import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { RGBOffset, ColorWheelMode } from '../types';

interface ColorWheelProps {
  mode: ColorWheelMode;
  onModeChange: (mode: ColorWheelMode) => void;
  onChange: (value: RGBOffset) => void;
  shadowValue: RGBOffset;
  midtoneValue: RGBOffset;
  highlightValue: RGBOffset;
  onReset: () => void;
}

const WHEEL_SIZE = 160;
const CENTER = WHEEL_SIZE / 2;
const RADIUS = WHEEL_SIZE / 2 - 10;

export const ColorWheel: React.FC<ColorWheelProps> = ({
  mode,
  onModeChange,
  onChange,
  shadowValue,
  midtoneValue,
  highlightValue,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 获取当前模式的值
  const currentValue = mode === 'shadows' ? shadowValue :
                       mode === 'midtones' ? midtoneValue : highlightValue;

  // RGB 转 HSL
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 100; g /= 100; b /= 100;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return [h * 360, s, l];
  };

  // HSL 转 RGB
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 100, g * 100, b * 100];
  };

  // 绘制色轮
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

    // 绘制色轮
    for (let angle = 0; angle < 360; angle++) {
      for (let dist = 0; dist < RADIUS; dist++) {
        const rad = (angle * Math.PI) / 180;
        const x = CENTER + Math.cos(rad) * dist;
        const y = CENTER - Math.sin(rad) * dist;
        const saturation = dist / RADIUS;

        const [r, g, b] = hslToRgb(angle, saturation, 0.5);
        ctx.fillStyle = `rgb(${r * 2.55}, ${g * 2.55}, ${b * 2.55})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // 绘制边框
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制中心点
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 3, 0, Math.PI * 2);
    ctx.fill();

    // 计算选择器位置
    const [h] = rgbToHsl(currentValue.r, currentValue.g, currentValue.b);
    const magnitude = Math.sqrt(currentValue.r * currentValue.r +
                                currentValue.g * currentValue.g +
                                currentValue.b * currentValue.b) / 100;
    const selectorRadius = Math.min(magnitude * RADIUS * 0.7, RADIUS - 5);
    const selectorAngle = (h * Math.PI) / 180;
    const selectorX = CENTER + Math.cos(selectorAngle) * selectorRadius;
    const selectorY = CENTER - Math.sin(selectorAngle) * selectorRadius;

    // 绘制选择器
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(selectorX, selectorY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgb(${128 + currentValue.r * 1.27}, ${128 + currentValue.g * 1.27}, ${128 + currentValue.b * 1.27})`;
    ctx.beginPath();
    ctx.arc(selectorX, selectorY, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [currentValue]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // 处理鼠标事件
  const handleMouseEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging && e.type !== 'mousedown') return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - CENTER;
    const y = -(e.clientY - rect.top - CENTER);

    const dist = Math.sqrt(x * x + y * y);
    const clampedDist = Math.min(dist, RADIUS);
    const angle = Math.atan2(y, x);

    // 转换为 RGB 偏移
    const saturation = clampedDist / RADIUS;
    const hue = ((angle * 180 / Math.PI) + 360) % 360;
    const [r, g, b] = hslToRgb(hue, saturation, 0.5);

    // 将 0-100 的值转换为 -100 到 100 的偏移
    const offset: RGBOffset = {
      r: (r - 50) * 2,
      g: (g - 50) * 2,
      b: (b - 50) * 2,
    };

    onChange(offset);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    handleMouseEvent(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleMouseEvent(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 模式标签
  const modeLabels: Record<ColorWheelMode, string> = {
    shadows: 'Shadows',
    midtones: 'Midtones',
    highlights: 'Highlights',
  };

  return (
    <div className="color-wheel">
      <div className="wheel-tabs">
        {(['shadows', 'midtones', 'highlights'] as ColorWheelMode[]).map(m => (
          <button
            key={m}
            className={`wheel-tab ${mode === m ? 'active' : ''}`}
            onClick={() => onModeChange(m)}
          >
            {modeLabels[m]}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={WHEEL_SIZE}
        height={WHEEL_SIZE}
        className="wheel-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="wheel-values">
        <span className="wheel-value" style={{ color: '#ff6b6b' }}>
          R: {currentValue.r.toFixed(0)}
        </span>
        <span className="wheel-value" style={{ color: '#51cf66' }}>
          G: {currentValue.g.toFixed(0)}
        </span>
        <span className="wheel-value" style={{ color: '#339af0' }}>
          B: {currentValue.b.toFixed(0)}
        </span>
      </div>
      <button className="reset-btn small" onClick={onReset}>Reset</button>
    </div>
  );
};

export default ColorWheel;
