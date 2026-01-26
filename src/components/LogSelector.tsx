// Log Profile Selector Component
// Dropdown for selecting camera log format (S-Log3, V-Log, LogC3, etc.)

import React from 'react';
import { logProfileList, type LogProfile } from '../engine/logProfiles';

interface LogSelectorProps {
    value: LogProfile;
    onChange: (profile: LogProfile) => void;
}

export const LogSelector: React.FC<LogSelectorProps> = ({ value, onChange }) => {
    return (
        <div className="log-selector">
            <label>Input Log Profile</label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as LogProfile)}
                className="log-select"
            >
                {logProfileList.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                        {profile.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LogSelector;
