import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name is too long"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Please provide a valid email address"),
  message: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(5, "Message must be at least 5 characters")
    .max(2000, "Message is too long"),
});

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkIpRateLimit(ip, { max: 5, windowMs: 10 * 60 * 1000 });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many messages sent. Please wait a few minutes before trying again.",
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const result = contactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.errors[0]?.message || "Invalid contact form submission",
          },
        },
        { status: 400 }
      );
    }

    const { name, email, message } = result.data;

    await db.contactMessage.create({
      data: {
        name,
        email,
        message,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Thank you for reaching out. We will get back to you shortly.",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to send message. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
