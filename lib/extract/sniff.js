/**
 * Magic-byte sniffing and file integrity validation for legal contracts.
 * Only valid PDF and DOCX files are permitted.
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function sniffFileType(buffer, filename = "") {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      detectedType: "empty",
      reason: "File is empty (0 bytes).",
    };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      detectedType: "oversized",
      reason: `File size exceeds the 50MB limit (${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  // Sniff PDF: starts with %PDF- (0x25 0x50 0x44 0x46 0x2D)
  const isPdf =
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  if (isPdf) {
    return {
      valid: true,
      detectedType: "pdf",
    };
  }

  // Sniff DOCX: Zip format (0x50 0x4B 0x03 0x04) containing word/document.xml
  const isZip =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

  if (isZip) {
    // Check for word/document.xml entry in the zip directory
    const docxSignature = Buffer.from("word/document.xml");
    const containsWordDoc = buffer.indexOf(docxSignature) !== -1;

    if (containsWordDoc) {
      return {
        valid: true,
        detectedType: "docx",
      };
    }

    return {
      valid: false,
      detectedType: "zip_non_docx",
      reason: "This is a ZIP archive, but not a valid Microsoft Word (.docx) document.",
    };
  }

  // Detect executable or other known dangerous types
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return {
      valid: false,
      detectedType: "exe",
      reason: "Executable binary detected. Only PDF and DOCX files are supported.",
    };
  }

  return {
    valid: false,
    detectedType: "unknown",
    reason: `Unsupported file format. Clause only accepts valid .pdf and .docx documents.`,
  };
}

export function validateExtension(filename) {
  if (!filename) {
    return { valid: false, error: "Filename is required" };
  }
  const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  if (ext !== "pdf" && ext !== "docx") {
    return {
      valid: false,
      error: `"${filename}" isn't supported. Upload a PDF or DOCX file.`,
      ext,
    };
  }
  return { valid: true, ext };
}
