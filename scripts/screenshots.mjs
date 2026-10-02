import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";
import { db } from "../lib/db.js";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs", "screenshots");

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function optimizePng(inputBuffer, outputPath) {
  const tmpPath = outputPath + ".tmp";
  await sharp(inputBuffer)
    .png({ compressionLevel: 9, adaptiveFiltering: true, quality: 85 })
    .toFile(tmpPath);
  if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  fs.renameSync(tmpPath, outputPath);
}

async function preparePage(page) {
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    const style = document.createElement("style");
    style.id = "disable-animations";
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      div[data-nextjs-toast], nextjs-portal, #__next-build-watcher, [data-next-badge], [data-nextjs-dev-tools-button] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  });
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(() => document.fonts.ready);
}

export async function captureAllScreenshots() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  process.stdout.write("Fetching seeded demo records from database...\n");

  const doc1 = await db.document.findFirst({
    where: { name: "Master Services Agreement v1.pdf" },
    orderBy: { createdAt: "desc" },
  });
  const doc2 = await db.document.findFirst({
    where: { name: "Master Services Agreement v2.pdf" },
    orderBy: { createdAt: "desc" },
  });
  const docProc = await db.document.findFirst({
    where: { status: "EXTRACTING" },
    orderBy: { createdAt: "desc" },
  });
  const docScan = await db.document.findFirst({
    where: { status: "NEEDS_OCR" },
    orderBy: { createdAt: "desc" },
  });

  const conv1 = await db.conversation.findFirst({
    where: { title: "Liability Cap and Payment Terms Audit" },
    orderBy: { createdAt: "desc" },
    include: { messages: { include: { citations: true } } },
  });
  const conv2 = await db.conversation.findFirst({
    where: { title: "Comparison of v1 vs v2 Terms" },
    orderBy: { createdAt: "desc" },
  });
  const comparison = await db.comparison.findFirst({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
  });
  const agentConv = await db.conversation.findFirst({
    where: { mode: "AGENT" },
    orderBy: { createdAt: "desc" },
  });

  if (!doc1 || !doc2 || !conv1 || !conv2 || !comparison || !agentConv) {
    throw new Error(
      "Missing seeded demo records. Run `npm run seed:demo` before capturing screenshots."
    );
  }

  const launchOptions = {
    headless: true,
  };
  if (fs.existsSync(EDGE_PATH)) {
    launchOptions.executablePath = EDGE_PATH;
  }

  const browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  const page = await context.newPage();

  process.stdout.write("Capturing screenshots...\n");

  // 1. 01-landing.png
  process.stdout.write("Capturing 01-landing.png...\n");
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await preparePage(page);
  const heroHeading = page.locator("h1").first();
  await heroHeading.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf01 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf01, path.join(SCREENSHOTS_DIR, "01-landing.png"));

  // 2. 02-dashboard.png
  process.stdout.write("Capturing 02-dashboard.png...\n");
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
  await preparePage(page);
  const dashboardHeading = page.locator("h1").filter({ hasText: "Counselor" }).first();
  await dashboardHeading.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf02 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf02, path.join(SCREENSHOTS_DIR, "02-dashboard.png"));

  // 3. 03-upload-processing.png
  process.stdout.write("Capturing 03-upload-processing.png...\n");
  const procDocId = docProc ? docProc.id : doc1.id;
  await page.goto(`${BASE_URL}/documents/${procDocId}`, { waitUntil: "domcontentloaded" });
  await preparePage(page);
  const stepperActive = page.getByText("Reading pages").first();
  await stepperActive.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf03 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf03, path.join(SCREENSHOTS_DIR, "03-upload-processing.png"));

  // 4. 04-upload-rejected.png
  process.stdout.write("Capturing 04-upload-rejected.png...\n");
  const scanDocId = docScan ? docScan.id : doc1.id;
  await page.goto(`${BASE_URL}/documents/${scanDocId}`, { waitUntil: "domcontentloaded" });
  await preparePage(page);
  await page.evaluate(() => {
    const toastDiv = document.createElement("div");
    toastDiv.id = "mock-toast";
    toastDiv.className =
      "fixed bottom-6 right-6 z-50 rounded-xl bg-[#1c1917] border border-[#ef4444]/40 p-4 text-xs text-[#ef4444] shadow-2xl flex items-center gap-2 font-medium";
    toastDiv.innerHTML =
      '<span class="h-2 w-2 rounded-full bg-[#ef4444] shrink-0"></span><span>"vendor_agreement.exe" isn\'t supported. Upload a PDF or DOCX file.</span>';
    document.body.appendChild(toastDiv);
  });
  await page.waitForTimeout(400);
  const scanExplanation = page.getByText("Needs OCR").first();
  await scanExplanation.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf04 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf04, path.join(SCREENSHOTS_DIR, "04-upload-rejected.png"));

  // 5. 05-chat-verified-quotes.png
  process.stdout.write("Capturing 05-chat-verified-quotes.png...\n");
  await page.goto(`${BASE_URL}/chats/${conv1.id}`, { waitUntil: "networkidle" });
  await preparePage(page);
  await page.waitForTimeout(1500);
  const unverifiedChip = page.locator("button[aria-label*='Unverified']").first();
  const verifiedChip = page.locator("button[aria-label*='Verified']:not([aria-label*='Unverified'])").first();
  await unverifiedChip.waitFor({ state: "visible", timeout: 30000 });
  await verifiedChip.waitFor({ state: "visible", timeout: 30000 });
  // Click unverified chip to display the popover explanation
  await unverifiedChip.click();
  await page.waitForTimeout(800);
  const rawBuf05 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf05, path.join(SCREENSHOTS_DIR, "05-chat-verified-quotes.png"));

  // 6. 06-citation-highlighting.png
  process.stdout.write("Capturing 06-citation-highlighting.png...\n");
  const dupCitation = await db.citation.findFirst({
    where: {
      documentId: doc1.id,
      matchCount: { gte: 2 },
    },
    orderBy: { createdAt: "desc" },
  });
  const dupCiteParam = dupCitation ? `?cite=${dupCitation.id}` : "";
  await page.goto(`${BASE_URL}/documents/${doc1.id}${dupCiteParam}`, {
    waitUntil: "networkidle",
  });
  await preparePage(page);
  // Wait for PDF to render and highlight computation to complete
  await page.waitForTimeout(4000);
  // The highlight overlay sets aria-label with match count when matchCount > 1
  const highlightOverlay = page.locator("[aria-label*='Match 1 of']").first();
  const hasOverlay = await highlightOverlay.isVisible().catch(() => false);
  if (!hasOverlay) {
    // Fall back to any citation highlight being present
    const anyHighlight = page.locator("[aria-label*='Citation highlight']").first();
    await anyHighlight.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  }
  const rawBuf06 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf06, path.join(SCREENSHOTS_DIR, "06-citation-highlighting.png"));

  // 7. 07-citation-cross-page.png
  process.stdout.write("Capturing 07-citation-cross-page.png...\n");
  const crossCitation = await db.citation.findFirst({
    where: {
      documentId: doc1.id,
      pageEnd: { gt: 1 },
      quoteText: { contains: "continuous period" },
    },
    orderBy: { createdAt: "desc" },
  });
  const crossCiteParam = crossCitation ? `?cite=${crossCitation.id}` : "";
  await page.goto(`${BASE_URL}/documents/${doc1.id}${crossCiteParam}`, {
    waitUntil: "networkidle",
  });
  await preparePage(page);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const scrollEl = document.querySelector(".overflow-y-auto");
    if (scrollEl) scrollEl.scrollTop = 850;
  });
  await page.waitForTimeout(600);
  const rawBuf07 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf07, path.join(SCREENSHOTS_DIR, "07-citation-cross-page.png"));

  // 8. 08-multi-document.png
  process.stdout.write("Capturing 08-multi-document.png...\n");
  await page.goto(`${BASE_URL}/chats/${conv2.id}`, { waitUntil: "networkidle" });
  await preparePage(page);
  await page.waitForTimeout(1500);
  // Wait for citation chips — multi-doc conv has 5 verified citations
  const firstCitationChip = page.locator("button[aria-label*='Citation']").first();
  await firstCitationChip.waitFor({ state: "visible", timeout: 30000 });
  const rawBuf08 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf08, path.join(SCREENSHOTS_DIR, "08-multi-document.png"));

  // 9. 09-comparison.png
  process.stdout.write("Capturing 09-comparison.png...\n");
  await page.goto(`${BASE_URL}/compare/${comparison.id}`, {
    waitUntil: "networkidle",
  });
  await preparePage(page);
  await page.waitForTimeout(800);
  const criticalCard = page.getByText("CRITICAL").first();
  await criticalCard.waitFor({ state: "visible", timeout: 25000 });
  await criticalCard.click();
  await page.waitForTimeout(600);
  const aedBefore = page.getByText("AED 100,000").first();
  const aedAfter = page.getByText("AED 1,000,000").first();
  await aedBefore.waitFor({ state: "visible", timeout: 25000 });
  await aedAfter.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf09 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf09, path.join(SCREENSHOTS_DIR, "09-comparison.png"));

  // 10. 10-agent-timeline.png
  process.stdout.write("Capturing 10-agent-timeline.png...\n");
  await page.goto(`${BASE_URL}/chats/${agentConv.id}`, {
    waitUntil: "networkidle",
  });
  await preparePage(page);
  await page.waitForTimeout(1000);
  const viewStepsBtn = page.getByRole("button", { name: /View steps/i });
  if (await viewStepsBtn.isVisible()) {
    await viewStepsBtn.click();
    await page.waitForTimeout(500);
  }
  const toolStep = page.getByText("Scanning table of contents").first();
  await toolStep.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf10 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf10, path.join(SCREENSHOTS_DIR, "10-agent-timeline.png"));

  // 11. 11-mobile-chat.png (375px wide)
  process.stdout.write("Capturing 11-mobile-chat.png...\n");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/chats/${conv1.id}`, { waitUntil: "networkidle" });
  await preparePage(page);
  await page.waitForTimeout(1000);
  const mobileInput = page.locator("textarea, input[placeholder*='Ask']").first();
  await mobileInput.waitFor({ state: "visible", timeout: 25000 });
  const rawBuf11 = await page.screenshot({ fullPage: false });
  await optimizePng(rawBuf11, path.join(SCREENSHOTS_DIR, "11-mobile-chat.png"));

  await browser.close();

  const files = fs.readdirSync(SCREENSHOTS_DIR);
  let totalBytes = 0;
  for (const f of files) {
    if (f.endsWith(".png")) {
      totalBytes += fs.statSync(path.join(SCREENSHOTS_DIR, f)).size;
    }
  }

  process.stdout.write(
    `All 11 screenshots captured successfully in ${SCREENSHOTS_DIR}:\n` +
      `- Total size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB (limit: 6 MB)\n`
  );
}

if (process.argv[1]?.endsWith("screenshots.mjs")) {
  captureAllScreenshots().catch((err) => {
    process.stderr.write(`Screenshot capture failed: ${err.message}\n${err.stack}\n`);
    process.exit(1);
  });
}
