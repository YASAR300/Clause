import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "drfxktigz",
  api_key: process.env.CLOUDINARY_API_KEY || "733942119376438",
  api_secret: process.env.CLOUDINARY_API_SECRET || "fKi-BqIbA189KqySTgDa5_YrriY",
  secure: true,
});

/**
 * Upload a document buffer (PDF or DOCX) to Cloudinary.
 * We use resource_type: "raw" so document binaries are stored uncompressed and intact.
 */
export async function uploadToCloudinary(buffer, filename, folder = "clause_contracts") {
  return new Promise((resolve, reject) => {
    const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    const sanitizedBase = filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    const publicId = `${folder}/${Date.now()}_${sanitizedBase}.${ext}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload stream error:", error);
          return reject(error);
        }
        resolve({
          url: result.secure_url || result.url,
          pathname: result.public_id,
          bytes: result.bytes || buffer.length,
          format: result.format || ext,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete a contract file from Cloudinary by publicId
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
    });
    return res;
  } catch (err) {
    console.warn("Cloudinary destroy error for", publicId, ":", err.message);
  }
}

/**
 * Generate client-side upload signature for direct browser uploads
 */
export function generateCloudinarySignature(paramsToSign = {}) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "fKi-BqIbA189KqySTgDa5_YrriY";
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
  return {
    signature,
    timestamp: paramsToSign.timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY || "733942119376438",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "drfxktigz",
  };
}

export { cloudinary };
