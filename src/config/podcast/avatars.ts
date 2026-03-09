// src/config/podcast/avatars.ts

import type { PodcastAvatarConfig } from "@/types/podcast";

// ElevenLabs voice IDs — distinct voices for each avatar
// Male voices: Adam (pNInz6obpgDQGcFmaJgB), Antoni (ErXwobaYiN019PkySvjV), Josh (TxGEqnHWrfWFTfGW9XjX)
// Female voices: Rachel (21m00Tcm4TlvDq8ikWAM), Bella (EXAVITQu4vr4xnSDxMaL), Elli (MF3mGyEYCl7XYWbV9V6O), Dorothy (ThT5KcBeYPX3keUQqHPh)

export const HOST_AVATARS: PodcastAvatarConfig[] = [
  {
    id: "gabriel",
    name: "Gabriel",
    anamAvatarId: "6cc28442-cccd-42a8-b6e4-24b7210a09c5",
    role: "host",
    defaultVoiceName: "pNInz6obpgDQGcFmaJgB", // Adam
  },
  {
    id: "kevin",
    name: "Kevin",
    anamAvatarId: "ccf00c0e-7302-455b-ace2-057e0cf58127",
    role: "host",
    defaultVoiceName: "ErXwobaYiN019PkySvjV", // Antoni
  },
  {
    id: "leo",
    name: "Leo",
    anamAvatarId: "aa5d6abd-416f-4dd4-a123-b5b29bf1644a",
    role: "host",
    defaultVoiceName: "TxGEqnHWrfWFTfGW9XjX", // Josh
  },
];

export const GUEST_AVATARS: PodcastAvatarConfig[] = [
  {
    id: "layla",
    name: "Layla",
    anamAvatarId: "ae2ea8c1-db28-47e3-b6ea-493e4ed3c554",
    role: "guest",
    defaultVoiceName: "21m00Tcm4TlvDq8ikWAM", // Rachel
  },
  {
    id: "cara",
    name: "Cara",
    anamAvatarId: "30fa96d0-26c4-4e55-94a0-517025942e18",
    role: "guest",
    defaultVoiceName: "EXAVITQu4vr4xnSDxMaL", // Bella
  },
  {
    id: "mila",
    name: "Mila",
    anamAvatarId: "edf6fdcb-acab-44b8-b974-ded72665ee26",
    role: "guest",
    defaultVoiceName: "MF3mGyEYCl7XYWbV9V6O", // Elli
  },
  {
    id: "liv",
    name: "Liv",
    anamAvatarId: "071b0286-4cce-4808-bee2-e642f1062de3",
    role: "guest",
    defaultVoiceName: "ThT5KcBeYPX3keUQqHPh", // Dorothy
  },
];

export const DEFAULT_HOST_AVATAR = HOST_AVATARS[0];
export const DEFAULT_GUEST_AVATAR = GUEST_AVATARS[0];
