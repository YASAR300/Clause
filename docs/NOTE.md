# Engineering Notes

## Architecture Overview

Clause is a Next.js 14 application that ingests contract documents (PDF / DOCX), splits them into chunks, stores embeddings in Neon Postgres with pgvector, and answers questions using Gemini via streaming.

### Key design decisions

**Ingestion pipeline** (`lib/extract/pipeline.js`)
- PDF text extracted with `pdf-parse`; DOCX with `mammoth`
- Text split into ~800-token chunks with 100-token overlap
- Each chunk embedded with `text-embedding-004` and stored in `document_chunks(embedding vector(768))`
- Scanned PDFs yield < 100 characters of text and are flagged `status = 'unreadable'` without storing chunks

**Chat and retrieval** (`app/api/chat/route.js`)
- Top-8 chunks retrieved by cosine similarity for each turn
- Context budget of ~12 000 tokens; if chunks exceed the budget the excess is dropped and a coverage warning is appended to the answer
- Streaming uses Vercel AI SDK `streamText`; the client accumulates partial tokens and can abort mid-stream

**Citation verification** (`lib/verify.js`)
- Each quoted passage is normalised (collapse whitespace, strip punctuation) and fuzzy-matched against the source chunk
- Similarity >= 0.85 → Verified; below threshold → Unverified
- The inspector shows the raw chunk text alongside the cited quote so the user can judge discrepancies

**Large document handling**
- 150-page documents produce ~400+ chunks
- The retrieval window (top-8) intentionally covers only the most relevant sections
- The system prompt instructs the model to say "not found in the reviewed sections" rather than "does not exist" when confidence is low
- There is **no guarantee of full-document coverage per query**; this is a stated limitation

**Rate limiting** (`lib/rate-limit.js`)
- In-memory sliding-window limiter keyed by IP
- `/api/chat`: 20 req / min; `/api/upload`: 10 req / min
- Returns HTTP 429 with `Retry-After` header

**Background sweep** (`app/api/jobs/sweep/route.js`)
- Cron job (configured in `vercel.json`) re-queues stuck `processing` documents older than 10 minutes
- Uses `FOR UPDATE SKIP LOCKED` so concurrent invocations do not double-process

## Known Limitations

1. **Scanned PDFs** — OCR is not implemented. Documents with no selectable text are rejected.
2. **Tables and figures** — `pdf-parse` returns tables as unstructured text; complex layouts may parse poorly.
3. **Rate limiter is in-memory** — Resets on cold start; does not share state across Vercel serverless instances. A Redis-backed limiter would be needed for production-scale deployments.
4. **Embedding model dimensions** — `text-embedding-004` produces 768-d vectors. Changing the model requires re-embedding all stored chunks.
5. **Context window** — Very long answers or documents with dense cross-references may hit the 12 000-token context budget, triggering the partial-coverage warning.

## Database Schema (abbreviated)

```
documents        id, user_id, title, status, file_path, created_at
document_chunks  id, document_id, chunk_index, content, embedding vector(768)
conversations    id, document_id, title, created_at
messages         id, conversation_id, role, content, citations jsonb, created_at
```

## Environment Variables Required

```
DATABASE_URL          Neon Postgres connection string (pooled)
GEMINI_API_KEY        Google AI Studio key
NEXT_PUBLIC_APP_URL   Canonical URL for the deployment
```

See `.env.example` for the full list.
