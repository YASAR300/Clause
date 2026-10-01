-- Add tsvector generated column on Chunk table for PostgreSQL full-text search
ALTER TABLE "Chunk"
ADD COLUMN "tsv" tsvector
GENERATED ALWAYS AS (
  to_tsvector('english', coalesce("heading", '') || ' ' || "text")
) STORED;

-- Create GIN index on tsvector column for accelerated full-text queries
CREATE INDEX "idx_chunks_tsv" ON "Chunk" USING GIN ("tsv");