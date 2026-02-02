import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebGLEngine } from '../engine/WebGLEngine';
import { defaultGradingParams } from '../types';
import type { GradingParams, FilmType } from '../types';

type PortraVariant = 'portrait-160' | 'portrait-400' | 'portrait-800';

const portraPresets: Record<PortraVariant, { name: string; description: string }> = {
  'portrait-160': { name: 'Portra 160', description: 'Fine grain, natural tones' },
  'portrait-400': { name: 'Portra 400', description: 'Classic portrait look' },
  'portrait-800': { name: 'Portra 800', description: 'Soft, warm pastels' },
};

export const PortraMode: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<PortraVariant>('portrait-400');
  const [filmStrength, setFilmStrength] = useState(75);
  const [exposure, setExposure] = useState(0);

  // Initialize WebGL engine
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      try {
        engineRef.current = new WebGLEngine(canvasRef.current);
      } catch (e) {
        console.error('Failed to init WebGL', e);
      }
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Update engine when parameters change
  useEffect(() => {
    if (engineRef.current && imageLoaded) {
      const params: GradingParams = {
        ...defaultGradingParams,
        filmType: selectedVariant as FilmType,
        filmStrength: filmStrength,
        exposure: exposure,
        useFilmColorMatrix: true,
      };
      engineRef.current.updateParams(params);
    }
  }, [imageLoaded, selectedVariant, filmStrength, exposure]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && engineRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImageLoaded(true);
          engineRef.current?.loadImage(img);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleExport = useCallback(() => {
    if (engineRef.current && imageLoaded) {
      const dataUrl = engineRef.current.exportImage('png', 0.92);
      const link = document.createElement('a');
      link.download = `portra_${selectedVariant}_graded.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [imageLoaded, selectedVariant]);

  return (
    <div className="portra-mode">
      {/* Large image preview area */}
      <div className="portra-preview">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <div className="portra-canvas-container">
          <canvas
            ref={canvasRef}
            style={{
              display: imageLoaded ? 'block' : 'none',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
          {!imageLoaded && (
            <div
              className="portra-placeholder"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="portra-placeholder-icon">+</div>
              <div className="portra-placeholder-text">Click to load an image</div>
              <div className="portra-placeholder-subtext">Experience authentic Portra film look</div>
            </div>
          )}
        </div>
      </div>

      {/* Minimal controls at the bottom */}
      <div className="portra-controls">
        {/* Film stock toggle */}
        <div className="portra-variant-selector">
          {(Object.keys(portraPresets) as PortraVariant[]).map(variant => (
            <button
              key={variant}
              className={`portra-variant-btn${selectedVariant === variant ? ' active' : ''}`}
              onClick={() => setSelectedVariant(variant)}
              title={portraPresets[variant].description}
            >
              {portraPresets[variant].name}
            </button>
          ))}
        </div>

        {/* Sliders */}
        <div className="portra-sliders">
          <div className="portra-slider-group">
            <label>Film Strength</label>
            <input
              type="range"
              min={0}
              max={100}
              value={filmStrength}
              onChange={(e) => setFilmStrength(Number(e.target.value))}
              className="portra-slider"
            />
            <span className="portra-slider-value">{filmStrength}%</span>
          </div>

          <div className="portra-slider-group">
            <label>Exposure</label>
            <input
              type="range"
              min={-100}
              max={100}
              value={exposure}
              onChange={(e) => setExposure(Number(e.target.value))}
              className="portra-slider"
            />
            <span className="portra-slider-value">{exposure > 0 ? `+${exposure}` : exposure}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="portra-actions">
          <button
            className="portra-action-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Load Image
          </button>
          <button
            className="portra-action-btn primary"
            onClick={handleExport}
            disabled={!imageLoaded}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
