/**
 * Minimal in-memory fixture generators for PDF and DOCX testing.
 * Creates valid binary structures without requiring committed multi-megabyte files.
 */

import zlib from "node:zlib";

/**
 * Generate a valid minimal PDF buffer containing specified text lines
 */
export function generateValidPdf(textLines = ["This Master Services Agreement is entered into by and between Clause Corp and Client."]) {
  const contentStream = textLines
    .map((line, idx) => `BT /F1 12 Tf 72 ${700 - idx * 20} Td (${line.replace(/[()]/g, "")}) Tj ET`)
    .join("\n");

  const streamBytes = Buffer.from(contentStream, "ascii");
  const streamLen = streamBytes.length;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${contentStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;

  return Buffer.from(pdf, "ascii");
}

/**
 * Generate a valid image-only / scanned PDF with zero selectable text
 */
export function generateScannedPdf() {
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer
<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`;

  return Buffer.from(pdf, "ascii");
}

/**
 * Generate a fake executable disguised as PDF
 */
export function generateFakeExe() {
  // MZ header followed by random executable byte padding
  const buf = Buffer.alloc(1024);
  buf[0] = 0x4d; // 'M'
  buf[1] = 0x5a; // 'Z'
  buf.write("This program cannot be run in DOS mode.", 64, "ascii");
  return buf;
}

/**
 * Generate a valid minimal DOCX buffer with a word/document.xml entry
 */
export function generateValidDocx(clauseText = "Clause 1. All liabilities are limited to fees paid.") {
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${clauseText}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const xmlBuffer = Buffer.from(docXml, "utf8");
  const filename = Buffer.from("word/document.xml", "ascii");

  // Construct a minimal uncompressed ZIP local file header
  // Local file header signature: 0x04034b50 (PK\x03\x04)
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  header.writeUInt16LE(20, 4); // version needed to extract
  header.writeUInt16LE(0, 6); // general purpose bit flag
  header.writeUInt16LE(0, 8); // compression method (0 = stored)
  header.writeUInt16LE(0, 10); // file last mod time
  header.writeUInt16LE(0, 12); // file last mod date
  header.writeUInt32LE(0, 14); // crc-32 (0 for simple sniff test)
  header.writeUInt32LE(xmlBuffer.length, 18); // compressed size
  header.writeUInt32LE(xmlBuffer.length, 22); // uncompressed size
  header.writeUInt16LE(filename.length, 26); // file name length
  header.writeUInt16LE(0, 28); // extra field length

  return Buffer.concat([header, filename, xmlBuffer]);
}
