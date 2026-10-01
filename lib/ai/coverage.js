export function createCoverageTracker(totalChunks = 0) {
  return {
    totalChunks,
    analyzedChunks: [],
    failedChunks: [],
    complete: true,
  };
}

export function recordChunkSuccess(coverage, chunkIds) {
  const ids = Array.isArray(chunkIds) ? chunkIds : [chunkIds];
  for (const id of ids) {
    if (!coverage.analyzedChunks.includes(id)) {
      coverage.analyzedChunks.push(id);
    }
  }
  if (coverage.failedChunks.length > 0) {
    coverage.complete = false;
  }
}

export function recordChunkFailure(coverage, chunkIds, error = null) {
  const ids = Array.isArray(chunkIds) ? chunkIds : [chunkIds];
  for (const id of ids) {
    if (!coverage.failedChunks.includes(id)) {
      coverage.failedChunks.push(id);
    }
  }
  coverage.complete = false;
}
