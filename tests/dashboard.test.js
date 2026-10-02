import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/dashboard/route";
import { POST } from "@/app/api/sample/route";

// Mock DB so no DATABASE_URL needed
vi.mock("@/lib/db", () => ({
  db: {
    document: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([
        { id: "doc-1", name: "Contract.pdf", status: "READY", progress: 100, sizeBytes: 50000, pageCount: 10, createdAt: new Date() },
      ]),
      create: vi.fn().mockResolvedValue({ id: "mock-doc-id", name: "Master Services Agreement v1.pdf" }),
    },
    message: { count: vi.fn().mockResolvedValue(12) },
    citation: { count: vi.fn().mockResolvedValue(8) },
    comparison: { count: vi.fn().mockResolvedValue(2) },
    conversation: {
      findMany: vi.fn().mockResolvedValue([
        { id: "conv-1", title: "Chat 1", updatedAt: new Date(), documents: [], messages: [] },
      ]),
    },
    documentPage: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
    chunk: { createMany: vi.fn().mockResolvedValue({ count: 5 }) },
  },
}));

// Mock PDF extractor (needs Node 22 / real PDF file — skip in CI)
vi.mock("@/lib/extract/pdf", () => ({
  extractPdf: vi.fn().mockResolvedValue({
    numPages: 2,
    pages: [
      { pageNumber: 1, text: "Page one content.", startOffset: 0, endOffset: 17 },
      { pageNumber: 2, text: "Page two content.", startOffset: 18, endOffset: 35 },
    ],
    fullText: "Page one content.\fPage two content.",
    charCount: 35,
    emptyPages: [],
    isScanned: false,
  }),
}));

// Mock chunker
vi.mock("@/lib/chunking", () => ({
  chunkContract: vi.fn().mockReturnValue([
    { documentId: "mock-doc-id", chunkIndex: 0, content: "Page one content.", startOffset: 0, endOffset: 17 },
  ]),
}));

// Mock fs so sample route doesn't need the actual file on disk
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from("%PDF-1.4 mock")),
  },
}));

describe("Dashboard & Sample APIs", () => {
  it("ingests a sample contract through POST /api/sample", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.documentId).toBeDefined();
  }, 30000);

  it("computes accurate stats and returns activity feed in GET /api/dashboard", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.stats).toBeDefined();
    expect(data.stats.documentsReady).toBeGreaterThanOrEqual(1);
    expect(data.recentDocuments).toBeDefined();
    expect(data.activityFeed).toBeDefined();
  });
});
