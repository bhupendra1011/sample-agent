import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

const REDIS_KEY_PREFIX = "wb:";

interface WhiteboardCommand {
  action: string;
  params: Record<string, unknown>;
}

/**
 * GET /api/whiteboard/commands?channelName=xxx
 *
 * Polling endpoint for the client. Returns pending whiteboard commands
 * from Redis and clears them atomically.
 */
export async function GET(request: NextRequest) {
  try {
    const channelName = request.nextUrl.searchParams.get("channelName");
    if (!channelName) {
      return NextResponse.json(
        { commands: [], error: "channelName is required" },
        { status: 400 }
      );
    }

    const key = `${REDIS_KEY_PREFIX}${channelName}`;

    // Read all pending commands and delete the key atomically via pipeline
    const pipeline = redis.pipeline();
    pipeline.lrange(key, 0, -1);
    pipeline.del(key);
    const results = await pipeline.exec();

    const rawCommands = (results[0] as string[]) ?? [];

    // Commands are stored newest-first (LPUSH), reverse to get chronological order
    const commands: WhiteboardCommand[] = rawCommands
      .reverse()
      .map((raw) => {
        if (typeof raw === "string") {
          return JSON.parse(raw) as WhiteboardCommand;
        }
        // Already parsed by @upstash/redis
        return raw as WhiteboardCommand;
      });

    return NextResponse.json({ commands });
  } catch (err) {
    console.error("[Whiteboard Commands] Error:", err);
    return NextResponse.json(
      { commands: [], error: "Failed to fetch commands" },
      { status: 500 }
    );
  }
}
