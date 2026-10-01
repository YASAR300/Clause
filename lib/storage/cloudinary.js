import { v2 as cloudinary } from "cloudinary";
import zlib from "node:zlib";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "drfxktigz",
  api_key: process.env.CLOUDINARY_API_KEY || "733942119376438",
  api_secret: process.env.CLOUDINARY_API_SECRET || "fKi-BqIbA189KqySTgDa5_YrriY",
  secure: true,
});

/**
 * Upload a document buffer (PDF or DOCX) to Cloudinary.
 * We store as raw with a .bin extension so Cloudinary serves the file directly
 * without triggering Cloudinary's default account-level PDF delivery block.
 */
export async function uploadToCloudinary(buffer, filename, folder = "clause_contracts") {
  return new Promise((resolve, reject) => {
    const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
    const sanitizedBase = filename
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    // Using .bin extension allows direct public CDN fetching without ACL 401
    const publicId = `${folder}/${Date.now()}_${sanitizedBase}.bin`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        public_id: publicId,
        use_filename: false,
        unique_filename: false,
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
          format: ext,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Download a raw asset from Cloudinary using an authenticated archive URL.
 * Bypasses public delivery ACL restrictions on PDFs.
 */
export async function downloadFromCloudinaryArchive(publicId) {
  const zipUrl = cloudinary.utils.download_zip_url({
    public_ids: [publicId],
    resource_type: "raw",
  });

  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`Cloudinary archive fetch failed: ${res.statusText}`);
  }

  const zipBuf = Buffer.from(await res.arrayBuffer());

  // Locate central directory to extract the entry
  const cdSig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  const cdIdx = zipBuf.indexOf(cdSig);
  if (cdIdx === -1) {
    throw new Error("Invalid archive returned by storage");
  }

  const compMethod = zipBuf.readUInt16LE(cdIdx + 10);
  const compSize = zipBuf.readUInt32LE(cdIdx + 20);
  const localHeaderOffset = zipBuf.readUInt32LE(cdIdx + 42);

  const localNameLen = zipBuf.readUInt16LE(localHeaderOffset + 26);
  const localExtraLen = zipBuf.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;

  const compData = zipBuf.subarray(dataStart, dataStart + compSize);

  if (compMethod === 8) {
    return zlib.inflateRawSync(compData);
  }
  return compData;
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
