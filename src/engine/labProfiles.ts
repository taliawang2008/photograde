// Lab processing profiles - simulates different film lab scanning styles
// Based on research from professional film labs and scanner comparisons
// Sources: Ikigai Film Lab, Carmencita Film Lab, Arthur G Photo, and others
import type { RGBOffset } from '../types';

export interface LabProfile {
  id: string;
  name: string;
  description: string;
  // Scanner characteristics
  contrast: number;      // Lab scanner contrast (0.8 - 1.3)
  saturation: number;    // Color saturation adjustment (0.8 - 1.2)
  colorCast: RGBOffset;  // Scanner color bias
  // Additional processing
  warmth: number;        // Temperature shift (-0.2 to 0.2)
  brightness: number;    // Overall brightness adjustment (-0.1 to 0.1)
  // Optional styling
  fadedBlacks?: number;  // Lifted blacks amount (0 - 0.1)
  crushedHighlights?: number; // Compressed highlights (0 - 0.1)
}

export const labProfiles: Record<string, LabProfile> = {
  'frontier-sp3000': {
    id: 'frontier-sp3000',
    name: 'Frontier SP3000',
    description: 'Punchy contrast, vibrant colors, cyan shadows, yellow skin tones',
    // Research: Enhanced contrast with intensified blacks, vibrant saturation
    contrast: 1.15,
    saturation: 1.12,
    // Cooler shadows (blue/cyan lean), skin tones lean yellow/golden
    colorCast: { r: 0.03, g: -0.01, b: -0.03 },
    warmth: 0.03,
    brightness: 0.01,
    crushedHighlights: 0.02,
  },

  'noritsu-hs1800': {
    id: 'noritsu-hs1800',
    name: 'Noritsu HS-1800',
    description: 'Neutral, softer hues, peachy skin tones, gradual transitions',
    // Research: Flatter with more shadow/highlight detail, softer lighter hues
    contrast: 1.02,
    saturation: 0.98,
    // Peachy skin tones, warmer overall but neutral shadows
    colorCast: { r: 0.02, g: 0.01, b: 0.0 },
    warmth: 0.04,
    brightness: 0.0,
  },

  'pakon-f135': {
    id: 'pakon-f135',
    name: 'Pakon F135',
    description: 'Great skin tones, heavy detail, may need contrast boost',
    // Research: Excellent color rendering, can be slightly flat
    contrast: 0.95,
    saturation: 1.0,
    // Occasional yellow/green tint reported, good skin tones
    colorCast: { r: 0.01, g: 0.02, b: 0.0 },
    warmth: 0.01,
    brightness: 0.02,
    fadedBlacks: 0.03,
  },

  'dslr-raw': {
    id: 'dslr-raw',
    name: 'DSLR Scan (Linear)',
    description: 'Flat linear profile - neutral starting point for grading',
    // Research: Flat, neutral for editing from scratch (Negative Lab Pro linear mode)
    contrast: 0.90,
    saturation: 0.95,
    colorCast: { r: 0.0, g: 0.0, b: 0.0 },
    warmth: 0.0,
    brightness: 0.0,
  },

  'dslr-corrected': {
    id: 'dslr-corrected',
    name: 'DSLR Scan (NLP Corrected)',
    description: 'Custom camera profile calibrated for negatives',
    // Research: Negative Lab Pro custom profiles compensate for inverted effects
    contrast: 1.0,
    saturation: 1.02,
    // Minimal cyan/blue cast correction (inverse of orange mask)
    colorCast: { r: 0.01, g: 0.0, b: -0.01 },
    warmth: 0.0,
    brightness: 0.0,
  },

  'cinestill-cs41': {
    id: 'cinestill-cs41',
    name: 'CineStill Cs41 Home Dev',
    description: 'Vibrant true-to-life colors, home processing warmth',
    // Note: Cs41 is a processing kit, not a scanner - these values simulate
    // the warmer, slightly more contrasty look of home-developed C41
    contrast: 1.08,
    saturation: 1.04,
    colorCast: { r: 0.02, g: 0.01, b: -0.01 },
    warmth: 0.05,
    brightness: 0.0,
  },

  'vintage-drugstore': {
    id: 'vintage-drugstore',
    name: 'Vintage Drugstore',
    description: '1990s one-hour photo - faded, warm, lifted blacks',
    // Hypothetical vintage consumer lab aesthetic
    contrast: 0.92,
    saturation: 0.85,
    colorCast: { r: 0.05, g: 0.02, b: -0.04 },
    warmth: 0.12,
    brightness: 0.06,
    fadedBlacks: 0.08,
    crushedHighlights: 0.06,
  },

  'pro-lab-premium': {
    id: 'pro-lab-premium',
    name: 'Pro Lab Premium',
    description: 'High-end professional lab - accurate, neutral, refined',
    // Hypothetical high-end professional lab - minimal intervention
    contrast: 1.0,
    saturation: 1.0,
    colorCast: { r: 0.0, g: 0.0, b: 0.0 },
    warmth: 0.0,
    brightness: 0.0,
  },
};

// Research Sources:
// - Frontier SP3000: https://ikigaifilmlab.com.au/fujifilm-frontier-or-noritsu
// - Noritsu HS-1800: https://carmencitafilmlab.com/blog/frontier-vs-noritsu-round-2/
// - Pakon F135: https://jcstreetwolf.wordpress.com/2014/12/21/the-kodak-pakon-f135-scanner/
// - DSLR Scanning: https://www.negativelabpro.com/guide/scanning/
// - CineStill Cs41: https://cinestillfilm.com/products/cs41-simplified-color-processing-at-home-quart-kit-c-41-chemistry
//
// Note: "Vintage Drugstore" and "Pro Lab Premium" are hypothetical profiles
// based on general knowledge of consumer vs professional lab characteristics.

export const labProfileList = Object.values(labProfiles);
