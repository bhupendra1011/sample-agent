// src/constants/anamAvatars.ts
// Curated list of Anam stock avatar IDs (UUIDs). Label is shown in the dropdown; value is the avatar_id sent to Anam.
// Full gallery: https://docs.anam.ai/resources/avatar-gallery

export interface AnamAvatarOption {
  label: string;
  value: string;
}

export const ANAM_AVATAR_OPTIONS: AnamAvatarOption[] = [
  { label: "Gabriel", value: "6cc28442-cccd-42a8-b6e4-24b7210a09c5" },
  { label: "Layla", value: "ae2ea8c1-db28-47e3-b6ea-493e4ed3c554" },
  { label: "Cara", value: "30fa96d0-26c4-4e55-94a0-517025942e18" },
  { label: "Mila", value: "edf6fdcb-acab-44b8-b974-ded72665ee26" },

  { label: "Liv", value: "071b0286-4cce-4808-bee2-e642f1062de3" },
  { label: "Kevin", value: "ccf00c0e-7302-455b-ace2-057e0cf58127" },
  { label: "Leo", value: "aa5d6abd-416f-4dd4-a123-b5b29bf1644a" },
];

/** Default Anam avatar (Gabriel) */
export const ANAM_DEFAULT_AVATAR_ID = "6cc28442-cccd-42a8-b6e4-24b7210a09c5";
