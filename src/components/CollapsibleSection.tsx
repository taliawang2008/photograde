import React, { useState } from 'react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultOpen = false
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="collapsible-section" style={{ marginBottom: '10px' }}>
            <div
                className="collapsible-header"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid #333',
                    marginBottom: isOpen ? '10px' : '0',
                    userSelect: 'none',
                }}
            >
                <span style={{ fontWeight: 500, fontSize: '14px' }}>{title}</span>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▼
                </span>
            </div>

            {isOpen && (
                <div className="collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
};
