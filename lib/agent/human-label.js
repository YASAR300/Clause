/**
 * Generates user-friendly, plain-language activity labels and summaries
 * for agent tool executions.
 */

export function generateHumanLabel(toolName, args = {}, docMap = new Map()) {
  const docId = args.documentId;
  const doc = docId ? docMap.get(docId) : null;
  const docName = doc?.name ? `"${doc.name}"` : doc?.label ? `[${doc.label}]` : "document";

  switch (toolName) {
    case "search_document": {
      const q = args.query ? `"${args.query}"` : "keywords";
      return `Searching for ${q} in ${docName}`;
    }
    case "list_clauses": {
      return `Listing clauses in ${docName}`;
    }
    case "get_section": {
      const ref = args.number
        ? `Clause ${args.number}`
        : args.heading
        ? `"${args.heading}"`
        : "clause section";
      return `Reading ${ref} in ${docName}`;
    }
    case "get_pages": {
      const from = args.from ?? 1;
      const to = args.to ?? from;
      const range = from === to ? `page ${from}` : `pages ${from}-${to}`;
      return `Reading ${range} in ${docName}`;
    }
    case "list_documents": {
      return "Reviewing attached conversation contracts";
    }
    default: {
      return `Running ${toolName.replace(/_/g, " ")}`;
    }
  }
}

export function summarizeResult(toolName, result, ok = true) {
  if (!ok) {
    return result?.error || "Tool execution failed";
  }

  if (!result) return "Completed with no data";

  switch (toolName) {
    case "search_document": {
      const count = result.matches?.length ?? 0;
      return count === 0
        ? "No matching excerpts found"
        : `Found ${count} relevant excerpt${count === 1 ? "" : "s"}`;
    }
    case "list_clauses": {
      const count = result.clauses?.length ?? 0;
      return `Cataloged ${count} clause heading${count === 1 ? "" : "s"}`;
    }
    case "get_section": {
      if (result.notFound) return "Clause heading not found";
      const len = result.text?.length ?? 0;
      const trunc = result.truncated ? " (truncated)" : "";
      return `Retrieved ${len} characters${trunc}`;
    }
    case "get_pages": {
      const count = result.pages?.length ?? 0;
      return `Read ${count} page${count === 1 ? "" : "s"}`;
    }
    case "list_documents": {
      const count = result.documents?.length ?? 0;
      return `${count} contract${count === 1 ? "" : "s"} indexed`;
    }
    default: {
      return "Completed successfully";
    }
  }
}
