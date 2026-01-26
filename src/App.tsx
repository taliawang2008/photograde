import React, { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { WebGLEngine } from './engine/WebGLEngine';
import { CurveEditor } from './components/CurveEditor';
import { ColorWheel } from './components/ColorWheel';
import { Histogram, calculateHistogram } from './components/Histogram';
import { ParamSlider } from './components/ParamSlider';
import FilmSelector from './components/FilmSelector';
import LogSelector from './components/LogSelector';
import { filmProfiles } from './engine/filmProfiles';
import { loadCubeLUTFromFile, loadCubeLUTFromURL, downloadCubeLUT, createIdentityLUT } from './engine/LUTParser';
import { CollapsibleSection } from './components/CollapsibleSection';
import { filmCharacterPresets } from './engine/filmPresets';
import { useDebouncedLocalStorage, getStoredValue } from './hooks/useLocalStorage';
import type {
  GradingParams,
  GradingAction,
  CurveChannel,
  ColorWheelMode,
  HistogramData,
  LUT3D,
  FilmType,
  LogProfile,
  ACESOutputTransform,
} from './types';
import { acesOutputTransforms } from './engine/acesProfiles';
import { defaultGradingParams } from './types';

// Reducer 处理状态更新
function gradingReducer(state: GradingParams, action: GradingAction): GradingParams {
  switch (action.type) {
    case 'SET_PARAM':
      return { ...state, [action.param]: action.value };

    case 'SET_CURVE':
      return {
        ...state,
        curves: { ...state.curves, [action.channel]: action.points },
      };

    case 'SET_COLOR_WHEEL':
      if (action.mode === 'shadows') {
        return { ...state, shadowLift: action.value };
      } else if (action.mode === 'midtones') {
        return { ...state, midtoneGamma: action.value };
      } else {
        return { ...state, highlightGain: action.value };
      }

    case 'RESET_ALL':
      return { ...defaultGradingParams };

    case 'RESET_EXPOSURE':
      return {
        ...state,
        exposure: 0,
        contrast: 0,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
      };

    case 'RESET_TONE':
      return {
        ...state,
        highlights: 0,
        shadows: 0,
        whites: 0,
        blacks: 0,
      };

    case 'RESET_COLOR':
      return {
        ...state,
        temperature: 0,
        tint: 0,
        saturation: 0,
        vibrance: 0,
      };

    case 'RESET_CURVES':
      return {
        ...state,
        curves: {
          rgb: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
          red: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
          green: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
          blue: [{ x: 0, y: 0 }, { x: 255, y: 255 }],
        },
      };

    case 'RESET_COLOR_WHEELS':
      return {
        ...state,
        shadowLift: { r: 0, g: 0, b: 0 },
        midtoneGamma: { r: 0, g: 0, b: 0 },
        highlightGain: { r: 0, g: 0, b: 0 },
      };

    case 'RESET_FILM':
      return {
        ...state,
        filmType: 'none',
        filmStrength: 100,
        grainAmount: 0,
        grainSize: 50,
        fade: 0,
        halation: 0,
        halationColor: '#FF5500',
        halationThreshold: 65,
        halationRadius: 50,
      };

    case 'LOAD_PARAMS':
      return { ...action.params };

    case 'MERGE_PARAMS':
      return { ...state, ...action.params };

    default:
      return state;
  }
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WebGLEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lutInputRef = useRef<HTMLInputElement>(null);
  const lastCurvesRef = useRef<any>(null); // 用于优化曲线更新检查

  // 加载保存的参数或使用默认值
  const savedParams = getStoredValue<GradingParams>('vlog-grading-params', defaultGradingParams);
  const [params, dispatch] = useReducer(gradingReducer, savedParams);

  // UI 状态
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeCurveChannel, setActiveCurveChannel] = useState<CurveChannel>('rgb');
  const [activeWheelMode, setActiveWheelMode] = useState<ColorWheelMode>('shadows');
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [customLUT, setCustomLUT] = useState<LUT3D | null>(null);
  const [previewFilmType, setPreviewFilmType] = useState<FilmType | null>(null);  // For live film preview on hover
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mobile panel navigation state
  const [activePanel, setActivePanel] = useState<'left' | 'canvas' | 'right'>('canvas');
  const [isMobile, setIsMobile] = useState(false);

  // Touch gesture state for pinch-to-zoom
  const initialPinchDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(100);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 自动保存参数到 localStorage
  useDebouncedLocalStorage('vlog-grading-params', params, 500);

  // 初始化 WebGL 引擎
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      try {
        engineRef.current = new WebGLEngine(canvasRef.current);
        console.log('WebGL Engine Initialized');
      } catch (e) {
        console.error('Failed to init WebGL', e);
      }
    }

    return () => {
      // Destroy and null out the ref to prevent reusing deleted resources (React Strict Mode issue)
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Mouse wheel zoom - must use non-passive listener to prevent page scroll
  // Removed useEffect for wheel listener to revert to simpler handler

  // 更新参数到引擎 (使用 requestAnimationFrame 优化性能)
  const updateEngineRef = useRef<number | null>(null);
  const histogramTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (engineRef.current && imageLoaded) {
      // 取消之前的更新
      if (updateEngineRef.current) {
        cancelAnimationFrame(updateEngineRef.current);
      }
      if (histogramTimerRef.current) {
        clearTimeout(histogramTimerRef.current);
      }

      // 使用 requestAnimationFrame 确保流畅更新
      updateEngineRef.current = requestAnimationFrame(() => {
        // 优化：仅当曲线引用发生变化时才上传纹理 (避免每一帧都上传)
        if (engineRef.current && params.curves !== lastCurvesRef.current) {
          engineRef.current.updateCurves(params.curves);
          lastCurvesRef.current = params.curves;
        }

        // 更新 Uniforms 并渲染
        // Use preview film type if hovering, otherwise use actual params
        const renderParams = previewFilmType
          ? { ...params, filmType: previewFilmType }
          : params;
        engineRef.current?.updateParams(renderParams);
      });

      // 延迟更新直方图 (降低优先级)
      histogramTimerRef.current = setTimeout(() => {
        const pixels = engineRef.current?.getPixelData();
        if (pixels) {
          setHistogramData(calculateHistogram(pixels));
        }
      }, 300);

      return () => {
        if (updateEngineRef.current) {
          cancelAnimationFrame(updateEngineRef.current);
        }
        if (histogramTimerRef.current) {
          clearTimeout(histogramTimerRef.current);
        }
      };
    }
  }, [params, imageLoaded, previewFilmType]);

  // 优化：仅当曲线引用发生变化时才上传纹理 (避免每一帧都上传)
  useEffect(() => {
    if (engineRef.current && params.curves !== lastCurvesRef.current) {
      engineRef.current.updateCurves(params.curves);
      lastCurvesRef.current = params.curves;
    }
  }, [params.curves]);

  // Handle ACES Output Transform loading
  const handleFilmChange = (filmType: FilmType) => {
    // 1. Set the film type base
    dispatch({ type: 'SET_PARAM', param: 'filmType', value: filmType });

    // 2. Check for recipe overrides
    if (filmType === 'none') return;

    const profile = filmProfiles[filmType as keyof typeof filmProfiles];
    if (profile) {
      if (profile.shadowLift) dispatch({ type: 'SET_PARAM', param: 'shadowLift', value: profile.shadowLift });
      if (profile.midtoneGamma) dispatch({ type: 'SET_PARAM', param: 'midtoneGamma', value: profile.midtoneGamma });
      if (profile.highlightGain) dispatch({ type: 'SET_PARAM', param: 'highlightGain', value: profile.highlightGain });
      if (profile.curves) {
        dispatch({ type: 'SET_PARAM', param: 'curves', value: profile.curves });
      }
      if (profile.saturationOverride !== undefined) {
        dispatch({ type: 'SET_PARAM', param: 'saturation', value: profile.saturationOverride });
      }
      if (profile.contrastOverride !== undefined) {
        dispatch({ type: 'SET_PARAM', param: 'contrast', value: profile.contrastOverride });
      }
    }
  };

  const handlePresetChange = (presetId: string) => {
    const preset = filmCharacterPresets.find(p => p.id === presetId);
    if (preset) {
      dispatch({ type: 'MERGE_PARAMS', params: preset.params });
    }
  };

  useEffect(() => {
    if (!engineRef.current) return;

    const loadODT = async () => {
      const transform = acesOutputTransforms[params.acesOutputTransform];

      if (!transform || !transform.outputLUT) {
        engineRef.current?.clearOutputLUT();
        return;
      }

      try {
        const lut = await loadCubeLUTFromURL(transform.outputLUT);
        engineRef.current?.loadOutputLUT(lut);
      } catch (err) {
        console.error('Failed to load ACES ODT LUT:', err);
        // Fallback to clear if load fails
        engineRef.current?.clearOutputLUT();
      }
    };

    loadODT();
  }, [params.acesOutputTransform]);

  // 处理图片上传
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && engineRef.current) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          engineRef.current?.loadImage(img);
          setImageLoaded(true);

          // 初始化直方图
          setTimeout(() => {
            const pixels = engineRef.current?.getPixelData();
            if (pixels) {
              setHistogramData(calculateHistogram(pixels));
            }
          }, 100);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // 处理 LUT 上传
  const handleLUTUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const lut = await loadCubeLUTFromFile(file);
        setCustomLUT(lut);
        engineRef.current?.load3DLUT(lut);
        dispatch({ type: 'SET_PARAM', param: 'lutStrength', value: 100 });
      } catch (error) {
        console.error('Failed to load LUT:', error);
        alert('Failed to load LUT file. Please ensure it is a valid .cube file.');
      }
    }
  }, []);

  // 导出图片
  const handleExport = useCallback((format: 'png' | 'jpeg' = 'png') => {
    if (!engineRef.current || !imageLoaded) return;

    const dataUrl = engineRef.current.exportImage(format, 0.92);
    const link = document.createElement('a');
    link.download = `graded_image.${format}`;
    link.href = dataUrl;
    link.click();
  }, [imageLoaded, params, customLUT, previewFilmType]);

  // 导出 LUT
  const handleExportLUT = useCallback(() => {
    // 创建一个表示当前调整的 LUT
    const lut = createIdentityLUT(33);
    downloadCubeLUT(lut, 'color_grading');
  }, []);

  // 清除自定义 LUT
  const handleClearLUT = useCallback(() => {
    setCustomLUT(null);
    engineRef.current?.clear3DLUT();
  }, []);



  return (
    <div className="container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div className="mobile-header-content">
          <div className="mobile-header-title">Film Grade Pro</div>
          <div className="mobile-header-actions">
            <button className="mobile-action-btn" onClick={() => fileInputRef.current?.click()} title="Load Image">
              📁
            </button>
            <button className="mobile-action-btn" onClick={() => handleExport('png')} title="Export">
              💾
            </button>
          </div>
        </div>
      </div>

      <div className="main-layout">
        {/* 左侧面板 */}
        <div className={`panel left-panel${isMobile && activePanel === 'left' ? ' mobile-active' : ''}`}>
          {/* 文件加载 */}
          <div className="section">
            <div className="section-title">📁 Project</div>
            <div className="file-input-wrapper">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button className="file-input-label" onClick={() => fileInputRef.current?.click()}>
                Load Image
              </button>
            </div>
            <div className="file-actions">
              <input
                type="file"
                ref={lutInputRef}
                accept=".cube"
                onChange={handleLUTUpload}
                style={{ display: 'none' }}
              />
              <button className="action-btn small" onClick={() => lutInputRef.current?.click()}>
                Import LUT
              </button>
              {customLUT && (
                <button className="action-btn small" onClick={handleClearLUT}>
                  Clear LUT
                </button>
              )}
            </div>
          </div>

          {/* 胶片模拟 */}
          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>🎞️ Film Emulation</div>
              <button className="reset-section-btn" onClick={() => dispatch({ type: 'RESET_FILM' })}>
                Reset
              </button>
            </div>

            {/* Film Type Dropdown with Live Preview */}
            <FilmSelector
              value={params.filmType}
              onChange={handleFilmChange}
              onPreview={setPreviewFilmType}
            />

            {/* Revert to authentic matrices: only enable if profile has matrix */}
            {params.filmType !== 'none' && (
              <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="useMatrix"
                  checked={params.useFilmColorMatrix}
                  disabled={!filmProfiles[params.filmType]?.colorMatrix} // Disable if no matrix
                  onChange={(e) => dispatch({ type: 'SET_PARAM', param: 'useFilmColorMatrix', value: e.target.checked })}
                  style={{ width: 'auto', marginRight: '8px', cursor: filmProfiles[params.filmType]?.colorMatrix ? 'pointer' : 'not-allowed' }}
                />
                <label
                  htmlFor="useMatrix"
                  style={{
                    fontSize: '12px',
                    color: filmProfiles[params.filmType]?.colorMatrix ? '#ccc' : '#666',
                    cursor: filmProfiles[params.filmType]?.colorMatrix ? 'pointer' : 'not-allowed'
                  }}
                >
                  Use Pro Color Matrix {!filmProfiles[params.filmType]?.colorMatrix && '(Unavailable)'}
                </label>
              </div>
            )}

            <ParamSlider dispatch={dispatch} label="Film Strength" value={params.filmStrength} min={0} max={100} param="filmStrength" />

            {/* Film Character Presets Section */}
            <div className="preset-section" style={{ marginTop: '12px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Film Structure Presets
              </div>
              <select
                className="log-select"
                onChange={(e) => handlePresetChange(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select Preset structure...</option>
                {filmCharacterPresets.map(preset => (
                  <option key={preset.id} value={preset.id} title={preset.description}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '16px' }}>
              <CollapsibleSection title="🎬 Film Response">
                <ParamSlider dispatch={dispatch} label="Toe (Shadows)" value={params.filmToe} min={0} max={100} param="filmToe" />
                <ParamSlider dispatch={dispatch} label="Shoulder (Highlights)" value={params.filmShoulder} min={0} max={100} param="filmShoulder" />
                <ParamSlider dispatch={dispatch} label="Fade" value={params.fade} min={0} max={100} param="fade" />
              </CollapsibleSection>

              <CollapsibleSection title="🎞️ Texture & Grain">
                <ParamSlider dispatch={dispatch} label="Grain Amount" value={params.grainAmount} min={0} max={100} param="grainAmount" />
                {params.grainAmount > 0 && (
                  <div style={{ paddingLeft: '10px', borderLeft: '2px solid #333', marginTop: '4px', marginBottom: '10px' }}>
                    <ParamSlider dispatch={dispatch} label="Size" value={params.grainSize} min={0} max={100} param="grainSize" />
                    <ParamSlider dispatch={dispatch} label="Chromacity (Color)" value={params.grainChromacity ?? 60} min={0} max={100} param="grainChromacity" />
                    <ParamSlider dispatch={dispatch} label="Highlights" value={params.grainHighlights ?? 20} min={0} max={100} param="grainHighlights" />
                    <ParamSlider dispatch={dispatch} label="Shadows" value={params.grainShadows ?? 80} min={0} max={100} param="grainShadows" />
                  </div>
                )}
              </CollapsibleSection>

              <CollapsibleSection title="✨ Optics & Effects">
                <ParamSlider dispatch={dispatch} label="Acutance (Sharpness)" value={params.acutance} min={0} max={100} param="acutance" />
                <ParamSlider dispatch={dispatch} label="Halation" value={params.halation} min={0} max={100} param="halation" />
                {params.halation > 0 && (
                  <div style={{ paddingLeft: '10px', borderLeft: '2px solid #333', marginTop: '4px', marginBottom: '10px' }}>
                    <div className="color-picker-row">
                      <label>Halation Color</label>
                      <input
                        type="color"
                        value={params.halationColor}
                        onChange={(e) => dispatch({ type: 'SET_PARAM', param: 'halationColor', value: e.target.value })}
                      />
                    </div>
                    <ParamSlider dispatch={dispatch} label="Threshold" value={params.halationThreshold} min={0} max={100} param="halationThreshold" />
                    <ParamSlider dispatch={dispatch} label="Radius" value={params.halationRadius} min={0} max={100} param="halationRadius" />
                  </div>
                )}
                <ParamSlider dispatch={dispatch} label="Bloom" value={params.bloom} min={0} max={100} param="bloom" />
                <ParamSlider dispatch={dispatch} label="Diffusion" value={params.diffusion} min={0} max={100} param="diffusion" />
              </CollapsibleSection>

              <CollapsibleSection title="🔲 Vignette">
                <ParamSlider dispatch={dispatch} label="Vignette" value={params.vignette} min={0} max={100} param="vignette" />
                <ParamSlider dispatch={dispatch} label="Vignette Radius" value={params.vignetteRadius} min={0} max={100} param="vignetteRadius" />
              </CollapsibleSection>
            </div>

          </div>

          {/* 曝光控制 */}
          {/* Input Log Profile */}
          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>🎥 Input</div>
            </div>
            <LogSelector
              value={params.inputLogProfile}
              onChange={(profile: LogProfile) => dispatch({ type: 'SET_PARAM', param: 'inputLogProfile', value: profile })}
            />

            <div className="log-selector" style={{ marginTop: '8px' }}>
              <label>ACES Output (ODT)</label>
              <select
                value={params.acesOutputTransform}
                onChange={(e) => dispatch({ type: 'SET_PARAM', param: 'acesOutputTransform', value: e.target.value as ACESOutputTransform })}
                className="log-select"
              >
                {Object.entries(acesOutputTransforms).map(([key, profile]) => (
                  <option key={key} value={key}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>⚙️ Light</div>
              <button className="reset-section-btn" onClick={() => dispatch({ type: 'RESET_EXPOSURE' })}>
                Reset
              </button>
            </div>

            <ParamSlider dispatch={dispatch} label="Exposure" value={params.exposure} param="exposure" />
            <ParamSlider dispatch={dispatch} label="Contrast" value={params.contrast} param="contrast" />
            <ParamSlider dispatch={dispatch} label="Highlights" value={params.highlights} param="highlights" />
            <ParamSlider dispatch={dispatch} label="Shadows" value={params.shadows} param="shadows" />
            <ParamSlider dispatch={dispatch} label="Whites" value={params.whites} param="whites" />
            <ParamSlider dispatch={dispatch} label="Blacks" value={params.blacks} param="blacks" />
          </div>

          {/* 色彩控制 */}
          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>🎨 Color</div>
              <button className="reset-section-btn" onClick={() => dispatch({ type: 'RESET_COLOR' })}>
                Reset
              </button>
            </div>

            <ParamSlider dispatch={dispatch} label="Temperature" value={params.temperature} param="temperature" />
            <ParamSlider dispatch={dispatch} label="Tint" value={params.tint} param="tint" />
            <ParamSlider dispatch={dispatch} label="Saturation" value={params.saturation} param="saturation" />
            <ParamSlider dispatch={dispatch} label="Vibrance" value={params.vibrance} param="vibrance" />

            {/* 光谱控制 */}
            <div className="subsection-title">🌈 Spectral Controls</div>
            <ParamSlider dispatch={dispatch} label="Volume (Density)" value={params.spectralVolume} param="spectralVolume" />
            <ParamSlider dispatch={dispatch} label="Luminance" value={params.spectralLuminance} param="spectralLuminance" />
            <ParamSlider dispatch={dispatch} label="Hue Shift" value={params.spectralHue} param="spectralHue" />
          </div>

          {/* LUT 强度 */}
          {customLUT && (
            <div className="section">
              <div className="section-title">🎬 Custom LUT</div>
              <div className="lut-info">{customLUT.title || 'Loaded LUT'}</div>
              <ParamSlider dispatch={dispatch} label="LUT Strength" value={params.lutStrength} min={0} max={100} param="lutStrength" />
            </div>
          )}
        </div>

        {/* 中间面板 (Canvas) - Always visible, panels slide over */}
        <div
          className={`image-panel${isMobile && activePanel === 'left' ? ' mobile-shifted-right' : ''
            }${isMobile && activePanel === 'right' ? ' mobile-shifted-left' : ''
            }`}
          onClick={() => isMobile && activePanel !== 'canvas' && setActivePanel('canvas')}
        >
          <div className="panel canvas-panel">
            <div
              ref={containerRef}
              className="canvas-container"
              style={{
                overflow: 'hidden',
                cursor: zoom > 100 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onWheel={(e) => {
                const delta = e.deltaY > 0 ? -10 : 10;
                setZoom(z => Math.min(300, Math.max(10, z + delta)));
              }}
              onMouseDown={(e) => {
                if (zoom > 100) {
                  setIsPanning(true);
                  panStartRef.current = { x: e.clientX, y: e.clientY };
                  e.preventDefault();
                }
              }}
              onMouseMove={(e) => {
                if (isPanning && panStartRef.current) {
                  const dx = e.clientX - panStartRef.current.x;
                  const dy = e.clientY - panStartRef.current.y;
                  setPan(p => ({ x: p.x + dx, y: p.y + dy }));
                  panStartRef.current = { x: e.clientX, y: e.clientY };
                }
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              // Touch events for mobile pinch-to-zoom and pan
              onTouchStart={(e) => {
                if (e.touches.length === 2) {
                  // Pinch start
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
                  initialZoomRef.current = zoom;
                } else if (e.touches.length === 1 && zoom > 100) {
                  // Pan start
                  setIsPanning(true);
                  panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && initialPinchDistanceRef.current) {
                  // Pinch zoom
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const newDistance = Math.sqrt(dx * dx + dy * dy);
                  const scale = newDistance / initialPinchDistanceRef.current;
                  const newZoom = Math.min(300, Math.max(10, initialZoomRef.current * scale));
                  setZoom(newZoom);
                } else if (e.touches.length === 1 && isPanning && panStartRef.current) {
                  // Touch pan
                  const dx = e.touches[0].clientX - panStartRef.current.x;
                  const dy = e.touches[0].clientY - panStartRef.current.y;
                  setPan(p => ({ x: p.x + dx, y: p.y + dy }));
                  panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
              }}
              onTouchEnd={(e) => {
                if (e.touches.length < 2) {
                  initialPinchDistanceRef.current = null;
                }
                if (e.touches.length === 0) {
                  setIsPanning(false);
                  panStartRef.current = null;
                }
              }}
            >
              <canvas
                id="canvas"
                ref={canvasRef}
                style={{
                  display: imageLoaded ? 'block' : 'none',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                  transformOrigin: 'center center',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                }}
              />
              {!imageLoaded && (
                <div className="placeholder">
                  Load an image to start grading
                  <br />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    Supports JPG, PNG, WebP • WebGL Accelerated
                  </span>
                </div>
              )}
            </div>

            {/* 缩放控制 */}
            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => setZoom(Math.max(10, zoom - 10))}>−</button>
              <div className="zoom-label">{zoom}%</div>
              <button className="zoom-btn" onClick={() => setZoom(Math.min(300, zoom + 10))}>+</button>
              <button className="zoom-btn" onClick={() => setZoom(50)} title="Fit 50%">50%</button>
              <button className="zoom-btn" onClick={() => setZoom(100)}>100%</button>
              <button className="zoom-btn" onClick={() => handleExport('png')} title="Export PNG">
                💾
              </button>
            </div>
          </div>
        </div>

        {/* 右侧面板 */}
        <div className={`panel right-panel${isMobile && activePanel === 'right' ? ' mobile-active' : ''}`}>
          {/* 曲线编辑器 */}
          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>📈 Curves</div>
            </div>
            <CurveEditor
              curves={params.curves}
              activeChannel={activeCurveChannel}
              onChannelChange={setActiveCurveChannel}
              onCurveChange={(channel, points) => dispatch({ type: 'SET_CURVE', channel, points })}
              onReset={() => dispatch({ type: 'RESET_CURVES' })}
            />
          </div>

          {/* 色轮 */}
          <div className="section">
            <div className="section-header">
              <div className="section-title" style={{ marginBottom: 0 }}>🎡 Color Wheels</div>
            </div>
            <ColorWheel
              mode={activeWheelMode}
              onModeChange={setActiveWheelMode}
              onChange={(value) => dispatch({ type: 'SET_COLOR_WHEEL', mode: activeWheelMode, value })}
              shadowValue={params.shadowLift}
              midtoneValue={params.midtoneGamma}
              highlightValue={params.highlightGain}
              onReset={() => dispatch({ type: 'RESET_COLOR_WHEELS' })}
            />
          </div>

          {/* 直方图 */}
          <div className="section">
            <Histogram data={histogramData} width={240} height={100} />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="bottom-bar">
          <button className="action-btn" onClick={() => dispatch({ type: 'RESET_ALL' })}>
            Reset All
          </button>
          <button className="action-btn" onClick={() => handleExport('png')}>
            Export PNG
          </button>
          <button className="action-btn" onClick={() => handleExport('jpeg')}>
            Export JPEG
          </button>
          <button className="action-btn" onClick={handleExportLUT}>
            Export LUT
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        <div className="mobile-nav-tabs">
          <button
            className={`mobile-nav-tab${activePanel === 'left' ? ' active' : ''}`}
            onClick={() => setActivePanel('left')}
          >
            <span className="mobile-nav-tab-icon">⚙️</span>
            <span className="mobile-nav-tab-label">Settings</span>
          </button>
          <button
            className={`mobile-nav-tab${activePanel === 'canvas' ? ' active' : ''}`}
            onClick={() => setActivePanel('canvas')}
          >
            <span className="mobile-nav-tab-icon">🖼️</span>
            <span className="mobile-nav-tab-label">Image</span>
          </button>
          <button
            className={`mobile-nav-tab${activePanel === 'right' ? ' active' : ''}`}
            onClick={() => setActivePanel('right')}
          >
            <span className="mobile-nav-tab-icon">🎨</span>
            <span className="mobile-nav-tab-label">Tools</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
