import { z } from "zod";
import { db } from "@/lib/db";
import { searchChunks } from "@/lib/retrieval/search";
import { segmentDocument } from "@/lib/compare/segment";

export const MAX_SECTION_CHARS = 4000;
export const MAX_PAGE_RANGE = 5;
export const MAX_SEARCH_LIMIT = 8;

/**
 * Normalizes input document identifier (UUID or short label like D1, D2)
 * to a verified Document record attached to the current conversation.
 */
export function resolveConversationDocument(identifier, context) {
  if (!identifier || typeof identifier !== "string") {
    return null;
  }

  const clean = identifier.trim().toLowerCase();
  const docs = context?.conversationDocuments || [];

  for (const doc of docs) {
    if (doc.id.toLowerCase() === clean) return doc;
    if (doc.label && doc.label.toLowerCase() === clean) return doc;
    if (doc.name && doc.name.toLowerCase() === clean) return doc;
  }

  return null;
}

// 1. list_clauses
export const listClausesSchema = z.object({
  documentId: z.string().min(1, "Document identifier (id or label e.g. D1) is required"),
});

export async function handleListClauses(args, context) {
  const doc = resolveConversationDocument(args.documentId, context);
  if (!doc) {
    return {
      error: "invalid_document_id",
      message: `Document "${args.documentId}" is not attached to this conversation.`,
    };
  }

  // 1. Fetch chunks with headings
  const chunks = await db.chunk.findMany({
    where: {
      documentId: doc.id,
      heading: { not: null },
    },
    orderBy: { ordinal: "asc" },
    select: {
      id: true,
      heading: true,
      pageStart: true,
      pageEnd: true,
    },
  });

  let clauses = chunks
    .filter((c) => c.heading && c.heading.trim().length > 0)
    .map((c) => ({
      heading: c.heading.trim(),
      pageRange: [c.pageStart, c.pageEnd],
      chunkId: c.id,
    }));

  // Fallback: If chunks didn't record headings, segment document text
  if (clauses.length === 0 && doc.fullText) {
    const units = segmentDocument(doc.fullText);
    clauses = units.map((u) => ({
      heading: u.heading || (u.clauseNumber ? `Clause ${u.clauseNumber}` : "Section"),
      pageRange: [1, 1],
    }));
  }

  // Record tracked section in agent context
  context?.recordDocumentRead?.(doc.id, {
    mode: "list_clauses",
    clauseCount: clauses.length,
  });

  return {
    documentId: doc.id,
    documentLabel: doc.label || "D1",
    documentName: doc.name,
    totalClauses: clauses.length,
    clauses: clauses.slice(0, 80),
  };
}

// 2. search_document
export const searchDocumentSchema = z.object({
  documentId: z.string().min(1, "Document identifier (id or label e.g. D1) is required"),
  query: z.string().min(1, "Search query text is required"),
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).optional().default(5),
});

export async function handleSearchDocument(args, context) {
  const doc = resolveConversationDocument(args.documentId, context);
  if (!doc) {
    return {
      error: "invalid_document_id",
      message: `Document "${args.documentId}" is not attached to this conversation.`,
    };
  }

  const effectiveLimit = Math.min(Math.max(1, args.limit || 5), MAX_SEARCH_LIMIT);
  const rawChunks = await searchChunks({
    documentId: doc.id,
    query: args.query,
    limit: effectiveLimit,
  });

  const matches = rawChunks.map((c) => {
    // Generate compact snippet around match or start of chunk
    const snippet = (c.text || "").slice(0, 260).replace(/\s+/g, " ").trim();
    return {
      chunkId: c.id,
      heading: c.heading || null,
      pageRange: [c.pageStart || 1, c.pageEnd || 1],
      snippet: snippet.length >= 260 ? `${snippet}...` : snippet,
    };
  });

  // Track search in context
  context?.recordDocumentRead?.(doc.id, {
    mode: "search",
    query: args.query,
    chunkIds: matches.map((m) => m.chunkId),
    pageRanges: matches.map((m) => m.pageRange),
  });

  return {
    documentId: doc.id,
    documentLabel: doc.label || "D1",
    query: args.query,
    matches,
  };
}

// 3. get_section
export const getSectionSchema = z.object({
  documentId: z.string().min(1, "Document identifier is required"),
  number: z.string().optional(),
  heading: z.string().optional(),
}).refine((data) => data.number || data.heading, {
  message: "Either 'number' or 'heading' must be provided",
});

export async function handleGetSection(args, context) {
  const doc = resolveConversationDocument(args.documentId, context);
  if (!doc) {
    return {
      error: "invalid_document_id",
      message: `Document "${args.documentId}" is not attached to this conversation.`,
    };
  }

  const term = (args.number || args.heading || "").trim().toLowerCase();

  // 1. Try finding chunk matching heading
  const chunks = await db.chunk.findMany({
    where: { documentId: doc.id },
    orderBy: { ordinal: "asc" },
  });

  let matchedChunks = chunks.filter(
    (c) => c.heading && c.heading.toLowerCase().includes(term)
  );

  // If no heading match, try matching text beginning
  if (matchedChunks.length === 0) {
    matchedChunks = chunks.filter((c) =>
      c.text && c.text.toLowerCase().includes(term)
    );
  }

  if (matchedChunks.length === 0) {
    return {
      documentId: doc.id,
      notFound: true,
      message: `No section matching "${term}" was found in ${doc.name}.`,
    };
  }

  // Combine text from matched chunks
  let fullSectionText = matchedChunks.map((c) => c.text).join("\n\n");
  const isTruncated = fullSectionText.length > MAX_SECTION_CHARS;
  if (isTruncated) {
    fullSectionText = `${fullSectionText.slice(0, MAX_SECTION_CHARS)}... [TRUNCATED: Exceeded ${MAX_SECTION_CHARS} character budget]`;
  }

  const pageStart = matchedChunks[0].pageStart || 1;
  const pageEnd = matchedChunks[matchedChunks.length - 1].pageEnd || pageStart;

  // Track read section in agent context
  context?.recordDocumentRead?.(doc.id, {
    mode: "section",
    heading: matchedChunks[0].heading || term,
    pageRanges: [[pageStart, pageEnd]],
    fullTextChunk: fullSectionText,
  });

  return {
    documentId: doc.id,
    documentLabel: doc.label || "D1",
    heading: matchedChunks[0].heading || term,
    pageRange: [pageStart, pageEnd],
    truncated: isTruncated,
    text: fullSectionText,
  };
}

// 4. get_pages
export const getPagesSchema = z.object({
  documentId: z.string().min(1, "Document identifier is required"),
  from: z.coerce.number().int().min(1, "from page must be >= 1"),
  to: z.coerce.number().int().min(1, "to page must be >= 1"),
});

export async function handleGetPages(args, context) {
  const doc = resolveConversationDocument(args.documentId, context);
  if (!doc) {
    return {
      error: "invalid_document_id",
      message: `Document "${args.documentId}" is not attached to this conversation.`,
    };
  }

  let from = Math.max(1, args.from);
  let to = Math.max(1, args.to);
  if (to < from) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  // Max 5 pages per call
  if (to - from + 1 > MAX_PAGE_RANGE) {
    to = from + MAX_PAGE_RANGE - 1;
  }

  const pages = await db.page.findMany({
    where: {
      documentId: doc.id,
      pageNumber: { gte: from, lte: to },
    },
    orderBy: { pageNumber: "asc" },
    select: { pageNumber: true, text: true },
  });

  // Track pages read in agent context
  context?.recordDocumentRead?.(doc.id, {
    mode: "pages",
    pageRanges: [[from, to]],
    fullTextChunk: pages.map((p) => p.text).join("\n"),
  });

  return {
    documentId: doc.id,
    documentLabel: doc.label || "D1",
    from,
    to,
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text || "",
    })),
  };
}

// 5. list_documents
export const listDocumentsSchema = z.object({}).optional();

export async function handleListDocuments(args, context) {
  const docs = context?.conversationDocuments || [];

  return {
    documents: docs.map((d) => ({
      id: d.id,
      label: d.label || "D1",
      name: d.name,
      pageCount: d.pageCount || 1,
      coverageNotes: d.fullText
        ? `${d.fullText.length} characters indexed`
        : "Extracting or partial",
    })),
  };
}

/**
 * Tool registry metadata for OpenAI function calling
 */
export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_clauses",
      description: "Returns all detected headings, clause numbers, and page ranges for a contract.",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "Document ID or label (e.g. D1, D2).",
          },
        },
        required: ["documentId"],
      },
    },
    schema: listClausesSchema,
    handler: handleListClauses,
  },
  {
    type: "function",
    function: {
      name: "search_document",
      description: "Performs full-text keyword search across a contract and returns matching excerpts with headings and page numbers.",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "Document ID or label (e.g. D1, D2).",
          },
          query: {
            type: "string",
            description: "Keyword or short phrase to search for.",
          },
          limit: {
            type: "integer",
            description: "Maximum number of excerpts to return (1 to 8, defaults to 5).",
          },
        },
        required: ["documentId", "query"],
      },
    },
    schema: searchDocumentSchema,
    handler: handleSearchDocument,
  },
  {
    type: "function",
    function: {
      name: "get_section",
      description: "Retrieves the complete text of a specific clause or section by heading or number.",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "Document ID or label (e.g. D1, D2).",
          },
          number: {
            type: "string",
            description: "Clause number (e.g. '12.3', '4').",
          },
          heading: {
            type: "string",
            description: "Clause title or heading (e.g. 'Limitation of Liability', 'Termination').",
          },
        },
        required: ["documentId"],
      },
    },
    schema: getSectionSchema,
    handler: handleGetSection,
  },
  {
    type: "function",
    function: {
      name: "get_pages",
      description: "Retrieves the raw text of a page range from a contract (maximum 5 pages per call).",
      parameters: {
        type: "object",
        properties: {
          documentId: {
            type: "string",
            description: "Document ID or label (e.g. D1, D2).",
          },
          from: {
            type: "integer",
            description: "1-based starting page number.",
          },
          to: {
            type: "integer",
            description: "1-based ending page number.",
          },
        },
        required: ["documentId", "from", "to"],
      },
    },
    schema: getPagesSchema,
    handler: handleGetPages,
  },
  {
    type: "function",
    function: {
      name: "list_documents",
      description: "Lists all contracts attached to this conversation with their IDs, labels (D1, D2), and page counts.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    schema: listDocumentsSchema,
    handler: handleListDocuments,
  },
];
