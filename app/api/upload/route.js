import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { checkIpRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkIpRateLimit(ip, { max: 15, windowMs: 60 * 1000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many upload attempts. Please wait a minute before uploading more files.",
          },
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const ext = pathname
          .slice(((pathname.lastIndexOf(".") - 1) >>> 0) + 2)
          .toLowerCase();

        if (ext !== "pdf" && ext !== "docx") {
          throw new Error(
            `"${pathname}" isn't supported. Upload a PDF or DOCX file.`
          );
        }

        return {
          allowedContentTypes: [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
        };
      },
      onUploadCompleted: async () => {
        // Handled via /api/upload/complete
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_AUTH_FAILED",
          message: error.message || "Failed to generate upload credentials",
        },
      },
      { status: 400 }
    );
  }
}
