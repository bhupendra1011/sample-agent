// src/constants/heygenAvatars.ts
// Curated list of public HeyGen avatar IDs grouped by category.
// Label is shown in the dropdown; value is the avatar_id sent to HeyGen.

export interface HeyGenAvatarOption {
  label: string;
  value: string;
}

export interface HeyGenAvatarGroup {
  group: string;
  options: HeyGenAvatarOption[];
}

/** Public character avatars — one look per character for variety */
const CHARACTER_AVATARS: HeyGenAvatarGroup = {
  group: "Characters",
  options: [
    { label: "Thaddeus – Professional", value: "Thaddeus_ProfessionalLook_public" },
    { label: "Rika – Professional", value: "Rika_ProfessionalLook_public" },
    { label: "Pedro – Blue Shirt", value: "Pedro_Blue_Shirt_public" },
    { label: "Marianne – Red Suit", value: "Marianne_Red_Suit_public" },
    { label: "Katya – Pink Suit", value: "Katya_Pink_Suit_public" },
    { label: "Graham – Casual", value: "Graham_CasualLook_public" },
    { label: "Anthony – White Suit", value: "Anthony_White_Suit_public" },
    { label: "Alessandra – Grey Sweater", value: "Alessandra_Grey_Sweater_public" },
    { label: "Anastasia – Professional", value: "Anastasia_ProfessionalLook_public" },
    { label: "Amina – Blue Suit", value: "Amina_Blue_Suit_public" },
  ],
};

/** Specialty / role-based avatars */
const SPECIALTY_AVATARS: HeyGenAvatarGroup[] = [
  {
    group: "Doctors",
    options: [
      { label: "Ann – Doctor (Standing)", value: "Ann_Doctor_Standing2_public" },
      { label: "Dexter – Doctor (Standing)", value: "Dexter_Doctor_Standing2_public" },
      { label: "Judy – Doctor (Sitting)", value: "Judy_Doctor_Sitting2_public" },
    ],
  },
  {
    group: "Fitness",
    options: [
      { label: "Bryan – Fitness Coach", value: "Bryan_FitnessCoach_public" },
      { label: "Elenora – Fitness Coach", value: "Elenora_FitnessCoach_public" },
    ],
  },
  {
    group: "Lawyers",
    options: [
      { label: "Dexter – Lawyer", value: "Dexter_Lawyer_Sitting_public" },
      { label: "Judy – Lawyer", value: "Judy_Lawyer_Sitting2_public" },
    ],
  },
  {
    group: "Teachers",
    options: [
      { label: "Judy – Teacher (Standing)", value: "Judy_Teacher_Standing_public" },
      { label: "Judy – Teacher (Sitting)", value: "Judy_Teacher_Sitting_public" },
    ],
  },
  {
    group: "HR / Support",
    options: [
      { label: "June – HR", value: "June_HR_public" },
      { label: "Silas – HR", value: "SilasHR_public" },
      { label: "Silas – Customer Support", value: "Silas_CustomerSupport_public" },
    ],
  },
  {
    group: "Tech",
    options: [
      { label: "Bryan – IT", value: "Bryan_IT_Sitting_public" },
      { label: "Elenora – IT", value: "Elenora_IT_Sitting_public" },
    ],
  },
  {
    group: "Therapist",
    options: [
      { label: "Ann – Therapist", value: "Ann_Therapist_public" },
      { label: "Shawn – Therapist", value: "Shawn_Therapist_public" },
    ],
  },
];

/** All avatar groups in display order */
export const HEYGEN_AVATAR_GROUPS: HeyGenAvatarGroup[] = [
  CHARACTER_AVATARS,
  ...SPECIALTY_AVATARS,
];

/** Flat list of all avatars (useful for lookups) */
export const HEYGEN_ALL_AVATARS: HeyGenAvatarOption[] = HEYGEN_AVATAR_GROUPS.flatMap(
  (g) => g.options
);

/** Default avatar ID (Shawn – Therapist) */
export const HEYGEN_DEFAULT_AVATAR_ID = "Shawn_Therapist_public";
