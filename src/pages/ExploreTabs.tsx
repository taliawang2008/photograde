import React, { useState } from 'react';
import { PortraMode } from './PortraMode';
import { FilmLabMode } from './FilmLabMode';
import { ReferenceMatchMode } from './ReferenceMatchMode';
import { ABCompareMode } from './ABCompareMode';

export type ExploreTab = 'portra' | 'filmlab' | 'reference' | 'compare';

interface ExploreTabsProps {
  onBack: () => void;
}

export const ExploreTabs: React.FC<ExploreTabsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<ExploreTab>('portra');

  const tabs: { id: ExploreTab; label: string }[] = [
    { id: 'portra', label: 'Portra Mode' },
    { id: 'filmlab', label: 'Film Lab' },
    { id: 'reference', label: 'Reference Match' },
    { id: 'compare', label: 'A/B Compare' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'portra':
        return <PortraMode />;
      case 'filmlab':
        return <FilmLabMode />;
      case 'reference':
        return <ReferenceMatchMode />;
      case 'compare':
        return <ABCompareMode />;
      default:
        return null;
    }
  };

  return (
    <div className="explore-container">
      {/* Header with back button and tabs */}
      <div className="explore-header">
        <button
          className="explore-back-btn"
          onClick={onBack}
          title="Back to Standard Mode"
        >
          &larr; Standard
        </button>

        <div className="explore-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`explore-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="explore-content">
        {renderContent()}
      </div>
    </div>
  );
};
