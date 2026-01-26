// V-Log 色彩分级工具 - 类型定义

import type { LogProfile } from '../engine/logProfiles';
export type { LogProfile } from '../engine/logProfiles';
import type { ACESOutputTransform } from '../engine/acesProfiles';
export type { ACESOutputTransform } from '../engine/acesProfiles';

// 胶片类型
// Custom type for recipe overrides

export type FilmType =
  | 'none'
  // Kodak Color Negative
  | 'kodak-gold'
  | 'portra-160'
  | 'portra-400'
  | 'portra-800'
  | 'ektar'
  | 'ultramax'
  | 'colorplus'
  // Kodak Slide/Reversal
  | 'kodachrome'
  | 'ektachrome'
  // Fujifilm Color Negative
  | 'superia'
  | 'fuji-400h'
  | 'fuji-c200'
  // Fujifilm Slide
  | 'provia'
  | 'velvia'
  | 'astia'
  // Cinestill (Cinema)
  | 'cinestill-800t'
  | 'cinestill-50d'
  // Black & White
  | 'hp5'
  | 'trix'
  | 'delta'
  | 'tmax'
  | 'acros'
  | 'pan-f'
  // Special / Recipes (Phase 7)
  | 'kodak-2383'
  | 'lomochrome-purple'
  | 'reala-ace';

// RGB 颜色偏移
export interface RGBOffset {
  r: number;
  g: number;
  b: number;
}

// 曲线控制点
export interface CurvePoint {
  x: number;
  y: number;
}

// 曲线数据 (每个通道一组控制点)
export interface CurvesData {
  rgb: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

// 3D LUT 数据
export interface LUT3D {
  size: number;
  title?: string;
  data: Float32Array;
}

// 完整的调色参数
export interface GradingParams {
  // === 输入转换 ===
  inputLogProfile: LogProfile;  // Camera log format (none, slog3, vlog, etc.)
  acesOutputTransform: ACESOutputTransform; // ACES Output Transform (Rec.709, sRGB, etc.)

  // === 基础曝光控制 ===
  exposure: number;      // -100 to 100 (映射到 -2 to +2 stops)
  contrast: number;      // -100 to 100

  // === 分区域亮度调整 ===
  highlights: number;    // -100 to 100
  shadows: number;       // -100 to 100
  whites: number;        // -100 to 100
  blacks: number;        // -100 to 100

  // === 色彩控制 ===
  temperature: number;   // -100 (冷/蓝) to 100 (暖/橙)
  tint: number;          // -100 (绿) to 100 (洋红)
  saturation: number;    // -100 to 100
  vibrance: number;      // -100 to 100 (智能饱和度)

  // === 光谱控制 (Spectral Controls) ===
  spectralVolume: number;     // -100 to 100 (色彩密度/丰富度)
  spectralLuminance: number;  // -100 to 100 (光谱亮度)
  spectralHue: number;        // -100 to 100 (全局色相偏移)

  // === 色轮 (Lift-Gamma-Gain) ===
  shadowLift: RGBOffset;
  midtoneGamma: RGBOffset;
  highlightGain: RGBOffset;

  // === 曲线 ===
  curves: CurvesData;

  // === 胶片模拟 ===
  filmType: FilmType;
  filmStrength: number;  // 0 to 100

  // === 高级胶片响应 ===
  filmToe: number;       // 0 to 100 (暗部S曲线)
  filmShoulder: number;  // 0 to 100 (高光S曲线)
  crossoverShift: RGBOffset; // 色彩交叉偏移

  // === 颗粒效果 ===
  grainAmount: number;   // 0 to 100
  grainSize: number;     // 0 to 100
  grainChromacity: number; // 0 to 100 (0=Mono, 100=Color)
  grainHighlights: number; // 0 to 100 (Grain strength in highlights)
  grainShadows: number;    // 0 to 100 (Grain strength in shadows)
  acutance: number;      // 0 to 100 (Edge sharpness/development effect)

  // === 特效 ===
  useFilmColorMatrix: boolean; // Enable advanced film color matrix
  fade: number;          // 0 to 100 (褪色效果)
  halation: number;      // 0 to 100 (高光溢出)
  halationColor: string; // Hex color for halation glow (default: #FF5500)
  halationThreshold: number; // 0 to 100 (high = only brightest pixels)
  halationRadius: number;    // 0 to 100 (blur radius)
  bloom: number;         // 0 to 100 (光晕扩散)
  diffusion: number;     // 0 to 100 (柔焦效果)
  vignette: number;      // 0 to 100 (暗角强度)
  vignetteRadius: number; // 0 to 100 (暗角半径)

  // === LUT ===
  lutStrength: number;   // 0 to 100
}

// 直方图数据
export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
  luminance: number[];
}

// 缩放状态
export interface ZoomState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// 曲线编辑器活动通道
export type CurveChannel = 'rgb' | 'red' | 'green' | 'blue';

// 色轮模式
export type ColorWheelMode = 'shadows' | 'midtones' | 'highlights';

// 默认参数值
export const defaultGradingParams: GradingParams = {
  // 输入转换
  inputLogProfile: 'none',
  acesOutputTransform: 'none',

  // 基础
  exposure: 0,
  contrast: 0,

  // 分区域
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,

  // 色彩
  temperature: 0,
  tint: 0,
  saturation: 0,
  vibrance: 0,

  // 光谱控制
  spectralVolume: 0,
  spectralLuminance: 0,
  spectralHue: 0,

  // 色轮
  shadowLift: { r: 0, g: 0, b: 0 },
  midtoneGamma: { r: 0, g: 0, b: 0 },
  highlightGain: { r: 0, g: 0, b: 0 },

  // 曲线 (默认对角线)
  curves: {
    rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
    blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
  },

  // 胶片
  filmType: 'none',
  filmStrength: 100,

  // 高级胶片响应
  filmToe: 0,
  filmShoulder: 0,
  crossoverShift: { r: 0, g: 0, b: 0 },

  // 颗粒
  grainAmount: 0,
  grainSize: 50,
  grainChromacity: 60,   // Default color grain
  grainHighlights: 20,   // Less grain in highlights
  grainShadows: 80,      // More grain in shadows
  acutance: 0,

  // 特效
  useFilmColorMatrix: true, // Default to true for better quality
  fade: 0,
  halation: 0,
  halationColor: '#FF5500',
  halationThreshold: 65,
  halationRadius: 50,
  bloom: 0,
  diffusion: 0,
  vignette: 0,
  vignetteRadius: 50,

  // LUT
  lutStrength: 100,
};

// 胶片配置
export interface FilmProfile {
  name: string;
  // 色彩偏移
  shadowShift: RGBOffset;
  highlightShift: RGBOffset;
  // 调整
  contrast: number;
  saturation: number;
  warmth: number;
  // 颗粒
  grainAmount: number;
  grainSize: number;
  grainChromacity?: number;
  grainHighlights?: number;
  grainShadows?: number;
  acutance?: number; // Optional default acutance for this film
  // 是否黑白
  isBlackAndWhite: boolean;

  // Advanced Color Matrix (3x3)
  colorMatrix?: [
    number, number, number,
    number, number, number,
    number, number, number
  ];

  // Recipe Overrides (from Research)
  curves?: CurvesData;
  shadowLift?: RGBOffset;
  midtoneGamma?: RGBOffset;
  highlightGain?: RGBOffset;

  // Misc overrides
  saturationOverride?: number; // Override saturation param
  contrastOverride?: number; // Override contrast param
}

// Action 类型 (用于 useReducer)
export type GradingAction =
  | { type: 'SET_PARAM'; param: keyof GradingParams; value: any }
  | { type: 'SET_CURVE'; channel: CurveChannel; points: CurvePoint[] }
  | { type: 'SET_COLOR_WHEEL'; mode: ColorWheelMode; value: RGBOffset }
  | { type: 'RESET_ALL' }
  | { type: 'RESET_EXPOSURE' }
  | { type: 'RESET_TONE' }
  | { type: 'RESET_COLOR' }
  | { type: 'RESET_CURVES' }
  | { type: 'RESET_COLOR_WHEELS' }
  | { type: 'RESET_FILM' }
  | { type: 'LOAD_PARAMS'; params: GradingParams }
  | { type: 'MERGE_PARAMS'; params: Partial<GradingParams> };
