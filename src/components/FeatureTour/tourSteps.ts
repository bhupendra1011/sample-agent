export type TourStepPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  placement: TourStepPlacement;
  hostOnly?: boolean;
  isCentered?: boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "tour-welcome",
    title: "Welcome to RTC Convo AI Meeting",
    description:
      "This quick tour walks you through the controls and features available during your call. Use the arrows to navigate or skip at any time.",
    placement: "center",
    isCentered: true,
  },
  {
    id: "tour-meeting-name",
    title: "Meeting Name",
    description:
      "Your current meeting name is displayed here. Share this with participants so they know which room to join.",
    placement: "bottom",
  },
  {
    id: "tour-session-timer",
    title: "Session Timer",
    description:
      "Your session has a 15-minute time limit. When the timer runs out, you will be automatically logged out.",
    placement: "bottom",
  },
  {
    id: "tour-theme-toggle",
    title: "Theme Toggle",
    description:
      "Switch between light and dark mode to match your preference or environment.",
    placement: "bottom",
  },
  {
    id: "tour-mic-toggle",
    title: "Microphone",
    description:
      "Toggle your microphone on or off. When muted, other participants cannot hear you.",
    placement: "top",
  },
  {
    id: "tour-video-toggle",
    title: "Camera",
    description:
      "Toggle your camera on or off. When off, your video tile shows a placeholder avatar.",
    placement: "top",
  },
  {
    id: "tour-screen-share",
    title: "Screen Share",
    description:
      "Share your screen with all participants. The layout switches to a focused view when active.",
    placement: "top",
  },
  {
    id: "tour-whiteboard",
    title: "Whiteboard",
    description:
      "Open a collaborative whiteboard where all participants can draw and annotate together in real time.",
    placement: "top",
  },
  {
    id: "tour-share-meeting",
    title: "Share Meeting",
    description:
      "Copy meeting details and passphrases to invite others to this session.",
    placement: "top",
  },
  {
    id: "tour-end-call",
    title: "End Call",
    description:
      "Leave the meeting. This ends your session and returns you to the home screen.",
    placement: "top",
  },
  {
    id: "tour-agent-toggle",
    title: "AI Agent",
    description:
      "Invite or stop the AI Agent. Once active, the agent joins as a participant and responds in real time.",
    placement: "top",
    hostOnly: true,
  },
  {
    id: "tour-agent-settings",
    title: "Agent Settings",
    description:
      "Configure the AI Agent's LLM, voice, and MCP server settings across three dedicated tabs.",
    placement: "top",
    hostOnly: true,
  },
  {
    id: "tour-participants",
    title: "Participants",
    description:
      "Open the participants list in the left sidebar. The sidebar shows the Live Transcript by default; close the participants panel to return to the transcript.",
    placement: "top",
  },
];
