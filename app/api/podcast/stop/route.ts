import { NextRequest, NextResponse } from "next/server";
import { podcastSessions } from "../sessions";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

async function stopSingleAgent(agentId: string): Promise<boolean> {
  try {
    const authHeader = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString("base64");
    const resp = await fetch(
      `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/agents/${agentId}/leave`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authHeader}`,
        },
      },
    );
    if (!resp.ok) {
      console.error(`[Podcast] Failed to stop agent ${agentId}:`, await resp.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Podcast] Error stopping agent ${agentId}:`, err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, hostAgentId, guestAgentId } = body;

    if (!CUSTOMER_ID || !CUSTOMER_SECRET) {
      return NextResponse.json(
        { error: "Server missing Agora credentials." },
        { status: 500 },
      );
    }

    // Try to get agent IDs from session map first, fall back to request body
    let hostId = hostAgentId;
    let guestId = guestAgentId;
    if (sessionId && podcastSessions.has(sessionId)) {
      const session = podcastSessions.get(sessionId)!;
      hostId = hostId || session.hostAgentId;
      guestId = guestId || session.guestAgentId;
      podcastSessions.delete(sessionId);
    }

    if (hostId) await stopSingleAgent(hostId);
    if (guestId) await stopSingleAgent(guestId);

    console.log(`[Podcast] Session ${sessionId} stopped. Host: ${hostId}, Guest: ${guestId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Podcast] Stop error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
