/**
 * Streaming parser for inline <cite doc="...">...</cite> and <not_found/> tags.
 *
 * Implements a resilient state machine capable of parsing arbitrary chunk splits,
 * 1-character-at-a-time streaming, unclosed tags at stream termination, and
 * stray '<' characters in normal text.
 */

export class CiteStreamParser {
  constructor(options = {}) {
    this.onText = options.onText || (() => {});
    this.onCitation = options.onCitation || (() => {});
    this.onNotFound = options.onNotFound || (() => {});

    // State
    this.buffer = "";
    this.inCite = false;
    this.currentDocId = "D1";
    this.currentQuote = "";
    this.currentOrdinal = 0;
    this.tagBuffer = "";
    this.closeTagBuffer = "";
    this.isNotFoundDetected = false;
    this.citations = [];
    this.cleanTextAccumulator = "";
  }

  emitText(text) {
    if (!text) return;
    this.cleanTextAccumulator += text;
    this.onText(text);
  }

  feed(chunk = "") {
    if (!chunk) return;

    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];

      if (!this.inCite) {
        // Outside of <cite>
        if (this.tagBuffer.length > 0) {
          this.tagBuffer += char;

          // Check if tagBuffer is prefix of <not_found ...> or <cite ...>
          if ("<not_found/>".startsWith(this.tagBuffer) || "<not_found>".startsWith(this.tagBuffer)) {
            if (this.tagBuffer === "<not_found/>" || this.tagBuffer === "<not_found>") {
              this.isNotFoundDetected = true;
              this.onNotFound();
              this.tagBuffer = "";
            }
            continue;
          }

          if (this.tagBuffer.startsWith("<not_found")) {
            if (char === ">") {
              this.isNotFoundDetected = true;
              this.onNotFound();
              this.tagBuffer = "";
            }
            continue;
          }

          // Check <cite ...>
          if ("<cite".startsWith(this.tagBuffer) || this.tagBuffer.startsWith("<cite")) {
            if (char === ">") {
              // Parse doc id from tagBuffer: <cite doc="D1"> or <cite doc='D2'>
              const match = this.tagBuffer.match(/doc=["']?([A-Za-z0-9_-]+)["']?/i);
              this.currentDocId = match ? match[1] : "D1";
              this.currentOrdinal++;
              this.currentQuote = "";
              this.inCite = true;
              this.tagBuffer = "";

              // Emit citation marker in stream text
              const needsSpace =
                this.cleanTextAccumulator.length > 0 &&
                !this.cleanTextAccumulator.endsWith(" ");
              this.emitText(`${needsSpace ? " " : ""}[${this.currentOrdinal}]`);
            }
            continue;
          }

          // If tagBuffer cannot be any valid tag prefix, flush it as normal text
          this.emitText(this.tagBuffer);
          this.tagBuffer = "";
        } else if (char === "<") {
          this.tagBuffer = "<";
        } else {
          this.emitText(char);
        }
      } else {
        // Inside <cite>
        if (this.closeTagBuffer.length > 0) {
          this.closeTagBuffer += char;

          if ("</cite>".startsWith(this.closeTagBuffer)) {
            if (this.closeTagBuffer === "</cite>") {
              // Citation successfully completed
              const cite = {
                ordinal: this.currentOrdinal,
                docId: this.currentDocId,
                quoteText: this.currentQuote.trim(),
              };
              this.citations.push(cite);
              this.onCitation(cite);

              this.inCite = false;
              this.closeTagBuffer = "";
              this.currentQuote = "";
            }
            continue;
          }

          // If closeTagBuffer is not a prefix of </cite>, append to current quote
          this.currentQuote += this.closeTagBuffer;
          this.closeTagBuffer = "";
        } else if (char === "<") {
          this.closeTagBuffer = "<";
        } else {
          this.currentQuote += char;
        }
      }
    }
  }

  /**
   * Finalizes the parser when stream ends.
   * Handles unclosed tags per specification:
   * "An unclosed cite at the end is dropped from citations and its text is shown as plain unverified text."
   */
  end() {
    if (this.tagBuffer.length > 0) {
      this.emitText(this.tagBuffer);
      this.tagBuffer = "";
    }

    if (this.inCite) {
      // Unclosed cite: drop from citations and emit quote as plain unverified text
      const unclosedText = (this.currentQuote + this.closeTagBuffer).trim();
      if (unclosedText) {
        this.emitText(` ${unclosedText}`);
      }
      this.inCite = false;
      this.currentQuote = "";
      this.closeTagBuffer = "";
    }

    return {
      cleanText: this.cleanTextAccumulator.trim(),
      citations: this.citations,
      isNotFound: this.isNotFoundDetected,
    };
  }

  getCleanText() {
    return this.cleanTextAccumulator;
  }

  getCitations() {
    return this.citations;
  }
}
