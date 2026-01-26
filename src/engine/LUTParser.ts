// .cube LUT 文件解析器
import type { LUT3D } from '../types';

/**
 * 解析 .cube 格式的 3D LUT 文件
 * @param content .cube 文件的文本内容
 * @returns LUT3D 对象
 */
export function parseCubeLUT(content: string): LUT3D {
  const lines = content.split('\n');
  let size = 0;
  let title = '';
  const data: number[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 解析标题
    if (trimmed.startsWith('TITLE')) {
      title = trimmed.substring(5).trim().replace(/"/g, '');
      continue;
    }

    // 解析 LUT 尺寸
    if (trimmed.startsWith('LUT_3D_SIZE')) {
      size = parseInt(trimmed.split(/\s+/)[1], 10);
      continue;
    }

    // 跳过其他元数据
    if (trimmed.startsWith('DOMAIN_MIN') ||
        trimmed.startsWith('DOMAIN_MAX') ||
        trimmed.startsWith('LUT_1D_SIZE') ||
        trimmed.startsWith('LUT_1D_INPUT_RANGE') ||
        trimmed.startsWith('LUT_3D_INPUT_RANGE')) {
      continue;
    }

    // 解析颜色数据
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 3) {
      const r = parseFloat(parts[0]);
      const g = parseFloat(parts[1]);
      const b = parseFloat(parts[2]);

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        data.push(r, g, b);
      }
    }
  }

  if (size === 0) {
    throw new Error('Invalid .cube file: LUT_3D_SIZE not found');
  }

  const expectedLength = size * size * size * 3;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid .cube file: expected ${expectedLength} values, got ${data.length}`);
  }

  return {
    size,
    title,
    data: new Float32Array(data),
  };
}

/**
 * 导出 3D LUT 为 .cube 格式
 * @param lut LUT3D 对象
 * @param title LUT 标题
 * @returns .cube 文件内容字符串
 */
export function exportCubeLUT(lut: LUT3D, title: string = 'Exported LUT'): string {
  const lines: string[] = [];

  // 写入头部
  lines.push(`# Created by V-Log Color Grading Tool`);
  lines.push(`TITLE "${title}"`);
  lines.push(`LUT_3D_SIZE ${lut.size}`);
  lines.push(`DOMAIN_MIN 0.0 0.0 0.0`);
  lines.push(`DOMAIN_MAX 1.0 1.0 1.0`);
  lines.push('');

  // 写入颜色数据
  const size = lut.size;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const idx = (b * size * size + g * size + r) * 3;
        const rv = lut.data[idx].toFixed(6);
        const gv = lut.data[idx + 1].toFixed(6);
        const bv = lut.data[idx + 2].toFixed(6);
        lines.push(`${rv} ${gv} ${bv}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * 从文件对象读取并解析 .cube LUT
 * @param file 文件对象
 * @returns Promise<LUT3D>
 */
export async function loadCubeLUTFromFile(file: File): Promise<LUT3D> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const content = reader.result as string;
        const lut = parseCubeLUT(content);
        resolve(lut);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * 下载 LUT 为 .cube 文件
 * @param lut LUT3D 对象
 * @param filename 文件名 (不含扩展名)
 */
export function downloadCubeLUT(lut: LUT3D, filename: string = 'export'): void {
  const content = exportCubeLUT(lut, filename);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.cube`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * 创建恒等 LUT (无变化)
 * @param size LUT 尺寸
 * @returns LUT3D 对象
 */
export function createIdentityLUT(size: number = 33): LUT3D {
  const data = new Float32Array(size * size * size * 3);

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const idx = (b * size * size + g * size + r) * 3;
        data[idx] = r / (size - 1);
        data[idx + 1] = g / (size - 1);
        data[idx + 2] = b / (size - 1);
      }
    }
  }

  return {
    size,
    title: 'Identity',
    data,
  };
}
