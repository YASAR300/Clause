import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";

const OUTPUT_DIR = path.resolve(process.cwd(), "docs", "sample-contracts");

/**
 * Builds realistic, original, fictional Master Services Agreements (v1 and v2)
 * spanning 13 pages each with deliberate substantive and cosmetic differences.
 */

const DUPLICATE_CLAUSE_TEXT =
  "Each party shall bear its own internal administrative costs, legal fees, and operational expenses incurred in connection with its performance and compliance obligations under this Section.";

const CROSS_PAGE_PART_1 =
  "The Service Provider covenants and guarantees that all deliverables supplied hereunder shall strictly conform to the specifications and shall remain free from material defects for";

const CROSS_PAGE_PART_2 =
  "a continuous period of one hundred and eighty (180) calendar days following final acceptance by the Customer.";

export function generateContractPages(version = "v1") {
  const isV2 = version === "v2";
  const pages = [];

  // Page 1: Title, Recitals, Parties, Section 1 Definitions (Part 1)
  let p1 = `MASTER SERVICES AGREEMENT (${version.toUpperCase()})\n\n`;
  p1 += `This Master Services Agreement ("Agreement") is entered into and made effective as of October 1, 2026 ("Effective Date"), by and between:\n\n`;
  p1 += `Party A: Apex Horizon Cloud Ltd., a commercial enterprise organized and existing under the commercial laws of the Dubai International Financial Centre, with executive offices at Level 14, Al Fattan Currency House, DIFC, Dubai, UAE ("Service Provider"), and\n\n`;
  p1 += `Party B: Beacon Oasis Logistics FZ-LLC, a free zone limited liability company organized and existing under the regulations of Dubai South, with offices at Building A3, Logistics District, Dubai South, UAE ("Customer").\n\n`;
  p1 += `RECITALS\n`;
  p1 += `WHEREAS, Customer desires to procure enterprise cloud logistics orchestration, cargo analytics telemetry, and automated clearance infrastructure services; and\n`;
  p1 += `WHEREAS, Service Provider develops and operates high-availability cloud platforms and wishes to deliver such managed services in accordance with this Agreement.\n\n`;
  p1 += `NOW, THEREFORE, the parties mutually covenant and agree as follows:\n\n`;
  p1 += `SECTION 1. DEFINITIONS AND RULES OF INTERPRETATION\n\n`;
  p1 += `1.1 "Affiliate" means any entity that directly or indirectly controls, is controlled by, or is under common corporate ownership with an applicable party.\n`;
  p1 += `1.2 "Agreement" means this Master Services Agreement, together with all executed Statements of Work, Service Level Agreements, and annexed Schedules.\n`;
  p1 += `1.3 "Applicable Law" means all statutory enactments, administrative orders, decrees, and regulatory rules in force within the United Arab Emirates and the DIFC.\n`;
  p1 += `1.4 "Business Day" means any day excluding Saturdays, Sundays, and official public holidays recognized by the government of the United Arab Emirates.\n`;
  p1 += `1.5 "Customer Data" means all operational records, waybills, cargo manifests, and electronic transmissions submitted to the Service Provider by Customer.\n`;
  p1 += `1.6 "Deliverables" means all architectural designs, telemetry pipelines, and customized modules delivered to Customer under an applicable Statement of Work.\n`;
  pages.push(p1);

  // Page 2: Section 1 Definitions (Part 2), Section 2 Scope of Services (Part 1)
  let p2 = `SECTION 1. DEFINITIONS (CONTINUED)\n\n`;
  p2 += `1.7 "Intellectual Property Rights" means all patents, copyrights, moral rights, trademarks, trade secrets, design rights, and know-how recognized globally.\n`;
  p2 += `1.8 "Service Levels" means the availability metrics, response times, and uptime commitments set forth in Schedule A attached hereto.\n`;
  p2 += `1.9 "Statement of Work" or "SOW" means a mutually executed project schedule setting forth specialized scope, timelines, and commercial parameters.\n\n`;
  p2 += `SECTION 2. SERVICES AND STATEMENTS OF WORK\n\n`;
  p2 += `2.1 Provision of Services. Service Provider shall provide Customer with access to the managed logistics platform and perform the integration services.\n`;
  p2 += `2.2 Work Orders. Each project engagement shall be documented in an SOW executed by authorized signatories of both parties prior to commencement.\n`;
  if (!isV2) {
    // v1 Cosmetic version
    p2 += `2.3 Operational Standards. The Service Provider shall conduct the Services in accordance with prudent commercial standards, utilizing qualified personnel possessing adequate skill and experience.\n`;
  } else {
    // v2 Cosmetic reworded version
    p2 += `2.3 Operational Standards. The Service Provider will perform all Services consistent with recognized industry best practices, using competent personnel who hold appropriate expertise and training.\n`;
  }
  p2 += `2.4 Customer Cooperation. Customer shall provide timely access to internal technical environments, operational specifications, and personnel.\n\n`;
  p2 += `SECTION 2.5 WARRANTY AND PERFORMANCE TIMEFRAME\n`;
  // Cross-page sentence part 1 deliberately ending page 2
  p2 += `${CROSS_PAGE_PART_1}\n`;
  pages.push(p2);

  // Page 3: Cross-page sentence part 2, Section 3 Service Level Commitments
  let p3 = `${CROSS_PAGE_PART_2}\n\n`;
  p3 += `2.6 Remedy for Non-Conformance. If Customer gives written notice of any defect within the warranty period, Service Provider shall remediate without cost within ten (10) Business Days.\n\n`;
  p3 += `SECTION 3. SERVICE LEVEL COMMITMENTS AND AVAILABILITY\n\n`;
  p3 += `3.1 System Availability Target. Service Provider commits to maintain production platform availability of at least 99.9% across each calendar billing month.\n`;
  p3 += `3.2 Excluded Downtime. Availability calculations shall exclude planned maintenance windows scheduled between 02:00 and 06:00 Gulf Standard Time.\n`;
  p3 += `3.3 Service Credits. If availability falls below 99.9%, Customer shall receive a credit equal to 5% of monthly fees for each full 0.5% degradation.\n`;
  p3 += `3.4 Sole Remedy. The service credits provided under this Section 3 shall constitute Customer's sole monetary remedy for platform downtime.\n`;
  p3 += `3.5 Monitoring Reports. Service Provider shall publish monthly uptime records to Customer's designated administrative dashboard.\n`;
  pages.push(p3);

  // Page 4: Section 4 Fees, Invoicing, and Payment Terms
  let p4 = `SECTION 4. FEES, INVOICING, AND PAYMENT TERMS\n\n`;
  p4 += `4.1 Invoicing Cadence. Service Provider shall invoice Customer monthly in advance for subscription retainers, and monthly in arrears for usage metrics.\n`;
  if (!isV2) {
    // v1: 30 days, 1.0% interest
    p4 += `4.2 Payment Terms. Customer shall pay all properly invoiced amounts within thirty (30) days from the invoice date. Late payments shall accrue interest at a rate of 1.0% per month on the outstanding balance.\n`;
  } else {
    // v2: 60 days, 1.5% interest
    p4 += `4.2 Payment Terms. Customer shall pay all properly invoiced amounts within sixty (60) days from the invoice date. Late payments shall accrue interest at a rate of 1.5% per month on the outstanding balance.\n`;
  }
  p4 += `4.3 Currency. All fees, charges, and reimbursable sums shall be quoted and paid in United Arab Emirates Dirhams (AED).\n`;
  p4 += `4.4 Value Added Tax. Stated fees are exclusive of UAE Value Added Tax (VAT), which shall be charged at the statutory rate and itemized on tax invoices.\n`;
  p4 += `4.5 Disputed Invoices. Customer must provide written objection specifying disputed items within fifteen (15) Business Days of invoice transmission.\n`;
  p4 += `4.6 Undisputed Sums. Payment of undisputed invoice portions shall not be delayed or withheld pending resolution of disputed amounts.\n`;
  pages.push(p4);

  // Page 5: Section 5 Intellectual Property Rights
  let p5 = `SECTION 5. INTELLECTUAL PROPERTY RIGHTS AND LICENSING\n\n`;
  p5 += `5.1 Service Provider Background IP. Service Provider retains sole and exclusive title to all pre-existing software, algorithms, models, and core engines.\n`;
  p5 += `5.2 Customer License. Service Provider grants Customer a non-exclusive, non-transferable license to access and utilize the platform during the Term.\n`;
  p5 += `5.3 Deliverables and Custom Code. Unless otherwise specified in an SOW, custom workflow integrations created specifically for Customer shall vest in Customer.\n`;
  p5 += `5.4 Restrictions. Customer shall not decompile, reverse-engineer, distribute, or create derivative works of Service Provider Background IP.\n`;
  p5 += `5.5 IP Audits and Compliance Verification. Either party may verify compliance with license scopes upon fourteen (14) days advance written notice.\n`;
  // Duplicate clause occurrence 1
  p5 += `${DUPLICATE_CLAUSE_TEXT}\n`;
  pages.push(p5);

  // Page 6: Section 6 Confidentiality and Data Protection
  let p6 = `SECTION 6. CONFIDENTIALITY AND DATA PROTECTION\n\n`;
  p6 += `6.1 Confidential Information. "Confidential Information" encompasses all proprietary technical, financial, or commercial disclosures made by either party.\n`;
  p6 += `6.2 Nondisclosure Obligations. The receiving party shall safeguard all Confidential Information with the same degree of care as its own proprietary data.\n`;
  p6 += `6.3 Exceptions. Confidential obligations do not apply to data that is public knowledge, independently developed, or obtained lawfully without restriction.\n`;
  if (!isV2) {
    // v1 Cosmetic version
    p6 += `6.4 Return of Materials. Promptly upon expiration or termination of this Agreement, each party shall return or destroy all physical and electronic documents containing Confidential Information.\n`;
  } else {
    // v2 Cosmetic reworded version
    p6 += `6.4 Return of Materials. Immediately following the expiration or termination of this Agreement, both parties must return or certify the destruction of all recorded Confidential Information in their custody.\n`;
  }
  p6 += `6.5 Data Protection Protocols. Both parties shall maintain organizational and physical security controls in compliance with UAE Federal Data Protection Law.\n`;
  // Duplicate clause occurrence 2
  p6 += `${DUPLICATE_CLAUSE_TEXT}\n`;
  pages.push(p6);

  // Page 7: Section 7 Warranties and Representations, Section 8 Indemnity
  let p7 = `SECTION 7. REPRESENTATIONS AND WARRANTIES\n\n`;
  p7 += `7.1 Mutual Authority. Each party warrants that it possesses full corporate power, capacity, and legal authority to execute and perform this Agreement.\n`;
  p7 += `7.2 Compliance with Laws. Both parties covenant to comply with all applicable UAE export controls, anti-bribery regulations, and sanction regimes.\n`;
  p7 += `7.3 Non-Infringement. Service Provider warrants that the Services provided hereunder do not infringe any third-party Intellectual Property Rights.\n\n`;
  p7 += `SECTION 8. INDEMNIFICATION OBLIGATIONS\n\n`;
  p7 += `8.1 Service Provider Indemnity. Service Provider shall defend, indemnify, and hold harmless Customer against any third-party claim alleging intellectual property infringement.\n`;
  p7 += `8.2 Customer Indemnity. Customer shall defend and indemnify Service Provider against claims arising from unlawful Customer Data or unauthorized platform misuse.\n`;
  p7 += `8.3 Indemnity Procedure. The indemnified party must give prompt notice, grant full defense control, and provide reasonable cooperation.\n`;
  pages.push(p7);

  // Page 8: Section 9 Limitation of Liability
  let p8 = `SECTION 9. LIMITATION OF LIABILITY AND DAMAGES\n\n`;
  if (!isV2) {
    // v1: AED 100,000 cap
    p8 += `9.1 Aggregate Liability Cap. Subject to Section 9.3, each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 100,000.\n`;
  } else {
    // v2: AED 1,000,000 cap (CRITICAL change)
    p8 += `9.1 Aggregate Liability Cap. Subject to Section 9.3, each party's aggregate cumulative liability arising out of or related to this Agreement shall be strictly capped at and limited to AED 1,000,000.\n`;
  }
  p8 += `9.2 Consequential Damages Exclusion. Neither party shall be liable for indirect, incidental, special, punitive, or consequential losses, or loss of profits.\n`;
  p8 += `9.3 Uncapped Liabilities. Nothing in this Agreement shall exclude or limit liability for gross negligence, willful misconduct, or indemnification under Section 8.\n`;
  p8 += `9.4 Mitigation of Losses. Both parties shall take all commercially reasonable actions to mitigate damages arising from any breach or claim.\n`;
  pages.push(p8);

  // Page 9: Section 10 Term and Termination
  let p9 = `SECTION 10. TERM AND TERMINATION\n\n`;
  p9 += `10.1 Term. This Agreement commences on the Effective Date and shall remain in effect for an initial duration of thirty-six (36) calendar months.\n`;
  p9 += `10.2 Termination for Cause. Either party may terminate immediately if the other party commits a material breach and fails to cure within thirty (30) days.\n`;
  if (!isV2) {
    // v1 has termination for convenience
    p9 += `10.3 Termination for Convenience. Either party may terminate this Agreement or any Statement of Work without cause upon giving sixty (60) calendar days prior written notice to the other party.\n`;
    p9 += `10.4 Effect of Termination. Expiration or termination shall not relieve either party of accrued financial debts or surviving obligations.\n`;
  } else {
    // v2: Termination for Convenience is DELETED entirely!
    p9 += `10.3 Effect of Termination. Expiration or termination shall not relieve either party of accrued financial debts or surviving obligations.\n`;
  }
  p9 += `10.5 Transition Assistance. Upon written request, Service Provider shall offer transition assistance for up to sixty (60) days at standard rate card fees.\n`;
  pages.push(p9);

  // Page 10: Section 11 Restrictive Covenants / Non-Solicitation (v2 only) & Reordered Clauses
  let p10 = "";
  if (!isV2) {
    // In v1: Section 11 is Force Majeure, Section 12 is Notices
    p10 += `SECTION 11. FORCE MAJEURE AND EXCUSABLE DELAYS\n\n`;
    p10 += `11.1 Excusable Delay. Neither party shall be liable for delay or failure caused by acts of God, armed conflict, national cyber disasters, or grid outages.\n`;
    p10 += `11.2 Notice of Delay. The affected party must deliver written notification within forty-eight (48) hours detailing the event and estimated duration.\n\n`;
    p10 += `SECTION 12. NOTICES AND OFFICIAL COMMUNICATIONS\n\n`;
    p10 += `12.1 Delivery Method. All legal notices shall be in writing and delivered by hand, registered courier, or confirmed digital transmission.\n`;
    p10 += `12.2 Contact Addresses. Notices to Service Provider: Level 14, Al Fattan Currency House, DIFC, Dubai. Notices to Customer: Building A3, Dubai South.\n`;
  } else {
    // In v2: Section 11 is Non-Solicitation (NEW), Section 12 is Notices, Section 13 is Force Majeure (reordered)
    p10 += `SECTION 11. NON-SOLICITATION OF PERSONNEL\n\n`;
    p10 += `11.1 Non-Solicitation. During the Term and for a period of twelve (12) months following termination, neither party shall directly solicit for employment any personnel of the other party involved in the delivery or receipt of the Services.\n\n`;
    p10 += `SECTION 12. NOTICES AND OFFICIAL COMMUNICATIONS\n\n`;
    p10 += `12.1 Delivery Method. All legal notices shall be in writing and delivered by hand, registered courier, or confirmed digital transmission.\n`;
    p10 += `12.2 Contact Addresses. Notices to Service Provider: Level 14, Al Fattan Currency House, DIFC, Dubai. Notices to Customer: Building A3, Dubai South.\n\n`;
    p10 += `SECTION 13. FORCE MAJEURE AND EXCUSABLE DELAYS\n\n`;
    p10 += `13.1 Excusable Delay. Neither party shall be liable for delay or failure caused by acts of God, armed conflict, national cyber disasters, or grid outages.\n`;
    p10 += `13.2 Notice of Delay. The affected party must deliver written notification within forty-eight (48) hours detailing the event and estimated duration.\n`;
  }
  pages.push(p10);

  // Page 11: Governing Law, Dispute Resolution, and General Provisions
  const govSectionNum = isV2 ? "14" : "13";
  let p11 = `SECTION ${govSectionNum}. GOVERNING LAW AND DISPUTE RESOLUTION\n\n`;
  p11 += `${govSectionNum}.1 Governing Law. This Agreement and all claims arising hereunder shall be governed by and construed in accordance with the laws of the DIFC.\n`;
  p11 += `${govSectionNum}.2 Arbitration. Any controversy or dispute shall be settled exclusively by arbitration administered under the Arbitration Rules of the DIFC-LCIA.\n`;
  p11 += `${govSectionNum}.3 Seat and Language. The seat of arbitration shall be Dubai International Financial Centre, UAE, and proceedings shall be in English.\n`;
  p11 += `${govSectionNum}.4 Severability. If any provision is deemed invalid or unenforceable, remaining terms shall continue in full legal force and effect.\n`;
  p11 += `${govSectionNum}.5 Amendments. No modification or waiver of any provision shall be valid unless executed in writing by authorized corporate officers.\n`;
  pages.push(p11);

  // Page 12: Schedule A - Services, Scope, and Technical Milestones
  let p12 = `SCHEDULE A: SERVICES SPECIFICATION AND SERVICE LEVELS\n\n`;
  p12 += `1. Core Cloud Logistics Platform.\n`;
  p12 += `Service Provider shall deploy, host, and maintain the multi-tenant telemetry gateway and clearance routing services in dedicated regional data centers.\n\n`;
  p12 += `2. Performance SLA Targets.\n`;
  p12 += `- Production Service Availability: 99.9% uptime per calendar month.\n`;
  p12 += `- Critical Incident Response Time: Within fifteen (15) minutes, available 24 hours per day, 7 days per week.\n`;
  p12 += `- Major Incident Response Time: Within sixty (60) minutes during standard UAE Business Hours.\n\n`;
  p12 += `3. Backup and Disaster Recovery.\n`;
  p12 += `- Recovery Point Objective (RPO): Maximum fifteen (15) minutes of data loss.\n`;
  p12 += `- Recovery Time Objective (RTO): Maximum four (4) hours to restore full operational services.\n`;
  pages.push(p12);

  // Page 13: Schedule B - Commercial Rates & Signatures
  let p13 = `SCHEDULE B: COMMERCIAL PRICING AND SIGNATURE BLOCK\n\n`;
  p13 += `1. Base Subscription Retainer: AED 45,000 per month, invoiced in advance.\n`;
  p13 += `2. Ingestion Fee: AED 0.25 per transaction manifest processed.\n`;
  p13 += `3. Consulting and Custom Engineering: AED 850 per professional hour.\n\n`;
  p13 += `IN WITNESS WHEREOF, the parties hereto have caused this Master Services Agreement to be executed by their duly authorized representatives as of the Effective Date.\n\n`;
  p13 += `APEX HORIZON CLOUD LTD.                     BEACON OASIS LOGISTICS FZ-LLC\n\n`;
  p13 += `By: _________________________________       By: _________________________________\n`;
  p13 += `Name: Tariq Mansoor                         Name: Farida Al-Hashemi\n`;
  p13 += `Title: Managing Director                    Title: Chief Commercial Officer\n`;
  p13 += `Date: October 1, 2026                       Date: October 1, 2026\n`;
  pages.push(p13);

  return pages;
}

function wrapText(text, maxChars = 80) {
  const result = [];
  for (const block of text.split("\n")) {
    if (!block.trim()) {
      result.push("");
      continue;
    }
    const words = block.split(" ");
    let line = "";
    for (const w of words) {
      if (!line) {
        line = w;
      } else if (line.length + 1 + w.length <= maxChars) {
        line += " " + w;
      } else {
        result.push(line);
        line = w;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

/**
 * Generates a valid PDF binary in pure Node.js
 */
function generatePdf(pages) {
  let currentObjId = 5;
  const pageObjectIds = [];
  const contentObjectIds = [];

  for (let i = 0; i < pages.length; i++) {
    pageObjectIds.push(currentObjId++);
    contentObjectIds.push(currentObjId++);
  }

  const chunks = [`%PDF-1.4\n%âãÏÓ\n`];
  const offsets = [];

  function recordObj(id, content) {
    offsets[id] = chunks.join("").length;
    chunks.push(`${id} 0 obj\n${content}\nendobj\n`);
  }

  recordObj(1, `<< /Type /Catalog /Pages 3 0 R >>`);
  recordObj(2, `<< /Type /Outlines /Count 0 >>`);
  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  recordObj(3, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>`);
  recordObj(4, `<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>`);

  for (let i = 0; i < pages.length; i++) {
    const pageId = pageObjectIds[i];
    const contentId = contentObjectIds[i];

    const lines = wrapText(pages[i], 80).slice(0, 44);

    let streamBody = "BT\n/F1 9.5 Tf\n50 740 Td\n15 TL\n";
    for (const line of lines) {
      const sanitized = line
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");
      streamBody += `(${sanitized}) '\n`;
    }
    streamBody += "ET\n";

    recordObj(
      pageId,
      `<< /Type /Page /Parent 3 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 4 0 R >> >> >>`
    );

    recordObj(
      contentId,
      `<< /Length ${Buffer.byteLength(streamBody)} >>\nstream\n${streamBody}endstream`
    );
  }

  const xrefOffset = chunks.join("").length;
  chunks.push(`xref\n0 ${currentObjId}\n0000000000 65535 f \n`);

  for (let i = 1; i < currentObjId; i++) {
    const off = String(offsets[i]).padStart(10, "0");
    chunks.push(`${off} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${currentObjId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return Buffer.from(chunks.join(""));
}

/**
 * Generates a valid DOCX binary using JSZip
 */
async function generateDocx(pages) {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  let bodyXml = "";

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i];
    const paragraphs = pageText.split("\n").filter((p) => p.trim().length > 0);

    for (const p of paragraphs) {
      const escaped = p
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      bodyXml += `<w:p><w:r><w:t>${escaped}</w:t></w:r></w:p>`;
    }

    if (i < pages.length - 1) {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r><w:r><w:t>&#x000C;</w:t></w:r></w:p>`;
    }
  }

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyXml}</w:body>
</w:document>`
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function buildSampleContracts() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const v1Pages = generateContractPages("v1");
  const v2Pages = generateContractPages("v2");

  const v1Pdf = generatePdf(v1Pages);
  const v2Pdf = generatePdf(v2Pages);

  const v1Docx = await generateDocx(v1Pages);
  const v2Docx = await generateDocx(v2Pages);

  const v1PdfPath = path.join(OUTPUT_DIR, "Master Services Agreement v1.pdf");
  const v1DocxPath = path.join(OUTPUT_DIR, "Master Services Agreement v1.docx");
  const v2PdfPath = path.join(OUTPUT_DIR, "Master Services Agreement v2.pdf");
  const v2DocxPath = path.join(OUTPUT_DIR, "Master Services Agreement v2.docx");

  fs.writeFileSync(v1PdfPath, v1Pdf);
  fs.writeFileSync(v1DocxPath, v1Docx);
  fs.writeFileSync(v2PdfPath, v2Pdf);
  fs.writeFileSync(v2DocxPath, v2Docx);

  return {
    v1: {
      pages: v1Pages.length,
      pdfPath: v1PdfPath,
      pdfSizeBytes: v1Pdf.length,
      docxPath: v1DocxPath,
      docxSizeBytes: v1Docx.length,
    },
    v2: {
      pages: v2Pages.length,
      pdfPath: v2PdfPath,
      pdfSizeBytes: v2Pdf.length,
      docxPath: v2DocxPath,
      docxSizeBytes: v2Docx.length,
    },
  };
}

if (process.argv[1]?.endsWith("generate-sample-contracts.mjs")) {
  buildSampleContracts().then((res) => {
    process.stdout.write(
      `Generated sample contracts in ${OUTPUT_DIR}:\n` +
        `- MSA v1: ${res.v1.pages} pages, PDF ${(res.v1.pdfSizeBytes / 1024).toFixed(1)} KB, DOCX ${(res.v1.docxSizeBytes / 1024).toFixed(1)} KB\n` +
        `- MSA v2: ${res.v2.pages} pages, PDF ${(res.v2.pdfSizeBytes / 1024).toFixed(1)} KB, DOCX ${(res.v2.docxSizeBytes / 1024).toFixed(1)} KB\n`
    );
  });
}
