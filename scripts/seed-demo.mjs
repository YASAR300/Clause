import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db.js";
import { extractPdf } from "../lib/extract/pdf.js";
import { chunkContract } from "../lib/chunking/index.js";
import { CiteStreamParser } from "../lib/ai/cite-parser.js";
import { findQuote } from "../lib/verify/quotes.js";

/**
 * Idempotent demo database seeder.
 * Populates sample contracts, conversations, citations (verified and unverified),
 * a complete comparison, and an agent tool trace.
 */

const V1_NAME = "Master Services Agreement v1.pdf";
const V2_NAME = "Master Services Agreement v2.pdf";

async function main() {
  const isProduction = process.env.NODE_ENV === "production";
  const hasForce = process.argv.includes("--force");

  if (isProduction && !hasForce) {
    process.stderr.write(
      "Refusing to seed demo data in production environment without --force flag.\n"
    );
    process.exit(1);
  }

  process.stdout.write("Starting idempotent demo seeding...\n");

  const contractsDir = path.resolve(process.cwd(), "docs", "sample-contracts");
  const v1PdfPath = path.join(contractsDir, V1_NAME);
  const v2PdfPath = path.join(contractsDir, V2_NAME);

  if (!fs.existsSync(v1PdfPath) || !fs.existsSync(v2PdfPath)) {
    process.stdout.write("Sample contracts not found on disk. Generating now...\n");
    const { buildSampleContracts } = await import("./generate-sample-contracts.mjs");
    await buildSampleContracts();
  }

  // 1. Clean existing demo records for idempotency
  const existingDocs = await db.document.findMany({
    where: { name: { in: [V1_NAME, V2_NAME] } },
    select: { id: true },
  });

  const existingDocIds = existingDocs.map((d) => d.id);
  if (existingDocIds.length > 0) {
    process.stdout.write(`Cleaning up ${existingDocIds.length} previous demo documents...\n`);
    await db.document.deleteMany({
      where: { id: { in: existingDocIds } },
    });
  }

  // 2. Ingest v1 and v2 through real extraction and chunking
  process.stdout.write("Processing Master Services Agreement v1 through real extraction pipeline...\n");
  const v1Buffer = fs.readFileSync(v1PdfPath);
  const v1Extraction = await extractPdf(v1Buffer);
  const v1DataUri = `data:application/pdf;base64,${v1Buffer.toString("base64")}`;

  const doc1 = await db.document.create({
    data: {
      name: V1_NAME,
      mimeType: "application/pdf",
      sizeBytes: v1Buffer.length,
      blobUrl: v1DataUri,
      blobPathname: `sample-contracts/${V1_NAME}`,
      status: "READY",
      statusDetail: "Ingested via demo seed pipeline",
      progress: 100,
      pageCount: v1Extraction.numPages,
      charCount: v1Extraction.charCount,
      fullText: v1Extraction.fullText,
      emptyPages: v1Extraction.emptyPages || [],
      versionLabel: "v1.0",
    },
  });

  await db.documentPage.createMany({
    data: v1Extraction.pages.map((p) => ({
      documentId: doc1.id,
      pageNumber: p.pageNumber,
      text: p.text,
      startOffset: p.startOffset,
      endOffset: p.endOffset,
    })),
  });

  const v1Chunks = chunkContract(v1Extraction.fullText, v1Extraction.pages, doc1.id);
  if (v1Chunks.length > 0) {
    await db.chunk.createMany({ data: v1Chunks });
  }

  process.stdout.write("Processing Master Services Agreement v2 through real extraction pipeline...\n");
  const v2Buffer = fs.readFileSync(v2PdfPath);
  const v2Extraction = await extractPdf(v2Buffer);
  const v2DataUri = `data:application/pdf;base64,${v2Buffer.toString("base64")}`;

  const doc2 = await db.document.create({
    data: {
      name: V2_NAME,
      mimeType: "application/pdf",
      sizeBytes: v2Buffer.length,
      blobUrl: v2DataUri,
      blobPathname: `sample-contracts/${V2_NAME}`,
      status: "READY",
      statusDetail: "Ingested via demo seed pipeline",
      progress: 100,
      pageCount: v2Extraction.numPages,
      charCount: v2Extraction.charCount,
      fullText: v2Extraction.fullText,
      emptyPages: v2Extraction.emptyPages || [],
      versionLabel: "v2.0",
    },
  });

  await db.documentPage.createMany({
    data: v2Extraction.pages.map((p) => ({
      documentId: doc2.id,
      pageNumber: p.pageNumber,
      text: p.text,
      startOffset: p.startOffset,
      endOffset: p.endOffset,
    })),
  });

  const v2Chunks = chunkContract(v2Extraction.fullText, v2Extraction.pages, doc2.id);
  if (v2Chunks.length > 0) {
    await db.chunk.createMany({ data: v2Chunks });
  }

  // Helper to parse citations through real parser and real verification engine
  async function processScriptedAssistantMessage({
    conversationId,
    rawModelText,
    docsMap,
    allDocs,
    coverage = null,
    toolTrace = null,
  }) {
    const message = await db.message.create({
      data: {
        conversationId,
        role: "ASSISTANT",
        content: "",
        status: "COMPLETE",
        coverage,
        toolTrace,
      },
    });

    const parsedCitations = [];
    const parser = new CiteStreamParser({
      onCleanText: () => {},
      onCitation: async (rawCite) => {
        const targetDoc = docsMap[rawCite.docId] || docsMap["D1"] || allDocs[0];
        const otherDocs = allDocs.filter((d) => d.id !== targetDoc.id);

        const verification = findQuote(
          targetDoc.fullText,
          targetDoc.pages || [],
          rawCite.quoteText,
          { otherDocuments: otherDocs }
        );

        const firstMatch = verification.matches[0] || {};
        const citationRecord = {
          messageId: message.id,
          documentId: targetDoc.id,
          ordinal: rawCite.ordinal,
          quoteText: rawCite.quoteText,
          verified: verification.verified,
          matchCount: verification.matchCount,
          startOffset: firstMatch.start ?? 0,
          endOffset: firstMatch.end ?? 0,
          pageStart: firstMatch.pageStart ?? 1,
          pageEnd: firstMatch.pageEnd ?? 1,
          allMatches: { matches: verification.matches },
          failureReason: verification.reason,
        };

        const saved = await db.citation.create({ data: citationRecord });
        parsedCitations.push(saved);
      },
    });

    parser.feed(rawModelText);
    const parseResult = parser.end();

    await db.message.update({
      where: { id: message.id },
      data: { content: parseResult.cleanText },
    });

    return { message, citations: parsedCitations };
  }

  // 3. Conversation 1: Single document (v1) with verified & unverified chips
  process.stdout.write("Seeding single-document conversation with genuine quote verification...\n");
  const conv1 = await db.conversation.create({
    data: {
      title: "Liability Cap and Payment Terms Audit",
      mode: "STANDARD",
      documents: {
        create: [{ documentId: doc1.id, label: "D1" }],
      },
    },
  });

  await db.message.create({
    data: {
      conversationId: conv1.id,
      role: "USER",
      content: "What is the liability cap and what are the payment terms under this agreement?",
      status: "COMPLETE",
    },
  });

  const scriptedOutput1 =
    "Under Section 9.1, each party's aggregate cumulative liability is capped at AED 1,000,000 <cite doc=\"D1\">each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 1,000,000.</cite>\n\nRegarding payment terms, customer payments are due within 30 days <cite doc=\"D1\">Customer shall pay all properly invoiced amounts within thirty (30) days from the invoice date.</cite> Late balances accrue interest at approximately one percent each month <cite doc=\"D1\">Late payments will accrue interest at approximately one percent each month</cite>.";

  const conv1Coverage = {
    strategy: "RETRIEVAL",
    pagesSearched: [1, 2, 4, 8],
    totalPages: 13,
    percentage: 31,
    summary: "Searched sections covering Payment and Limitation of Liability.",
  };

  await processScriptedAssistantMessage({
    conversationId: conv1.id,
    rawModelText: scriptedOutput1,
    docsMap: { D1: doc1 },
    allDocs: [doc1],
    coverage: conv1Coverage,
  });

  // 4. Conversation 2: Multi-document conversation across v1 and v2
  process.stdout.write("Seeding multi-document comparative conversation across v1 and v2...\n");
  const conv2 = await db.conversation.create({
    data: {
      title: "Comparison of v1 vs v2 Terms",
      mode: "STANDARD",
      documents: {
        create: [
          { documentId: doc1.id, label: "D1" },
          { documentId: doc2.id, label: "D2" },
        ],
      },
    },
  });

  await db.message.create({
    data: {
      conversationId: conv2.id,
      role: "USER",
      content: "Compare the liability caps, payment terms, and termination rights between v1 and v2.",
      status: "COMPLETE",
    },
  });

  const scriptedOutput2 =
    "Between Master Services Agreement v1 and v2, several critical commercial terms have changed:\n\n**Liability Cap**: In v1, liability is capped at AED 100,000 <cite doc=\"D1\">each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 100,000.</cite>, whereas in v2 the cap is increased tenfold to AED 1,000,000 <cite doc=\"D2\">each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 1,000,000.</cite>.\n\n**Payment Terms**: Under v1, payments are due in 30 days <cite doc=\"D1\">Customer shall pay all properly invoiced amounts within thirty (30) days from the invoice date.</cite> with 1.0% interest, while v2 extends terms to 60 days <cite doc=\"D2\">Customer shall pay all properly invoiced amounts within sixty (60) days from the invoice date.</cite> with 1.5% interest.\n\n**Termination for Convenience**: v1 allows either party to terminate for convenience upon sixty days notice <cite doc=\"D1\">Either party may terminate this Agreement or any Statement of Work without cause upon giving sixty (60) calendar days prior written notice to the other party.</cite>. In v2, this termination for convenience right has been completely removed.";

  const conv2Coverage = {
    documents: [
      {
        documentId: doc1.id,
        name: V1_NAME,
        strategy: "RETRIEVAL",
        pagesSearched: [4, 8, 9],
        totalPages: 13,
        percentage: 23,
      },
      {
        documentId: doc2.id,
        name: V2_NAME,
        strategy: "RETRIEVAL",
        pagesSearched: [4, 8, 9],
        totalPages: 13,
        percentage: 23,
      },
    ],
  };

  await processScriptedAssistantMessage({
    conversationId: conv2.id,
    rawModelText: scriptedOutput2,
    docsMap: { D1: doc1, D2: doc2 },
    allDocs: [doc1, doc2],
    coverage: conv2Coverage,
  });

  // 5. Seed Comparison between v1 and v2
  process.stdout.write("Seeding finished Comparison between v1 and v2...\n");
  const comparison = await db.comparison.create({
    data: {
      baseDocumentId: doc1.id,
      revisedDocumentId: doc2.id,
      status: "READY",
      summary: {
        totalChanges: 7,
        criticalCount: 1,
        majorCount: 3,
        minorCount: 1,
        cosmeticCount: 2,
        summary:
          "Significant expansion of liability cap from AED 100,000 to AED 1,000,000, extension of payment window to 60 days, elimination of termination for convenience, and addition of 12-month non-solicitation covenant.",
      },
    },
  });

  const changesData = [
    {
      comparisonId: comparison.id,
      changeType: "MODIFIED",
      significance: "CRITICAL",
      category: "liability",
      heading: "9.1 Aggregate Liability Cap",
      baseText:
        "9.1 Aggregate Liability Cap. Subject to Section 9.3, each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 100,000.",
      revisedText:
        "9.1 Aggregate Liability Cap. Subject to Section 9.3, each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 1,000,000.",
      baseStart: 6200,
      revisedStart: 6200,
      summary:
        "Aggregate liability cap increased tenfold from AED 100,000 to AED 1,000,000.",
      whyItMatters:
        "Substantially enlarges financial exposure for both parties in the event of contractual default or breach.",
      facts: [
        {
          type: "amount",
          before: "AED 100,000",
          after: "AED 1,000,000",
        },
      ],
      position: 0,
    },
    {
      comparisonId: comparison.id,
      changeType: "MODIFIED",
      significance: "MAJOR",
      category: "payment",
      heading: "4.2 Payment Terms",
      baseText:
        "4.2 Payment Terms. Customer shall pay all properly invoiced amounts within thirty (30) days from the invoice date. Late payments shall accrue interest at a rate of 1.0% per month on the outstanding balance.",
      revisedText:
        "4.2 Payment Terms. Customer shall pay all properly invoiced amounts within sixty (60) days from the invoice date. Late payments shall accrue interest at a rate of 1.5% per month on the outstanding balance.",
      baseStart: 3100,
      revisedStart: 3100,
      summary:
        "Payment window lengthened from 30 days to 60 days, and late-payment interest increased from 1.0% to 1.5%.",
      whyItMatters:
        "Extends Customer cash payment cycle while imposing a 50% higher penalty on overdue balances.",
      facts: [
        { type: "duration", before: "30 days", after: "60 days" },
        { type: "percentage", before: "1.0%", after: "1.5%" },
      ],
      position: 1,
    },
    {
      comparisonId: comparison.id,
      changeType: "REMOVED",
      significance: "MAJOR",
      category: "termination",
      heading: "10.3 Termination for Convenience",
      baseText:
        "10.3 Termination for Convenience. Either party may terminate this Agreement or any Statement of Work without cause upon giving sixty (60) calendar days prior written notice to the other party.",
      revisedText: "",
      baseStart: 7400,
      revisedStart: null,
      summary: "Termination for convenience clause removed entirely in v2.",
      whyItMatters:
        "Neither party may terminate the agreement without establishing material breach or insolvency, eliminating early exit flexibility.",
      facts: [],
      position: 2,
    },
    {
      comparisonId: comparison.id,
      changeType: "ADDED",
      significance: "MAJOR",
      category: "other",
      heading: "11. Non-Solicitation of Personnel",
      baseText: "",
      revisedText:
        "11.1 Non-Solicitation. During the Term and for a period of twelve (12) months following termination, neither party shall directly solicit for employment any personnel of the other party involved in the delivery or receipt of the Services.",
      baseStart: null,
      revisedStart: 8100,
      summary:
        "New covenant prohibiting employment solicitation of personnel for 12 months after agreement termination.",
      whyItMatters:
        "Prevents talent poaching but limits recruitment options for key operational staff.",
      facts: [{ type: "duration", before: "none", after: "12 months" }],
      position: 3,
    },
    {
      comparisonId: comparison.id,
      changeType: "MODIFIED",
      significance: "COSMETIC",
      category: "other",
      heading: "2.3 Operational Standards",
      baseText:
        "2.3 Operational Standards. The Service Provider shall conduct the Services in accordance with prudent commercial standards, utilizing qualified personnel possessing adequate skill and experience.",
      revisedText:
        "2.3 Operational Standards. The Service Provider will perform all Services consistent with recognized industry best practices, using competent personnel who hold appropriate expertise and training.",
      baseStart: 1800,
      revisedStart: 1800,
      summary: "Reworded operational standard using synonymous phrasing.",
      whyItMatters: "Identical legal standard of care and commercial performance.",
      facts: [],
      position: 4,
    },
    {
      comparisonId: comparison.id,
      changeType: "MODIFIED",
      significance: "COSMETIC",
      category: "confidentiality",
      heading: "6.4 Return of Materials",
      baseText:
        "6.4 Return of Materials. Promptly upon expiration or termination of this Agreement, each party shall return or destroy all physical and electronic documents containing Confidential Information.",
      revisedText:
        "6.4 Return of Materials. Immediately following the expiration or termination of this Agreement, both parties must return or certify the destruction of all recorded Confidential Information in their custody.",
      baseStart: 4900,
      revisedStart: 4900,
      summary: "Reworded confidential documents return obligation.",
      whyItMatters:
        "Retains exact mutual obligation to return or certify destruction of proprietary files.",
      facts: [],
      position: 5,
    },
    {
      comparisonId: comparison.id,
      changeType: "MOVED",
      significance: "MINOR",
      category: "other",
      heading: "Notices and Force Majeure",
      baseText:
        "SECTION 11. FORCE MAJEURE AND EXCUSABLE DELAYS\nSECTION 12. NOTICES AND OFFICIAL COMMUNICATIONS",
      revisedText:
        "SECTION 12. NOTICES AND OFFICIAL COMMUNICATIONS\nSECTION 13. FORCE MAJEURE AND EXCUSABLE DELAYS",
      baseStart: 8200,
      revisedStart: 8900,
      summary: "Section numbers and order transposed between versions.",
      whyItMatters:
        "Structural rearrangement without alteration of notice delivery or excusable delay provisions.",
      facts: [],
      position: 6,
    },
  ];

  await db.comparisonChange.createMany({ data: changesData });

  // 6. Seed Agent-mode conversation with stored tool trace
  process.stdout.write("Seeding agent-mode conversation with multi-step tool execution trace...\n");
  const agentConv = await db.conversation.create({
    data: {
      title: "Deep Research: Liability and Warranty Audit",
      mode: "AGENT",
      documents: {
        create: [{ documentId: doc1.id, label: "D1" }],
      },
    },
  });

  await db.message.create({
    data: {
      conversationId: agentConv.id,
      role: "USER",
      content:
        "Perform a deep research audit on the liability caps and warranty obligations under Master Services Agreement v1.",
      status: "COMPLETE",
    },
  });

  const agentToolTrace = [
    {
      id: "step-1",
      name: "list_clauses",
      humanLabel: "Scanning table of contents and article headings",
      summary: "Found 12 top-level sections across 13 pages",
      durationMs: 142,
      ok: true,
      result: {
        totalClauses: 12,
        pagesCovered: "1-13",
        sections: [
          "1. Definitions and Rules of Interpretation",
          "2. Services and Statements of Work",
          "3. Service Level Commitments and Availability",
          "4. Fees, Invoicing, and Payment Terms",
          "5. Intellectual Property Rights and Licensing",
          "6. Confidentiality and Data Protection",
          "7. Representations and Warranties",
          "8. Indemnification Obligations",
          "9. Limitation of Liability and Damages",
          "10. Term and Termination",
          "11. Force Majeure and Excusable Delays",
          "12. Notices and Official Communications",
        ],
      },
    },
    {
      id: "step-2",
      name: "search_document",
      humanLabel: "Searching for liability cap and indemnities",
      summary: "Found 4 matching chunks in Section 8 & 9",
      durationMs: 215,
      ok: true,
      result: {
        query: "liability cap indemnity",
        matchCount: 4,
        pages: [7, 8],
      },
    },
    {
      id: "step-3",
      name: "get_section",
      humanLabel: "Reading Section 9: Limitation of Liability",
      summary: "Retrieved full text (1,420 chars)",
      durationMs: 180,
      ok: true,
      result: {
        section: "9. Limitation of Liability",
        charCount: 1420,
        pageRange: "8",
      },
    },
    {
      id: "step-4",
      name: "get_section",
      humanLabel: "Reading Section 2.5: Warranty and Performance",
      summary: "Retrieved full text (890 chars)",
      durationMs: 165,
      ok: true,
      result: {
        section: "2.5 Warranty and Performance",
        charCount: 890,
        pageRange: "2-3",
      },
    },
  ];

  const agentScriptedOutput =
    "Based on deep research across Master Services Agreement v1:\n\n1. **Liability Cap**: Under Section 9.1, aggregate cumulative liability is strictly limited to AED 100,000 <cite doc=\"D1\">each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 100,000.</cite>.\n2. **Consequential Damages**: Neither party is liable for indirect or punitive damages <cite doc=\"D1\">Neither party shall be liable for indirect, incidental, special, punitive, or consequential losses, or loss of profits.</cite>.\n3. **Warranty Period**: Deliverables are guaranteed against material defects for 180 calendar days <cite doc=\"D1\">material defects for a continuous period of one hundred and eighty (180) calendar days following final acceptance by the Customer.</cite>.";

  const agentCoverage = {
    strategy: "RETRIEVAL",
    pagesSearched: [2, 3, 7, 8],
    totalPages: 13,
    percentage: 31,
    summary: "Analyzed Sections 2, 7, 8, and 9 for warranty and liability provisions.",
  };

  await processScriptedAssistantMessage({
    conversationId: agentConv.id,
    rawModelText: agentScriptedOutput,
    docsMap: { D1: doc1 },
    allDocs: [doc1],
    coverage: agentCoverage,
    toolTrace: agentToolTrace,
  });

  process.stdout.write(
    `Demo seeding completed successfully:\n` +
      `- Ingested: "${doc1.name}" (${doc1.pageCount} pages, ${doc1.charCount} chars)\n` +
      `- Ingested: "${doc2.name}" (${doc2.pageCount} pages, ${doc2.charCount} chars)\n` +
      `- Single-Doc Conversation: ID ${conv1.id}\n` +
      `- Multi-Doc Conversation: ID ${conv2.id}\n` +
      `- Comparison: ID ${comparison.id} (${changesData.length} redline changes)\n` +
      `- Agent Conversation: ID ${agentConv.id} (${agentToolTrace.length} tool steps)\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Seed failed: ${err.message}\n${err.stack}\n`);
  process.exit(1);
});
