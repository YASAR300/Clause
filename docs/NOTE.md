# Engineering Note

## How quote verification works, and where it fails

The model wraps every quote in a `<cite doc="Dx">` tag. `lib/verify/quotes.js` normalises both the document and the quote through the same pipeline — NFKC, ligature expansion, curly-to-straight quotes and dashes, soft-hyphen removal, hyphenated-word joining across line breaks, whitespace collapsing, lowercase — and builds a character-level index mapping each normalised position to its original offset. I search the normalised quote inside the normalised document and recover offsets from that index; page numbers come from a binary search on the stored page-offset table. A whitespace-stripped second pass retries when the first finds nothing. A paraphrase is never fuzzy-matched into a pass.

Failure modes: verified means the text exists verbatim, not that it supports the claim; quotes under 8 normalised characters are rejected; multi-column pages extract in scrambled order so a genuine quote can span non-adjacent characters; numbers written differently (`AED 100,000` vs `AED 100000`) are rejected rather than reconciled.

## How large documents are handled

Chunks target 3,500 characters (hard cap 5,000) with 300-character overlap on mid-clause splits and the invariant `fullText.slice(startOffset, endOffset) === chunk.text`. The strategy router picks `whole` when the document fits within 60,000 characters, `retrieval` (FTS with ILIKE fallback) for targeted questions, or `exhaustive` map-reduce at concurrency 4 for existence and list-all questions. The absence guardrail is enforced in code: `lib/retrieval/coverage.js` pattern-matches the response for phrases like "does not contain" and, if coverage is partial, prepends a deterministic notice naming which sections were read and stating that absence cannot be confirmed.

## Part C: agentic document research

I chose Option 2 because it reuses the retrieval and verification layers already built, and reliable OOXML tracked-change generation was harder to scope in the time available. The loop in `lib/agent/run.js` caps at 6 rounds, 16 total tool calls, 4 per round, and 2 minutes wall-clock. Five tools are registered: `list_clauses`, `search_document`, `get_section`, `get_pages`, `list_documents`. Arguments are Zod-validated; unknown names, invalid JSON, and bad document IDs return structured errors without crashing. Three consecutive invalid calls force a final answer. The activity timeline streams per-round and per-tool events over SSE and works. Stop aborts the `AbortSignal` through every call; partial text is saved with status `STOPPED`. The hardest part was bounding the loop against models that invent tool names or emit malformed arguments while keeping verification intact.

## What I would build next

OCR for scanned PDFs, because the extractor rejects documents below 25 average characters per page and there is no fallback. Table-aware and multi-column extraction, because `pdfjs-dist` interleaves column text and scrambles cross-column quotes. Semantic embedding search, because `websearch_to_tsquery` misses synonyms and paraphrased headings. A per-claim support check that tests whether a verified quote entails the model's conclusion, because verified currently means only that the text exists.
