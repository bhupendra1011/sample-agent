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
  {
    name: "draw_shape",
    description:
      "Draw a shape on the whiteboard. Supported shapes: rectangle, ellipse, triangle, rhombus, star. The shape will be drawn at the specified position with the given size and color. Use this for visual explanations — draw boxes for concepts, circles for highlights, etc.",
    inputSchema: {
      type: "object",
      properties: {
        shape: {
          type: "string",
          enum: ["rectangle", "ellipse", "triangle", "rhombus", "star"],
          description: "Type of shape to draw",
        },
        x: { type: "number", description: "X position (center)" },
        y: { type: "number", description: "Y position (center)" },
        width: { type: "number", description: "Width in pixels (default: 200)" },
        height: { type: "number", description: "Height in pixels (default: 150)" },
        color: {
          type: "array",
          items: { type: "number" },
          description: "RGB color as [r, g, b], e.g. [255, 0, 0] for red. Default: [51, 102, 255] (blue)",
        },
        strokeWidth: {
          type: "number",
          description: "Stroke width in pixels (default: 2)",
        },
      },
      required: ["shape", "x", "y"],
    },
  },
  {
    name: "draw_line",
    description:
      "Draw a straight line or arrow on the whiteboard between two points. Use arrows to show relationships, flows, or connections between concepts. Use lines for underlines, separators, or pointers.",
    inputSchema: {
      type: "object",
      properties: {
        x1: { type: "number", description: "Start X position" },
        y1: { type: "number", description: "Start Y position" },
        x2: { type: "number", description: "End X position" },
        y2: { type: "number", description: "End Y position" },
        arrow: {
          type: "boolean",
          description: "If true, draws an arrow instead of a plain line (default: false)",
        },
        color: {
          type: "array",
          items: { type: "number" },
          description: "RGB color as [r, g, b]. Default: [0, 0, 0] (black)",
        },
        strokeWidth: {
          type: "number",
          description: "Stroke width in pixels (default: 2)",
        },
      },
      required: ["x1", "y1", "x2", "y2"],
    },
  },
  {
    name: "draw_pencil",
    description:
      "Draw a freehand pencil path on the whiteboard. Provide an array of [x, y] coordinate points that form the path. Use this for handwritten-style annotations, underlining, circling items, or sketching. Keep paths simple (10-30 points) for best results.",
    inputSchema: {
      type: "object",
      properties: {
        points: {
          type: "array",
          items: {
            type: "array",
            items: { type: "number" },
          },
          description: "Array of [x, y] points forming the pencil path, e.g. [[100,100],[150,120],[200,100]]",
        },
        color: {
          type: "array",
          items: { type: "number" },
          description: "RGB color as [r, g, b]. Default: [255, 0, 0] (red)",
        },
        strokeWidth: {
          type: "number",
          description: "Stroke width in pixels (default: 4)",
        },
      },
      required: ["points"],
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
    case "draw_shape": {
      const shape = args.shape as string;
      const x = (args.x as number) ?? 0;
      const y = (args.y as number) ?? 0;
      const width = (args.width as number) ?? 200;
      const height = (args.height as number) ?? 150;
      const color = (args.color as number[]) ?? [51, 102, 255];
      const strokeWidth = (args.strokeWidth as number) ?? 2;
      if (!shape) {
        return jsonRpcError(id, -32602, "shape is required");
      }
      await storeCommand(channelName, {
        action: "draw_shape",
        params: { shape, x, y, width, height, color, strokeWidth },
      });
      resultText = `Drew a ${shape} on the whiteboard at (${x}, ${y}) with size ${width}x${height}.`;
      break;
    }
    case "draw_line": {
      const x1 = (args.x1 as number) ?? 0;
      const y1 = (args.y1 as number) ?? 0;
      const x2 = (args.x2 as number) ?? 100;
      const y2 = (args.y2 as number) ?? 100;
      const arrow = (args.arrow as boolean) ?? false;
      const lineColor = (args.color as number[]) ?? [0, 0, 0];
      const lineStroke = (args.strokeWidth as number) ?? 2;
      await storeCommand(channelName, {
        action: "draw_line",
        params: { x1, y1, x2, y2, arrow, color: lineColor, strokeWidth: lineStroke },
      });
      resultText = `Drew ${arrow ? "an arrow" : "a line"} from (${x1}, ${y1}) to (${x2}, ${y2}).`;
      break;
    }
    case "draw_pencil": {
      const points = args.points as number[][];
      const pencilColor = (args.color as number[]) ?? [255, 0, 0];
      const pencilStroke = (args.strokeWidth as number) ?? 4;
      if (!points || points.length < 2) {
        return jsonRpcError(id, -32602, "points array with at least 2 points is required");
      }
      await storeCommand(channelName, {
        action: "draw_pencil",
        params: { points, color: pencilColor, strokeWidth: pencilStroke },
      });
      resultText = `Drew a freehand path with ${points.length} points on the whiteboard.`;
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
