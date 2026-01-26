import React, { useRef, useEffect, useCallback } from 'react';
import type { HistogramData } from '../types';

interface HistogramProps {
  data: HistogramData | null;
  width?: number;
  height?: number;
}

export const Histogram: React.FC<HistogramProps> = ({
  data,
  width = 256,
  height = 100,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawHistogram = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (!data) {
      // 绘制空状态
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Load an image to see histogram', width / 2, height / 2);
      return;
    }

    // 找到最大值用于归一化
    const maxValue = Math.max(
      ...data.red,
      ...data.green,
      ...data.blue,
    );

    if (maxValue === 0) return;

    // 绘制网格线
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (i / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 绘制 RGB 通道 (半透明叠加)
    const drawChannel = (channelData: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, height);

      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * width;
        const h = (channelData[i] / maxValue) * height;
        const y = height - h;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    };

    // 按顺序绘制以获得正确的叠加效果
    drawChannel(data.red, 'rgba(255, 107, 107, 0.5)');
    drawChannel(data.green, 'rgba(81, 207, 102, 0.5)');
    drawChannel(data.blue, 'rgba(51, 154, 240, 0.5)');

    // 绘制亮度曲线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * width;
      const h = (data.luminance[i] / maxValue) * height;
      const y = height - h;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 绘制边框
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);
  }, [data, width, height]);

  useEffect(() => {
    drawHistogram();
  }, [drawHistogram]);

  return (
    <div className="histogram">
      <div className="histogram-header">
        <span>Histogram</span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="histogram-canvas"
      />
      <div className="histogram-legend">
        <span className="legend-item" style={{ color: '#ff6b6b' }}>R</span>
        <span className="legend-item" style={{ color: '#51cf66' }}>G</span>
        <span className="legend-item" style={{ color: '#339af0' }}>B</span>
        <span className="legend-item" style={{ color: '#fff' }}>L</span>
      </div>
    </div>
  );
};

/**
 * 从像素数据计算直方图
 * @param pixels RGBA 像素数据
 * @returns HistogramData
 */
export function calculateHistogram(pixels: Uint8Array): HistogramData {
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    red[r]++;
    green[g]++;
    blue[b]++;

    // BT.709 亮度
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    luminance[Math.min(255, lum)]++;
  }

  return { red, green, blue, luminance };
}

export default Histogram;
