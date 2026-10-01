import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: error.message || "Database connection check failed",
        },
      },
      { status: 503 }
    );
  }
}
