// 胶片模拟配置 - 扩展版
import type { FilmType, FilmProfile } from '../types';

// Shared Matrices
// Shared Matrices
type Mat3 = [number, number, number, number, number, number, number, number, number];

const MAT_WARM: Mat3 = [
  1.05, -0.05, 0.0,
  0.0, 1.02, -0.02,
  -0.05, 0.05, 1.0
];
const MAT_PORTRAIT: Mat3 = [
  1.02, -0.01, -0.01,
  0.01, 1.01, -0.02,
  -0.01, 0.01, 1.0
];
const MAT_FUJI: Mat3 = [
  0.95, 0.05, 0.0,
  0.0, 1.02, -0.02,
  0.0, 0.05, 1.05
];
const MAT_AUTUMN: Mat3 = [
  1.15, -0.1, -0.05,  // Red boosts, Green cuts
  0.2, 0.85, -0.05,   // Green shifts to Red (Yellow)
  -0.05, -0.05, 1.1   // Blue boosts slightly
];

export const filmProfiles: Record<Exclude<FilmType, 'none'>, FilmProfile> = {
  // ==================== COLOR NEGATIVE ====================

  'amber-gold': {
    name: 'K-Amber Gold 200',
    shadowShift: { r: 0.04, g: 0.02, b: -0.01 },
    highlightShift: { r: 0.06, g: 0.03, b: -0.03 },
    contrast: 1.12,
    saturation: 1.25,
    warmth: 0.18,
    grainAmount: 0.025,
    grainSize: 0.8,
    grainRoughness: 0.6, // Standard negative
    acutance: 0.1, // Slight sharpening
    isBlackAndWhite: false,
    colorMatrix: MAT_WARM,
  },

  'autumn-breeze': {
    name: 'F-Autumn Breeze',
    shadowShift: { r: -0.02, g: 0.01, b: 0.03 }, // Teal shadows
    highlightShift: { r: 0.04, g: 0.02, b: -0.03 }, // Creamy warm highlights
    contrast: 0.95, // Soft midtones
    saturation: 1.1, // Golden hour boost
    warmth: 0.20, // Very warm
    grainAmount: 0.03,
    grainSize: 0.75,
    grainRoughness: 0.4, // Organic/Cloudy
    isBlackAndWhite: false,
    colorMatrix: MAT_AUTUMN, // Green -> Olive shift

    // Recipe: Matte Shadow & Dreamy Glow
    curves: {
      rgb: [
        { x: 0, y: 30 },    // Lifted blacks (Matte)
        { x: 50, y: 65 },   // Soft shadows
        { x: 128, y: 128 }, // Neutral mids
        { x: 255, y: 245 }  // Soft whites
      ],
      red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
      blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    },
    halation: 0.35,
    halationRadius: 0.6,
    halationThreshold: 0.2, // Glows easily
    halationColor: '#FF9955', // Warm sunset glow
  },

  'portrait-160': {
    name: 'P-Portrait 160',
    shadowShift: { r: 0.01, g: 0.015, b: 0.01 },
    highlightShift: { r: 0.02, g: 0.01, b: -0.01 },
    contrast: 0.92,
    saturation: 0.85,
    warmth: 0.03,
    grainAmount: 0.01,
    grainSize: 0.6,
    isBlackAndWhite: false,
  },

  'portrait-400': {
    name: 'P-Portrait 400',
    shadowShift: { r: 0.015, g: 0.02, b: 0.01 },
    highlightShift: { r: 0.025, g: 0.015, b: -0.01 },
    contrast: 0.95,
    saturation: 0.88,
    warmth: 0.05,
    grainAmount: 0.018,
    grainSize: 0.9,
    grainRoughness: 0.3, // Very smooth T-Grain
    isBlackAndWhite: false,
    colorMatrix: MAT_PORTRAIT,
  },

  'portrait-800': {
    name: 'P-Portrait 800',
    shadowShift: { r: 0.02, g: 0.025, b: 0.015 },
    highlightShift: { r: 0.03, g: 0.02, b: 0.0 },
    contrast: 0.98,
    saturation: 0.9,
    warmth: 0.08,
    grainAmount: 0.035,
    grainSize: 1.1,
    isBlackAndWhite: false,
  },

  'vivid-100': {
    name: 'K-Vivid 100',
    shadowShift: { r: -0.01, g: 0.0, b: 0.02 },
    highlightShift: { r: 0.03, g: 0.01, b: -0.02 },
    contrast: 1.18,
    saturation: 1.35,
    warmth: 0.02,
    grainAmount: 0.008,
    grainSize: 0.4,
    isBlackAndWhite: false,
  },

  'max-400': {
    name: 'K-Max 400',
    shadowShift: { r: 0.03, g: 0.02, b: -0.02 },
    highlightShift: { r: 0.05, g: 0.02, b: -0.03 },
    contrast: 1.1,
    saturation: 1.2,
    warmth: 0.12,
    grainAmount: 0.028,
    grainSize: 0.85,
    isBlackAndWhite: false,
  },

  'budget-color': {
    name: 'K-Color 200',
    shadowShift: { r: 0.03, g: 0.015, b: -0.015 },
    highlightShift: { r: 0.04, g: 0.02, b: -0.02 },
    contrast: 1.08,
    saturation: 1.15,
    warmth: 0.1,
    grainAmount: 0.022,
    grainSize: 0.75,
    isBlackAndWhite: false,
  },

  // ==================== SLIDE/REVERSAL ====================

  'vintage-chrome': {
    name: 'K-Vintage 64',
    shadowShift: { r: 0.02, g: 0.0, b: -0.02 },
    highlightShift: { r: 0.04, g: 0.01, b: -0.03 },
    contrast: 1.25,
    saturation: 1.4,
    warmth: 0.15,
    grainAmount: 0.012,
    grainSize: 0.5,
    isBlackAndWhite: false,
  },

  'chrome-100': {
    name: 'K-Chrome 100',
    shadowShift: { r: 0.0, g: 0.01, b: 0.02 },
    highlightShift: { r: 0.01, g: 0.0, b: 0.01 },
    contrast: 1.15,
    saturation: 1.2,
    warmth: -0.05,
    grainAmount: 0.01,
    grainSize: 0.45,
    isBlackAndWhite: false,
  },

  // ==================== COLOR NEGATIVE (ALT) ====================

  'verdant-400': {
    name: 'F-Verdant 400',
    shadowShift: { r: -0.02, g: 0.035, b: 0.01 },
    highlightShift: { r: 0.0, g: 0.025, b: -0.01 },
    contrast: 1.08,
    saturation: 1.12,
    warmth: -0.05,
    grainAmount: 0.025,
    grainSize: 0.85,
    isBlackAndWhite: false,
  },

  'f-portrait-400': {
    name: 'F-Portrait 400H',
    shadowShift: { r: -0.01, g: 0.02, b: 0.02 },
    highlightShift: { r: 0.01, g: 0.015, b: 0.01 },
    contrast: 0.9,
    saturation: 0.82,
    warmth: -0.02,
    grainAmount: 0.015,
    grainSize: 0.8,
    isBlackAndWhite: false,
    colorMatrix: MAT_FUJI,
  },

  'f-c200': {
    name: 'F-Color 200',
    shadowShift: { r: -0.01, g: 0.025, b: 0.0 },
    highlightShift: { r: 0.01, g: 0.02, b: -0.01 },
    contrast: 1.05,
    saturation: 1.1,
    warmth: -0.03,
    grainAmount: 0.02,
    grainSize: 0.7,
    isBlackAndWhite: false,
  },

  // ==================== SLIDE (ALT) ====================

  'natural-100': {
    name: 'F-Natural 100F',
    shadowShift: { r: 0.0, g: 0.005, b: 0.01 },
    highlightShift: { r: 0.01, g: 0.005, b: 0.005 },
    contrast: 1.08,
    saturation: 1.15,
    warmth: 0.0,
    grainAmount: 0.008,
    grainSize: 0.5,
    isBlackAndWhite: false,
  },

  'vivid-50': {
    name: 'F-Vivid 50',
    shadowShift: { r: 0.01, g: 0.0, b: 0.03 },
    highlightShift: { r: 0.03, g: 0.01, b: 0.02 },
    contrast: 1.25,
    saturation: 1.6,
    warmth: 0.02,
    grainAmount: 0.006,
    grainSize: 0.4,
    acutance: 0.3, // High sharpness
    isBlackAndWhite: false,
  },

  'soft-100': {
    name: 'F-Soft 100',
    shadowShift: { r: 0.005, g: 0.01, b: 0.01 },
    highlightShift: { r: 0.015, g: 0.01, b: 0.005 },
    contrast: 1.02,
    saturation: 1.0,
    warmth: 0.02,
    grainAmount: 0.007,
    grainSize: 0.45,
    isBlackAndWhite: false,
  },

  // ==================== CINEMA ====================

  'motion-800t': {
    name: 'C-Motion 800T',
    shadowShift: { r: -0.03, g: 0.01, b: 0.05 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.03 },
    contrast: 1.05,
    saturation: 1.1,
    warmth: -0.15,
    grainAmount: 0.04,
    grainSize: 1.0,
    isBlackAndWhite: false,
    colorMatrix: [
      1.0, 0.0, 0.0,
      0.0, 0.95, 0.05,
      0.0, 0.05, 1.15
    ], // Halation-heavy, cool shadows
  },

  'motion-50d': {
    name: 'C-Motion 50D',
    shadowShift: { r: -0.01, g: 0.005, b: 0.02 },
    highlightShift: { r: 0.02, g: 0.01, b: 0.01 },
    contrast: 1.12,
    saturation: 1.2,
    warmth: 0.0,
    grainAmount: 0.01,
    grainSize: 0.5,
    isBlackAndWhite: false,
  },

  // ==================== BLACK & WHITE ====================

  'mono-classic-400': {
    name: 'I-Classic 400',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.2,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.035,
    grainSize: 0.85,
    isBlackAndWhite: true,
  },

  'mono-classic-tx': {
    name: 'K-Classic 400',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.18,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.03,
    grainSize: 0.9,
    grainRoughness: 0.9, // Classic Cubic Grain - Rough/Sharp
    isBlackAndWhite: true,
  },

  'mono-grain-3200': {
    name: 'I-Grain 3200',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.28,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.055,
    grainSize: 1.3,
    isBlackAndWhite: true,
  },

  'mono-fine-100': {
    name: 'K-Fine 100',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.15,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.012,
    grainSize: 0.5,
    acutance: 0.4, // Very high acutance (T-Grain)
    isBlackAndWhite: true,
  },

  'mono-fine-ac': {
    name: 'F-Fine 100',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.1,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.01,
    grainSize: 0.45,
    isBlackAndWhite: true,
  },

  'mono-fine-pf': {
    name: 'I-Fine 50',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.22,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.006,
    grainSize: 0.35,
    isBlackAndWhite: true,
  },

  // ==================== SPECIAL RECIPES ====================

  'cinema-2383': {
    name: 'Cinema 2383 (Print Film)',
    shadowShift: { r: -0.02, g: -0.01, b: 0.02 }, // Teal shadows
    highlightShift: { r: 0.02, g: 0.01, b: -0.01 }, // Warm highlights
    contrast: 1.25, // High contrast print look
    saturation: 1.1,
    warmth: 0.05,
    grainAmount: 0.015,
    grainSize: 0.4,
    acutance: 0.1,
    isBlackAndWhite: false,
    colorMatrix: [
      1.1, -0.05, -0.05,
      -0.05, 1.1, -0.05,
      -0.05, -0.05, 1.1
    ],
  },

  'lomochrome-purple': {
    name: 'LomoChrome Purple',
    shadowShift: { r: 0.05, g: 0.0, b: 0.05 }, // Magenta tint
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.1,
    saturation: 1.2,
    warmth: 0.0,
    grainAmount: 0.03,
    grainSize: 0.7,
    acutance: 0.1,
    isBlackAndWhite: false,
    colorMatrix: [
      1.0, 1.0, 0.0,
      0.0, 0.1, 0.0,
      0.0, 0.8, 1.0
    ],
  },

  'reala-ace': {
    name: 'F-Color Reala Ace',
    shadowShift: { r: 0.0, g: 0.01, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.05,
    saturation: 1.0,
    warmth: -0.02,
    grainAmount: 0.01,
    grainSize: 0.3,
    acutance: 0.3,
    isBlackAndWhite: false,
  },
};

// 获取胶片显示名称
export function getFilmDisplayName(type: FilmType): string {
  if (type === 'none') return 'None';
  return filmProfiles[type].name;
}

// 胶片类型列表 (用于 UI) - 分类展示
export const filmTypeList: { value: FilmType; label: string; category: 'color' | 'slide' | 'cinema' | 'bw' }[] = [
  { value: 'none', label: 'None', category: 'color' },
  { value: 'autumn-breeze', label: 'F-Autumn Breeze (New)', category: 'color' },
  // Color Negative
  { value: 'amber-gold', label: 'K-Amber Gold 200 (Pro)', category: 'color' },
  { value: 'portrait-160', label: 'P-Portrait 160', category: 'color' },
  { value: 'portrait-400', label: 'P-Portrait 400 (Pro)', category: 'color' },
  { value: 'portrait-800', label: 'P-Portrait 800', category: 'color' },
  { value: 'vivid-100', label: 'K-Vivid 100', category: 'color' },
  { value: 'max-400', label: 'K-Max 400', category: 'color' },
  { value: 'budget-color', label: 'K-Color 200', category: 'color' },
  // Color Negative (Alt)
  { value: 'verdant-400', label: 'F-Verdant 400', category: 'color' },
  { value: 'f-portrait-400', label: 'F-Portrait 400H (Pro)', category: 'color' },
  { value: 'f-c200', label: 'F-Color 200', category: 'color' },
  // Slide Films
  { value: 'vintage-chrome', label: 'K-Vintage 64', category: 'slide' },
  { value: 'chrome-100', label: 'K-Chrome 100', category: 'slide' },
  { value: 'natural-100', label: 'F-Natural 100F', category: 'slide' },
  { value: 'vivid-50', label: 'F-Vivid 50', category: 'slide' },
  { value: 'soft-100', label: 'F-Soft 100', category: 'slide' },
  // Cinema
  { value: 'motion-800t', label: 'C-Motion 800T (Pro)', category: 'cinema' },
  { value: 'motion-50d', label: 'C-Motion 50D', category: 'cinema' },
  // Black & White
  { value: 'mono-classic-400', label: 'I-Classic 400', category: 'bw' },
  { value: 'mono-classic-tx', label: 'K-Classic 400', category: 'bw' },
  { value: 'mono-grain-3200', label: 'I-Grain 3200', category: 'bw' },
  { value: 'mono-fine-100', label: 'K-Fine 100', category: 'bw' },
  { value: 'mono-fine-ac', label: 'F-Fine 100', category: 'bw' },
  { value: 'mono-fine-pf', label: 'I-Fine 50', category: 'bw' },
  // Recipes
  { value: 'cinema-2383', label: 'Cinema 2383 (Print Film) (Pro)', category: 'cinema' },
  { value: 'lomochrome-purple', label: 'LomoChrome Purple (Pro)', category: 'color' },
  { value: 'reala-ace', label: 'F-Color Reala Ace', category: 'color' },
];
