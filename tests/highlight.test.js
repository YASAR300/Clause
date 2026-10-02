import { describe, it, expect, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import {
  collectTextNodes,
  mapOffsetToNode,
  locateInDom,
  mergeLineRects,
  locateCrossPageInDom,
  findInDom,
} from "@/lib/highlight";

describe("Highlight Engine", () => {
  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>");
    document = dom.window.document;
    global.document = document;
    global.NodeFilter = dom.window.NodeFilter;
    global.Node = dom.window.Node;
    global.Range = dom.window.Range;
  });

  describe("collectTextNodes and mapOffsetToNode", () => {
    it("collects text nodes in document order with exact boundary offsets", () => {
      const root = document.getElementById("root");
      root.innerHTML = `
        <div class="line"><span>The Customer </span><span>shall pay</span></div>
        <div class="line"><span> within 30 </span><span>days.</span></div>
      `;

      const { textNodes, fullText } = collectTextNodes(root);
      expect(textNodes.length).toBeGreaterThan(0);
      expect(fullText).toContain("The Customer shall pay");

      // Verify boundary offsets
      const first = textNodes[0];
      expect(first.start).toBe(0);
      expect(first.end).toBe(first.text.length);

      // Verify mapOffsetToNode
      const loc = mapOffsetToNode(textNodes, 4, false);
      expect(loc).not.toBeNull();
      expect(loc.node).toBe(first.node);
      expect(loc.offset).toBe(4);
    });
  });

  describe("locateInDom", () => {
    it("locates exact normalized quote spanning multiple child text nodes", () => {
      const root = document.getElementById("root");
      root.innerHTML = `
        <p>
          <span>Section 4.1: </span>
          <span>Either party may </span>
          <span>terminate this Agreement </span>
          <span>upon thirty (30) days notice.</span>
        </p>
      `;

      const quote = "Either party may terminate this Agreement upon thirty (30) days notice.";
      const results = locateInDom(root, quote);

      expect(results.length).toBe(1);
      expect(results[0].range).toBeDefined();
      expect(results[0].matchedText).toContain("Either party may");
      expect(results[0].matchedText).toContain("thirty (30) days notice.");
    });

    it("matches quotes with OCR word-split spans and whitespace variations", () => {
      const root = document.getElementById("root");
      root.innerHTML = `
        <div>
          <span>Indem</span><span>nifi</span><span>cation</span>
          <span> Obli</span><span>gations</span>
        </div>
      `;

      const quote = "Indemnification Obligations";
      const results = locateInDom(root, quote);

      expect(results.length).toBe(1);
      expect(results[0].matchedText.replace(/\s+/g, "")).toBe("IndemnificationObligations");
    });

    it("handles multiple occurrences and sorts by hint offset", () => {
      const root = document.getElementById("root");
      root.innerHTML = `
        <div>
          <p id="p1">Payment terms: net 30 days from invoice date.</p>
          <p id="p2">Payment terms: net 30 days from invoice date.</p>
        </div>
      `;

      const quote = "Payment terms: net 30 days";
      const results = locateInDom(root, quote, { findAll: true });
      expect(results.length).toBe(2);

      // Hint offset closer to second paragraph
      const hinted = locateInDom(root, quote, { findAll: true, hintOffset: 100 });
      expect(hinted.length).toBe(2);
      expect(hinted[0].startOffset).toBeGreaterThan(hinted[1].startOffset);
    });
  });

  describe("mergeLineRects", () => {
    it("merges adjacent rectangles on the same line into one continuous box", () => {
      const rects = [
        { top: 10, left: 20, width: 50, height: 16, bottom: 26, right: 70 },
        { top: 10, left: 72, width: 60, height: 16, bottom: 26, right: 132 },
        { top: 32, left: 20, width: 100, height: 16, bottom: 48, right: 120 }, // next line
      ];

      const merged = mergeLineRects(rects);
      expect(merged.length).toBe(2);
      // Line 1 should be merged from left 20 to right 132 (width 112)
      expect(merged[0].left).toBe(20);
      expect(merged[0].width).toBe(112);
      // Line 2 unchanged
      expect(merged[1].top).toBe(32);
      expect(merged[1].width).toBe(100);
    });
  });

  describe("locateCrossPageInDom", () => {
    it("locates quote spanning across two page containers", () => {
      const page1 = document.createElement("div");
      page1.id = "page-1";
      page1.innerHTML = "<span>Liability shall be strictly limited to the total fees paid under this </span>";

      const page2 = document.createElement("div");
      page2.id = "page-2";
      page2.innerHTML = "<span>Agreement in the preceding twelve (12) months.</span>";

      // Mock getBoundingClientRect for both pages
      page1.getBoundingClientRect = () => ({ top: 0, left: 0, width: 800, height: 1000 });
      page2.getBoundingClientRect = () => ({ top: 1050, left: 0, width: 800, height: 1000 });

      const quote = "limited to the total fees paid under this Agreement in the preceding twelve (12) months.";

      const result = locateCrossPageInDom(
        [
          { pageNumber: 1, container: page1 },
          { pageNumber: 2, container: page2 },
        ],
        quote
      );

      expect(result.firstPage).toBe(1);
      expect(result.ranges.length).toBe(2);
    });
  });

  describe("findInDom", () => {
    it("finds all occurrences of arbitrary search string", () => {
      const root = document.getElementById("root");
      root.innerHTML = "<span>Force majeure shall include acts of God, war, and pandemic. In case of force majeure...</span>";

      const matches = findInDom(root, "force majeure");
      expect(matches.length).toBe(2);
      expect(matches[0].index).toBe(0);
      expect(matches[1].index).toBe(1);
    });
  });
});
