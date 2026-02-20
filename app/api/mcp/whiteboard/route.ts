import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const REDIS_KEY_PREFIX = "wb:";
const REDIS_TTL_SECONDS = 300; // 5 minutes auto-cleanup

// MCP Tool definitions exposed to the Agora Conversational AI agent
const TOOLS = [
  {
    name: "draw_diagram",
    description:
      "Draw a Mermaid diagram on the shared whiteboard. Use standard Mermaid syntax: flowchart TD for top-down flows, sequenceDiagram for interactions, classDiagram for structures, mindmap for concept maps, graph LR for left-right flows. The diagram will be rendered as an image and placed on the whiteboard visible to all participants.",
    inputSchema: {
      type: "object",
      properties: {
        mermaidCode: {
          type: "string",
          description: "Valid Mermaid diagram syntax",
        },
        title: {
          type: "string",
          description: "Optional title for the diagram",
        },
      },
      required: ["mermaidCode"],
    },
  },
  {
    name: "insert_text",
    description:
      "Add a text annotation on the whiteboard at a specific position.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X position on the whiteboard" },
        y: { type: "number", description: "Y position on the whiteboard" },
        text: { type: "string", description: "Text content to display" },
        fontSize: {
          type: "number",
          description: "Font size in pixels (default: 16)",
        },
      },
      required: ["x", "y", "text"],
    },
  },
  {
    name: "clear_board",
    description: "Clear the current whiteboard scene.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "undo",
    description: "Undo the last whiteboard action.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "redo",
    description: "Redo the last undone whiteboard action.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

interface WhiteboardCommand {
  action: string;
  params: Record<string, unknown>;
}

function buildMermaidInkUrl(mermaidCode: string): string {
  // mermaid.ink expects base64-encoded Mermaid code
  const encoded = Buffer.from(mermaidCode, "utf-8").toString("base64");
  return `https://mermaid.ink/img/${encoded}`;
}

async function storeCommand(
  channelName: string,
  command: WhiteboardCommand
): Promise<void> {
  const key = `${REDIS_KEY_PREFIX}${channelName}`;
  await redis.lpush(key, JSON.stringify(command));
  await redis.expire(key, REDIS_TTL_SECONDS);
}

function handleToolsList(id: number | string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result: { tools: TOOLS },
  });
}

async function handleToolCall(
  id: number | string,
  toolName: string,
  args: Record<string, unknown>,
  channelName: string
) {
  let resultText: string;

  switch (toolName) {
    case "draw_diagram": {
      const mermaidCode = args.mermaidCode as string;
      const title = (args.title as string) || "Diagram";
      if (!mermaidCode) {
        return jsonRpcError(id, -32602, "mermaidCode is required");
      }
      const imageUrl = buildMermaidInkUrl(mermaidCode);
      await storeCommand(channelName, {
        action: "insert_image",
        params: { url: imageUrl, title, width: 800, height: 600 },
      });
      resultText = `Diagram "${title}" has been drawn on the whiteboard.`;
      break;
    }
    case "insert_text": {
      const text = args.text as string;
      const x = (args.x as number) ?? 100;
      const y = (args.y as number) ?? 100;
      const fontSize = (args.fontSize as number) ?? 16;
      if (!text) {
        return jsonRpcError(id, -32602, "text is required");
      }
      await storeCommand(channelName, {
        action: "insert_text",
        params: { x, y, text, fontSize },
      });
      resultText = `Text "${text}" has been added to the whiteboard at position (${x}, ${y}).`;
      break;
    }
    case "clear_board": {
      await storeCommand(channelName, {
        action: "clear_board",
        params: {},
      });
      resultText = "The whiteboard has been cleared.";
      break;
    }
    case "undo": {
      await storeCommand(channelName, { action: "undo", params: {} });
      resultText = "Last whiteboard action has been undone.";
      break;
    }
    case "redo": {
      await storeCommand(channelName, { action: "redo", params: {} });
      resultText = "Last undone whiteboard action has been redone.";
      break;
    }
    default:
      return jsonRpcError(id, -32601, `Unknown tool: ${toolName}`);
  }

  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: resultText }],
    },
  });
}

function jsonRpcError(
  id: number | string | null,
  code: number,
  message: string
) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
}

/**
 * POST /api/mcp/whiteboard
 *
 * MCP endpoint (JSON-RPC 2.0) for the Agora Conversational AI agent.
 * Handles tools/list and tools/call requests.
 * channelName is extracted from URL query params (auto-injected by invite route).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as JsonRpcRequest;
    const { jsonrpc, id, method, params } = body;

    if (jsonrpc !== "2.0") {
      return jsonRpcError(id ?? null, -32600, "Invalid JSON-RPC version");
    }

    const channelName =
      request.nextUrl.searchParams.get("channelName") ?? "default";

    switch (method) {
      case "tools/list":
        return handleToolsList(id);

      case "tools/call": {
        const toolName = params?.name;
        const args = params?.arguments ?? {};
        if (!toolName) {
          return jsonRpcError(id, -32602, "Missing tool name");
        }
        return handleToolCall(id, toolName, args, channelName);
      }

      default:
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    console.error("[MCP Whiteboard] Error:", err);
    return jsonRpcError(null, -32603, "Internal server error");
  }
}
