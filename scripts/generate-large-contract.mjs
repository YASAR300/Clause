import fs from "node:fs";
import path from "node:path";

/**
 * Builds a realistic 150-page enterprise master services agreement.
 * Generates both a structured text fixture and a standard valid 150-page PDF file.
 */

const TARGET_PAGES = 150;
const OUTPUT_DIR = path.resolve(process.cwd(), "fixtures");

const CLAUSE_TITLES = [
  "Definitions and Rules of Interpretation",
  "Scope of Services and Deliverables",
  "License Grants and Permitted Use",
  "Customer Obligations and Prerequisites",
  "Service Level Agreements and Performance Credits",
  "Fees, Payment Terms, and Reimbursable Expenses",
  "Taxes, Duties, and Regulatory Levies",
  "Intellectual Property Ownership and Work Made for Hire",
  "Mutual Confidentiality and Proprietary Information",
  "Data Protection, Security Safeguards, and Privacy",
  "Representations, Warranties, and Disclaimers",
  "Indemnification Obligations and Defense Procedures",
  "Limitation of Liability and Aggregate Liability Caps",
  "Insurance Coverage and Policy Endorsements",
  "Term, Automatic Renewal, and Expiration",
  "Termination for Cause, Insolvency, and Material Breach",
  "Termination for Convenience and Transition Services",
  "Effect of Termination and Return of Customer Data",
  "Force Majeure and Excusable Delays",
  "Non-Solicitation and Restrictive Covenants",
  "Export Compliance and Sanctions Laws",
  "Governing Law, Jurisdiction, and Venue",
  "Dispute Resolution and Mandatory Arbitration",
  "Severability, Modification, and Waiver",
  "Entire Agreement and Precedence of Schedules",
];

const DEFINITIONS = [
  ["Affiliate", "any entity that directly or indirectly controls, is controlled by, or is under common control with a party."],
  ["Applicable Law", "all international, federal, state, and local statutes, ordinances, regulations, and judicial orders."],
  ["Authorized User", "an individual employee, agent, or independent contractor authorized by Customer to access the Platform."],
  ["Claim", "any third-party civil, criminal, administrative, or investigative demand, lawsuit, arbitration, or proceeding."],
  ["Confidential Information", "all non-public information disclosed by either party, whether in tangible, electronic, or oral form."],
  ["Customer Data", "all electronic data, documents, files, and records submitted, uploaded, or transmitted by Customer."],
  ["Deliverables", "all work product, reports, configurations, documentation, and source code prepared for Customer."],
  ["Documentation", "the user manuals, specifications, and technical guides published by Service Provider."],
  ["Effective Date", "the date of execution of the initial Statement of Work or Order Form by both authorized representatives."],
  ["Force Majeure Event", "acts of God, war, terrorism, civil unrest, natural disasters, national power grid failures, or pandemics."],
  ["Intellectual Property Rights", "patents, copyrights, trade secrets, trademarks, service marks, moral rights, and mask works."],
  ["Losses", "actual damages, settlement payments, reasonable attorney fees, court costs, and related defense expenses."],
  ["Order Form", "the ordering schedule or statement of work mutually executed by the parties referencing this Agreement."],
  ["Service Provider IP", "the proprietary software, architecture, algorithms, and methodologies pre-existing or developed independently."],
  ["Term", "the initial period of thirty-six (36) months commencing on the Effective Date, together with any Renewal Terms."],
];

function generateContractText() {
  const pages = [];

  // Page 1: Title and Preamble
  let p1 = `GLOBAL MASTER SERVICES AGREEMENT\n\n`;
  p1 += `This Master Services Agreement ("Agreement") is dated as of October 1, 2026 ("Effective Date"), by and between:\n\n`;
  p1 += `Party A: Apex Infrastructure Global Corp., a Delaware corporation with offices at 100 Enterprise Way, Suite 400, New York, NY ("Service Provider"), and\n`;
  p1 += `Party B: Meridian Enterprise Technologies, LLC, a California limited liability company with offices at 500 Market Street, San Francisco, CA ("Customer").\n\n`;
  p1 += `RECITALS\n`;
  p1 += `WHEREAS, Customer desires to retain Service Provider to perform enterprise software implementation, infrastructure analysis, and continuous monitoring services; and\n`;
  p1 += `WHEREAS, Service Provider possesses specialized technical expertise and agrees to provide such services under the terms and conditions set forth herein.\n\n`;
  p1 += `NOW, THEREFORE, in consideration of the mutual covenants and conditions contained herein, the parties agree as follows:\n\n`;
  p1 += `1. DEFINITIONS AND INTERPRETATION\n\n`;
  for (let i = 0; i < 6; i++) {
    const [term, def] = DEFINITIONS[i];
    p1 += `1.${i + 1} "${term}" means ${def}\n\n`;
  }
  pages.push(p1);

  // Pages 2 to 148: Articles, Clauses, and Schedules
  let sectionIndex = 2;
  while (pages.length < TARGET_PAGES - 2) {
    const pageNum = pages.length + 1;
    const clauseTitle = CLAUSE_TITLES[(pageNum - 2) % CLAUSE_TITLES.length];
    let pageText = `\nSECTION ${sectionIndex}. ${clauseTitle.toUpperCase()}\n\n`;

    pageText += `${sectionIndex}.1 Scope and Operational Requirements.\n`;
    pageText += `In connection with the performance of obligations under this Section ${sectionIndex}, both parties shall adhere to industry best practices, established compliance protocols, and agreed-upon service levels. The Service Provider shall ensure continuous availability of designated personnel and system components, subject to planned maintenance windows communicated at least forty-eight (48) hours in advance.\n\n`;

    pageText += `${sectionIndex}.2 Standards of Diligence and Review.\n`;
    pageText += `Each deliverable and work product generated pursuant to this Section ${sectionIndex} shall be subject to a formal acceptance period of ten (10) business days. Customer may issue written notice of deficiency detailing any failure to conform to the functional specifications, whereupon Service Provider shall remediate such deficiency within five (5) business days at no additional cost.\n\n`;

    pageText += `${sectionIndex}.3 Risk Allocation and Compliance.\n`;
    pageText += `Neither party shall take any action that compromises the cryptographic integrity, operational availability, or confidential status of the shared infrastructure. All audits, logs, and telemetry gathered during the term shall be retained for seven (7) years in an immutable format complying with ISO/IEC 27001 and SOC 2 Type II criteria.\n\n`;

    // Add extra paragraphs to fill page length realistically (~2200-2800 characters per page)
    pageText += `${sectionIndex}.4 Reporting, Monitoring, and Governance.\n`;
    pageText += `The parties shall appoint authorized relationship managers who shall meet on a bi-weekly cadence to evaluate technical progress, outstanding invoices, risk metrics, and performance scorecard status. Minutes of each meeting shall be documented and distributed within forty-eight (48) hours of adjournment.\n\n`;

    pageText += `[Page ${pageNum} of ${TARGET_PAGES} | Enterprise Contract Master Fixture]\n`;
    pages.push(pageText);
    sectionIndex++;
  }

  // Page 149: Schedule A - Service Level Agreement & Pricing Matrix
  let p149 = `\nSCHEDULE A: SERVICE LEVEL AGREEMENT & PRICING MATRIX\n\n`;
  p149 += `1. Availability Commitment. Service Provider guarantees 99.95% monthly uptime for all production workloads.\n`;
  p149 += `2. Service Credits. Failure to meet the availability target entitles Customer to a 10% credit of the monthly subscription fee for each 0.1% downtime exceeding the threshold.\n`;
  p149 += `3. Fee Schedule: Base platform retainer is $50,000 per calendar quarter, payable net thirty (30) days from invoice receipt.\n`;
  p149 += `4. Payment Term in Clause 4: All supplemental consulting services shall be billed at $250/hour, reconciled bi-weekly.\n\n`;
  p149 += `[Page 149 of ${TARGET_PAGES}]\n`;
  pages.push(p149);

  // Page 150: Execution and Signatures
  let p150 = `\nSIGNATURE AND EXECUTION BLOCK\n\n`;
  p150 += `IN WITNESS WHEREOF, the parties hereto have caused this Master Services Agreement to be executed by their duly authorized representatives as of the Effective Date.\n\n`;
  p150 += `APEX INFRASTRUCTURE GLOBAL CORP.          MERIDIAN ENTERPRISE TECHNOLOGIES, LLC\n`;
  p150 += `By: ___________________________________     By: ___________________________________\n`;
  p150 += `Name: Sarah Jenkins                         Name: David Vance\n`;
  p150 += `Title: Chief Executive Officer              Title: VP of Legal & Compliance\n`;
  p150 += `Date: October 1, 2026                       Date: October 1, 2026\n\n`;
  p150 += `[Page 150 of ${TARGET_PAGES} - End of Agreement]\n`;
  pages.push(p150);

  return pages;
}

/**
 * Generates a valid 150-page PDF binary in pure Node.js
 */
function generatePdfBinary(pages) {
  const objects = [];
  let currentObjId = 1;

  // Obj 1: Catalog
  // Obj 2: Outlines
  // Obj 3: Pages tree
  // Obj 4: Font F1
  currentObjId = 5;

  const pageObjectIds = [];
  const contentObjectIds = [];

  for (let i = 0; i < pages.length; i++) {
    const pageObjId = currentObjId++;
    const contentObjId = currentObjId++;
    pageObjectIds.push(pageObjId);
    contentObjectIds.push(contentObjId);
  }

  const chunks = [];
  chunks.push(`%PDF-1.4\n%âãÏÓ\n`);

  const offsets = [];

  function recordObj(id, content) {
    offsets[id] = chunks.join("").length;
    chunks.push(`${id} 0 obj\n${content}\nendobj\n`);
  }

  // 1: Catalog
  recordObj(1, `<< /Type /Catalog /Pages 3 0 R >>`);

  // 2: Outlines
  recordObj(2, `<< /Type /Outlines /Count 0 >>`);

  // 3: Pages tree
  const kids = pageObjectIds.map((id) => `${id} 0 R`).join(" ");
  recordObj(3, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>`);

  // 4: Font
  recordObj(4, `<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>`);

  // Pages and Contents
  for (let i = 0; i < pages.length; i++) {
    const pageId = pageObjectIds[i];
    const contentId = contentObjectIds[i];
    const rawText = pages[i]
      .replace(/\r/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

    const lines = rawText.split("\n").slice(0, 42); // Fits on one letter page

    let streamBody = "BT\n/F1 10 Tf\n50 750 Td\n14 TL\n";
    for (const line of lines) {
      streamBody += `(${line}) '\n`;
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

export function buildLargeContractFixture() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const pages = generateContractText();
  const fullText = pages.join("\n\f\n");

  const txtPath = path.join(OUTPUT_DIR, "large-contract-150-pages.txt");
  fs.writeFileSync(txtPath, fullText, "utf8");

  const pdfPath = path.join(OUTPUT_DIR, "large-contract-150-pages.pdf");
  const pdfBuffer = generatePdfBinary(pages);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const stats = {
    pages: pages.length,
    totalCharacters: fullText.length,
    txtPath,
    pdfPath,
    pdfSizeBytes: pdfBuffer.length,
  };

  return stats;
}

if (process.argv[1]?.endsWith("generate-large-contract.mjs")) {
  const result = buildLargeContractFixture();
  process.stdout.write(
    `Created realistic ${result.pages}-page contract fixture:\n` +
      `- Text: ${result.txtPath} (${result.totalCharacters.toLocaleString()} characters)\n` +
      `- PDF:  ${result.pdfPath} (${(result.pdfSizeBytes / 1024).toFixed(1)} KB)\n`
  );
}
