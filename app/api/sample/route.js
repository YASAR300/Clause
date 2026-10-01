import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SAMPLE_CONTRACT_TEXT = `MASTER SERVICES AGREEMENT

This Master Services Agreement ("Agreement") is made and entered into as of January 15, 2026 ("Effective Date"), by and between Acme Cloud Solutions Inc., a Delaware corporation ("Vendor"), and Global Dynamics Corp. ("Customer").

1. SERVICES AND WORK ORDERS
Vendor shall provide Customer with access to its proprietary cloud contract analytics platform and related professional services as specified in one or more mutually executed Order Forms or Statements of Work.

4. FEES AND PAYMENT TERMS
Customer shall pay all undisputed fees set forth in the applicable Order Form within thirty (30) days of receipt of invoice. Overdue amounts shall accrue interest at the lesser of one and one-half percent (1.5%) per month or the maximum rate permitted by law.

8. LIMITATION OF LIABILITY
8.1 Consequential Damages Waiver. NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT.
8.2 Aggregate Liability Cap. EXCEPT FOR INDEMNIFICATION OBLIGATIONS UNDER SECTION 9, LIABILITIES ARISING FROM GROSS NEGLIGENCE OR WILLFUL MISCONDUCT, OR BREACH OF CONFIDENTIALITY, EACH PARTY'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE AMOUNTS ACTUALLY PAID OR PAYABLE BY CUSTOMER UNDER THE APPLICABLE ORDER FORM IN THE TWELVE (12) MONTHS PRECEDING THE INCIDENT GIVING RISE TO LIABILITY.

9. INDEMNIFICATION
Vendor shall defend Customer and its officers, directors, and employees against any third-party claim, suit, or proceeding alleging that the Services infringe or misappropriate any patent, copyright, or trademark, and shall indemnify Customer for all damages, reasonable attorney fees, and costs finally awarded against Customer.

14. TERM AND TERMINATION
14.1 Term. This Agreement commences on the Effective Date and continues for an initial period of one (1) year.
14.2 Termination for Convenience. Either party may terminate this Agreement or any Statement of Work for convenience upon sixty (60) days prior written notice to the other party.
14.3 Termination for Cause. Either party may terminate immediately upon written notice if the other party materially breaches any provision of this Agreement and fails to cure such breach within thirty (30) days.

18. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of laws provisions. Any legal action or proceeding arising under this Agreement shall be brought exclusively in the state or federal courts located in Wilmington, Delaware.`;

export async function POST() {
  try {
    // Create Document record
    const document = await db.document.create({
      data: {
        name: "Master Services Agreement (Sample).pdf",
        mimeType: "application/pdf",
        sizeBytes: 124500,
        blobUrl: "https://clause.app/sample/msa-sample.pdf",
        blobPathname: "sample/msa-sample.pdf",
        status: "READY",
        statusDetail: "Sample document ingested with full text and verified offsets",
        progress: 100,
        pageCount: 3,
        charCount: SAMPLE_CONTRACT_TEXT.length,
        fullText: SAMPLE_CONTRACT_TEXT,
        emptyPages: [],
        versionLabel: "v1.0",
      },
    });

    // Create DocumentPages in batch
    const pageSize = Math.ceil(SAMPLE_CONTRACT_TEXT.length / 3);
    const pages = [];
    for (let pageNum = 1; pageNum <= 3; pageNum++) {
      const start = (pageNum - 1) * pageSize;
      const end = Math.min(start + pageSize, SAMPLE_CONTRACT_TEXT.length);
      pages.push({
        documentId: document.id,
        pageNumber: pageNum,
        text: SAMPLE_CONTRACT_TEXT.slice(start, end),
        startOffset: start,
        endOffset: end,
      });
    }
    await db.documentPage.createMany({ data: pages });

    // Create Chunks in batch
    const chunksData = [
      {
        documentId: document.id,
        heading: "1. Services and Work Orders",
        text: SAMPLE_CONTRACT_TEXT.slice(0, 400),
        pageStart: 1,
        pageEnd: 1,
        startOffset: 0,
        endOffset: 400,
        ordinal: 0,
      },
      {
        documentId: document.id,
        heading: "4. Fees and Payment Terms",
        text: SAMPLE_CONTRACT_TEXT.slice(401, 800),
        pageStart: 1,
        pageEnd: 1,
        startOffset: 401,
        endOffset: 800,
        ordinal: 1,
      },
      {
        documentId: document.id,
        heading: "8. Limitation of Liability",
        text: SAMPLE_CONTRACT_TEXT.slice(801, 1400),
        pageStart: 2,
        pageEnd: 2,
        startOffset: 801,
        endOffset: 1400,
        ordinal: 2,
      },
      {
        documentId: document.id,
        heading: "9. Indemnification",
        text: SAMPLE_CONTRACT_TEXT.slice(1401, 1800),
        pageStart: 2,
        pageEnd: 2,
        startOffset: 1401,
        endOffset: 1800,
        ordinal: 3,
      },
      {
        documentId: document.id,
        heading: "14. Term and Termination",
        text: SAMPLE_CONTRACT_TEXT.slice(1801, 2300),
        pageStart: 3,
        pageEnd: 3,
        startOffset: 1801,
        endOffset: 2300,
        ordinal: 4,
      },
      {
        documentId: document.id,
        heading: "18. Governing Law",
        text: SAMPLE_CONTRACT_TEXT.slice(2301),
        pageStart: 3,
        pageEnd: 3,
        startOffset: 2301,
        endOffset: SAMPLE_CONTRACT_TEXT.length,
        ordinal: 5,
      },
    ];

    await db.chunk.createMany({ data: chunksData });

    return NextResponse.json({
      ok: true,
      documentId: document.id,
      name: document.name,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "SAMPLE_GENERATION_FAILED",
          message: error.message || "Failed to generate sample document",
        },
      },
      { status: 500 }
    );
  }
}
