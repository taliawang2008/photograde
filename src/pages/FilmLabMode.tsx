import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebGLEngine } from '../engine/WebGLEngine';
import { defaultGradingParams } from '../types';
import { filmTypeList } from '../engine/filmProfiles';
import { labProfiles, labProfileList } from '../engine/labProfiles';
import type { GradingParams, FilmType } from '../types';

// Filter to color and slide films only (exclude B&W for lab simulation)
const availableFilms = filmTypeList.filter(f =>
  f.value !== 'none' &&
  f.category !== 'bw'
);

export const FilmLabMode: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<FilmType>('portrait-400');
  const [selectedLab, setSelectedLab] = useState('frontier-sp3000');
  const [filmStrength, setFilmStrength] = useState(80);

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
      const lab = labProfiles[selectedLab];

      const params: GradingParams = {
        ...defaultGradingParams,
        // Film selection
        filmType: selectedFilm,
        filmStrength: filmStrength,
        useFilmColorMatrix: true,
        // Lab processing adjustments
        contrast: (lab.contrast - 1) * 100,
        saturation: (lab.saturation - 1) * 100,
        temperature: lab.warmth * 100,
        // Color cast via shadow/midtone lift
        shadowLift: {
          r: lab.colorCast.r * 100,
          g: lab.colorCast.g * 100,
          b: lab.colorCast.b * 100,
        },
        // Faded blacks if applicable
        blacks: lab.fadedBlacks ? lab.fadedBlacks * 100 : 0,
        // Exposure adjustment
        exposure: lab.brightness * 50,
      };
      engineRef.current.updateParams(params);
    }
  }, [imageLoaded, selectedFilm, selectedLab, filmStrength]);

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

  const handleRandomize = useCallback(() => {
    const randomFilm = availableFilms[Math.floor(Math.random() * availableFilms.length)];
    const randomLab = labProfileList[Math.floor(Math.random() * labProfileList.length)];
    setSelectedFilm(randomFilm.value);
    setSelectedLab(randomLab.id);
  }, []);

  const handleExport = useCallback(() => {
    if (engineRef.current && imageLoaded) {
      const labName = labProfiles[selectedLab].name.replace(/\s+/g, '-').toLowerCase();
      const dataUrl = engineRef.current.exportImage('png', 0.92);
      const link = document.createElement('a');
      link.download = `${selectedFilm}_${labName}_graded.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [imageLoaded, selectedFilm, selectedLab]);

  return (
    <div className="filmlab-mode">
      <div className="filmlab-layout">
        {/* Left: Selection panels */}
        <div className="filmlab-selectors">
          {/* Film Stock Selection */}
          <div className="filmlab-section">
            <div className="filmlab-section-title">Film Stock</div>
            <div className="filmlab-list">
              {availableFilms.map(film => (
                <button
                  key={film.value}
                  className={`filmlab-item${selectedFilm === film.value ? ' active' : ''}`}
                  onClick={() => setSelectedFilm(film.value)}
                >
                  <span className="filmlab-item-name">{film.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lab Style Selection */}
          <div className="filmlab-section">
            <div className="filmlab-section-title">Lab / Scanner</div>
            <div className="filmlab-list">
              {labProfileList.map(lab => (
                <button
                  key={lab.id}
                  className={`filmlab-item${selectedLab === lab.id ? ' active' : ''}`}
                  onClick={() => setSelectedLab(lab.id)}
                  title={lab.description}
                >
                  <span className="filmlab-item-name">{lab.name}</span>
                  <span className="filmlab-item-desc">{lab.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="filmlab-section">
            <div className="filmlab-slider-group">
              <label>Film Strength</label>
              <input
                type="range"
                min={0}
                max={100}
                value={filmStrength}
                onChange={(e) => setFilmStrength(Number(e.target.value))}
                className="filmlab-slider"
              />
              <span>{filmStrength}%</span>
            </div>

            <button
              className="filmlab-randomize-btn"
              onClick={handleRandomize}
            >
              Randomize
            </button>
          </div>
        </div>

        {/* Right: Image preview */}
        <div className="filmlab-preview">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />

          <div className="filmlab-canvas-container">
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
                className="filmlab-placeholder"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="filmlab-placeholder-icon">+</div>
                <div className="filmlab-placeholder-text">Load an image</div>
                <div className="filmlab-placeholder-subtext">
                  Combine any film stock with lab processing styles
                </div>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="filmlab-actions">
            <button
              className="filmlab-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Load Image
            </button>
            <button
              className="filmlab-action-btn primary"
              onClick={handleExport}
              disabled={!imageLoaded}
            >
              Export
            </button>
          </div>

          {/* Current selection indicator */}
          {imageLoaded && (
            <div className="filmlab-current">
              <span className="filmlab-current-film">{selectedFilm}</span>
              <span className="filmlab-current-separator">+</span>
              <span className="filmlab-current-lab">{labProfiles[selectedLab].name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
