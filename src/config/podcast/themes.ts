// src/config/podcast/themes.ts

import type { PodcastTheme, LightingPreset } from "@/types/podcast";

/** Unsplash CDN URLs for actual photos (indoor studio / ambient). Uses known working photo IDs. */
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1920&q=80`;

export const PODCAST_THEMES: PodcastTheme[] = [
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    cssGradient: "linear-gradient(135deg, #3e2723 0%, #5d4037 30%, #4e342e 60%, #2c1a12 100%)",
    backgroundImage: U("1495474473367-402967ef43fa"), // coffee
    accentColor: "#d4a574",
    lightingFilter: "brightness(1.1) saturate(1.2) sepia(0.15)",
  },
  {
    id: "loft",
    name: "Loft",
    cssGradient: "linear-gradient(135deg, #2c1810 0%, #4a3728 30%, #3d2c21 60%, #1a120c 100%)",
    backgroundImage: U("1506905925346-21bda4d32df4"), // mountains/loft style
    accentColor: "#e8c547",
    lightingFilter: "brightness(1.08) saturate(1.1) sepia(0.08)",
  },
  {
    id: "night-city",
    name: "Night City",
    cssGradient: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 30%, #1a237e 60%, #4a148c 100%)",
    backgroundImage: U("1514565131-fce0801e5785"), // night
    accentColor: "#7c4dff",
    lightingFilter: "brightness(0.95) contrast(1.15) saturate(1.3)",
  },
  {
    id: "tech-lab",
    name: "Tech Lab",
    cssGradient: "linear-gradient(135deg, #004d40 0%, #00695c 30%, #00796b 50%, #003d33 100%)",
    backgroundImage: U("1518770660439-4636190af475"), // tech
    accentColor: "#00e5ff",
    lightingFilter: "brightness(1.0) contrast(1.1) saturate(0.9)",
  },
];

export const LIGHTING_PRESETS: LightingPreset[] = [
  { id: "warm", name: "Warm", cssFilter: "brightness(1.1) saturate(1.2) sepia(0.1)" },
  { id: "cool", name: "Cool", cssFilter: "brightness(1.05) saturate(0.9) hue-rotate(10deg)" },
  { id: "moody", name: "Moody", cssFilter: "brightness(0.85) contrast(1.2) saturate(1.3)" },
  { id: "natural", name: "Natural", cssFilter: "brightness(1.0) contrast(1.05)" },
];

export const DEFAULT_THEME = PODCAST_THEMES[0];
export const DEFAULT_LIGHTING = LIGHTING_PRESETS[3]; // Natural

/** Hex to RGB (0-255). */
function hexToRgb(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  const v = parseInt(n.length === 3 ? n.replace(/(.)/g, "$1$1") : n, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** RGB to hex. */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}

/** Blend two hex colors by weight (0–1 for second color). */
function blendHex(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return rgbToHex(
    r1 + (r2 - r1) * weight,
    g1 + (g2 - g1) * weight,
    b1 + (b2 - b1) * weight
  );
}

/** Darken hex by a factor (0–1, e.g. 0.3 = 30% darker). */
function darkenHex(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

/**
 * Ambient lighting display color per theme + preset.
 * Each preset (Warm, Cool, Moody, Natural) gets a distinct color derived from the theme so the ambiance is clear.
 */
export function getAmbientLightColor(themeAccent: string, presetId: string): string {
  const warmTint = "#e8a030";
  const coolTint = "#60b8d0";
  switch (presetId) {
    case "warm":
      return blendHex(themeAccent, warmTint, 0.5);
    case "cool":
      return blendHex(themeAccent, coolTint, 0.5);
    case "moody":
      return darkenHex(blendHex(themeAccent, "#4a3a6a", 0.4), 0.15);
    case "natural":
    default:
      return themeAccent;
  }
}
