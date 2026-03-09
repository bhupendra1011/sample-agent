// src/config/podcast/themes.ts

import type { PodcastTheme, LightingPreset } from "@/types/podcast";

export const PODCAST_THEMES: PodcastTheme[] = [
  {
    id: "studio",
    name: "Studio",
    cssGradient: "linear-gradient(135deg, #1a0533 0%, #2d1b4e 30%, #1a0533 60%, #0f0320 100%)",
    accentColor: "#a855f7",
    lightingFilter: "brightness(1.05) contrast(1.1)",
  },
  {
    id: "coffee-shop",
    name: "Coffee Shop",
    cssGradient: "linear-gradient(135deg, #3e2723 0%, #5d4037 30%, #4e342e 60%, #2c1a12 100%)",
    accentColor: "#d4a574",
    lightingFilter: "brightness(1.1) saturate(1.2) sepia(0.15)",
  },
  {
    id: "park",
    name: "Park",
    cssGradient: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 30%, #388e3c 50%, #1565c0 100%)",
    accentColor: "#66bb6a",
    lightingFilter: "brightness(1.15) saturate(1.1)",
  },
  {
    id: "night-city",
    name: "Night City",
    cssGradient: "linear-gradient(135deg, #0d1b2a 0%, #1b2838 30%, #1a237e 60%, #4a148c 100%)",
    accentColor: "#7c4dff",
    lightingFilter: "brightness(0.95) contrast(1.15) saturate(1.3)",
  },
  {
    id: "tech-lab",
    name: "Tech Lab",
    cssGradient: "linear-gradient(135deg, #004d40 0%, #00695c 30%, #00796b 50%, #003d33 100%)",
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
