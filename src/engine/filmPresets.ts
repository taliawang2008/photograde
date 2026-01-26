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
        description: 'No grain, no halation. Pure color response.',
        params: {
            grainAmount: 0,
            halation: 0,
            bloom: 0,
            diffusion: 0,
            filmToe: 0,
            filmShoulder: 0,
        },
    },
    {
        id: 'standard',
        name: 'Standard (35mm)',
        description: 'Subtle grain and structure typical of modern 35mm stock.',
        params: {
            grainAmount: 0.015,
            grainSize: 0.5,
            grainChromacity: 0.4,
            grainHighlights: 0.2,
            grainShadows: 0.6,
            halation: 0,
            filmToe: 10,
            filmShoulder: 10,
        },
    },
    {
        id: 'cinema',
        name: 'Cinema (Vision3)',
        description: 'Halation, soft highlights, and organic grain.',
        params: {
            grainAmount: 0.02,
            grainSize: 0.6,
            grainChromacity: 0.5,
            grainHighlights: 0.3,
            grainShadows: 0.7,
            halation: 30,
            halationRadius: 50,
            halationThreshold: 60,
            bloom: 10,
            filmToe: 15,
            filmShoulder: 25,
            fade: 5,
        },
    },
    {
        id: 'vintage',
        name: 'Vintage (16mm)',
        description: 'Heavy grain, faded shadows, and reduced contrast.',
        params: {
            grainAmount: 0.045,
            grainSize: 0.9,
            grainChromacity: 0.3,
            grainHighlights: 0.4,
            grainShadows: 0.8,
            halation: 40,
            halationRadius: 70,
            diffusion: 20,
            filmToe: 20,
            filmShoulder: 10,
            fade: 15,
            vignette: 30,
        },
    },
    {
        id: 'gritty',
        name: 'Gritty (Pushed)',
        description: 'High contrast, coarse grain, and rough texture.',
        params: {
            grainAmount: 0.05,
            grainSize: 1.2,
            grainChromacity: 0,
            grainHighlights: 0.5,
            grainShadows: 0.9,
            acutance: 40,
            contrast: 10, // Slight contrast boost
            filmToe: 5,
            filmShoulder: 5,
        },
    },
];
