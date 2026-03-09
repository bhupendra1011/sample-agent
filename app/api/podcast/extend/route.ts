import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addSeconds } = body;

    if (!addSeconds || addSeconds <= 0) {
      return NextResponse.json(
        { error: "addSeconds must be a positive number" },
        { status: 400 },
      );
    }

    // Duration extension is handled client-side via the podcast store timer.
    // This route exists as a server-side acknowledgment and for future session tracking.
    return NextResponse.json({ success: true, addedSeconds: addSeconds });
  } catch (error) {
    console.error("[Podcast] Extend error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
