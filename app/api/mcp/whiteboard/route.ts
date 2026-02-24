import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const REDIS_KEY_PREFIX = "wb:";
const REDIS_TTL_SECONDS = 300; // 5 minutes auto-cleanup

// MCP Tool definitions exposed to the Agora Conversational AI agent
// Keep descriptions concise to reduce token usage and avoid agent timeouts
const TOOLS = [
  {
    name: "open_whiteboard",
    description:
      "Open the shared whiteboard so all participants can see it. Always call this before using draw_diagram, insert_text, or clear_board. The whiteboard must be open for drawing tools to work.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "close_whiteboard",
    description:
      "Close the whiteboard and return to the normal video call view. Call this when done explaining on the whiteboard or when the user asks to close it.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "draw_diagram",
    description:
      "Draw a diagram on the whiteboard using Mermaid syntax. Renders as an image. Use for flowcharts, sequences, mind maps, class diagrams, shapes, and any visual explanation.",
    inputSchema: {
      type: "object",
      properties: {
        mermaidCode: {
          type: "string",
          description: "Mermaid diagram syntax (e.g. flowchart TD, sequenceDiagram, mindmap)",
        },
        title: { type: "string", description: "Optional title" },
      },
      required: ["mermaidCode"],
    },
  },
  {
    name: "insert_text",
    description: "Add text on the whiteboard at a position.",
    inputSchema: {
      type: "object",
      properties: {
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        text: { type: "string", description: "Text to display" },
      },
      required: ["x", "y", "text"],
    },
  },
  {
    name: "clear_board",
    description: "Clear the whiteboard.",
    inputSchema: { type: "object", properties: {} },
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
    case "open_whiteboard": {
      await storeCommand(channelName, {
        action: "open_whiteboard",
        params: {},
      });
      resultText = "Whiteboard opened.";
      break;
    }
    case "close_whiteboard": {
      await storeCommand(channelName, {
        action: "close_whiteboard",
        params: {},
      });
      resultText = "Whiteboard closed.";
      break;
    }
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
      resultText = `Diagram drawn on whiteboard.`;
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
      resultText = `Text added to whiteboard.`;
      break;
    }
    case "clear_board": {
      await storeCommand(channelName, {
        action: "clear_board",
        params: {},
      });
      resultText = "Whiteboard cleared.";
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
  // Custom API key auth — protects the endpoint without Vercel Deployment Protection
  const mcpSecret = process.env.WHITEBOARD_MCP_SECRET;
  if (mcpSecret) {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token !== mcpSecret) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Unauthorized" } },
        { status: 401 }
      );
    }
  }

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
