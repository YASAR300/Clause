import { describe, it, expect } from "vitest";
import {
  resolveConversationDocument,
  listClausesSchema,
  searchDocumentSchema,
  getSectionSchema,
  getPagesSchema,
} from "@/lib/agent/tools";
import { generateHumanLabel, summarizeResult } from "@/lib/agent/human-label";

describe("Agent Tools & Schemas", () => {
  const fakeContext = {
    conversationDocuments: [
      { id: "11111111-1111-1111-1111-111111111111", label: "D1", name: "Master Services Agreement.pdf" },
      { id: "22222222-2222-2222-2222-222222222222", label: "D2", name: "Statement of Work.pdf" },
    ],
  };

  it("resolves documents by UUID, label, or name case-insensitively", () => {
    expect(resolveConversationDocument("D1", fakeContext)?.name).toBe("Master Services Agreement.pdf");
    expect(resolveConversationDocument("d2", fakeContext)?.id).toBe("22222222-2222-2222-2222-222222222222");
    expect(resolveConversationDocument("11111111-1111-1111-1111-111111111111", fakeContext)?.label).toBe("D1");
    expect(resolveConversationDocument("nonexistent", fakeContext)).toBeNull();
  });

  it("validates schemas and clamps or rejects invalid parameters", () => {
    // Search limit
    expect(searchDocumentSchema.safeParse({ documentId: "D1", query: "termination", limit: 5 }).success).toBe(true);
    expect(searchDocumentSchema.safeParse({ documentId: "D1", query: "" }).success).toBe(false);

    // Section requires either number or heading
    expect(getSectionSchema.safeParse({ documentId: "D1", heading: "Indemnity" }).success).toBe(true);
    expect(getSectionSchema.safeParse({ documentId: "D1" }).success).toBe(false);

    // Page range
    expect(getPagesSchema.safeParse({ documentId: "D1", from: 1, to: 4 }).success).toBe(true);
    expect(getPagesSchema.safeParse({ documentId: "D1", from: -1, to: 4 }).success).toBe(false);
  });

  it("generates human-readable labels and result summaries", () => {
    const docMap = new Map([
      ["D1", { name: "Services Agreement.pdf", label: "D1" }],
    ]);

    const labelSearch = generateHumanLabel("search_document", { documentId: "D1", query: "liability cap" }, docMap);
    expect(labelSearch).toContain("liability cap");
    expect(labelSearch).toContain("Services Agreement.pdf");

    const summary = summarizeResult("search_document", { matches: [{}, {}] }, true);
    expect(summary).toBe("Found 2 relevant excerpts");
  });
});
