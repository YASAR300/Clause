import { handleUpload } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
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
      { error: error.message || "Failed to generate upload credentials" },
      { status: 400 }
    );
  }
}
