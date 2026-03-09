import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import { WRAPUP_INJECTION } from "@/config/podcast/prompts";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID!;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostAgentId, channelName, currentSystemMessages } = body;

    if (!hostAgentId || !channelName) {
      return NextResponse.json(
        { error: "hostAgentId and channelName are required" },
        { status: 400 },
      );
    }

    if (!APP_CERTIFICATE || !CUSTOMER_ID || !CUSTOMER_SECRET) {
      return NextResponse.json(
        { error: "Server missing Agora credentials." },
        { status: 500 },
      );
    }

    // Append wrap-up injection to system messages
    const systemMessages = [
      ...(currentSystemMessages || []),
      { role: "system", content: WRAPUP_INJECTION },
    ];

    // Regenerate token for the update call
    const hostRtcUid = 1001;
    const agentRtcToken = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      String(hostRtcUid),
      RtcRole.PUBLISHER,
      1800,
      1800,
    );

    const updatePayload = {
      properties: {
        token: agentRtcToken,
        llm: {
          system_messages: systemMessages,
        },
      },
    };

    const authHeader = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString("base64");
    const apiUrl = `https://api.agora.io/api/conversational-ai-agent/v2/projects/${APP_ID}/agents/${hostAgentId}/update`;

    const agoraResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(updatePayload),
    });

    const responseData = await agoraResponse.json();

    if (!agoraResponse.ok) {
      console.error("[Podcast] Wrap-up update failed:", responseData);
      return NextResponse.json(
        { error: "Failed to update agent for wrap-up", details: responseData },
        { status: agoraResponse.status },
      );
    }

    console.log(`[Podcast] Wrap-up triggered for host agent: ${hostAgentId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Podcast] Wrap-up error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
