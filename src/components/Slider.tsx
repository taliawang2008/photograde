import React, { useRef, useCallback, useEffect, useState } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = -100,
  max = 100,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateValue = useCallback((clientX: number) => {
    if (!trackRef.current) return value;

    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newValue = Math.round(min + percentage * (max - min));
    return newValue;
  }, [min, max, value]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const newValue = calculateValue(e.clientX);
    onChange(newValue);
  }, [calculateValue, onChange]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newValue = calculateValue(e.clientX);
    onChange(newValue);
  }, [isDragging, calculateValue, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 计算滑块位置百分比
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-control">
      <div className="slider-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div
        ref={trackRef}
        className="custom-slider-track"
        onMouseDown={handleMouseDown}
      >
        <div
          className="custom-slider-fill"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="custom-slider-thumb"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
