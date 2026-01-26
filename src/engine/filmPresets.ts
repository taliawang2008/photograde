import type { GradingParams } from '../types';

export interface FilmCharacterPreset {
    id: string;
    name: string;
    description: string;
    params: Partial<GradingParams>;
}

export const filmCharacterPresets: FilmCharacterPreset[] = [
    {
        id: 'clean',
        name: 'Clean (Digital)',
        description: 'No grain, no halation. Resets structure to modern digital standards.',
        params: {
            grainAmount: 0,
            halation: 0,
            bloom: 0,
            diffusion: 0,
            filmToe: 0,
            filmShoulder: 0,
            fade: 0,
            acutance: 0,
        },
    },
    {
        id: 'standard',
        name: 'Standard (35mm)',
        description: 'Subtle grain and structure typical of modern 35mm stock.',
        params: {
            grainAmount: 18,
            grainSize: 45,
            grainChromacity: 40,
            grainHighlights: 20,
            grainShadows: 60,
            halation: 0,
            acutance: 10,
        },
    },
    {
        id: 'cinema',
        name: 'Cinema (Vision3)',
        description: 'Halation, soft highlights, and organic grain.',
        params: {
            grainAmount: 28,
            grainSize: 55,
            grainChromacity: 50,
            grainHighlights: 30,
            grainShadows: 70,
            halation: 30,
            halationRadius: 50,
            halationThreshold: 60,
            bloom: 10,
            acutance: 15,
        },
    },
    {
        id: 'vintage',
        name: 'Vintage (16mm)',
        description: 'Heavy grain, faded shadows, and organic texture.',
        params: {
            grainAmount: 55,
            grainSize: 80,
            grainChromacity: 30,
            grainHighlights: 40,
            grainShadows: 85,
            halation: 40,
            halationRadius: 70,
            diffusion: 20,
            fade: 12, // Keep some fade for vintage character
            vignette: 25,
        },
    },
    {
        id: 'gritty',
        name: 'Gritty (Pushed)',
        description: 'High contrast, coarse grain, and rough texture.',
        params: {
            grainAmount: 70,
            grainSize: 90,
            grainChromacity: 0,
            grainHighlights: 50,
            grainShadows: 95,
            acutance: 50,
            contrast: 10, // Subtle grit boost
        },
    },
];
