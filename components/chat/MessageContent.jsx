"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CitationChip } from "./CitationChip";

/**
 * Traverses React nodes and replaces "[1]", "[2]" string matches with interactive CitationChip components.
 */
function replaceCitationMarkers(children, citationsMap) {
  return React.Children.map(children, (child) => {
    if (typeof child === "string") {
      const parts = child.split(/(\[\d+\])/g);
      if (parts.length === 1) return child;

      return parts.map((part, idx) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const ordinal = parseInt(match[1], 10);
          const citation = citationsMap.get(ordinal);
          return (
            <CitationChip
              key={`cite-${ordinal}-${idx}`}
              citation={citation}
              fallbackOrdinal={ordinal}
            />
          );
        }
        return part;
      });
    }

    if (React.isValidElement(child) && child.props?.children) {
      return React.cloneElement(child, {
        children: replaceCitationMarkers(child.props.children, citationsMap),
      });
    }

    return child;
  });
}

/**
 * Sanitized Markdown renderer for legal answers with inline interactive citation chips.
 */
export function MessageContent({ content = "", citations = [] }) {
  const citationsMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(citations)) {
      for (const cite of citations) {
        if (cite && cite.ordinal) {
          map.set(cite.ordinal, cite);
        }
      }
    }
    return map;
  }, [citations]);

  const components = useMemo(
    () => ({
      p: ({ children }) => (
        <p className="mb-3 leading-relaxed text-[#ededed] text-xs sm:text-sm">
          {replaceCitationMarkers(children, citationsMap)}
        </p>
      ),
      li: ({ children }) => (
        <li className="mb-1.5 leading-relaxed text-[#ededed] text-xs sm:text-sm">
          {replaceCitationMarkers(children, citationsMap)}
        </li>
      ),
      ul: ({ children }) => (
        <ul className="list-disc list-inside mb-3 space-y-1 text-xs sm:text-sm text-[#ededed]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-3 space-y-1 text-xs sm:text-sm text-[#ededed]">
          {children}
        </ol>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-white">
          {replaceCitationMarkers(children, citationsMap)}
        </strong>
      ),
      code: ({ inline, children }) =>
        inline ? (
          <code className="px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] font-mono text-[11px] text-[#e4e4e7]">
            {children}
          </code>
        ) : (
          <pre className="p-3 my-2 rounded-lg bg-[#18181b] border border-[#27272a] font-mono text-xs overflow-x-auto text-[#e4e4e7]">
            <code>{children}</code>
          </pre>
        ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-2 border-[#3b82f6] pl-3 my-2 italic text-[#a1a1aa] text-xs">
          {replaceCitationMarkers(children, citationsMap)}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="overflow-x-auto my-3 border border-[#27272a] rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            {children}
          </table>
        </div>
      ),
      th: ({ children }) => (
        <th className="p-2 border-b border-[#27272a] bg-[#18181b] font-semibold text-[#ededed]">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="p-2 border-b border-[#27272a]/60 text-[#d4d4d8]">
          {replaceCitationMarkers(children, citationsMap)}
        </td>
      ),
    }),
    [citationsMap]
  );

  if (!content) return null;

  return (
    <div className="prose prose-invert max-w-none break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
