
import type { GradingParams } from '../types';

export interface ImageStats {
    histogram: {
        r: number[];
        g: number[];
        b: number[];
        l: number[]; // Luminance
    };
    average: {
        r: number;
        g: number;
        b: number;
    };
    min: { r: number; g: number; b: number };
    max: { r: number; g: number; b: number };
    exposure: number; // calculated exposure bias (0-255 scale)

    // NEW: Extended stats for adaptive color matching
    percentiles: {
        p5: number;   // Black point (5th percentile)
        p50: number;  // Midpoint (median)
        p95: number;  // White point (95th percentile)
    };
    lab: {
        meanL: number;
        meanA: number;
        meanB: number;
        stdL: number;
        stdA: number;
        stdB: number;
    };
    zones: {
        shadows: { r: number; g: number; b: number };    // Pixels below p25
        midtones: { r: number; g: number; b: number };   // Pixels p25-p75
        highlights: { r: number; g: number; b: number }; // Pixels above p75
    };
    contrast: number;    // Standard deviation of luminance
    saturation: number;  // Average chroma
}

// --- Color Space Conversion Helpers ---

// sRGB to Linear
function srgbToLinear(value: number): number {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// RGB to Lab (D65 illuminant)
function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
    // sRGB to linear
    let rLin = srgbToLinear(r);
    let gLin = srgbToLinear(g);
    let bLin = srgbToLinear(b);

    // Linear RGB to XYZ (D65)
    const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
    const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750);
    const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

    // XYZ to Lab
    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return {
        L: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

// Helper: Get percentile from histogram
function getPercentile(hist: number[], total: number, percentile: number): number {
    let count = 0;
    const target = total * percentile;
    for (let i = 0; i < 256; i++) {
        count += hist[i];
        if (count >= target) return i;
    }
    return 255;
}

// 1. Calculate Image Statistics from Raw Pixel Data
export function calculateImageStats(pixelData: Uint8Array, _width: number, _height: number, sampleRate: number = 4): ImageStats {
    const stats: ImageStats = {
        histogram: {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0),
            l: new Array(256).fill(0)
        },
        average: { r: 0, g: 0, b: 0 },
        min: { r: 255, g: 255, b: 255 },
        max: { r: 0, g: 0, b: 0 },
        exposure: 0,
        // Initialize new fields
        percentiles: { p5: 0, p50: 0, p95: 0 },
        lab: { meanL: 0, meanA: 0, meanB: 0, stdL: 0, stdA: 0, stdB: 0 },
        zones: {
            shadows: { r: 0, g: 0, b: 0 },
            midtones: { r: 0, g: 0, b: 0 },
            highlights: { r: 0, g: 0, b: 0 }
        },
        contrast: 0,
        saturation: 0
    };

    let totalR = 0, totalG = 0, totalB = 0;
    let totalL = 0, totalA = 0, totalLabB = 0;
    let pixelCount = 0;

    // For standard deviation (two-pass or online algorithm)
    const lumValues: number[] = [];
    const labLValues: number[] = [];
    const labAValues: number[] = [];
    const labBValues: number[] = [];

    // Zone accumulators
    let shadowR = 0, shadowG = 0, shadowB = 0, shadowCount = 0;
    let midR = 0, midG = 0, midB = 0, midCount = 0;
    let highR = 0, highG = 0, highB = 0, highCount = 0;

    // Sample pixels (optimization: skip pixels for performance on large images)
    const step = Math.max(1, Math.floor(sampleRate)); // sample every Nth pixel

    for (let i = 0; i < pixelData.length; i += 4 * step) {
        const r = pixelData[i];
        const g = pixelData[i + 1];
        const b = pixelData[i + 2];
        // alpha ignored

        // Luminance (Rec.709 coefficients)
        const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        lumValues.push(l);

        // Lab conversion
        const lab = rgbToLab(r, g, b);
        labLValues.push(lab.L);
        labAValues.push(lab.a);
        labBValues.push(lab.b);
        totalL += lab.L;
        totalA += lab.a;
        totalLabB += lab.b;

        // Update Histogram
        stats.histogram.r[r]++;
        stats.histogram.g[g]++;
        stats.histogram.b[b]++;
        stats.histogram.l[l]++;

        // Accumulate for Average
        totalR += r;
        totalG += g;
        totalB += b;

        // Min/Max
        stats.min.r = Math.min(stats.min.r, r);
        stats.min.g = Math.min(stats.min.g, g);
        stats.min.b = Math.min(stats.min.b, b);

        stats.max.r = Math.max(stats.max.r, r);
        stats.max.g = Math.max(stats.max.g, g);
        stats.max.b = Math.max(stats.max.b, b);

        // Zone classification (will refine after percentiles)
        if (l < 64) {
            shadowR += r; shadowG += g; shadowB += b; shadowCount++;
        } else if (l < 192) {
            midR += r; midG += g; midB += b; midCount++;
        } else {
            highR += r; highG += g; highB += b; highCount++;
        }

        pixelCount++;
    }

    if (pixelCount > 0) {
        stats.average.r = totalR / pixelCount;
        stats.average.g = totalG / pixelCount;
        stats.average.b = totalB / pixelCount;

        // Estimate generic "exposure" as average luminance
        stats.exposure = 0.2126 * stats.average.r + 0.7152 * stats.average.g + 0.0722 * stats.average.b;

        // Lab means
        stats.lab.meanL = totalL / pixelCount;
        stats.lab.meanA = totalA / pixelCount;
        stats.lab.meanB = totalLabB / pixelCount;

        // Calculate standard deviations
        let sumSqL = 0, sumSqA = 0, sumSqB = 0, sumSqLum = 0;
        for (let j = 0; j < pixelCount; j++) {
            sumSqL += Math.pow(labLValues[j] - stats.lab.meanL, 2);
            sumSqA += Math.pow(labAValues[j] - stats.lab.meanA, 2);
            sumSqB += Math.pow(labBValues[j] - stats.lab.meanB, 2);
            sumSqLum += Math.pow(lumValues[j] - stats.exposure, 2);
        }
        stats.lab.stdL = Math.sqrt(sumSqL / pixelCount);
        stats.lab.stdA = Math.sqrt(sumSqA / pixelCount);
        stats.lab.stdB = Math.sqrt(sumSqB / pixelCount);
        stats.contrast = Math.sqrt(sumSqLum / pixelCount);

        // Saturation as average chroma (sqrt(a² + b²))
        stats.saturation = Math.sqrt(stats.lab.stdA * stats.lab.stdA + stats.lab.stdB * stats.lab.stdB);

        // Percentiles
        const totalPixels = stats.histogram.l.reduce((a, b) => a + b, 0);
        stats.percentiles.p5 = getPercentile(stats.histogram.l, totalPixels, 0.05);
        stats.percentiles.p50 = getPercentile(stats.histogram.l, totalPixels, 0.50);
        stats.percentiles.p95 = getPercentile(stats.histogram.l, totalPixels, 0.95);

        // Zone colors
        if (shadowCount > 0) {
            stats.zones.shadows = {
                r: shadowR / shadowCount,
                g: shadowG / shadowCount,
                b: shadowB / shadowCount
            };
        }
        if (midCount > 0) {
            stats.zones.midtones = {
                r: midR / midCount,
                g: midG / midCount,
                b: midB / midCount
            };
        }
        if (highCount > 0) {
            stats.zones.highlights = {
                r: highR / highCount,
                g: highG / highCount,
                b: highB / highCount
            };
        }
    }

    return stats;
}

// 2. Compute Normalization Parameters
export function computeAutoParams(stats: ImageStats): Partial<GradingParams> {
    const result: Partial<GradingParams> = {};

    // --- Auto Exposure ---
    // Target midgray: ~128 (in 0-255 sRGB gamma space) usually maps to 18% linear gray
    // Let's target a slightly brighter cinematic midtone, around 110-120 depending on key
    const targetLuminance = 115;
    const currentLuminance = stats.exposure;

    // Calculate exposure stops difference (approximate)
    // Primitive formula: (target - current) scaled to our exposure parameter (-100 to 100)
    // Our exposure param maps roughly to -2 -> +2 stops.
    // We need to map diff to that.

    // A simple linear correction for the UI slider primarily
    let exposureCorrection = (targetLuminance - currentLuminance) * 0.8;
    // Clamp
    exposureCorrection = Math.max(-80, Math.min(80, exposureCorrection));
    result.exposure = exposureCorrection;


    // --- Auto Contrast (Dynamic Range Stretch) ---
    // Find actual black/white points (percentiles)
    const getPercentile = (hist: number[], total: number, percentile: number) => {
        let count = 0;
        const target = total * percentile;
        for (let i = 0; i < 256; i++) {
            count += hist[i];
            if (count >= target) return i;
        }
        return 255;
    };

    const totalPixels = stats.histogram.l.reduce((a, b) => a + b, 0);
    const blackPoint = getPercentile(stats.histogram.l, totalPixels, 0.01); // 1% shadow
    const whitePoint = getPercentile(stats.histogram.l, totalPixels, 0.99); // 99% highlight

    // Ideal range: 10 - 245
    const currentRange = whitePoint - blackPoint;
    const targetRange = 235;

    // If range is compressed (flat image), increase contrast
    let contrastCorrection = 0;
    if (currentRange < 150) {
        contrastCorrection = (1 - (currentRange / targetRange)) * 50;
    } else if (currentRange < 200) {
        contrastCorrection = 10;
    }
    result.contrast = Math.min(60, contrastCorrection);


    // --- Auto White Balance (Gray World Assumption) ---
    const { r, g, b } = stats.average;

    // Gray World: If scene average is NEUTRAL, r=g=b.
    // If r > b, image is WARM -> needs COOL correction (Temp < 0)
    // If g > (r+b)/2, image is GREEN -> needs MAGENTA correction (Tint > 0)

    const tempDiff = (r - b); // Positive = Warm
    const tintDiff = (g - (r + b) / 2); // Positive = Green

    // Scale to our UI params (-100 to 100)
    // We invert the difference because the controls CORRECT the error.
    result.temperature = -(tempDiff * 1.5);
    result.tint = -(tintDiff * 2.0);

    // Clamp WB to reasonable limits (don't go crazy on weird images)
    result.temperature = Math.max(-60, Math.min(60, result.temperature || 0));
    result.tint = Math.max(-60, Math.min(60, result.tint || 0));

    return result;
}

// ============================================================================
// NEW: Reference-Based Adaptive Color Matching
// ============================================================================

/**
 * Compute normalization parameters to match source image to a reference.
 * This brings any input image to a similar baseline as the reference.
 */
export function computeReferenceBasedParams(
    sourceStats: ImageStats,
    referenceStats: ImageStats,
    options: {
        normalizeExposure?: boolean;
        normalizeContrast?: boolean;
        normalizeWhiteBalance?: boolean;
        strength?: number;  // 0-1, how strongly to match
    } = {}
): Partial<GradingParams> {
    const {
        normalizeExposure = true,
        normalizeContrast = true,
        normalizeWhiteBalance = true,
        strength = 1.0
    } = options;

    const result: Partial<GradingParams> = {};

    // --- Exposure Matching ---
    if (normalizeExposure) {
        const targetLuminance = referenceStats.exposure;
        const currentLuminance = sourceStats.exposure;
        let exposureCorrection = (targetLuminance - currentLuminance) * 0.8 * strength;
        exposureCorrection = Math.max(-80, Math.min(80, exposureCorrection));
        result.exposure = exposureCorrection;
    }

    // --- Contrast Matching ---
    if (normalizeContrast) {
        const targetRange = referenceStats.percentiles.p95 - referenceStats.percentiles.p5;
        const currentRange = sourceStats.percentiles.p95 - sourceStats.percentiles.p5;

        if (currentRange > 0 && targetRange > 0) {
            const rangeRatio = targetRange / currentRange;
            // Convert ratio to contrast adjustment (-100 to 100 scale)
            let contrastCorrection = (rangeRatio - 1) * 50 * strength;
            contrastCorrection = Math.max(-60, Math.min(60, contrastCorrection));
            result.contrast = contrastCorrection;
        }
    }

    // --- White Balance Matching (Lab-based) ---
    if (normalizeWhiteBalance) {
        // Match Lab a* and b* means (color balance)
        const aDiff = referenceStats.lab.meanA - sourceStats.lab.meanA;
        const bDiff = referenceStats.lab.meanB - sourceStats.lab.meanB;

        // Convert Lab shifts to temperature/tint (approximate mapping)
        // b* positive = yellow, negative = blue → maps to temperature
        // a* positive = red/magenta, negative = green → maps to tint
        result.temperature = (bDiff * 2.0) * strength;
        result.tint = (aDiff * 2.0) * strength;

        result.temperature = Math.max(-60, Math.min(60, result.temperature || 0));
        result.tint = Math.max(-60, Math.min(60, result.tint || 0));
    }

    return result;
}

/**
 * Reinhard Color Transfer Parameters
 * For use in WebGL shader or CPU processing
 */
export interface ReinhardParams {
    sourceMeanL: number;
    sourceMeanA: number;
    sourceMeanB: number;
    sourceStdL: number;
    sourceStdA: number;
    sourceStdB: number;
    targetMeanL: number;
    targetMeanA: number;
    targetMeanB: number;
    targetStdL: number;
    targetStdA: number;
    targetStdB: number;
}

/**
 * Compute Reinhard color transfer parameters from source and target stats.
 * These can be passed to WebGL shader for real-time processing.
 */
export function computeReinhardParams(
    sourceStats: ImageStats,
    targetStats: ImageStats
): ReinhardParams {
    return {
        sourceMeanL: sourceStats.lab.meanL,
        sourceMeanA: sourceStats.lab.meanA,
        sourceMeanB: sourceStats.lab.meanB,
        sourceStdL: Math.max(0.001, sourceStats.lab.stdL),  // Avoid division by zero
        sourceStdA: Math.max(0.001, sourceStats.lab.stdA),
        sourceStdB: Math.max(0.001, sourceStats.lab.stdB),
        targetMeanL: targetStats.lab.meanL,
        targetMeanA: targetStats.lab.meanA,
        targetMeanB: targetStats.lab.meanB,
        targetStdL: targetStats.lab.stdL,
        targetStdA: targetStats.lab.stdA,
        targetStdB: targetStats.lab.stdB,
    };
}

/**
 * Pre-computed reference profile for a specific look.
 * Store this JSON and load it to apply the look to any input.
 */
export interface ReferenceProfile {
    name: string;
    description?: string;
    stats: ImageStats;
    filmSettings?: Partial<GradingParams>;
}

/**
 * Create a reference profile from image stats.
 * Call this on your reference image and save the result.
 */
export function createReferenceProfile(
    name: string,
    stats: ImageStats,
    filmSettings?: Partial<GradingParams>
): ReferenceProfile {
    return {
        name,
        stats,
        filmSettings
    };
}
