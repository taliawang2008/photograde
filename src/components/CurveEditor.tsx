import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { CurvePoint, CurveChannel } from '../types';

interface CurveEditorProps {
  curves: {
    rgb: CurvePoint[];
    red: CurvePoint[];
    green: CurvePoint[];
    blue: CurvePoint[];
  };
  activeChannel: CurveChannel;
  onChannelChange: (channel: CurveChannel) => void;
  onCurveChange: (channel: CurveChannel, points: CurvePoint[]) => void;
  onReset: () => void;
}

const CANVAS_SIZE = 200;
const POINT_RADIUS = 6;
const GRID_DIVISIONS = 4;

// 通道颜色
const channelColors: Record<CurveChannel, string> = {
  rgb: '#ffffff',
  red: '#ff6b6b',
  green: '#51cf66',
  blue: '#339af0',
};

export const CurveEditor: React.FC<CurveEditorProps> = ({
  curves,
  activeChannel,
  onChannelChange,
  onCurveChange,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 获取当前通道的控制点
  const currentPoints = curves[activeChannel];

  // Catmull-Rom 插值
  const interpolateCurve = useCallback((points: CurvePoint[]): number[] => {
    const lut: number[] = new Array(256);
    if (points.length < 2) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    const sorted = [...points].sort((a, b) => a.x - b.x);

    for (let i = 0; i < 256; i++) {
      let idx = 0;
      while (idx < sorted.length - 1 && sorted[idx + 1].x < i) {
        idx++;
      }

      if (idx >= sorted.length - 1) {
        lut[i] = Math.max(0, Math.min(255, sorted[sorted.length - 1].y));
        continue;
      }

      const p0 = sorted[Math.max(0, idx - 1)];
      const p1 = sorted[idx];
      const p2 = sorted[Math.min(sorted.length - 1, idx + 1)];
      const p3 = sorted[Math.min(sorted.length - 1, idx + 2)];

      const t = p2.x === p1.x ? 0 : (i - p1.x) / (p2.x - p1.x);
      const t2 = t * t;
      const t3 = t2 * t;

      const v = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      lut[i] = Math.max(0, Math.min(255, Math.round(v)));
    }

    return lut;
  }, []);

  // 绘制曲线
  const drawCurve = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // 绘制网格
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_DIVISIONS; i++) {
      const pos = (i / GRID_DIVISIONS) * CANVAS_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    // 绘制对角线参考
    ctx.strokeStyle = '#444';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, CANVAS_SIZE);
    ctx.lineTo(CANVAS_SIZE, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // 绘制所有通道的曲线 (非活动通道半透明)
    const channels: CurveChannel[] = ['rgb', 'red', 'green', 'blue'];
    for (const channel of channels) {
      if (channel === activeChannel) continue;

      const points = curves[channel];
      const lut = interpolateCurve(points);

      ctx.strokeStyle = channelColors[channel] + '40'; // 半透明
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < 256; x++) {
        const canvasX = (x / 255) * CANVAS_SIZE;
        const canvasY = CANVAS_SIZE - (lut[x] / 255) * CANVAS_SIZE;
        if (x === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      }
      ctx.stroke();
    }

    // 绘制活动通道曲线
    const activeLut = interpolateCurve(currentPoints);
    ctx.strokeStyle = channelColors[activeChannel];
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < 256; x++) {
      const canvasX = (x / 255) * CANVAS_SIZE;
      const canvasY = CANVAS_SIZE - (activeLut[x] / 255) * CANVAS_SIZE;
      if (x === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    }
    ctx.stroke();

    // 绘制控制点
    for (let i = 0; i < currentPoints.length; i++) {
      const point = currentPoints[i];
      const canvasX = (point.x / 255) * CANVAS_SIZE;
      const canvasY = CANVAS_SIZE - (point.y / 255) * CANVAS_SIZE;

      ctx.fillStyle = draggingPoint === i ? '#fff' : channelColors[activeChannel];
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }, [curves, currentPoints, activeChannel, interpolateCurve, draggingPoint]);

  // 绘制效果
  useEffect(() => {
    drawCurve();
  }, [drawCurve]);

  // 坐标转换
  const canvasToPoint = (e: React.MouseEvent<HTMLCanvasElement>): CurvePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 255;
    const y = (1 - (e.clientY - rect.top) / rect.height) * 255;
    return {
      x: Math.max(0, Math.min(255, Math.round(x))),
      y: Math.max(0, Math.min(255, Math.round(y))),
    };
  };

  // 查找最近的控制点
  const findNearestPoint = (mousePoint: CurvePoint): number | null => {
    const threshold = 15; // 像素距离阈值
    let nearest = -1;
    let minDist = Infinity;

    for (let i = 0; i < currentPoints.length; i++) {
      const p = currentPoints[i];
      const dx = p.x - mousePoint.x;
      const dy = p.y - mousePoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < threshold) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest >= 0 ? nearest : null;
  };

  // 鼠标按下
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = canvasToPoint(e);
    const nearestIdx = findNearestPoint(point);

    if (nearestIdx !== null) {
      // 拖拽现有点
      setDraggingPoint(nearestIdx);
      setIsDragging(true);
    } else if (currentPoints.length < 8) {
      // 添加新点 (最多 8 个)
      const newPoints = [...currentPoints, point].sort((a, b) => a.x - b.x);
      onCurveChange(activeChannel, newPoints);
    }
  };

  // 鼠标移动
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || draggingPoint === null) return;

    const point = canvasToPoint(e);
    const newPoints = [...currentPoints];

    // 端点只能上下移动
    if (draggingPoint === 0) {
      newPoints[0] = { x: 0, y: point.y };
    } else if (draggingPoint === currentPoints.length - 1) {
      newPoints[draggingPoint] = { x: 255, y: point.y };
    } else {
      // 中间点可以移动，但不能超过相邻点
      const minX = currentPoints[draggingPoint - 1].x + 1;
      const maxX = currentPoints[draggingPoint + 1].x - 1;
      newPoints[draggingPoint] = {
        x: Math.max(minX, Math.min(maxX, point.x)),
        y: point.y,
      };
    }

    onCurveChange(activeChannel, newPoints);
  };

  // 鼠标抬起
  const handleMouseUp = () => {
    setDraggingPoint(null);
    setIsDragging(false);
  };

  // 双击删除点
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = canvasToPoint(e);
    const nearestIdx = findNearestPoint(point);

    // 不能删除端点，且至少保留 2 个点
    if (nearestIdx !== null && nearestIdx > 0 && nearestIdx < currentPoints.length - 1 && currentPoints.length > 2) {
      const newPoints = currentPoints.filter((_, i) => i !== nearestIdx);
      onCurveChange(activeChannel, newPoints);
    }
  };

  return (
    <div className="curve-editor">
      <div className="curve-tabs">
        {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map(channel => (
          <button
            key={channel}
            className={`curve-tab ${activeChannel === channel ? 'active' : ''}`}
            style={{
              borderColor: activeChannel === channel ? channelColors[channel] : 'transparent',
              color: channelColors[channel],
            }}
            onClick={() => onChannelChange(channel)}
          >
            {channel.toUpperCase()}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="curve-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
      <div className="curve-info">
        <span>点击添加点 | 双击删除点 | 拖拽调整</span>
        <button className="reset-btn small" onClick={onReset}>Reset</button>
      </div>
    </div>
  );
};

export default CurveEditor;
