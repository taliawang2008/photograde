import React from 'react';
import type { GradingParams } from '../types';

interface FiltersPanelProps {
    params: GradingParams;
    onParamChange: (param: keyof GradingParams, value: any) => void;
}

const filterOptions = [
    { value: 'none', label: 'None' },
    { value: 'black-pro-mist', label: 'Black Pro-Mist (Tiffen)' },
    { value: 'black-mist', label: 'Black Mist' },
    { value: 'hdf', label: 'Heavy Diffusion (HDF)' },
    { value: 'hollywood-black-magic', label: 'Hollywood Black Magic' },
    { value: 'glimmerglass', label: 'Glimmerglass' },
    { value: 'white-diffusion', label: 'White Diffusion / Soft FX' },
    { value: 'orton', label: 'Orton Effect' },
    { value: 'streak', label: 'Streak Filter (Anamorphic)' },
];

const filterDescriptions: Record<string, string> = {
    'none': 'No filter applied',
    'black-pro-mist': 'Softens highlights, creates vintage glow, reduces contrast',
    'black-mist': 'Strong highlight bloom with dreamy, ethereal quality',
    'hdf': 'Extreme softening and glow for romantic, music video look',
    'hollywood-black-magic': 'Warm golden glow in highlights, vintage glamour',
    'glimmerglass': 'Sparkle and subtle glow, maintains detail',
    'white-diffusion': 'Overall softening without glow, skin smoothing',
    'orton': 'Dreamy glow overlay with enhanced colors',
    'streak': 'Directional light streaks, anamorphic lens simulation',
};

const FiltersPanel: React.FC<FiltersPanelProps> = ({ params, onParamChange }) => {
    const isStreakFilter = params.filterType === 'streak';
    const hasGlow = ['black-pro-mist', 'black-mist', 'hdf', 'hollywood-black-magic', 'glimmerglass', 'orton'].includes(params.filterType);

    return (
        <div className="section">
            <div className="section-title">🎬 Cinematography Filters</div>

            {/* Filter Type Selector */}
            <div className="log-selector">
                <label>Filter Type</label>
                <select
                    value={params.filterType}
                    onChange={(e) => onParamChange('filterType', e.target.value)}
                    className="log-select"
                >
                    {filterOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {params.filterType !== 'none' && (
                    <p className="filter-description" style={{
                        fontSize: '11px',
                        color: '#888',
                        marginTop: '6px',
                        lineHeight: '1.4'
                    }}>
                        {filterDescriptions[params.filterType]}
                    </p>
                )}
            </div>

            {/* Filter Controls - Only show if filter is active */}
            {params.filterType !== 'none' && (
                <>
                    <div className="slider-control">
                        <div className="slider-label">
                            <span>Strength</span>
                            <span>{params.filterStrength}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={params.filterStrength}
                            onChange={(e) => onParamChange('filterStrength', parseInt(e.target.value))}
                        />
                    </div>

                    {hasGlow && (
                        <>
                            <div className="slider-control">
                                <div className="slider-label">
                                    <span>Glow Radius</span>
                                    <span>{params.filterGlowRadius}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={params.filterGlowRadius}
                                    onChange={(e) => onParamChange('filterGlowRadius', parseInt(e.target.value))}
                                />
                            </div>

                            <div className="slider-control">
                                <div className="slider-label">
                                    <span>Glow Threshold</span>
                                    <span>{params.filterGlowThreshold}</span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={params.filterGlowThreshold}
                                    onChange={(e) => onParamChange('filterGlowThreshold', parseInt(e.target.value))}
                                />
                            </div>
                        </>
                    )}

                    <div className="slider-control">
                        <div className="slider-label">
                            <span>Sharpness Reduction</span>
                            <span>{params.filterSharpness}</span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={params.filterSharpness}
                            onChange={(e) => onParamChange('filterSharpness', parseInt(e.target.value))}
                        />
                    </div>

                    {isStreakFilter && (
                        <div className="slider-control">
                            <div className="slider-label">
                                <span>Streak Angle</span>
                                <span>{params.filterStreakAngle}°</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={360}
                                step={15}
                                value={params.filterStreakAngle}
                                onChange={(e) => onParamChange('filterStreakAngle', parseInt(e.target.value))}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Quick Presets */}
            {params.filterType !== 'none' && (
                <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>Quick Presets</div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => {
                                onParamChange('filterStrength', 25);
                                onParamChange('filterGlowRadius', 30);
                                onParamChange('filterSharpness', 15);
                            }}
                            className="action-btn small"
                            style={{ flex: 1 }}
                        >
                            Subtle
                        </button>
                        <button
                            onClick={() => {
                                onParamChange('filterStrength', 50);
                                onParamChange('filterGlowRadius', 50);
                                onParamChange('filterSharpness', 30);
                            }}
                            className="action-btn small"
                            style={{ flex: 1 }}
                        >
                            Medium
                        </button>
                        <button
                            onClick={() => {
                                onParamChange('filterStrength', 75);
                                onParamChange('filterGlowRadius', 70);
                                onParamChange('filterSharpness', 50);
                            }}
                            className="action-btn small"
                            style={{ flex: 1 }}
                        >
                            Strong
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FiltersPanel;
