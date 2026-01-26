import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { logProfileToInt } from './logProfiles';
import { filmProfiles } from './filmProfiles'; // New import
import type { GradingParams, CurvesData, CurvePoint, LUT3D, FilmType } from '../types';

// 胶片类型到整数的映射
const filmTypeToInt: Record<FilmType, number> = {
  'none': 0,
  // Color Negative (1-7)
  'amber-gold': 1,
  'portrait-160': 2,
  'portrait-400': 3,
  'portrait-800': 4,
  'vivid-100': 5,
  'max-400': 6,
  'budget-color': 7,
  // Slide (8-9)
  'vintage-chrome': 8,
  'chrome-100': 9,
  // Color Negative (Alt) (10-12)
  'verdant-400': 10,
  'f-portrait-400': 11,
  'f-c200': 12,
  // Slide (Alt) (13-15)
  'natural-100': 13,
  'vivid-50': 14,
  'soft-100': 15,
  // Cinema (16-17)
  'motion-800t': 16,
  'motion-50d': 17,
  // Black & White (18-23)
  'mono-classic-400': 18,
  'mono-classic-tx': 19,
  'mono-grain-3200': 20,
  'mono-fine-100': 21,
  'mono-fine-ac': 22,
  'mono-fine-pf': 23,
  // Recipes (24-27)
  'cinema-2383': 24,
  'lomochrome-purple': 25,
  'reala-ace': 26,
  'autumn-breeze': 27,
};

export class WebGLEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private program: WebGLProgram | null = null;

  // 纹理
  private imageTexture: WebGLTexture | null = null;
  private curveLUTTexture: WebGLTexture | null = null;
  private filmLUTTexture: WebGLTexture | null = null;
  private inputLUTTexture: WebGLTexture | null = null;
  private outputLUTTexture: WebGLTexture | null = null;

  // 属性位置
  private positionLocation: number = 0;
  private texCoordLocation: number = 0;

  // Uniform 位置缓存
  private uniforms: { [key: string]: WebGLUniformLocation | null } = {};

  // 曲线 LUT 数据 (256x4, RGBA)
  private curveLUTData: Uint8Array = new Uint8Array(256 * 4 * 4);

  // 是否使用曲线
  private useCurveLUT: boolean = false;

  // 是否使用外部 LUT
  private useFilmLUT: boolean = false;
  private filmLUTSize: number = 0;

  // ACES Dual LUT state
  private useInputLUT: boolean = false;
  private inputLUTSize: number = 0;
  private useOutputLUT: boolean = false;
  private outputLUTSize: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,  // 用于导出
      premultipliedAlpha: false,
    });
    if (!gl) {
      throw new Error("WebGL not supported");
    }
    this.gl = gl;
    this.init();
    this.initCurveLUT();
  }

  private init() {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    this.program = this.createProgram(vertexShader, fragmentShader);
    if (!this.program) return;

    this.gl.useProgram(this.program);

    // 获取属性位置
    this.positionLocation = this.gl.getAttribLocation(this.program, "a_position");
    this.texCoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");

    // 获取所有 uniform 位置
    const uniformNames = [
      // 纹理
      'u_image', 'u_curveLUT', 'u_filmLUT', 'u_inputLUT', 'u_outputLUT',
      // 输入Log转换
      'u_inputLogProfile',
      // 基础曝光
      'u_exposure', 'u_contrast',
      // 分区域亮度
      'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
      // 色彩控制
      'u_temperature', 'u_tint', 'u_saturation', 'u_vibrance',
      // 光谱控制
      'u_spectralVolume', 'u_spectralLuminance', 'u_spectralHue',
      // 色轮
      'u_shadowLift', 'u_midtoneGamma', 'u_highlightGain',
      // 胶片效果
      'u_filmStrength', 'u_filmType', 'u_filmLUTSize',
      'u_useFilmColorMatrix', 'u_filmColorMatrix', // New uniforms
      // 高级胶片响应
      'u_filmToe', 'u_filmShoulder', 'u_crossoverShift',
      // 颗粒效果
      'u_grainAmount', 'u_grainSize', 'u_time', 'u_grainRoughness', // New uniform
      'u_grainChromacity', 'u_grainHighlights', 'u_grainShadows', // New Advanced Grain
      'u_acutance', 'u_texSize', // New uniforms
      // 特效
      'u_fade', 'u_halation', 'u_halationColor', 'u_halationThreshold', 'u_halationRadius',
      'u_bloom', 'u_diffusion', 'u_vignette', 'u_vignetteRadius',
      // LUT 控制
      'u_lutStrength', 'u_useCurveLUT', 'u_useFilmLUT',
      'u_useInputLUT', 'u_useOutputLUT', 'u_filmLUTSize', 'u_inputLUTSize', 'u_outputLUTSize',
      // Cinematography Filters
      'u_filterType', 'u_filterStrength', 'u_filterGlowRadius',
      'u_filterGlowThreshold', 'u_filterSharpness', 'u_filterStreakAngle',
    ];

    uniformNames.forEach(name => {
      this.uniforms[name] = this.gl.getUniformLocation(this.program!, name);
    });

    // 设置顶点缓冲区 (全屏四边形)
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      -1.0, -1.0,
      1.0, -1.0,
      -1.0, 1.0,
      1.0, 1.0,
    ]), this.gl.STATIC_DRAW);

    // 设置纹理坐标缓冲区
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
    ]), this.gl.STATIC_DRAW);

    // 启用顶点属性
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.enableVertexAttribArray(this.positionLocation);
    this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.enableVertexAttribArray(this.texCoordLocation);
    this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // 设置纹理单元
    this.gl.uniform1i(this.uniforms['u_image']!, 0);
    this.gl.uniform1i(this.uniforms['u_curveLUT']!, 1);
    this.gl.uniform1i(this.uniforms['u_filmLUT']!, 2);
    this.gl.uniform1i(this.uniforms['u_inputLUT']!, 3);
    this.gl.uniform1i(this.uniforms['u_outputLUT']!, 4);
  }

  // 初始化曲线 LUT (默认对角线)
  private initCurveLUT() {
    // 创建 256x4 的 LUT 纹理
    // Row 0: RGB 主曲线
    // Row 1: Red 通道
    // Row 2: Green 通道
    // Row 3: Blue 通道
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 256; i++) {
        const offset = (row * 256 + i) * 4;
        this.curveLUTData[offset] = i;     // R
        this.curveLUTData[offset + 1] = i; // G
        this.curveLUTData[offset + 2] = i; // B
        this.curveLUTData[offset + 3] = 255; // A
      }
    }

    // 创建纹理
    this.curveLUTTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.curveLUTTexture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      256, 4, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.curveLUTData
    );
  }

  // 加载图片
  public loadImage(image: HTMLImageElement) {
    // 保持原始分辨率以便高质量导出
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    // 通过 CSS 控制显示大小，适应容器
    const container = this.canvas.parentElement;
    if (container) {
      const maxWidth = container.clientWidth - 40;
      const maxHeight = container.clientHeight - 40;

      if (image.width > maxWidth || image.height > maxHeight) {
        const scaleW = maxWidth / image.width;
        const scaleH = maxHeight / image.height;
        const scale = Math.min(scaleW, scaleH);
        this.canvas.style.width = `${Math.floor(image.width * scale)}px`;
        this.canvas.style.height = `${Math.floor(image.height * scale)}px`;
      } else {
        this.canvas.style.width = `${image.width}px`;
        this.canvas.style.height = `${image.height}px`;
      }
    }

    // 创建/更新图像纹理
    if (this.imageTexture) this.gl.deleteTexture(this.imageTexture);

    this.imageTexture = this.gl.createTexture();
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.render();
  }

  // 更新所有参数
  public updateParams(params: GradingParams) {
    if (!this.program || !this.imageTexture) return;

    this.gl.useProgram(this.program);

    // === 输入Log转换 ===
    this.gl.uniform1i(this.uniforms['u_inputLogProfile']!, logProfileToInt[params.inputLogProfile] || 0);

    // === 基础曝光控制 ===
    // exposure: -100~100 映射到 -2~2 stops
    this.gl.uniform1f(this.uniforms['u_exposure']!, (params.exposure || 0) / 50.0);
    this.gl.uniform1f(this.uniforms['u_contrast']!, (params.contrast || 0) / 100.0);

    // === 分区域亮度调整 ===
    this.gl.uniform1f(this.uniforms['u_highlights']!, (params.highlights || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_shadows']!, (params.shadows || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_whites']!, (params.whites || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_blacks']!, (params.blacks || 0) / 100.0);

    // === 色彩控制 ===
    this.gl.uniform1f(this.uniforms['u_temperature']!, (params.temperature || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_tint']!, (params.tint || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_saturation']!, (params.saturation || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_vibrance']!, (params.vibrance || 0) / 100.0);

    // === 光谱控制 ===
    this.gl.uniform1f(this.uniforms['u_spectralVolume']!, (params.spectralVolume || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_spectralLuminance']!, (params.spectralLuminance || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_spectralHue']!, (params.spectralHue || 0) / 100.0);

    // === 色轮 ===
    this.gl.uniform3f(
      this.uniforms['u_shadowLift']!,
      (params.shadowLift.r || 0) / 100.0,
      (params.shadowLift.g || 0) / 100.0,
      (params.shadowLift.b || 0) / 100.0
    );
    this.gl.uniform3f(
      this.uniforms['u_midtoneGamma']!,
      (params.midtoneGamma.r || 0) / 100.0,
      (params.midtoneGamma.g || 0) / 100.0,
      (params.midtoneGamma.b || 0) / 100.0
    );
    this.gl.uniform3f(
      this.uniforms['u_highlightGain']!,
      (params.highlightGain.r || 0) / 100.0,
      (params.highlightGain.g || 0) / 100.0,
      (params.highlightGain.b || 0) / 100.0
    );

    // === 胶片效果 ===
    this.gl.uniform1f(this.uniforms['u_filmStrength']!, (params.filmStrength || 0) / 100.0);
    this.gl.uniform1i(this.uniforms['u_filmType']!, filmTypeToInt[params.filmType] || 0);

    // Film Color Matrix logic
    const currentFilm = params.filmType !== 'none' ? filmProfiles[params.filmType] : null;
    const hasMatrix = currentFilm && currentFilm.colorMatrix && params.useFilmColorMatrix;

    this.gl.uniform1i(this.uniforms['u_useFilmColorMatrix']!, hasMatrix ? 1 : 0);

    if (hasMatrix && currentFilm?.colorMatrix) {
      this.gl.uniformMatrix3fv(this.uniforms['u_filmColorMatrix']!, false, currentFilm.colorMatrix);
    } else {
      // Fallback to Identity
      this.gl.uniformMatrix3fv(this.uniforms['u_filmColorMatrix']!, false, [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }

    this.gl.uniform1f(this.uniforms['u_filmToe']!, (params.filmToe || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_filmShoulder']!, (params.filmShoulder || 0) / 100.0);
    this.gl.uniform3f(
      this.uniforms['u_crossoverShift']!,
      (params.crossoverShift?.r || 0) / 100.0,
      (params.crossoverShift?.g || 0) / 100.0,
      (params.crossoverShift?.b || 0) / 100.0
    );

    // === 颗粒效果 ===
    this.gl.uniform1f(this.uniforms['u_grainAmount']!, (params.grainAmount || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_grainSize']!, (params.grainSize || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_grainRoughness']!, (params.grainRoughness ?? 50) / 100.0); // Default to 0.5
    this.gl.uniform1f(this.uniforms['u_time']!, performance.now() / 1000.0);

    // Advanced Grain
    this.gl.uniform1f(this.uniforms['u_grainChromacity']!, (params.grainChromacity ?? 60) / 100.0);
    this.gl.uniform1f(this.uniforms['u_grainHighlights']!, (params.grainHighlights ?? 20) / 100.0);
    this.gl.uniform1f(this.uniforms['u_grainShadows']!, (params.grainShadows ?? 80) / 100.0);

    // Acutance
    // Use film profile default if available and not overridden (logic could be more complex, but here we just use params.acutance)
    // Actually params.acutance IS the source of truth, but we might initialize it from profile later.
    this.gl.uniform1f(this.uniforms['u_acutance']!, (params.acutance || 0) / 100.0);
    this.gl.uniform2f(this.uniforms['u_texSize']!, this.canvas.width, this.canvas.height);

    // === 特效 ===
    this.gl.uniform1f(this.uniforms['u_fade']!, (params.fade || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_halation']!, (params.halation || 0) / 100.0);

    // Halation color - convert hex to RGB
    const halationColor = params.halationColor || '#FF5500';
    const r = parseInt(halationColor.slice(1, 3), 16) / 255;
    const g = parseInt(halationColor.slice(3, 5), 16) / 255;
    const b = parseInt(halationColor.slice(5, 7), 16) / 255;
    this.gl.uniform3f(this.uniforms['u_halationColor']!, r, g, b);

    this.gl.uniform1f(this.uniforms['u_halationThreshold']!, (params.halationThreshold ?? 65) / 100.0);
    this.gl.uniform1f(this.uniforms['u_halationRadius']!, (params.halationRadius ?? 50) / 100.0);

    this.gl.uniform1f(this.uniforms['u_bloom']!, (params.bloom || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_diffusion']!, (params.diffusion || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_vignette']!, (params.vignette || 0) / 100.0);
    this.gl.uniform1f(this.uniforms['u_vignetteRadius']!, (params.vignetteRadius || 50) / 100.0);

    // === LUT 控制 ===
    this.gl.uniform1f(this.uniforms['u_lutStrength']!, (params.lutStrength || 0) / 100.0);
    this.gl.uniform1i(this.uniforms['u_useCurveLUT']!, this.useCurveLUT ? 1 : 0);
    this.gl.uniform1i(this.uniforms['u_useFilmLUT']!, this.useFilmLUT ? 1 : 0);
    this.gl.uniform1f(this.uniforms['u_filmLUTSize']!, this.filmLUTSize);

    // ACES Dual LUTs
    this.gl.uniform1i(this.uniforms['u_useInputLUT']!, this.useInputLUT ? 1 : 0);
    this.gl.uniform1f(this.uniforms['u_inputLUTSize']!, this.inputLUTSize);
    this.gl.uniform1i(this.uniforms['u_useOutputLUT']!, this.useOutputLUT ? 1 : 0);
    this.gl.uniform1f(this.uniforms['u_outputLUTSize']!, this.outputLUTSize);

    // === Cinematography Filters ===
    const filterTypeMap: Record<string, number> = {
      'none': 0,
      'black-pro-mist': 1,
      'black-mist': 2,
      'hdf': 3,
      'hollywood-black-magic': 4,
      'glimmerglass': 5,
      'white-diffusion': 6,
      'orton': 7,
      'streak': 8,
    };

    // Use defaults if params are undefined (for backwards compatibility)
    const filterType = params.filterType ?? 'none';
    const filterStrength = params.filterStrength ?? 50;
    const filterGlowRadius = params.filterGlowRadius ?? 50;
    const filterGlowThreshold = params.filterGlowThreshold ?? 65;
    const filterSharpness = params.filterSharpness ?? 30;
    const filterStreakAngle = params.filterStreakAngle ?? 0;

    this.gl.uniform1i(this.uniforms['u_filterType']!, filterTypeMap[filterType] || 0);
    this.gl.uniform1f(this.uniforms['u_filterStrength']!, filterStrength);
    this.gl.uniform1f(this.uniforms['u_filterGlowRadius']!, filterGlowRadius);
    this.gl.uniform1f(this.uniforms['u_filterGlowThreshold']!, filterGlowThreshold);
    this.gl.uniform1f(this.uniforms['u_filterSharpness']!, filterSharpness);
    this.gl.uniform1f(this.uniforms['u_filterStreakAngle']!, filterStreakAngle);

    this.render();
  }

  // 更新曲线数据
  public updateCurves(curves: CurvesData) {
    // Guard: ensure texture is initialized
    if (!this.curveLUTTexture) {
      console.error('curveLUTTexture not initialized');
      return;
    }

    // 从控制点生成 256 点 LUT
    const rgbLUT = this.interpolateCurve(curves.rgb);
    const redLUT = this.interpolateCurve(curves.red);
    const greenLUT = this.interpolateCurve(curves.green);
    const blueLUT = this.interpolateCurve(curves.blue);

    // 检查是否有非默认曲线
    this.useCurveLUT = !this.isDefaultCurve(curves.rgb) ||
      !this.isDefaultCurve(curves.red) ||
      !this.isDefaultCurve(curves.green) ||
      !this.isDefaultCurve(curves.blue);

    // 更新 LUT 数据
    for (let i = 0; i < 256; i++) {
      // Row 0: RGB 主曲线
      this.curveLUTData[i * 4] = rgbLUT[i];
      this.curveLUTData[i * 4 + 1] = rgbLUT[i];
      this.curveLUTData[i * 4 + 2] = rgbLUT[i];
      this.curveLUTData[i * 4 + 3] = 255;

      // Row 1: Red 通道
      this.curveLUTData[256 * 4 + i * 4] = redLUT[i];
      this.curveLUTData[256 * 4 + i * 4 + 1] = i;
      this.curveLUTData[256 * 4 + i * 4 + 2] = i;
      this.curveLUTData[256 * 4 + i * 4 + 3] = 255;

      // Row 2: Green 通道
      this.curveLUTData[512 * 4 + i * 4] = i;
      this.curveLUTData[512 * 4 + i * 4 + 1] = greenLUT[i];
      this.curveLUTData[512 * 4 + i * 4 + 2] = i;
      this.curveLUTData[512 * 4 + i * 4 + 3] = 255;

      // Row 3: Blue 通道
      this.curveLUTData[768 * 4 + i * 4] = i;
      this.curveLUTData[768 * 4 + i * 4 + 1] = i;
      this.curveLUTData[768 * 4 + i * 4 + 2] = blueLUT[i];
      this.curveLUTData[768 * 4 + i * 4 + 3] = 255;
    }

    // 更新纹理
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.curveLUTTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      256, 4, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.curveLUTData
    );
  }

  // 检查曲线是否为默认对角线
  private isDefaultCurve(points: CurvePoint[]): boolean {
    if (points.length !== 2) return false;
    return points[0].x === 0 && points[0].y === 0 &&
      points[1].x === 255 && points[1].y === 255;
  }

  // 曲线插值 (Catmull-Rom spline)
  private interpolateCurve(points: CurvePoint[]): Uint8Array {
    const lut = new Uint8Array(256);

    if (points.length < 2) {
      for (let i = 0; i < 256; i++) lut[i] = i;
      return lut;
    }

    // 对控制点按 x 排序
    const sorted = [...points].sort((a, b) => a.x - b.x);

    // Catmull-Rom 插值
    for (let i = 0; i < 256; i++) {
      // 找到 i 所在的区间
      let idx = 0;
      while (idx < sorted.length - 1 && sorted[idx + 1].x < i) {
        idx++;
      }

      if (idx >= sorted.length - 1) {
        lut[i] = Math.round(Math.max(0, Math.min(255, sorted[sorted.length - 1].y)));
        continue;
      }

      const p0 = sorted[Math.max(0, idx - 1)];
      const p1 = sorted[idx];
      const p2 = sorted[Math.min(sorted.length - 1, idx + 1)];
      const p3 = sorted[Math.min(sorted.length - 1, idx + 2)];

      const t = p2.x === p1.x ? 0 : (i - p1.x) / (p2.x - p1.x);

      // Catmull-Rom 公式
      const t2 = t * t;
      const t3 = t2 * t;

      const v = 0.5 * (
        (2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      );

      lut[i] = Math.round(Math.max(0, Math.min(255, v)));
    }

    return lut;
  }

  // 加载 3D LUT
  public load3DLUT(lut: LUT3D) {
    const size = lut.size;
    this.filmLUTSize = size;

    // 将 3D LUT 打包成 2D 纹理
    const packed = this.packLUTData(lut);
    const data = packed.data;
    const width = packed.width;
    const height = packed.height;

    // Create texture helper
    const texture = this.gl.createTexture();
    this.uploadLUTTexture(texture, data, width, height, 2); // Unit 2 for FilmLUT

    if (this.filmLUTTexture) this.gl.deleteTexture(this.filmLUTTexture);
    this.filmLUTTexture = texture;
    this.useFilmLUT = true;
  }

  // Helper to upload LUT data to texture
  private uploadLUTTexture(texture: WebGLTexture | null, data: Uint8Array, width: number, height: number, unitIndex: number) {
    if (!texture) return;
    const units = [this.gl.TEXTURE0, this.gl.TEXTURE1, this.gl.TEXTURE2, this.gl.TEXTURE3, this.gl.TEXTURE4];

    this.gl.activeTexture(units[unitIndex]);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      width, height, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, data
    );
  }

  // Load Input LUT (IDT)
  public loadInputLUT(lut: LUT3D) {
    const size = lut.size;
    this.inputLUTSize = size;
    const data = this.packLUTData(lut);

    const texture = this.gl.createTexture();
    this.uploadLUTTexture(texture, data.data, data.width, data.height, 3); // Unit 3

    if (this.inputLUTTexture) this.gl.deleteTexture(this.inputLUTTexture);
    this.inputLUTTexture = texture;
    this.useInputLUT = true;
  }

  // Clear Input LUT
  public clearInputLUT() {
    this.useInputLUT = false;
    this.inputLUTSize = 0;
  }

  // Load Output LUT (ODT)
  public loadOutputLUT(lut: LUT3D) {
    const size = lut.size;
    this.outputLUTSize = size;
    const data = this.packLUTData(lut);

    const texture = this.gl.createTexture();
    this.uploadLUTTexture(texture, data.data, data.width, data.height, 4); // Unit 4

    if (this.outputLUTTexture) this.gl.deleteTexture(this.outputLUTTexture);
    this.outputLUTTexture = texture;
    this.useOutputLUT = true;
  }

  // Clear Output LUT
  public clearOutputLUT() {
    this.useOutputLUT = false;
    this.outputLUTSize = 0;
  }

  // Helper to pack 3D LUT to 2D array
  private packLUTData(lut: LUT3D): { data: Uint8Array, width: number, height: number } {
    const size = lut.size;
    const width = size * size;
    const height = size;
    const data = new Uint8Array(width * height * 4);

    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          const srcIdx = (b * size * size + g * size + r) * 3;
          const dstX = b * size + r;
          const dstY = g;
          const dstIdx = (dstY * width + dstX) * 4;

          data[dstIdx] = Math.round(lut.data[srcIdx] * 255);
          data[dstIdx + 1] = Math.round(lut.data[srcIdx + 1] * 255);
          data[dstIdx + 2] = Math.round(lut.data[srcIdx + 2] * 255);
          data[dstIdx + 3] = 255;
        }
      }
    }
    return { data, width, height };
  }

  // 清除 3D LUT
  public clear3DLUT() {
    this.useFilmLUT = false;
    this.filmLUTSize = 0;
  }

  // 获取像素数据 (用于直方图)
  public getPixelData(): Uint8Array | null {
    if (!this.imageTexture) return null;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const pixels = new Uint8Array(width * height * 4);

    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

    return pixels;
  }

  // 导出图片
  public exportImage(format: 'png' | 'jpeg' = 'png', quality: number = 0.92): string {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return this.canvas.toDataURL(mimeType, quality);
  }

  // 获取 Canvas 元素
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // 渲染
  private render() {
    if (!this.imageTexture || !this.curveLUTTexture) return;

    // 确保纹理绑定正确
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);

    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.curveLUTTexture);

    if (this.filmLUTTexture) {
      this.gl.activeTexture(this.gl.TEXTURE2);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.filmLUTTexture);
    }

    if (this.inputLUTTexture) {
      this.gl.activeTexture(this.gl.TEXTURE3);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.inputLUTTexture);
    }

    if (this.outputLUTTexture) {
      this.gl.activeTexture(this.gl.TEXTURE4);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.outputLUTTexture);
    }

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  // 创建着色器
  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // 创建着色器程序
  private createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  // 销毁资源
  public destroy() {
    if (this.imageTexture) this.gl.deleteTexture(this.imageTexture);
    if (this.curveLUTTexture) this.gl.deleteTexture(this.curveLUTTexture);
    if (this.filmLUTTexture) this.gl.deleteTexture(this.filmLUTTexture);
    if (this.program) this.gl.deleteProgram(this.program);
  }
}
