// ACES Profile Definitions
// Defines Input (IDT) and Output (ODT) transforms for ACES color management

export interface ACESProfile {
    name: string;
    description: string;
    inputLUT?: string;   // Path to IDT LUT (Camera -> ACEScg) - if undefined, uses current log profile math
    outputLUT: string;   // Path to ODT LUT (ACEScg -> Display)
}

// Output transforms (ODT)
export type ACESOutputTransform =
    | 'none'
    | 'rec709'
    | 'srgb'
    | 'p3d65'
    | 'rec2020';

export const acesOutputTransforms: Record<ACESOutputTransform, ACESProfile> = {
    'none': {
        name: 'None',
        description: 'No output transform (ACEScg)',
        outputLUT: '', // Empty path means identity/none
    },
    'rec709': {
        name: 'Rec.709',
        description: 'Standard HD TV (Rec.709 / Gamma 2.4)',
        outputLUT: '/luts/aces/ACEScg_to_Rec709.cube',
    },
    'srgb': {
        name: 'sRGB',
        description: 'Computer Monitors (sRGB)',
        outputLUT: '/luts/aces/ACEScg_to_sRGB.cube',
    },
    'p3d65': {
        name: 'P3-D65',
        description: 'Apple Display / Digital Cinema (P3-D65)',
        outputLUT: '/luts/aces/ACEScg_to_P3D65.cube',
    },
    'rec2020': {
        name: 'Rec.2020',
        description: 'HDR TV (Rec.2020 / PQ)',
        outputLUT: '/luts/aces/ACEScg_to_Rec2020.cube',
    },
};

// ACES Input Transforms (IDT)
// These map from specific camera spaces to ACEScg
// Note: We primarily use the algorithmic log transforms we implemented in Phase 2
// But these LUTs offer an alternative "official" path if preferred
export const acesInputTransforms = {
    'slog3': '/luts/aces/SLog3_to_ACEScg.cube',
    'vlog': '/luts/aces/VLog_to_ACEScg.cube',
    'logc3': '/luts/aces/LogC3_to_ACEScg.cube',
    'clog3': '/luts/aces/CLog3_to_ACEScg.cube',
};
