import { describe, it, expect } from "vitest";
import { getDocumentAuditQueries } from "@/lib/ai/suggestions";

describe("Dynamic Audit Suggestions Engine", () => {
  it("detects job description and hiring documents", () => {
    const doc = {
      name: "TechSol_Full_Stack_Intern_JD.pdf",
      fullText:
        "Job description for full stack engineering intern. Responsibilities include building react components, nodejs apis, and testing.",
    };

    const queries = getDocumentAuditQueries(doc);
    expect(queries).toHaveLength(4);
    expect(queries[0].title).toBe("Role & Key Responsibilities");
    expect(queries[1].title).toBe("Tech Stack & Required Skills");
    expect(queries[2].title).toBe("Compensation & Work Mode");
    expect(queries[3].title).toBe("Eligibility & Selection");
    expect(queries[0].prompt.length).toBeGreaterThan(10);
  });

  it("detects NDA and confidentiality agreements", () => {
    const doc = {
      name: "Mutual_Non_Disclosure_Agreement.pdf",
      fullText:
        "This Non-Disclosure Agreement defines Confidential Information between Disclosing Party and Receiving Party. Obligations survive for 3 years.",
    };

    const queries = getDocumentAuditQueries(doc);
    expect(queries).toHaveLength(4);
    expect(queries[0].title).toBe("Confidentiality Definition");
    expect(queries[1].title).toBe("Standard Exclusions");
    expect(queries[2].title).toBe("Survival & Term Duration");
    expect(queries[3].title).toBe("Return or Destruction");
  });

  it("detects SaaS and SLA subscription agreements", () => {
    const doc = {
      name: "Cloud_SaaS_Service_Agreement.pdf",
      fullText:
        "Software license subscription agreement. Service level agreement guarantees 99.9% uptime. Customer data ownership remains with customer.",
    };

    const queries = getDocumentAuditQueries(doc);
    expect(queries).toHaveLength(4);
    expect(queries[0].title).toBe("Service Level & Uptime (SLA)");
    expect(queries[1].title).toBe("License Scope & Restrictions");
    expect(queries[2].title).toBe("Customer Data & Security");
    expect(queries[3].title).toBe("Renewal & Fee Escalation");
  });

  it("detects commercial contract with IP, Indemnity, and Liability", () => {
    const doc = {
      name: "Master_Services_Agreement_2025.pdf",
      fullText:
        "Contractor indemnifies company against third party claims. Intellectual property and work product shall be owned exclusively by Client. Aggregate liability is capped at 12 months fees.",
    };

    const queries = getDocumentAuditQueries(doc);
    expect(queries).toHaveLength(4);
    const titles = queries.map((q) => q.title);
    expect(titles).toContain("Intellectual Property Ownership");
    expect(titles).toContain("Indemnification Obligations");
    expect(titles).toContain("Limitation of Liability");
  });

  it("handles empty or missing document gracefully with sensible fallbacks", () => {
    const queriesEmpty = getDocumentAuditQueries([]);
    expect(queriesEmpty).toHaveLength(4);
    expect(queriesEmpty[0].title).toBe("Core Contract Scope");

    const queriesNull = getDocumentAuditQueries(null);
    expect(queriesNull).toHaveLength(4);
    expect(queriesNull[0].title).toBe("Core Contract Scope");
  });
});
