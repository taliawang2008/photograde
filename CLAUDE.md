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
    | dispatch(action)
    v
gradingReducer updates state
    | useEffect
    v
WebGLEngine.updateParams() sets 60+ uniforms
    | requestAnimationFrame
    v
Fragment shader processes all effects (1,829 lines)
    |
    v
Canvas output
```

### Key Source Files

| Path | Purpose |
|------|---------|
| `src/App.tsx` | Main component, state management (useReducer), all UI orchestration |
| `src/types/index.ts` | GradingParams, FilmProfile, and all type definitions |
| `src/engine/WebGLEngine.ts` | WebGL rendering engine, texture management, uniform binding |
| `src/engine/shaders.ts` | GLSL vertex + fragment shaders (uber-shader) |
| `src/engine/filmProfiles.ts` | 27 film stock definitions with color matrices |
| `src/engine/logProfiles.ts` | Camera log transforms (S-Log3, V-Log, C-Log3, LogC3, N-Log, F-Log, BRAW) |
| `src/engine/acesProfiles.ts` | ACES Input/Output transforms (IDT/ODT) with LUT paths |
| `src/engine/ImageAnalyzer.ts` | Image statistics extraction (Lab space, histograms, zones) |
| `src/engine/ColorTransfer.ts` | Reinhard color transfer algorithm |
| `src/engine/LUTParser.ts` | .cube LUT file parsing |

### UI Components

| Component | Purpose |
|-----------|---------|
| `CollapsibleSection.tsx` | Expandable panel container for UI sections |
| `ParamSlider.tsx` | Reusable slider connected to GradingParams dispatch |
| `ColorWheel.tsx` | Lift/Gamma/Gain color wheel controls |
| `CurveEditor.tsx` | RGB and per-channel curve editing with spline interpolation |
| `FilmSelector.tsx` | Film stock dropdown selector |
| `LogSelector.tsx` | Camera log profile selector |
| `FiltersPanel.tsx` | Cinematography filter controls (Pro-Mist, Glimmerglass, etc.) |
| `Histogram.tsx` | Real-time RGB/luminance histogram display |
| `AdaptivePanel.tsx` | Adaptive color matching controls |
| `ReferenceLoader.tsx` | Reference image upload for color matching |

### Shader Processing Pipeline (in order)

1. Input log transform (8 camera formats)
2. ACES LUT transforms (optional IDT/ODT)
3. Exposure & contrast
4. Tone range (highlights, shadows, whites, blacks)
5. Color (temperature, tint, saturation, vibrance)
6. Spectral controls (volume, luminance, hue)
7. Color wheels (Lift-Gamma-Gain)
8. Curves (RGB + per-channel via 256-sample LUT texture)
9. Adaptive color matching (Reinhard transfer in Lab space)
10. Film emulation (color matrix + toe/shoulder)
11. Film grain (Golden Noise algorithm with acutance)
12. Effects (fade, halation, bloom, diffusion, vignette)
13. Cinematography filters (Pro-Mist, Glimmerglass, Streak, etc.)

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
2. Add default value to `defaultGradingParams` in same file
3. Add uniform declaration in fragment shader (`src/engine/shaders.ts`)
4. Add uniform name to `uniformNames` array in `WebGLEngine.ts`
5. Set uniform value in `updateParams()` method in `WebGLEngine.ts`
6. Add UI control in `App.tsx` or appropriate component

## Adding New Film Profiles

1. Add film type to `FilmType` union in `src/types/index.ts`
2. Add film profile definition to `filmProfiles` in `src/engine/filmProfiles.ts`
3. Add integer mapping to `filmTypeToInt` in `src/engine/WebGLEngine.ts`
4. Shader automatically uses color matrix if `colorMatrix` is defined

## Key Patterns

- **Single-pass rendering**: All effects processed in one fragment shader to avoid multi-pass overhead
- **Golden Noise**: Deterministic, pattern-free noise for film grain (no temporal animation)
- **Bloom Dithering**: Per-pixel jitter in bloom/streak calculations prevents banding at large radii
- **32-bit float precision**: Required throughout for accurate color science
- **Trilinear interpolation**: Used for 3D LUT lookups
- **Lab color space**: Used for perceptually uniform color operations (adaptive matching)
- **useReducer pattern**: All grading state managed via reducer with typed actions

## Adaptive Color Matching System

The adaptive color matching feature uses the Reinhard color transfer algorithm to match input images to reference image characteristics.

### How it works

1. **ImageAnalyzer** computes statistics from both source and reference images:
   - Lab color space mean and standard deviation
   - Histogram percentiles (P5, P50, P95)
   - Zone-based color averages (shadows, midtones, highlights)

2. **Reinhard transfer** in the shader:
   ```
   output = (target_std / source_std) * (input - source_mean) + target_mean
   ```

3. Controlled by uniforms: `u_sourceMean`, `u_sourceStd`, `u_targetMean`, `u_targetStd`, `u_adaptiveStrength`

### Files involved

- `src/engine/ImageAnalyzer.ts` - Statistics extraction
- `src/engine/ColorTransfer.ts` - CPU-side Reinhard implementation
- `src/components/AdaptivePanel.tsx` - UI controls
- `src/components/ReferenceLoader.tsx` - Reference image upload
- `docs/adaptive-color-matching-plan.md` - Full implementation plan

## Scripts

Located in `scripts/`:

| Script | Purpose |
|--------|---------|
| `create-reference-profile.mjs` | Generate reference profile JSON from image |
| `compare-lut.mjs` | Compare LUT output quality |
| `apply-film-profile.mjs` | Batch apply film profile to images |
| `run-conversion.mjs` | Run image conversion pipeline |

These scripts use Puppeteer and Sharp for headless browser automation and image processing.

## LUT Files

Located in `public/luts/`:

- `aces/` - ACES Input/Output transforms (.cube files)
  - `SLog3_to_ACEScg.cube`, `VLog_to_ACEScg.cube`, etc. (IDTs)
  - `ACEScg_to_Rec709.cube`, `ACEScg_to_sRGB.cube`, etc. (ODTs)
- Custom LUTs can be loaded via the UI

## Code Conventions

- **Chinese comments**: Some original comments are in Chinese; maintain consistency when editing those sections
- **Type safety**: All parameters are strictly typed via `GradingParams` interface
- **Reducer actions**: Use typed actions (`GradingAction`) for state updates
- **No external state libraries**: Pure React with `useReducer` and `useLocalStorage` hook
- **CSS-in-JS**: Inline styles used throughout; no external CSS framework

## Common Tasks

### Adjusting film profile color response
Edit `src/engine/filmProfiles.ts`. Key properties:
- `colorMatrix`: 3x3 color transformation matrix
- `shadowShift`/`highlightShift`: RGB offsets for tonal regions
- `contrast`, `saturation`, `warmth`: Scalar multipliers

### Modifying shader behavior
Edit `src/engine/shaders.ts`. The fragment shader `main()` function calls processing functions in order. Each effect has its own function (e.g., `applyGrain()`, `applyHalation()`).

### Adding new camera log support
1. Add type to `LogProfile` in `src/engine/logProfiles.ts`
2. Add metadata to `logProfileData`
3. Add to `logProfileList` for UI
4. Add integer mapping to `logProfileToInt`
5. Implement transform function in shader (look for `applyLogTransform()`)

## Performance Considerations

- Avoid creating new textures per frame; reuse texture units
- Minimize uniform updates; batch when possible
- Shader uses `highp` precision for color accuracy (required on mobile)
- Large bloom/streak radii use dithering to prevent banding without increasing sample count
