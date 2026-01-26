# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

No test framework is configured. TypeScript errors are caught during `npm run build`.

## Architecture Overview

This is a **WebGL-based color grading application** using React + TypeScript. The core architecture is a single-pass "uber-shader" that processes all color grading operations in one GPU pass for 60+ FPS performance.

### Data Flow

```
React State (GradingParams via useReducer)
    ↓ dispatch(action)
gradingReducer updates state
    ↓ useEffect
WebGLEngine.updateParams() sets 50+ uniforms
    ↓ requestAnimationFrame
Fragment shader processes all effects
    ↓
Canvas output
```

### Key Source Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main component, state management (useReducer), all UI orchestration |
| `src/types/index.ts` | GradingParams and all type definitions |
| `src/engine/WebGLEngine.ts` | WebGL rendering engine, texture management, uniform binding |
| `src/engine/shaders.ts` | GLSL vertex + fragment shaders (1,683 lines uber-shader) |
| `src/engine/filmProfiles.ts` | 27 film stock definitions with color matrices |
| `src/engine/logProfiles.ts` | Camera log transforms (S-Log3, V-Log, C-Log3, LogC3, N-Log, F-Log) |

### Shader Processing Pipeline (in order)

1. Input log transform (8 camera formats)
2. ACES LUT transforms (optional IDT/ODT)
3. Exposure & contrast
4. Tone range (highlights, shadows, whites, blacks)
5. Color (temperature, tint, saturation, vibrance)
6. Spectral controls (volume, luminance, hue)
7. Color wheels (Lift-Gamma-Gain)
8. Curves (RGB + per-channel via 256-sample LUT texture)
9. Film emulation (color matrix + toe/shoulder)
10. Film grain (Golden Noise algorithm)
11. Effects (fade, halation, bloom, diffusion, vignette)
12. Cinematography filters (Pro-Mist, Glimmerglass, Streak, etc.)

### Texture Units

| Unit | Purpose |
|------|---------|
| 0 | Input image |
| 1 | Curve LUT (256x4 RGBA) |
| 2 | Film 3D LUT (packed 2D) |
| 3 | ACES Input LUT |
| 4 | ACES Output LUT |

## Adding New Parameters

1. Add to `GradingParams` type in `src/types/index.ts`
2. Add uniform declaration in fragment shader (`src/engine/shaders.ts`)
3. Add uniform name to `uniformNames` array in `WebGLEngine.ts`
4. Set uniform value in `updateParams()` method
5. Add UI control in `App.tsx`

## Key Patterns

- **Single-pass rendering**: All effects processed in one fragment shader to avoid multi-pass overhead
- **Golden Noise**: Deterministic, pattern-free noise for film grain (no temporal animation)
- **Dithering**: Per-pixel jitter in bloom/streak calculations prevents banding at large radii
- **32-bit float precision**: Required throughout for accurate color science
- **Trilinear interpolation**: Used for 3D LUT lookups
