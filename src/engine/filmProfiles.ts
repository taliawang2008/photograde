// 胶片模拟配置 - 扩展版
import type { FilmType, FilmProfile } from '../types';

export const filmProfiles: Record<Exclude<FilmType, 'none'>, FilmProfile> = {
  // ==================== KODAK COLOR NEGATIVE ====================

  'kodak-gold': {
    name: 'Kodak Gold 200',
    shadowShift: { r: 0.04, g: 0.02, b: -0.01 },
    highlightShift: { r: 0.06, g: 0.03, b: -0.03 },
    contrast: 1.12,
    saturation: 1.25,
    warmth: 0.18,
    grainAmount: 0.025,
    grainSize: 0.8,
    isBlackAndWhite: false,
    colorMatrix: [
      1.05, -0.05, 0.0,
      0.0, 1.02, -0.02,
      -0.05, 0.05, 1.0
    ], // Warm/Golden shift
  },

  'portra-160': {
    name: 'Kodak Portra 160',
    shadowShift: { r: 0.01, g: 0.015, b: 0.01 },
    highlightShift: { r: 0.02, g: 0.01, b: -0.01 },
    contrast: 0.92,
    saturation: 0.85,
    warmth: 0.03,
    grainAmount: 0.01,
    grainSize: 0.6,
    isBlackAndWhite: false,
  },

  'portra-400': {
    name: 'Kodak Portra 400',
    shadowShift: { r: 0.015, g: 0.02, b: 0.01 },
    highlightShift: { r: 0.025, g: 0.015, b: -0.01 },
    contrast: 0.95,
    saturation: 0.88,
    warmth: 0.05,
    grainAmount: 0.018,
    grainSize: 0.9,
    isBlackAndWhite: false,
    colorMatrix: [
      1.02, -0.01, -0.01,
      0.01, 1.01, -0.02,
      -0.01, 0.01, 1.0
    ], // Accurate skin tones
  },

  'portra-800': {
    name: 'Kodak Portra 800',
    shadowShift: { r: 0.02, g: 0.025, b: 0.015 },
    highlightShift: { r: 0.03, g: 0.02, b: 0.0 },
    contrast: 0.98,
    saturation: 0.9,
    warmth: 0.08,
    grainAmount: 0.035,
    grainSize: 1.1,
    isBlackAndWhite: false,
  },

  'ektar': {
    name: 'Kodak Ektar 100',
    shadowShift: { r: -0.01, g: 0.0, b: 0.02 },
    highlightShift: { r: 0.03, g: 0.01, b: -0.02 },
    contrast: 1.18,
    saturation: 1.35,
    warmth: 0.02,
    grainAmount: 0.008,
    grainSize: 0.4,
    isBlackAndWhite: false,
  },

  'ultramax': {
    name: 'Kodak Ultramax 400',
    shadowShift: { r: 0.03, g: 0.02, b: -0.02 },
    highlightShift: { r: 0.05, g: 0.02, b: -0.03 },
    contrast: 1.1,
    saturation: 1.2,
    warmth: 0.12,
    grainAmount: 0.028,
    grainSize: 0.85,
    isBlackAndWhite: false,
  },

  'colorplus': {
    name: 'Kodak ColorPlus 200',
    shadowShift: { r: 0.03, g: 0.015, b: -0.015 },
    highlightShift: { r: 0.04, g: 0.02, b: -0.02 },
    contrast: 1.08,
    saturation: 1.15,
    warmth: 0.1,
    grainAmount: 0.022,
    grainSize: 0.75,
    isBlackAndWhite: false,
  },

  // ==================== KODAK SLIDE/REVERSAL ====================

  'kodachrome': {
    name: 'Kodachrome 64',
    shadowShift: { r: 0.02, g: 0.0, b: -0.02 },
    highlightShift: { r: 0.04, g: 0.01, b: -0.03 },
    contrast: 1.25,
    saturation: 1.4,
    warmth: 0.15,
    grainAmount: 0.012,
    grainSize: 0.5,
    isBlackAndWhite: false,
  },

  'ektachrome': {
    name: 'Ektachrome E100',
    shadowShift: { r: 0.0, g: 0.01, b: 0.02 },
    highlightShift: { r: 0.01, g: 0.0, b: 0.01 },
    contrast: 1.15,
    saturation: 1.2,
    warmth: -0.05,
    grainAmount: 0.01,
    grainSize: 0.45,
    isBlackAndWhite: false,
  },

  // ==================== FUJIFILM COLOR NEGATIVE ====================

  'superia': {
    name: 'Fujifilm Superia 400',
    shadowShift: { r: -0.02, g: 0.035, b: 0.01 },
    highlightShift: { r: 0.0, g: 0.025, b: -0.01 },
    contrast: 1.08,
    saturation: 1.12,
    warmth: -0.05,
    grainAmount: 0.025,
    grainSize: 0.85,
    isBlackAndWhite: false,
  },

  'fuji-400h': {
    name: 'Fujifilm Pro 400H',
    shadowShift: { r: -0.01, g: 0.02, b: 0.02 },
    highlightShift: { r: 0.01, g: 0.015, b: 0.01 },
    contrast: 0.9,
    saturation: 0.82,
    warmth: -0.02,
    grainAmount: 0.015,
    grainSize: 0.8,
    isBlackAndWhite: false,
    colorMatrix: [
      0.95, 0.05, 0.0,
      0.0, 1.02, -0.02,
      0.0, 0.05, 1.05
    ], // Cool/Green-ish
  },

  'fuji-c200': {
    name: 'Fujifilm C200',
    shadowShift: { r: -0.01, g: 0.025, b: 0.0 },
    highlightShift: { r: 0.01, g: 0.02, b: -0.01 },
    contrast: 1.05,
    saturation: 1.1,
    warmth: -0.03,
    grainAmount: 0.02,
    grainSize: 0.7,
    isBlackAndWhite: false,
  },

  // ==================== FUJIFILM SLIDE ====================

  'provia': {
    name: 'Fujifilm Provia 100F',
    shadowShift: { r: 0.0, g: 0.005, b: 0.01 },
    highlightShift: { r: 0.01, g: 0.005, b: 0.005 },
    contrast: 1.08,
    saturation: 1.15,
    warmth: 0.0,
    grainAmount: 0.008,
    grainSize: 0.5,
    isBlackAndWhite: false,
  },

  'velvia': {
    name: 'Fujifilm Velvia 50',
    shadowShift: { r: 0.01, g: 0.0, b: 0.03 },
    highlightShift: { r: 0.03, g: 0.01, b: 0.02 },
    contrast: 1.25,
    saturation: 1.6,
    warmth: 0.02,
    grainAmount: 0.006,
    grainSize: 0.4,
    isBlackAndWhite: false,
  },

  'astia': {
    name: 'Fujifilm Astia 100F',
    shadowShift: { r: 0.005, g: 0.01, b: 0.01 },
    highlightShift: { r: 0.015, g: 0.01, b: 0.005 },
    contrast: 1.02,
    saturation: 1.0,
    warmth: 0.02,
    grainAmount: 0.007,
    grainSize: 0.45,
    isBlackAndWhite: false,
  },

  // ==================== CINESTILL (CINEMA) ====================

  'cinestill-800t': {
    name: 'CineStill 800T',
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

  'cinestill-50d': {
    name: 'CineStill 50D',
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

  'hp5': {
    name: 'Ilford HP5 Plus 400',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.2,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.035,
    grainSize: 0.85,
    isBlackAndWhite: true,
  },

  'trix': {
    name: 'Kodak Tri-X 400',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.18,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.03,
    grainSize: 0.9,
    isBlackAndWhite: true,
  },

  'delta': {
    name: 'Ilford Delta 3200',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.28,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.055,
    grainSize: 1.3,
    isBlackAndWhite: true,
  },

  'tmax': {
    name: 'Kodak T-Max 100',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.15,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.012,
    grainSize: 0.5,
    isBlackAndWhite: true,
  },

  'acros': {
    name: 'Fujifilm Acros 100',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.1,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.01,
    grainSize: 0.45,
    isBlackAndWhite: true,
  },

  'pan-f': {
    name: 'Ilford Pan F Plus 50',
    shadowShift: { r: 0.0, g: 0.0, b: 0.0 },
    highlightShift: { r: 0.0, g: 0.0, b: 0.0 },
    contrast: 1.22,
    saturation: 0.0,
    warmth: 0.0,
    grainAmount: 0.006,
    grainSize: 0.35,
    isBlackAndWhite: true,
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
  // Kodak Color Negative
  { value: 'kodak-gold', label: 'Kodak Gold 200', category: 'color' },
  { value: 'portra-160', label: 'Portra 160', category: 'color' },
  { value: 'portra-400', label: 'Portra 400', category: 'color' },
  { value: 'portra-800', label: 'Portra 800', category: 'color' },
  { value: 'ektar', label: 'Ektar 100', category: 'color' },
  { value: 'ultramax', label: 'Ultramax 400', category: 'color' },
  { value: 'colorplus', label: 'ColorPlus 200', category: 'color' },
  // Fuji Color Negative
  { value: 'superia', label: 'Superia 400', category: 'color' },
  { value: 'fuji-400h', label: 'Pro 400H', category: 'color' },
  { value: 'fuji-c200', label: 'C200', category: 'color' },
  // Slide Films
  { value: 'kodachrome', label: 'Kodachrome 64', category: 'slide' },
  { value: 'ektachrome', label: 'Ektachrome E100', category: 'slide' },
  { value: 'provia', label: 'Provia 100F', category: 'slide' },
  { value: 'velvia', label: 'Velvia 50', category: 'slide' },
  { value: 'astia', label: 'Astia 100F', category: 'slide' },
  // Cinema
  { value: 'cinestill-800t', label: 'CineStill 800T', category: 'cinema' },
  { value: 'cinestill-50d', label: 'CineStill 50D', category: 'cinema' },
  // Black & White
  { value: 'hp5', label: 'HP5 Plus', category: 'bw' },
  { value: 'trix', label: 'Tri-X 400', category: 'bw' },
  { value: 'delta', label: 'Delta 3200', category: 'bw' },
  { value: 'tmax', label: 'T-Max 100', category: 'bw' },
  { value: 'acros', label: 'Acros 100', category: 'bw' },
  { value: 'pan-f', label: 'Pan F 50', category: 'bw' },
];
