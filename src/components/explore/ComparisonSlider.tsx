import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ComparisonSliderProps {
  leftImage: string | null;
  rightImage: string | null;
  leftLabel?: string;
  rightLabel?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  leftImage,
  rightImage,
  leftLabel = 'Processed',
  rightLabel = 'Reference',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging) {
      handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  if (!leftImage && !rightImage) {
    return (
      <div className="comparison-empty">
        Load images to compare
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="comparison-container"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
    >
      {/* Right (reference) image - full width, bottom layer */}
      {rightImage && (
        <div className="comparison-image-wrapper right">
          <img src={rightImage} alt={rightLabel} className="comparison-image" />
        </div>
      )}

      {/* Left (processed) image - clipped by slider position */}
      {leftImage && (
        <div
          className="comparison-image-wrapper left"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img src={leftImage} alt={leftLabel} className="comparison-image" />
        </div>
      )}

      {/* Slider line */}
      <div
        className="comparison-slider-line"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="comparison-slider-handle">
          <div className="comparison-slider-arrow left">&larr;</div>
          <div className="comparison-slider-arrow right">&rarr;</div>
        </div>
      </div>

      {/* Labels */}
      <div className="comparison-labels">
        <span className="comparison-label left" style={{ opacity: sliderPosition > 10 ? 1 : 0 }}>
          {leftLabel}
        </span>
        <span className="comparison-label right" style={{ opacity: sliderPosition < 90 ? 1 : 0 }}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
};
