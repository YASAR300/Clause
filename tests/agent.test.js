import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAgent, MAX_ROUNDS } from "@/lib/agent/run";
import { AiTimeoutError } from "@/lib/ai/client";

// Mock environment variables
vi.mock("@/lib/env", () => ({
  env: {
    DATABASE_URL: "postgresql://localhost:5432/db",
    DIRECT_URL: "postgresql://localhost:5432/db",
    BLOB_READ_WRITE_TOKEN: "mock_token",
    AI_API_KEY: "sk-mock",
    AI_BASE_URL: "https://api.openai.com/v1",
    AI_MODEL: "gpt-4o",
    AI_FAST_MODEL: "gpt-4o-mini",
  },
  getEnv: () => ({
    DATABASE_URL: "postgresql://localhost:5432/db",
    DIRECT_URL: "postgresql://localhost:5432/db",
    BLOB_READ_WRITE_TOKEN: "mock_token",
    AI_API_KEY: "sk-mock",
    AI_BASE_URL: "https://api.openai.com/v1",
    AI_MODEL: "gpt-4o",
    AI_FAST_MODEL: "gpt-4o-mini",
  }),
}));

// Mock database chunks and pages
vi.mock("@/lib/db", () => {
  return {
    db: {
      chunk: {
        findMany: vi.fn().mockImplementation(async ({ where }) => {
          if (where.heading?.not === null) {
            return [
              { id: "c1", heading: "1. Term and Termination", pageStart: 1, pageEnd: 2 },
              { id: "c2", heading: "12. Limitation of Liability", pageStart: 8, pageEnd: 8 },
            ];
          }
          return [
            {
              id: "c1",
              ordinal: 1,
              heading: "1. Term and Termination",
              text: "Either party may terminate this Agreement upon thirty (30) days prior written notice in the event of a material breach.",
              pageStart: 1,
              pageEnd: 1,
            },
          ];
        }),
      },
      page: {
        findMany: vi.fn().mockResolvedValue([
          { pageNumber: 1, text: "Page 1 contract text with terms and conditions." },
        ]),
      },
    },
  };
});

// Mock OpenAI client
const mockCreate = vi.fn();
vi.mock("@/lib/ai/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getOpenAIClient: () => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }),
    executeAiCall: async (fn) => fn(new AbortController().signal),
  };
});

describe("Agentic Document Research Loop", () => {
  const sampleDocs = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      label: "D1",
      name: "Master Services Agreement.pdf",
      pageCount: 10,
      fullText: "Either party may terminate this Agreement upon thirty (30) days prior written notice.",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes a normal multi-round run with tool calls and final answer", async () => {
    // Round 1: Model requests search_document
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "search_document",
                  arguments: JSON.stringify({ documentId: "D1", query: "terminate" }),
                },
              },
            ],
          },
        },
      ],
    });

    // Round 2: Model provides final answer citing excerpt
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "Under the agreement, either party may terminate upon notice <cite doc=\"D1\">Either party may terminate this Agreement upon thirty (30) days prior written notice</cite>.",
          },
        },
      ],
    });

    const events = [];
    const result = await runAgent({
      question: "What are the termination notice rules?",
      documents: sampleDocs,
      signal: new AbortController().signal,
      onEvent: async (type, data) => events.push({ type, data }),
    });

    expect(result.toolTrace.length).toBe(1);
    expect(result.toolTrace[0].name).toBe("search_document");
    expect(result.toolTrace[0].ok).toBe(true);
    expect(result.rawContent).toContain("<cite doc=\"D1\">");
    expect(events.some((e) => e.type === "round_start")).toBe(true);
    expect(events.some((e) => e.type === "tool_start")).toBe(true);
    expect(events.some((e) => e.type === "tool_result")).toBe(true);
  });

  it("handles unknown tools, missing arguments, nonsense params and invalid documentId without failing", async () => {
    // Round 1: Model issues 4 invalid/erroneous tool calls
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_unknown",
                type: "function",
                function: {
                  name: "inspect_satellite_imagery",
                  arguments: "{}",
                },
              },
              {
                id: "call_missing_arg",
                type: "function",
                function: {
                  name: "search_document",
                  arguments: JSON.stringify({ documentId: "D1" }), // missing query
                },
              },
              {
                id: "call_invalid_doc",
                type: "function",
                function: {
                  name: "get_section",
                  arguments: JSON.stringify({ documentId: "unrelated-id", heading: "Cap" }),
                },
              },
              {
                id: "call_nonsense",
                type: "function",
                function: {
                  name: "get_pages",
                  arguments: JSON.stringify({ documentId: "D1", from: -99, to: "banana" }),
                },
              },
            ],
          },
        },
      ],
    });

    // Round 2: Model recovers and delivers final answer
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: "Recovered from invalid calls and completed answer.",
          },
        },
      ],
    });

    const result = await runAgent({
      question: "Check contract terms",
      documents: sampleDocs,
      signal: new AbortController().signal,
    });

    expect(result.toolTrace.length).toBe(4);
    expect(result.toolTrace[0].ok).toBe(false);
    expect(result.toolTrace[0].result.error).toBe("unknown_tool");
    expect(result.toolTrace[1].ok).toBe(false);
    expect(result.toolTrace[1].result.error).toBe("validation_error");
    expect(result.toolTrace[2].ok).toBe(false);
    expect(result.toolTrace[2].result.error).toBe("invalid_document_id");
    expect(result.toolTrace[3].ok).toBe(false);
    expect(result.toolTrace[3].result.error).toBe("validation_error");
    expect(result.rawContent).toBe("Recovered from invalid calls and completed answer.");
  });

  it("forces a final answer with an incomplete coverage notice when hitting MAX_ROUNDS", async () => {
    // Model continuously loops requesting list_clauses
    mockCreate.mockImplementation(async ({ messages }) => {
      // If forced to answer in cut-short prompt:
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.content?.includes("Research was cut short")) {
        return {
          choices: [
            {
              message: {
                role: "assistant",
                content: "Research was cut short due to round limit. Partial findings summarized.",
              },
            },
          ],
        };
      }

      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: `call_${Math.random()}`,
                  type: "function",
                  function: {
                    name: "list_clauses",
                    arguments: JSON.stringify({ documentId: "D1" }),
                  },
                },
              ],
            },
          },
        ],
      };
    });

    const result = await runAgent({
      question: "Exhaustive audit",
      documents: sampleDocs,
      signal: new AbortController().signal,
    });

    expect(result.cutShort).toBe(true);
    expect(result.coverage.complete).toBe(false);
    expect(result.rawContent).toContain("Research was cut short");
  });

  it("terminates gracefully after consecutive invalid calls", async () => {
    // Model returns unknown tool 3 times consecutively
    mockCreate
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              tool_calls: [
                { id: "c1", type: "function", function: { name: "fake_tool_1", arguments: "{}" } },
                { id: "c2", type: "function", function: { name: "fake_tool_2", arguments: "{}" } },
                { id: "c3", type: "function", function: { name: "fake_tool_3", arguments: "{}" } },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              role: "assistant",
              content: "Stopped research after consecutive invalid tools. Answering with limitations.",
            },
          },
        ],
      });

    const result = await runAgent({
      question: "Query with broken tools",
      documents: sampleDocs,
      signal: new AbortController().signal,
    });

    expect(result.rawContent).toContain("Stopped research after consecutive invalid tools");
    expect(result.toolTrace.every((t) => t.ok === false)).toBe(true);
  });

  it("aborts mid-loop when signal is triggered and raises AiTimeoutError", async () => {
    const controller = new AbortController();

    mockCreate.mockImplementationOnce(async () => {
      controller.abort();
      return {
        choices: [
          {
            message: {
              role: "assistant",
              tool_calls: [
                { id: "c1", type: "function", function: { name: "list_clauses", arguments: JSON.stringify({ documentId: "D1" }) } },
              ],
            },
          },
        ],
      };
    });

    await expect(
      runAgent({
        question: "Abort check",
        documents: sampleDocs,
        signal: controller.signal,
      })
    ).rejects.toThrow(AiTimeoutError);
  });
});
