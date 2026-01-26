// Camera Log Profiles - Input transforms for professional camera log formats
// These transforms convert camera log footage to linear/viewable space

export type LogProfile =
    | 'none'
    | 'slog3'      // Sony S-Log3
    | 'vlog'       // Panasonic V-Log  
    | 'clog3'      // Canon C-Log3
    | 'logc3'      // ARRI LogC3 (EI 800)
    | 'nlog'       // Nikon N-Log
    | 'flog'       // Fujifilm F-Log
    | 'braw';      // Blackmagic Film Gen 5

export interface LogProfileData {
    name: string;
    manufacturer: string;
    gamut: 'rec709' | 'sgamut3' | 'sgamut3cine' | 'vgamut' | 'cinema' | 'rec2020' | 'bwg';
    description: string;
}

// Log profile metadata (for UI display)
export const logProfileData: Record<LogProfile, LogProfileData> = {
    'none': {
        name: 'None (Standard)',
        manufacturer: '',
        gamut: 'rec709',
        description: 'No log transform - use for regular sRGB/Rec.709 images',
    },
    'slog3': {
        name: 'S-Log3',
        manufacturer: 'Sony',
        gamut: 'sgamut3',
        description: 'Sony cinema cameras (FX3, FX6, A7S III, etc.)',
    },
    'vlog': {
        name: 'V-Log',
        manufacturer: 'Panasonic',
        gamut: 'vgamut',
        description: 'Panasonic cinema cameras (GH5, S1H, BGH1, etc.)',
    },
    'clog3': {
        name: 'C-Log3',
        manufacturer: 'Canon',
        gamut: 'cinema',
        description: 'Canon cinema cameras (C70, C300 III, R5 C, etc.)',
    },
    'logc3': {
        name: 'LogC3 (EI 800)',
        manufacturer: 'ARRI',
        gamut: 'rec2020',
        description: 'ARRI cinema cameras (Alexa, Alexa Mini, AMIRA)',
    },
    'nlog': {
        name: 'N-Log',
        manufacturer: 'Nikon',
        gamut: 'rec709',
        description: 'Nikon mirrorless (Z6, Z7, Z8, Z9)',
    },
    'flog': {
        name: 'F-Log',
        manufacturer: 'Fujifilm',
        gamut: 'rec709',
        description: 'Fujifilm cameras (X-H2, X-T5, GFX series)',
    },
    'braw': {
        name: 'Blackmagic Film Gen 5',
        manufacturer: 'Blackmagic',
        gamut: 'bwg',
        description: 'Blackmagic cameras (BMPCC, URSA)',
    },
};

// Log profile type list for UI dropdown
export const logProfileList: { value: LogProfile; label: string; group: string }[] = [
    { value: 'none', label: 'None (Standard)', group: 'Standard' },
    { value: 'slog3', label: 'Sony S-Log3', group: 'Sony' },
    { value: 'vlog', label: 'Panasonic V-Log', group: 'Panasonic' },
    { value: 'clog3', label: 'Canon C-Log3', group: 'Canon' },
    { value: 'logc3', label: 'ARRI LogC3', group: 'ARRI' },
    { value: 'nlog', label: 'Nikon N-Log', group: 'Nikon' },
    { value: 'flog', label: 'Fujifilm F-Log', group: 'Fujifilm' },
    { value: 'braw', label: 'Blackmagic Film', group: 'Blackmagic' },
];

// Map log profile to shader integer
export const logProfileToInt: Record<LogProfile, number> = {
    'none': 0,
    'slog3': 1,
    'vlog': 2,
    'clog3': 3,
    'logc3': 4,
    'nlog': 5,
    'flog': 6,
    'braw': 7,
};

// Get display name for a log profile
export function getLogProfileDisplayName(profile: LogProfile): string {
    return logProfileData[profile]?.name || 'Unknown';
}
