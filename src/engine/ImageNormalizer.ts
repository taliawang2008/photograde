import { ImageStats } from './ImageAnalyzer';

export interface NormalizationParams {
    exposureAdjust: number;     // Stops to add/subtract
    contrastAdjust: number;     // Multiplier for contrast
    blackPoint: number;         // Target black level (0-255)
    whitePoint: number;         // Target white level (0-255)
    whiteBalanceShift: {        // Lab a/b shift
        a: number;
        b: number;
    };
}

export class ImageNormalizer {
    /**
     * Calculate normalization parameters to match source stats to target stats
     */
    static calculateNormalization(
        sourceStats: ImageStats,
        targetStats: ImageStats
    ): NormalizationParams {
        // 1. Exposure Adjustment
        // Log2 ratio of luminance means gives us stops difference
        // Avoid division by zero
        const sourceMeanL = Math.max(0.001, sourceStats.lab.meanL);
        const targetMeanL = Math.max(0.001, targetStats.lab.meanL);
        // L is 0-100 usually in Lab, but our stats might be based on RGB 0-255 inputs converting to Lab.
        // The previous implementation of rgbToLab returns L in 0-100 range.

        // Simple ratio of means for exposure:
        // If source L=50 and target L=25, we need to darken. log2(25/50) = -1 stop.
        // Wait, L is perceptual (gamma corrected approx), so linear exposure adjust is trickier.
        // However, adding to L is "brightness", scaling L is "contrast/exposure".
        // For now, let's use a simple shift or ratio.
        // The plan suggested: exposureAdjust = log2(targetMeanL / sourceStats.meanL)
        const exposureAdjust = Math.log2(targetMeanL / sourceMeanL);

        // 2. Contrast Adjustment
        // Target / Source std dev
        const sourceContrast = Math.max(0.001, sourceStats.contrast);
        const contrastAdjust = targetStats.contrast / sourceContrast;

        // 3. Black/White Points
        const blackPoint = targetStats.percentiles.p5; // Using target's bounds
        const whitePoint = targetStats.percentiles.p95;

        // 4. White Balance Shift (Lab space)
        const wbShiftA = targetStats.lab.meanA - sourceStats.lab.meanA;
        const wbShiftB = targetStats.lab.meanB - sourceStats.lab.meanB;

        return {
            exposureAdjust,
            contrastAdjust,
            blackPoint,
            whitePoint,
            whiteBalanceShift: {
                a: wbShiftA,
                b: wbShiftB
            }
        };
    }
}
