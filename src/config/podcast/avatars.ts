// src/config/podcast/avatars.ts

import type { PodcastAvatarConfig } from "@/types/podcast";

// ElevenLabs voice IDs — distinct voices per avatar where possible
// Male: Adam (pNInz6obpgDQGcFmaJgB), Antoni (ErXwobaYiN019PkySvjV), Josh (TxGEqnHWrfWFTfGW9XjX)
// Female: Rachel (21m00Tcm4TlvDq8ikWAM), Bella (EXAVITQu4vr4xnSDxMaL), Elli (MF3mGyEYCl7XYWbV9V6O), Dorothy (ThT5KcBeYPX3keUQqHPh)

/**
 * Five hosts — mixed male/female. Order alternates F/M/F/M/F for horizontal scroll
 * so the first tiles on a phone show both genders.
 */
export const HOST_AVATARS: PodcastAvatarConfig[] = [
  {
    id: "anne",
    name: "Anne",
    anamAvatarId: "27e12daa-50fc-4384-93c2-ebca73f1f78d",
    role: "host",
    defaultVoiceName: "ThT5KcBeYPX3keUQqHPh",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/anne_home.png",
  },
  {
    id: "gabriel",
    name: "Gabriel",
    anamAvatarId: "6cc28442-cccd-42a8-b6e4-24b7210a09c5",
    role: "host",
    defaultVoiceName: "pNInz6obpgDQGcFmaJgB",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/gabriel_table.png",
  },
  {
    id: "sophie",
    name: "Sophie",
    anamAvatarId: "6dbc1e47-7768-403e-878a-94d7fcc3677b",
    role: "host",
    defaultVoiceName: "MF3mGyEYCl7XYWbV9V6O",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/sophie_sofa.png",
  },
  {
    id: "kevin",
    name: "Kevin",
    anamAvatarId: "ccf00c0e-7302-455b-ace2-057e0cf58127",
    role: "host",
    defaultVoiceName: "ErXwobaYiN019PkySvjV",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/kevin_table.png",
  },
  {
    id: "mia",
    name: "Mia",
    anamAvatarId: "edf6fdcb-acab-44b8-b974-ded72665ee26",
    role: "host",
    defaultVoiceName: "21m00Tcm4TlvDq8ikWAM",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/mia_studio.png",
  },
];

/** Five guests — mixed; order F/M/F/M/F for first-viewport diversity */
export const GUEST_AVATARS: PodcastAvatarConfig[] = [
  {
    id: "liv",
    name: "Liv",
    anamAvatarId: "071b0286-4cce-4808-bee2-e642f1062de3",
    role: "guest",
    defaultVoiceName: "EXAVITQu4vr4xnSDxMaL",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/liv_home.png",
  },
  {
    id: "hunter",
    name: "Hunter",
    anamAvatarId: "ecfb2ddb-80ec-4526-88a7-299a4738957c",
    role: "guest",
    defaultVoiceName: "TxGEqnHWrfWFTfGW9XjX",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/hunter_table.png",
  },
  {
    id: "bella",
    name: "Bella",
    anamAvatarId: "dc9aa3e1-32f2-499e-9921-ecabac1076fc",
    role: "guest",
    defaultVoiceName: "MF3mGyEYCl7XYWbV9V6O",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/bella_sofa.png",
  },
  {
    id: "finn",
    name: "Finn",
    anamAvatarId: "8a339c9f-0666-46bd-ab27-e90acd0409dc",
    role: "guest",
    defaultVoiceName: "pNInz6obpgDQGcFmaJgB",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/finn_lean.png",
  },
  {
    id: "julia",
    name: "Julia",
    anamAvatarId: "edcb8f1a-334f-4cdb-871c-5c513db806a7",
    role: "guest",
    defaultVoiceName: "EXAVITQu4vr4xnSDxMaL",
    imageUrl: "https://lab.anam.ai/persona_thumbnails/julia_sofa.png",
  },
];

export const DEFAULT_HOST_AVATAR =
  HOST_AVATARS.find((a) => a.id === "gabriel") ?? HOST_AVATARS[0];
export const DEFAULT_GUEST_AVATAR =
  GUEST_AVATARS.find((a) => a.id === "hunter") ?? GUEST_AVATARS[0];
