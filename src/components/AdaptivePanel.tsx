
import React from 'react';
import type { GradingParams, GradingAction } from '../types';
import { ParamSlider } from './ParamSlider';
import { ReferenceLoader } from './ReferenceLoader';

interface AdaptivePanelProps {
    params: GradingParams;
    dispatch: React.Dispatch<GradingAction>;
}

export const AdaptivePanel: React.FC<AdaptivePanelProps> = ({ params, dispatch }) => {
    const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch({
            type: 'SET_PARAM',
            param: 'useAdaptiveColor',
            value: e.target.checked
        });
    };

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center' }}>
                <input
                    type="checkbox"
                    id="useAdaptive"
                    checked={params.useAdaptiveColor}
                    onChange={handleToggle}
                    style={{ width: 'auto', marginRight: '8px', cursor: 'pointer' }}
                />
                <label
                    htmlFor="useAdaptive"
                    style={{
                        fontSize: '12px',
                        color: params.useAdaptiveColor ? '#667eea' : '#ccc',
                        fontWeight: params.useAdaptiveColor ? 600 : 400,
                        cursor: 'pointer'
                    }}
                >
                    Enable Adaptive Match
                </label>
            </div>

            {params.useAdaptiveColor && (
                <div>
                    <div style={{ marginBottom: '15px' }}>
                        <ReferenceLoader dispatch={dispatch} />
                    </div>

                    <ParamSlider
                        dispatch={dispatch}
                        label="Match Strength"
                        value={params.adaptiveStrength}
                        min={0}
                        max={100}
                        param="adaptiveStrength"
                    />

                    <div className="info-box" style={{ marginTop: '10px' }}>
                        Load a reference image to match its color palette.
                    </div>
                </div>
            )}
        </div>
    );
};
