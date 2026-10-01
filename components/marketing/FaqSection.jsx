"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

const FAQS = [
  {
    q: "How does quote verification actually work?",
    a: "When an answer is synthesized by the model, every proposed quotation is intercepted. Clause performs a whitespace-tolerant, case-normalized exact substring search against the raw document buffer. If the candidate quote cannot be matched character-by-character at exact byte coordinates, the citation is rejected and marked unverified.",
  },
  {
    q: "What happens with scanned PDFs or image-based contracts?",
    a: "Clause first checks for native digital text layers. If a page contains no text, it is flagged as NEEDS_OCR. We explicitly audit all unreadable or blank pages and display them in the coverage transparency log rather than silently pretending they were read.",
  },
  {
    q: "How are large documents (150+ pages) handled?",
    a: "Documents are split into structured semantic chunks with pageStart, pageEnd, and character offsets. A combination of PostgreSQL tsvector full-text search with GIN indexing and vector embeddings retrieves candidate sections, which are then passed through concurrent verification workers.",
  },
  {
    q: "How is my contract data stored, and can I delete it?",
    a: "Files are stored in secure blob storage and indexed in PostgreSQL. You can permanently delete any document, comparison, or conversation thread at any time from your dashboard. A delete action cascades and purges all pages, chunks, and citations from our database immediately.",
  },
  {
    q: "Which AI models power Clause?",
    a: "Clause operates against OpenAI-compatible inference APIs, including Groq (with token-aware rate limiting) and OpenAI. We never lock you into a single provider, and prompts are structured with strict context budgets to eliminate truncation.",
  },
  {
    q: "What are the limitations of the platform?",
    a: "Clause guarantees that every verified quote exists in your contract text and has not been fabricated by the model. However, Clause is an analytical software tool and does not provide legal advice. Strategic legal interpretation must always be performed by licensed counsel.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-24 border-b border-border/60 bg-bg">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Badge
            variant="outline"
            className="mb-3.5 border-border bg-surface px-3 py-1 text-xs"
          >
            Direct Answers
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-text mb-4">
            Frequently asked questions.
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Honest answers about architecture, security, and document handling limitations.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-border bg-surface/70 px-5 shadow-sm transition-colors hover:border-border-strong"
            >
              <AccordionTrigger className="text-left text-sm sm:text-base font-medium text-text py-4 hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted leading-relaxed pb-4 pt-1">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
