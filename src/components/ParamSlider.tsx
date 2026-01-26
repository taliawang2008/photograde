import React from 'react';
import { GradingParams, GradingAction } from '../types';

interface ParamSliderProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    param: keyof GradingParams;
    dispatch: React.Dispatch<GradingAction>;
}

export const ParamSlider = React.memo(({
    label,
    value,
    min = -100,
    max = 100,
    param,
    dispatch
}: ParamSliderProps) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value);
        dispatch({ type: 'SET_PARAM', param, value: newValue });
    };

    return (
        <div className="slider-control">
            <div className="slider-label">
                <span>{label}</span>
                <span>{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={handleChange}
            />
        </div>
    );
});
