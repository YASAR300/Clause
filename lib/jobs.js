import { db } from "@/lib/db";

const handlers = new Map();

export function registerJobHandler(type, handler) {
  handlers.set(type, handler);
}

/**
 * Claim the next available QUEUED job atomically using FOR UPDATE SKIP LOCKED
 */
export async function claimNextJob() {
  try {
    const rows = await db.$queryRaw`
      UPDATE "Job"
      SET "status" = 'RUNNING'::"JobStatus",
          "lockedAt" = NOW(),
          "attempts" = "attempts" + 1,
          "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id" FROM "Job"
        WHERE "status" = 'QUEUED'::"JobStatus" AND "attempts" < 3
        ORDER BY "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "type", "payload", "attempts", "status"
    `;

    return rows?.[0] || null;
  } catch (error) {
    console.error("Error claiming job:", error);
    return null;
  }
}

/**
 * Mark a job complete
 */
export async function completeJob(id) {
  return db.job.update({
    where: { id },
    data: {
      status: "DONE",
      lockedAt: null,
    },
  });
}

/**
 * Mark a job failed
 */
export async function failJob(id, errorMessage) {
  return db.job.update({
    where: { id },
    data: {
      status: "FAILED",
      lastError: errorMessage || "Unknown job failure",
      lockedAt: null,
    },
  });
}

/**
 * Re-queue any job running with lockedAt older than 3 minutes
 */
export async function sweepStaleJobs() {
  try {
    // 1. Re-queue stale running jobs under 3 attempts
    const recovered = await db.$executeRaw`
      UPDATE "Job"
      SET "status" = 'QUEUED'::"JobStatus",
          "lockedAt" = NULL,
          "updatedAt" = NOW()
      WHERE "status" = 'RUNNING'::"JobStatus"
        AND "lockedAt" < NOW() - INTERVAL '3 minutes'
        AND "attempts" < 3
    `;

    // 2. Mark permanently failed jobs that exceeded 3 attempts
    const failed = await db.$executeRaw`
      UPDATE "Job"
      SET "status" = 'FAILED'::"JobStatus",
          "lastError" = 'Job timed out after maximum retry attempts',
          "lockedAt" = NULL,
          "updatedAt" = NOW()
      WHERE "status" = 'RUNNING'::"JobStatus"
        AND "lockedAt" < NOW() - INTERVAL '3 minutes'
        AND "attempts" >= 3
    `;

    return { recovered, failed };
  } catch (error) {
    console.error("Error sweeping stale jobs:", error);
    return { recovered: 0, failed: 0, error: error.message };
  }
}

/**
 * Run the next available job in the queue
 */
export async function processNextJob() {
  const job = await claimNextJob();
  if (!job) return null;

  const handler = handlers.get(job.type);
  if (!handler) {
    await failJob(job.id, `No handler registered for job type: ${job.type}`);
    return { jobId: job.id, status: "FAILED", error: "No handler registered" };
  }

  try {
    const payload = typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload;
    const result = await handler(payload);
    await completeJob(job.id);
    return { jobId: job.id, status: "DONE", result };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await failJob(job.id, error.message || "Execution error");
    return { jobId: job.id, status: "FAILED", error: error.message };
  }
}

/**
 * Run all queued jobs until queue is empty
 */
export async function processQueue() {
  let processed = 0;
  let result;
  while ((result = await processNextJob()) !== null) {
    processed++;
  }
  return processed;
}
