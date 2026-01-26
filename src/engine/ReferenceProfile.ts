import { ImageStats } from './ImageAnalyzer';

export interface ReferenceProfile {
    name: string;
    description: string;

    // Pre-computed statistics from reference image(s)
    stats: ImageStats;

    // Optional: Film profile settings to accompany the color match
    filmProfile?: {
        contrast: number;
        saturation: number;
        grainAmount: number;
        grainSize: number;
        // We can expand this with more from FilmProfile if needed
    };

    // Optional: Base64 or URL of the reference image for UI display
    thumbnail?: string;
}

// Pre-built profiles can be added here or loaded from JSON
export const AUTUMN_BREEZE_PROFILE: ReferenceProfile = {
    name: 'Autumn Breeze',
    description: 'Warm, golden hues with soft contrast',
    stats: {
        histogram: { r: [], g: [], b: [], luminance: [] }, // Empty for brevity, would act. be populated
        percentiles: { p5: 10, p50: 120, p95: 240 },
        lab: {
            meanL: 65, meanA: 10, meanB: 25, // Warm
            stdL: 25, stdA: 10, stdB: 15
        },
        contrast: 25,
        saturation: 18,
        colorTemp: 25,
        dynamicRange: 230,
        zones: {
            shadows: { r: 0, g: 0, b: 0 },
            midtones: { r: 0, g: 0, b: 0 },
            highlights: { r: 0, g: 0, b: 0 }
        }
    }
};
