import { NextResponse, after } from "next/server";
import { sweepStaleJobs, processNextJob } from "@/lib/jobs";

export const maxDuration = 300;

export async function GET() {
  try {
    const sweepResult = await sweepStaleJobs();

    // Kick processing for any recovered jobs
    after(async () => {
      try {
        await processNextJob();
      } catch (err) {
        console.error("Job runner error post-sweep:", err);
      }
    });

    return NextResponse.json({
      ok: true,
      sweep: sweepResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "SWEEP_FAILED", message: error.message } },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
