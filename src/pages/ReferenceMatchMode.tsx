import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebGLEngine } from '../engine/WebGLEngine';
import { ImageAnalyzer } from '../engine/ImageAnalyzer';
import { defaultGradingParams } from '../types';
import type { GradingParams } from '../types';

interface LabStats {
  L: number;
  a: number;
  b: number;
}

export const ReferenceMatchMode: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [referenceLoaded, setReferenceLoaded] = useState(false);
  const [referenceThumbnail, setReferenceThumbnail] = useState<string | null>(null);

  const [matchStrength, setMatchStrength] = useState(100);

  // Source and target Lab stats
  const [sourceStats, setSourceStats] = useState<{ mean: LabStats; std: LabStats } | null>(null);
  const [targetStats, setTargetStats] = useState<{ mean: LabStats; std: LabStats } | null>(null);

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
    if (engineRef.current && imageLoaded && sourceStats && targetStats) {
      const params: GradingParams = {
        ...defaultGradingParams,
        useAdaptiveColor: true,
        adaptiveStrength: matchStrength,
        adaptiveSourceMean: sourceStats.mean,
        adaptiveSourceStd: sourceStats.std,
        adaptiveTargetMean: targetStats.mean,
        adaptiveTargetStd: targetStats.std,
      };
      engineRef.current.updateParams(params);
    } else if (engineRef.current && imageLoaded) {
      // No reference, show original
      const params: GradingParams = {
        ...defaultGradingParams,
        useAdaptiveColor: false,
      };
      engineRef.current.updateParams(params);
    }
  }, [imageLoaded, sourceStats, targetStats, matchStrength]);

  const analyzeImage = useCallback((img: HTMLImageElement): { mean: LabStats; std: LabStats } | null => {
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
        mean: { L: stats.lab.meanL, a: stats.lab.meanA, b: stats.lab.meanB },
        std: { L: stats.lab.stdL, a: stats.lab.stdA, b: stats.lab.stdB },
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

          // Analyze source image
          const stats = analyzeImage(img);
          if (stats) {
            setSourceStats(stats);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeImage]);

  const handleReferenceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setReferenceThumbnail(url);

        const img = new Image();
        img.onload = () => {
          setReferenceLoaded(true);

          // Analyze reference image
          const stats = analyzeImage(img);
          if (stats) {
            setTargetStats(stats);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  }, [analyzeImage]);

  const handleExport = useCallback(() => {
    if (engineRef.current && imageLoaded) {
      const dataUrl = engineRef.current.exportImage('png', 0.92);
      const link = document.createElement('a');
      link.download = `reference_matched_${matchStrength}pct.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [imageLoaded, matchStrength]);

  const clearReference = useCallback(() => {
    setReferenceLoaded(false);
    setReferenceThumbnail(null);
    setTargetStats(null);
  }, []);

  return (
    <div className="refmatch-mode">
      <div className="refmatch-layout">
        {/* Left: Reference panel */}
        <div className="refmatch-reference-panel">
          <div className="refmatch-section-title">Reference Image</div>

          <input
            type="file"
            ref={refFileInputRef}
            accept="image/*"
            onChange={handleReferenceUpload}
            style={{ display: 'none' }}
          />

          <div className="refmatch-reference-preview">
            {referenceThumbnail ? (
              <div className="refmatch-reference-loaded">
                <img
                  src={referenceThumbnail}
                  alt="Reference"
                  className="refmatch-reference-img"
                />
                <button
                  className="refmatch-clear-btn"
                  onClick={clearReference}
                  title="Clear reference"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div
                className="refmatch-reference-placeholder"
                onClick={() => refFileInputRef.current?.click()}
              >
                <div className="refmatch-reference-placeholder-icon">+</div>
                <div className="refmatch-reference-placeholder-text">Upload Reference</div>
              </div>
            )}
          </div>

          {/* Stats display */}
          {referenceLoaded && targetStats && (
            <div className="refmatch-stats">
              <div className="refmatch-stats-title">Target Lab Stats</div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">L:</span>
                <span className="refmatch-stats-value">{targetStats.mean.L.toFixed(1)} ({targetStats.std.L.toFixed(1)})</span>
              </div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">a:</span>
                <span className="refmatch-stats-value">{targetStats.mean.a.toFixed(1)} ({targetStats.std.a.toFixed(1)})</span>
              </div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">b:</span>
                <span className="refmatch-stats-value">{targetStats.mean.b.toFixed(1)} ({targetStats.std.b.toFixed(1)})</span>
              </div>
            </div>
          )}

          {/* Match strength slider */}
          <div className="refmatch-controls">
            <div className="refmatch-slider-group">
              <label>Match Strength</label>
              <input
                type="range"
                min={0}
                max={100}
                value={matchStrength}
                onChange={(e) => setMatchStrength(Number(e.target.value))}
                className="refmatch-slider"
              />
              <span>{matchStrength}%</span>
            </div>
          </div>

          {/* Source stats */}
          {imageLoaded && sourceStats && (
            <div className="refmatch-stats source">
              <div className="refmatch-stats-title">Source Lab Stats</div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">L:</span>
                <span className="refmatch-stats-value">{sourceStats.mean.L.toFixed(1)} ({sourceStats.std.L.toFixed(1)})</span>
              </div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">a:</span>
                <span className="refmatch-stats-value">{sourceStats.mean.a.toFixed(1)} ({sourceStats.std.a.toFixed(1)})</span>
              </div>
              <div className="refmatch-stats-row">
                <span className="refmatch-stats-label">b:</span>
                <span className="refmatch-stats-value">{sourceStats.mean.b.toFixed(1)} ({sourceStats.std.b.toFixed(1)})</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Main image preview */}
        <div className="refmatch-preview">
          <input
            type="file"
            ref={mainFileInputRef}
            accept="image/*"
            onChange={handleMainImageUpload}
            style={{ display: 'none' }}
          />

          <div className="refmatch-canvas-container">
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
                className="refmatch-placeholder"
                onClick={() => mainFileInputRef.current?.click()}
              >
                <div className="refmatch-placeholder-icon">+</div>
                <div className="refmatch-placeholder-text">Load your image</div>
                <div className="refmatch-placeholder-subtext">
                  Match its colors to any reference photo
                </div>
              </div>
            )}
          </div>

          <div className="refmatch-actions">
            <button
              className="refmatch-action-btn"
              onClick={() => mainFileInputRef.current?.click()}
            >
              Load Image
            </button>
            <button
              className="refmatch-action-btn primary"
              onClick={handleExport}
              disabled={!imageLoaded}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
