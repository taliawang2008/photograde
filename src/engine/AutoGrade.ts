
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
        exposure: 0
    };

    let totalR = 0, totalG = 0, totalB = 0;
    let pixelCount = 0;

    // Sample pixels (optimization: skip pixels for performance on large images)
    const step = Math.max(1, Math.floor(sampleRate)); // sample every Nth pixel

    for (let i = 0; i < pixelData.length; i += 4 * step) {
        const r = pixelData[i];
        const g = pixelData[i + 1];
        const b = pixelData[i + 2];
        // alpha ignored

        // Luminance (Rec.709 coefficients)
        const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

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

        pixelCount++;
    }

    if (pixelCount > 0) {
        stats.average.r = totalR / pixelCount;
        stats.average.g = totalG / pixelCount;
        stats.average.b = totalB / pixelCount;

        // Estimate generic "exposure" as average luminance
        stats.exposure = 0.2126 * stats.average.r + 0.7152 * stats.average.g + 0.0722 * stats.average.b;
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
