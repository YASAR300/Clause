/**
 * Dynamic Contract Suggestion Engine.
 * Analyzes document name, text content, and extracted headings to generate
 * 4 context-aware, document-specific audit queries instead of generic hardcoded cards.
 */

import {
  Shield,
  CreditCard,
  Scale,
  Lock,
  Briefcase,
  Wrench,
  GraduationCap,
  Building,
  Cpu,
  FileCheck,
  Search,
  AlertCircle,
  HelpCircle,
  FileText,
} from "lucide-react";

/**
 * Returns 4 dynamic audit query cards tailored to the document's actual content.
 *
 * @param {object|Array} docOrDocs - Single document object or array of documents
 * @returns {Array<{
 *   icon: any,
 *   title: string,
 *   description: string,
 *   prompt: string,
 *   tag: string
 * }>}
 */
export function getDocumentAuditQueries(docOrDocs) {
  const docs = Array.isArray(docOrDocs) ? docOrDocs : docOrDocs ? [docOrDocs] : [];
  if (!docs.length) {
    return getDefaultFallbackQueries();
  }

  // Concatenate names and sample text from the document(s)
  const combinedNames = docs.map((d) => d.name || "").join(" ").toLowerCase();
  const sampleText = docs
    .map((d) => (d.fullText ? d.fullText.slice(0, 30000) : ""))
    .join(" ")
    .toLowerCase();

  const fullCorpus = `${combinedNames} ${sampleText}`;

  // 1. Check for Job Description / Internship / Hiring Assignment / JD
  const isJobOrHiring =
    /intern|job description|\bjd\b|hiring|assignment|interview|candidate|stipend|recruitment|responsibilities|qualification/i.test(
      combinedNames
    ) ||
    (/candidate|responsibilities|qualifications|stipend|full-time|skills required/i.test(
      sampleText
    ) &&
      !/indemnif|master services agreement/i.test(combinedNames));

  if (isJobOrHiring) {
    return [
      {
        icon: Briefcase,
        title: "Role & Key Responsibilities",
        description: "Primary duties, project deliverables, and expected day-to-day contributions",
        prompt: "What are the primary responsibilities, deliverables, and day-to-day duties expected for this role?",
        tag: "Responsibilities found in text",
      },
      {
        icon: Wrench,
        title: "Tech Stack & Required Skills",
        description: "Programming languages, frameworks, databases, and tooling evaluated",
        prompt: "What technical skills, programming languages, and tools or frameworks are required or preferred?",
        tag: "Technical requirements",
      },
      {
        icon: CreditCard,
        title: "Compensation & Work Mode",
        description: "Stipend, salary, perks, working hours, and remote or hybrid policy",
        prompt: "What are the details regarding compensation, stipend, duration, and work location or remote arrangements?",
        tag: "Terms & Compensation",
      },
      {
        icon: GraduationCap,
        title: "Eligibility & Selection",
        description: "Prerequisites, academic criteria, and evaluation/submission guidelines",
        prompt: "What are the candidate eligibility criteria, prerequisites, and evaluation steps mentioned in this document?",
        tag: "Evaluation Criteria",
      },
    ];
  }

  // 2. Check for Non-Disclosure Agreement (NDA) / Confidentiality Agreement
  const isNda =
    /non-disclosure|\bnda\b|confidentiality agreement/i.test(combinedNames) ||
    (/confidential information/i.test(sampleText) &&
      /disclosing party|receiving party/i.test(sampleText) &&
      !/license fee|purchase order|work order/i.test(sampleText));

  if (isNda) {
    return [
      {
        icon: Lock,
        title: "Confidentiality Definition",
        description: "What proprietary materials, oral disclosures, and data are protected",
        prompt: "How is Confidential Information defined and what specific materials or disclosures are protected?",
        tag: "Scope of Protection",
      },
      {
        icon: Shield,
        title: "Standard Exclusions",
        description: "Carve-outs where secrecy restrictions do not apply (prior knowledge, public domain)",
        prompt: "What standard exclusions to confidentiality are recognized (e.g. public knowledge, court orders)?",
        tag: "Permitted Disclosures",
      },
      {
        icon: Scale,
        title: "Survival & Term Duration",
        description: "How long secrecy obligations endure after contract expiration",
        prompt: "What is the duration of the confidentiality obligations and how long do they survive termination?",
        tag: "Survival Clause",
      },
      {
        icon: FileCheck,
        title: "Return or Destruction",
        description: "Obligations to return or certify destruction of proprietary documents",
        prompt: "What are the requirements and timelines for returning or destroying confidential materials upon request?",
        tag: "Data Disposal",
      },
    ];
  }

  // 3. Check for Software / SaaS / SLA Subscription Agreement
  const isSaasOrSoftware =
    /software license|saas|subscription agreement|\bsla\b|cloud service/i.test(
      combinedNames
    ) ||
    (/uptime|service level|cloud service|subscription fee/i.test(sampleText) &&
      /license/i.test(sampleText));

  if (isSaasOrSoftware) {
    return [
      {
        icon: Cpu,
        title: "Service Level & Uptime (SLA)",
        description: "Availability guarantee, downtime exclusions, and service credit remedies",
        prompt: "What service availability percentage or SLAs are guaranteed, and what credits apply for downtime?",
        tag: "Uptime & Credits",
      },
      {
        icon: FileText,
        title: "License Scope & Restrictions",
        description: "User seat limits, permitted deployment, and reverse engineering prohibitions",
        prompt: "What is the scope of the license granted and what usage restrictions or seat limits are enforced?",
        tag: "Usage Rights",
      },
      {
        icon: Lock,
        title: "Customer Data & Security",
        description: "Ownership of customer content, encryption standards, and breach notifications",
        prompt: "Who owns customer data uploaded to the service and what security safeguards are contractually mandated?",
        tag: "Data Ownership",
      },
      {
        icon: CreditCard,
        title: "Renewal & Fee Escalation",
        description: "Auto-renewal triggers, price increase limitations, and cancellation notice",
        prompt: "How does subscription auto-renewal work and what notice is required to cancel or prevent fee increases?",
        tag: "Billing & Renewal",
      },
    ];
  }

  // 4. Check for Real Estate / Lease / Tenancy Agreement
  const isLease =
    /lease|tenancy|landlord|tenant|premises|rental agreement/i.test(combinedNames) ||
    (/landlord/i.test(sampleText) && /tenant/i.test(sampleText) && /premises/i.test(sampleText));

  if (isLease) {
    return [
      {
        icon: Building,
        title: "Premises & Lease Term",
        description: "Demised premises description, commencement date, and extension options",
        prompt: "What is the exact lease term, commencement date, and renewal or extension options for the premises?",
        tag: "Lease Duration",
      },
      {
        icon: CreditCard,
        title: "Rent & Security Deposit",
        description: "Base rent, escalation formula, and conditions for security deposit refund",
        prompt: "What is the monthly base rent, annual escalation percentage, and terms for security deposit return?",
        tag: "Financial Terms",
      },
      {
        icon: Wrench,
        title: "Repairs & Maintenance",
        description: "Landlord vs. tenant responsibilities for structural repairs and utilities",
        prompt: "Who is responsible for property maintenance, structural repairs, and operating expenses or utilities?",
        tag: "Upkeep & Repairs",
      },
      {
        icon: AlertCircle,
        title: "Default & Remedies",
        description: "Late rent cure periods, eviction triggers, and landlord lien rights",
        prompt: "What constitutes tenant default and what notice and cure periods apply before the landlord can terminate?",
        tag: "Default & Remedies",
      },
    ];
  }

  // 5. Dynamic Commercial Contract / MSA / General Agreement analysis:
  // Detect which specific clauses ACTUALLY exist in the document text
  const candidates = [];

  if (/intellectual property|work product|\bipr\b|proprietary rights/i.test(fullCorpus)) {
    candidates.push({
      icon: Cpu,
      title: "Intellectual Property Ownership",
      description: "Ownership of background IP versus newly created work product",
      prompt: "Who retains ownership of pre-existing IP versus newly created custom deliverables or work product?",
      tag: "IP Clause found in contract",
      weight: 10,
    });
  }

  if (/indemnif|hold harmless/i.test(fullCorpus)) {
    candidates.push({
      icon: Shield,
      title: "Indemnification Obligations",
      description: "Events and third-party claims triggering indemnification defense",
      prompt: "What specific events or third-party claims trigger indemnification obligations under this agreement?",
      tag: "Indemnity found in contract",
      weight: 9,
    });
  }

  if (/liabilit|consequential damages|aggregate liability/i.test(fullCorpus)) {
    candidates.push({
      icon: Scale,
      title: "Limitation of Liability",
      description: "Overall liability cap amount and excluded claim categories",
      prompt: "What is the aggregate limitation of liability cap and what carve-outs or exclusions apply?",
      tag: "Liability found in contract",
      weight: 8,
    });
  }

  if (/terminat|convenience|material breach/i.test(fullCorpus)) {
    candidates.push({
      icon: AlertCircle,
      title: "Termination & Cure Periods",
      description: "Termination for cause, convenience rights, and notice periods",
      prompt: "What are the provisions for termination for cause vs. convenience and what notice periods apply?",
      tag: "Termination found in contract",
      weight: 8,
    });
  }

  if (/payment|invoice|fees|billing|net 30|net 60/i.test(fullCorpus)) {
    candidates.push({
      icon: CreditCard,
      title: "Payment Terms & Invoicing",
      description: "Invoicing frequency, payment terms, and late fee penalties",
      prompt: "What are the payment terms, invoicing schedule, and late fee penalties?",
      tag: "Payment found in contract",
      weight: 7,
    });
  }

  if (/audit|inspection|books and records/i.test(fullCorpus)) {
    candidates.push({
      icon: Search,
      title: "Audit & Inspection Rights",
      description: "Rights to examine books, records, and compliance logs",
      prompt: "What rights exist to audit financial records, operational logs, or performance compliance?",
      tag: "Audit found in contract",
      weight: 6,
    });
  }

  if (/governing law|jurisdiction|arbitration|venue/i.test(fullCorpus)) {
    candidates.push({
      icon: Scale,
      title: "Governing Law & Disputes",
      description: "Applicable state laws and mandatory arbitration or venue",
      prompt: "What state or jurisdiction governs this contract and what is the designated dispute resolution forum?",
      tag: "Disputes found in contract",
      weight: 5,
    });
  }

  if (/warranty|warranties|disclaimer|as-is/i.test(fullCorpus)) {
    candidates.push({
      icon: FileCheck,
      title: "Warranties & Disclaimers",
      description: "Express performance promises and disclaimers of implied terms",
      prompt: "What express performance warranties are granted and what warranties are explicitly disclaimed?",
      tag: "Warranties found in contract",
      weight: 5,
    });
  }

  if (/force majeure|acts of god|epidemic/i.test(fullCorpus)) {
    candidates.push({
      icon: AlertCircle,
      title: "Force Majeure Delays",
      description: "Excusable non-performance triggers and notification rules",
      prompt: "What events qualify as excusable force majeure delays and what notification is required?",
      tag: "Force Majeure found in contract",
      weight: 4,
    });
  }

  if (/confidential/i.test(fullCorpus)) {
    candidates.push({
      icon: Lock,
      title: "Confidentiality Obligations",
      description: "Duty to protect proprietary data and trade secrets",
      prompt: "What are the confidentiality obligations and how long do they survive termination?",
      tag: "Confidentiality found in contract",
      weight: 4,
    });
  }

  // Sort by presence weight and select top 4
  candidates.sort((a, b) => b.weight - a.weight);

  if (candidates.length >= 4) {
    return candidates.slice(0, 4);
  }

  // If fewer than 4 matched, pad with fallback
  const fallbacks = getDefaultFallbackQueries();
  const merged = [...candidates];
  for (const fb of fallbacks) {
    if (merged.length >= 4) break;
    if (!merged.some((c) => c.title === fb.title)) {
      merged.push(fb);
    }
  }

  return merged.slice(0, 4);
}

function getDefaultFallbackQueries() {
  return [
    {
      icon: FileText,
      title: "Core Contract Scope",
      description: "Main purpose, obligations, and deliverables under this contract",
      prompt: "What is the primary purpose and scope of obligations described in this document?",
      tag: "Contract Scope",
    },
    {
      icon: Scale,
      title: "Key Terms & Liabilities",
      description: "Major liabilities, commitments, and legal obligations",
      prompt: "What are the most significant liabilities, caps, and legal obligations in this document?",
      tag: "Legal Obligations",
    },
    {
      icon: CreditCard,
      title: "Financial & Commercial Terms",
      description: "Fees, pricing structures, and payment terms",
      prompt: "What fees, pricing structures, or payment terms are established in this agreement?",
      tag: "Financial Terms",
    },
    {
      icon: AlertCircle,
      title: "Term & Termination",
      description: "Effective period, termination triggers, and notice requirements",
      prompt: "What is the effective term of this document and what are the rules for termination?",
      tag: "Duration & Ending",
    },
  ];
}
