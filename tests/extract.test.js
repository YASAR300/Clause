import { describe, it, expect } from "vitest";
import { sniffFileType, validateExtension } from "@/lib/extract/sniff";
import { extractPdf } from "@/lib/extract/pdf";
import {
  generateValidPdf,
  generateScannedPdf,
  generateFakeExe,
  generateValidDocx,
} from "./fixtures/generate";

describe("Magic-Byte Sniffing and Extension Validation", () => {
  it("accepts a real PDF buffer beginning with %PDF-", () => {
    const pdfBuf = generateValidPdf();
    const result = sniffFileType(pdfBuf, "contract.pdf");
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe("pdf");
  });

  it("accepts a real DOCX buffer containing PK and word/document.xml", () => {
    const docxBuf = generateValidDocx();
    const result = sniffFileType(docxBuf, "agreement.docx");
    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe("docx");
  });

  it("rejects an executable renamed to .pdf", () => {
    const exeBuf = generateFakeExe();
    const result = sniffFileType(exeBuf, "malicious.pdf");
    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe("exe");
    expect(result.reason).toContain("Executable binary detected");
  });

  it("rejects an empty 0-byte file with specific message", () => {
    const emptyBuf = Buffer.alloc(0);
    const result = sniffFileType(emptyBuf, "empty.pdf");
    expect(result.valid).toBe(false);
    expect(result.detectedType).toBe("empty");
    expect(result.reason).toContain("empty (0 bytes)");
  });

  it("rejects unsupported extensions on client/server validation", () => {
    const res = validateExtension("spreadsheet.xlsx");
    expect(res.valid).toBe(false);
    expect(res.error).toBe(`"spreadsheet.xlsx" isn't supported. Upload a PDF or DOCX file.`);
  });
});

describe("Scanned PDF Detection", () => {
  it("flags an image-only PDF with zero text as scanned (NEEDS_OCR)", async () => {
    const scannedBuf = generateScannedPdf();
    const extracted = await extractPdf(scannedBuf);

    expect(extracted.numPages).toBe(1);
    expect(extracted.charCount).toBe(0);
    expect(extracted.isScanned).toBe(true);
  });
});

describe("Mathematical Character Offset Invariant", () => {
  it("guarantees fullText.slice(startOffset, endOffset) === page.text for every page", async () => {
    const textLines = [
      "Master Services Agreement Section 1. Definitions and Term.",
      "Section 2. Representations, Warranties, and Mutual Covenants.",
      "Section 3. Limitation of Liability and Indemnification Obligations.",
    ];

    const pdfBuf = generateValidPdf(textLines);
    const extracted = await extractPdf(pdfBuf);

    expect(extracted.pages.length).toBeGreaterThan(0);
    expect(extracted.fullText.length).toBeGreaterThan(0);

    for (const page of extracted.pages) {
      const sliced = extracted.fullText.slice(page.startOffset, page.endOffset);
      expect(sliced).toBe(page.text);
      expect(page.endOffset).toBeGreaterThanOrEqual(page.startOffset);
    }
  });
});
