import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";
import crypto from "crypto";
import type { PodcastStartRequest } from "@/types/podcast";
import { podcastSessions } from "../sessions";
import type { ServerPodcastSession } from "../sessions";

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE!;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PodcastStartRequest;
    const { topic, duration } = body;

    if (!topic || !duration) {
      return NextResponse.json(
        { error: "topic and duration are required" },
        { status: 400 },
      );
    }

    if (!APP_ID || !APP_CERTIFICATE) {
      return NextResponse.json(
        { error: "Agora APP_ID or APP_CERTIFICATE not configured" },
        { status: 500 },
      );
    }

    const sessionId = crypto.randomUUID().slice(0, 8);
    const channel = `podcast-${sessionId}`;

    // Pre-assign UIDs
    const viewerUid = 5000 + Math.floor(Math.random() * 1000);
    const hostRtcUid = 1001;
    const guestRtcUid = 1002;
    const hostAvatarUid = 999998;
    const guestAvatarUid = 999999;

    const tokenExpiration = 1800; // 30 min
    const privilegeExpiration = 1800;

    // Generate viewer token (RTC + RTM)
    const viewerToken = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      String(viewerUid),
      RtcRole.SUBSCRIBER,
      tokenExpiration,
      privilegeExpiration,
    );

    // Generate host agent token (RTC + RTM for transcript)
    const hostAgentToken = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      String(hostRtcUid),
      RtcRole.PUBLISHER,
      tokenExpiration,
      privilegeExpiration,
    );

    // Generate guest agent token (RTC + RTM for transcript)
    const guestAgentToken = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channel,
      String(guestRtcUid),
      RtcRole.PUBLISHER,
      tokenExpiration,
      privilegeExpiration,
    );

    // Store session server-side
    const session: ServerPodcastSession = {
      sessionId,
      channel,
      viewerUid,
      hostRtcUid,
      guestRtcUid,
      hostAvatarUid,
      guestAvatarUid,
      hostAgentId: null,
      guestAgentId: null,
      topic,
      duration,
      createdAt: Date.now(),
      wrapUpAt: null,
    };
    podcastSessions.set(sessionId, session);

    console.log(`[Podcast] Session started: ${sessionId}, channel: ${channel}`);

    return NextResponse.json({
      sessionId,
      channel,
      rtcToken: viewerToken,
      rtmToken: viewerToken,
      uid: viewerUid,
      hostRtcUid,
      guestRtcUid,
      hostAgentToken,
      guestAgentToken,
      hostAvatarUid,
      guestAvatarUid,
    });
  } catch (error) {
    console.error("[Podcast] Start error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
