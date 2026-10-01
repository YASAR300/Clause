import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const waitlistSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const result = waitlistSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid email address",
          },
        },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Check if email already on waitlist
    const existing = await db.waitlistEntry.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          alreadyExists: true,
          message: "You are already on the waitlist. We will notify you soon.",
        },
        { status: 200 }
      );
    }

    await db.waitlistEntry.create({
      data: { email },
    });

    return NextResponse.json(
      {
        ok: true,
        alreadyExists: false,
        message: "You're on the waitlist. We will reach out when Team tier opens.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Could not save your entry. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
