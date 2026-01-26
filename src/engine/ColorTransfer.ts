import { ImageStats, ImageAnalyzer } from './ImageAnalyzer';

export class ColorTransfer {
    /**
     * Apply Reinhard color transfer to match source image to target statistics.
     * Transfers color characteristics (mean/std dev in Lab space).
     * 
     * @param source ImageData of the source image to modify
     * @param sourceStats Pre-calculated stats for the source image
     * @param targetStats Pre-calculated stats for the target reference
     * @param strength 0-1, blending factor (1.0 = full transfer)
     */
    static reinhard(
        source: ImageData,
        sourceStats: ImageStats,
        targetStats: ImageStats,
        strength: number = 1.0
    ): ImageData {
        const { width, height, data } = source;
        // Create new ImageData to avoid modifying source in place (optional, but safer)
        const output = new ImageData(
            new Uint8ClampedArray(data),
            width,
            height
        );

        const s = sourceStats.lab;
        const t = targetStats.lab;

        // Scaling factors (ratio of standard deviations)
        const lScale = t.stdL / (s.stdL || 1); // Avoid div by zero
        const aScale = t.stdA / (s.stdA || 1);
        const bScale = t.stdB / (s.stdB || 1);

        for (let i = 0; i < output.data.length; i += 4) {
            const r = output.data[i];
            const g = output.data[i + 1];
            const b = output.data[i + 2];

            // 1. Convert to Lab
            const [l, aVal, bVal] = ImageAnalyzer.rgbToLab(r, g, b);

            // 2. Apply Reinhard Transfer
            // out = (target_std / source_std) * (in - source_mean) + target_mean
            let lOut = lScale * (l - s.meanL) + t.meanL;
            let aOut = aScale * (aVal - s.meanA) + t.meanA;
            let bOut = bScale * (bVal - s.meanB) + t.meanB;

            // Blend with original if strength < 1.0
            if (strength < 1.0) {
                lOut = l + (lOut - l) * strength;
                aOut = aVal + (aOut - aVal) * strength;
                bOut = bVal + (bOut - bVal) * strength;
            }

            // 3. Convert back to RGB
            const [rOut, gOut, bFinal] = ImageAnalyzer.labToRgb(lOut, aOut, bOut);

            output.data[i] = rOut;
            output.data[i + 1] = gOut;
            output.data[i + 2] = bFinal;
            // Alpha remains same
        }

        return output;
    }
}
