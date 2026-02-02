import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebGLEngine } from '../engine/WebGLEngine';
import { ImageAnalyzer } from '../engine/ImageAnalyzer';
import { defaultGradingParams } from '../types';
import { filmProfiles, filmTypeList } from '../engine/filmProfiles';
import { ComparisonSlider } from '../components/explore/ComparisonSlider';
import type { GradingParams, FilmType } from '../types';

// Filter to color and slide films only
const availableFilms = filmTypeList.filter(f =>
  f.value !== 'none' &&
  f.category !== 'bw'
);

interface LabStats {
  meanL: number;
  meanA: number;
  meanB: number;
}

function calculateMatchScore(sourceStats: LabStats | null, targetStats: LabStats | null): number {
  if (!sourceStats || !targetStats) return 0;

  // Calculate Lab distance (lower is better)
  const dL = Math.abs(sourceStats.meanL - targetStats.meanL);
  const dA = Math.abs(sourceStats.meanA - targetStats.meanA);
  const dB = Math.abs(sourceStats.meanB - targetStats.meanB);

  // Total Lab distance
  const distance = Math.sqrt(dL * dL + dA * dA + dB * dB);

  // Convert to a 0-100 score (100 = perfect match)
  // Typical Lab distance range: 0-100+
  const score = Math.max(0, Math.min(100, 100 - distance));
  return Math.round(score);
}

export const ABCompareMode: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const [selectedFilm, setSelectedFilm] = useState<FilmType>('portrait-400');
  const [filmStrength, setFilmStrength] = useState(75);

  const [sourceStats, setSourceStats] = useState<LabStats | null>(null);
  const [referenceStats, setReferenceStats] = useState<LabStats | null>(null);

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

  // Update engine and capture processed image
  useEffect(() => {
    if (engineRef.current && imageLoaded) {
      const params: GradingParams = {
        ...defaultGradingParams,
        filmType: selectedFilm,
        filmStrength: filmStrength,
        useFilmColorMatrix: true,
      };
      engineRef.current.updateParams(params);

      // Capture processed image for comparison
      setTimeout(() => {
        if (engineRef.current) {
          const dataUrl = engineRef.current.exportImage('png', 0.92);
          setProcessedImage(dataUrl);

          // Analyze processed image stats
          const pixels = engineRef.current.getPixelData();
          if (pixels) {
            const width = engineRef.current.getCanvas().width;
            const height = engineRef.current.getCanvas().height;
            const imageData = new ImageData(new Uint8ClampedArray(pixels), width, height);
            try {
              const stats = ImageAnalyzer.analyze(imageData);
              setSourceStats({
                meanL: stats.lab.meanL,
                meanA: stats.lab.meanA,
                meanB: stats.lab.meanB,
              });
            } catch (e) {
              console.error('Failed to analyze processed image:', e);
            }
          }
        }
      }, 100);
    }
  }, [imageLoaded, selectedFilm, filmStrength]);

  const analyzeImage = useCallback((img: HTMLImageElement): LabStats | null => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);

    try {
      const stats = ImageAnalyzer.analyze(imageData);
      return {
        meanL: stats.lab.meanL,
        meanA: stats.lab.meanA,
        meanB: stats.lab.meanB,
      };
    } catch (e) {
      console.error('Failed to analyze image:', e);
      return null;
    }
  }, []);

  const handleMainImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setReferenceImage(url);

        const img = new Image();
        img.onload = () => {
          const stats = analyzeImage(img);
          if (stats) {
            setReferenceStats(stats);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeImage]);

  const handleExport = useCallback(() => {
    if (processedImage) {
      const link = document.createElement('a');
      link.download = `ab_compare_${selectedFilm}.png`;
      link.href = processedImage;
      link.click();
    }
  }, [processedImage, selectedFilm]);

  const matchScore = calculateMatchScore(sourceStats, referenceStats);

  return (
    <div className="abcompare-mode">
      <div className="abcompare-layout">
        {/* Left panel: Controls */}
        <div className="abcompare-controls-panel">
          {/* Film Selection */}
          <div className="abcompare-section">
            <div className="abcompare-section-title">Film Stock</div>
            <select
              value={selectedFilm}
              onChange={(e) => setSelectedFilm(e.target.value as FilmType)}
              className="abcompare-select"
            >
              {availableFilms.map(film => (
                <option key={film.value} value={film.value}>{film.label}</option>
              ))}
            </select>

            <div className="abcompare-slider-group">
              <label>Strength</label>
              <input
                type="range"
                min={0}
                max={100}
                value={filmStrength}
                onChange={(e) => setFilmStrength(Number(e.target.value))}
                className="abcompare-slider"
              />
              <span>{filmStrength}%</span>
            </div>
          </div>

          {/* Reference Upload */}
          <div className="abcompare-section">
            <div className="abcompare-section-title">Reference Sample</div>
            <input
              type="file"
              ref={refFileInputRef}
              accept="image/*"
              onChange={handleReferenceUpload}
              style={{ display: 'none' }}
            />
            <button
              className="abcompare-upload-btn"
              onClick={() => refFileInputRef.current?.click()}
            >
              {referenceImage ? 'Change Reference' : 'Upload Reference'}
            </button>
            {referenceImage && (
              <div className="abcompare-ref-thumb">
                <img src={referenceImage} alt="Reference" />
              </div>
            )}
          </div>

          {/* Match Score */}
          {referenceImage && imageLoaded && (
            <div className="abcompare-section">
              <div className="abcompare-section-title">Match Score</div>
              <div className="abcompare-score">
                <div
                  className="abcompare-score-bar"
                  style={{
                    width: `${matchScore}%`,
                    backgroundColor: matchScore > 70 ? '#4ade80' : matchScore > 40 ? '#facc15' : '#f87171',
                  }}
                />
                <span className="abcompare-score-text">{matchScore}%</span>
              </div>
              <div className="abcompare-score-hint">
                {matchScore > 70 ? 'Great match!' : matchScore > 40 ? 'Partial match' : 'Different look'}
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="abcompare-section">
            <input
              type="file"
              ref={mainFileInputRef}
              accept="image/*"
              onChange={handleMainImageUpload}
              style={{ display: 'none' }}
            />
            <button
              className="abcompare-action-btn"
              onClick={() => mainFileInputRef.current?.click()}
            >
              Load Image
            </button>
            <button
              className="abcompare-action-btn primary"
              onClick={handleExport}
              disabled={!processedImage}
            >
              Export
            </button>
          </div>
        </div>

        {/* Right: Comparison area */}
        <div className="abcompare-preview">
          {/* Hidden canvas for processing */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {imageLoaded && (processedImage || referenceImage) ? (
            <ComparisonSlider
              leftImage={processedImage}
              rightImage={referenceImage}
              leftLabel={`${filmProfiles[selectedFilm as keyof typeof filmProfiles]?.name || selectedFilm}`}
              rightLabel="Reference"
            />
          ) : (
            <div
              className="abcompare-placeholder"
              onClick={() => mainFileInputRef.current?.click()}
            >
              <div className="abcompare-placeholder-icon">+</div>
              <div className="abcompare-placeholder-text">Load an image to compare</div>
              <div className="abcompare-placeholder-subtext">
                Compare your processed image with reference film scans
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
