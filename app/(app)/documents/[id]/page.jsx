"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Loader2, AlertCircle } from "lucide-react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { ViewerHeader } from "@/components/viewer/ViewerHeader";
import { PdfViewer } from "@/components/viewer/PdfViewer";
import { DocxViewer } from "@/components/viewer/DocxViewer";
import { UnreadyState } from "@/components/viewer/UnreadyState";
import { DocumentChatPane } from "@/components/viewer/DocumentChatPane";

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function DocumentViewerPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const documentId = resolvedParams.id;
  const citeParam = searchParams.get("cite");

  // Fetch document details
  const { data, error, isLoading, mutate } = useSWR(
    documentId ? `/api/documents/${documentId}` : null,
    fetcher,
    {
      refreshInterval: (latestData) => {
        // Poll every 3 seconds if document is processing
        const status = latestData?.document?.status;
        return status === "UPLOADED" || status === "EXTRACTING" || status === "INDEXING"
          ? 3000
          : 0;
      },
    }
  );

  const document = data?.document;

  // Fetch all documents for the switcher
  const { data: allDocsData } = useSWR("/api/documents?limit=50", fetcher);
  const allDocuments = allDocsData?.items || [];

  // Active citation for highlighting
  const [activeCitation, setActiveCitation] = useState(null);

  // Chat panel visibility toggle
  const [chatOpen, setChatOpen] = useState(true);

  // Find in document search state
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  // Deep-link citation loader: ?cite=<citationId>
  useEffect(() => {
    if (!citeParam) return;

    let isMounted = true;

    async function loadDeepLinkCitation() {
      try {
        const res = await fetch(`/api/citations/${citeParam}`);
        if (!res.ok) return;

        const json = await res.json();
        const cit = json.citation;

        if (!isMounted || !cit) return;

        // If the citation belongs to a different document, switch tabs
        if (cit.documentId && cit.documentId !== documentId) {
          router.push(`/documents/${cit.documentId}?cite=${citeParam}`);
          return;
        }

        // Only highlight if verified or has quote text
        if (cit.quoteText) {
          setActiveCitation(cit);
        }
      } catch (err) {
        console.warn("Failed to load deep-link citation:", err);
      }
    }

    loadDeepLinkCitation();

    return () => {
      isMounted = false;
    };
  }, [citeParam, documentId, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-12 text-center bg-[#09090b]">
        <Loader2 className="h-7 w-7 animate-spin text-[#3b82f6] mb-3" />
        <p className="text-xs text-[#a1a1aa] font-mono">Loading contract and offset index...</p>
      </div>
    );
  }

  if (error || (!isLoading && !document)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center bg-[#09090b] space-y-4">
        <AlertCircle className="h-8 w-8 text-[#ef4444]" />
        <p className="text-xs text-[#ef4444]">
          {error?.message || "Document not found or could not be loaded."}
        </p>
        <Button size="sm" variant="outline" onClick={() => router.push("/documents")}>
          Back to Documents
        </Button>
      </div>
    );
  }

  const isReady = document.status === "READY";
  const isDocx =
    document.mimeType?.includes("wordprocessingml") ||
    document.name?.toLowerCase().endsWith(".docx");

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#09090b]">
      {/* Top Header */}
      <ViewerHeader
        document={document}
        allDocuments={allDocuments}
        onSelectDocument={(id) => router.push(`/documents/${id}`)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        matchIndex={matchIndex}
        totalMatches={totalMatches}
        onNextMatch={() => {
          if (totalMatches > 0) setMatchIndex((i) => (i + 1) % totalMatches);
        }}
        onPrevMatch={() => {
          if (totalMatches > 0) setMatchIndex((i) => (i - 1 + totalMatches) % totalMatches);
        }}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(!chatOpen)}
      />

      {/* Main Layout */}
      {!isReady ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <UnreadyState document={document} onRetry={mutate} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 w-full overflow-hidden">
          {/* Desktop Resizable View */}
          <div className="hidden md:block h-full w-full">
            <Group orientation="horizontal" className="h-full w-full">
              {/* Left Pane: Document Viewer */}
              <Panel defaultSize={chatOpen ? 65 : 100} minSize={35} className="h-full">
                {isDocx ? (
                  <DocxViewer
                    documentId={document.id}
                    documentName={document.name}
                    citation={activeCitation}
                    fullText={document.fullText || ""}
                    onFindInDoc={(q) => setSearchQuery(q)}
                    onDismissCitation={() => setActiveCitation(null)}
                  />
                ) : (
                  <PdfViewer
                    documentId={document.id}
                    documentName={document.name}
                    citation={activeCitation}
                    fullText={document.fullText || ""}
                    onFindInDoc={(q) => setSearchQuery(q)}
                    onDismissCitation={() => setActiveCitation(null)}
                  />
                )}
              </Panel>

              {/* Resizable Divider */}
              {chatOpen && (
                <Separator className="w-1.5 bg-[#18181b] hover:bg-[#3b82f6] border-x border-[#222226] transition-colors cursor-col-resize shrink-0" />
              )}

              {/* Right Pane: Document Chat Companion */}
              {chatOpen && (
                <Panel defaultSize={35} minSize={25} className="h-full">
                  <DocumentChatPane
                    documentId={document.id}
                    documentName={document.name}
                    document={document}
                    isDocumentReady={isReady}
                    onSelectCitation={(c) => setActiveCitation(c)}
                  />
                </Panel>
              )}
            </Group>
          </div>

          {/* Mobile View: Single Pane with toggle between Viewer & Chat */}
          <div className="md:hidden h-full w-full relative">
            <div className={`h-full w-full ${chatOpen ? "hidden" : "block"}`}>
              {isDocx ? (
                <DocxViewer
                  documentId={document.id}
                  documentName={document.name}
                  citation={activeCitation}
                  fullText={document.fullText || ""}
                  onFindInDoc={(q) => setSearchQuery(q)}
                  onDismissCitation={() => setActiveCitation(null)}
                />
              ) : (
                <PdfViewer
                  documentId={document.id}
                  documentName={document.name}
                  citation={activeCitation}
                  fullText={document.fullText || ""}
                  onFindInDoc={(q) => setSearchQuery(q)}
                  onDismissCitation={() => setActiveCitation(null)}
                />
              )}
            </div>

            {chatOpen && (
              <div className="h-full w-full bg-[#0c0c0e]">
                <DocumentChatPane
                  documentId={document.id}
                  documentName={document.name}
                  document={document}
                  isDocumentReady={isReady}
                  onSelectCitation={(c) => {
                    setActiveCitation(c);
                    setChatOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
