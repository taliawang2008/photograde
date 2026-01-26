# Adaptive Color Matching Implementation Plan

## Problem Statement

A static film profile/LUT applies the same transformation to every pixel regardless of the input image's characteristics. This fails to produce consistent results because different input images have vastly different:

- **Exposure levels** - Some images are darker/brighter than the reference
- **White balance** - Color temperature varies between shots
- **Contrast range** - Dynamic range differs based on lighting conditions
- **Color distribution** - Subject matter affects overall color palette

**Goal**: Make any user image achieve the look of a reference image, matching not just color but also contrast, saturation, grain, and other film characteristics.

---

## Research Findings

### 1. Reinhard Color Transfer (2001)

**Source**: [PyImageSearch](https://pyimagesearch.com/2014/06/30/super-fast-color-transfer-images/), [Wikipedia](https://en.wikipedia.org/wiki/Image_color_transfer)

**How it works**:
- Converts images to Lab color space (perceptually uniform)
- Matches mean (μ) and standard deviation (σ) of each channel
- Formula: `output = (σ_target / σ_source) × (source - μ_source) + μ_target`

**Pros**:
- Very fast (simple statistics)
- Works reasonably well for global color mood

**Cons**:
- Global-only, doesn't preserve local details
- Large uniform regions can skew results
- Doesn't handle exposure differences well

**Implementation complexity**: Low

---

### 2. Histogram Matching

**How it works**:
- Computes cumulative distribution function (CDF) of both images
- Maps source pixels to match target's CDF
- Can be done per-channel or in Lab space

**Pros**:
- Better color distribution alignment than Reinhard
- Preserves relative relationships within image

**Cons**:
- Still global, can cause artifacts
- Doesn't account for semantic content
- Can produce unnatural results if images are very different

**Implementation complexity**: Low-Medium

---

### 3. Neural Network / AI Solutions

**Commercial examples**:
- [fylm.ai](https://fylm.ai/ai-colour-grading/) - Deep learning trained on millions of cinematic frames
- [Colourlab](https://nofilmschool.com/ai-comes-filmmaking-colourlab) - Neural network-driven automatic shot matching
- [Color.io](https://www.color.io/ai-color-match) - ML-based color transfer with LUT export

**How they work**:
- Train on large datasets of professionally graded footage
- Learn semantic understanding of images (faces, sky, foliage, etc.)
- Generate custom 3D LUTs from reference images
- Can match shots in ~10 seconds with good accuracy

**Pros**:
- Best quality results
- Understands image content semantically
- Can handle very different source/target pairs

**Cons**:
- Requires significant ML infrastructure
- Training data collection is expensive
- Computationally intensive

**Implementation complexity**: Very High

---

### 4. ACES Normalization Workflow

**Source**: [Netflix ACES Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360002088888-Color-Managed-Workflow-in-Resolve-ACES), [Frame.io Guide](https://workflow.frame.io/guide/aces)

**How it works**:
- Input Transform (IDT): Converts camera-specific color to common ACES space
- All images normalized to scene-linear, wide-gamut working space
- Creative grading applied in consistent environment
- Output Transform (ODT): Converts to display color space

**Key insight**: By normalizing all inputs to a common baseline FIRST, creative grades become portable and consistent.

**Pros**:
- Industry standard for film/TV
- Mathematically rigorous
- Consistent results across different cameras

**Cons**:
- Requires knowing source camera/color space
- Complex pipeline
- User images often lack metadata

**Implementation complexity**: Medium-High

---

### 5. DaVinci Resolve Shot Match

**Source**: [Blackmagic](https://www.blackmagicdesign.com/products/davinciresolve/color), [Shot Match Documentation](https://www.steakunderwater.com/VFXPedia/__man/Resolve18-6/DaVinciResolve18_Manual_files/part2690.htm)

**How it works**:
- Analyzes darkest levels → neutralizes black color balance
- Analyzes brightest levels → neutralizes highlight color balance
- Adjusts Lift/Gain to maximize contrast at 0-100% boundaries
- Optional: Uses color chart for precise calibration

**Pros**:
- Fast automatic matching
- Good baseline correction
- Works without reference image

**Cons**:
- Hit-or-miss without guidance
- Works best with similar lighting conditions
- Doesn't transfer creative "look"

**Implementation complexity**: Medium

---

### 6. 3D LUT Generation from Image Pairs

**Tools**: [3D LUT Creator](https://3dlutcreator.com/), [MagicTints](https://polycount.com/discussion/226164/create-your-own-lut-in-1-click-from-a-single-reference-magictints-2)

**How it works**:
- Uses HALD pattern (image containing all possible color values)
- Applies color matching to HALD
- Exports modified HALD as 3D LUT
- LUT captures the transformation

**Pros**:
- Creates reusable LUT files
- Can export to standard .cube format

**Cons**:
- Quality depends on matching algorithm
- Global transform, same limitations as above

**Implementation complexity**: Medium

---

## Proposed Solution: Multi-Stage Adaptive Pipeline

Based on the research, the optimal approach combines multiple techniques:

```
┌─────────────────────────────────────────────────────────────────┐
│                      INPUT IMAGE                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: ANALYZE                                                │
│  ─────────────────                                               │
│  • Histogram percentiles (P5, P50, P95)                         │
│  • Average luminance (L* in Lab)                                │
│  • White balance estimate (a*, b* averages)                     │
│  • Contrast measure (luminance std dev)                         │
│  • Saturation measure (chroma std dev)                          │
│  • Shadow/midtone/highlight color averages                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: NORMALIZE                                              │
│  ─────────────────                                               │
│  • Exposure correction → match reference avg luminance          │
│  • White balance → shift toward reference color temp            │
│  • Contrast adjustment → match reference dynamic range          │
│  • Black/white point alignment                                  │
│                                                                  │
│  Output: Image with similar baseline to reference               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: COLOR TRANSFER                                         │
│  ───────────────────────                                         │
│  • Reinhard transfer in Lab space (mean + std dev matching)     │
│  • Optional: Histogram matching for finer distribution          │
│  • Optional: Local color transfer for better detail             │
│                                                                  │
│  Output: Image with reference color palette                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: FILM PROFILE                                           │
│  ─────────────────────                                           │
│  • Tone curve (S-curve, film response)                          │
│  • Grain simulation (size, roughness, chromatic)                │
│  • Halation (light bleed in highlights)                         │
│  • Color matrix (film stock color rendering)                    │
│  • Vignette, bloom, other effects                               │
│                                                                  │
│  Output: Final graded image                                     │
└─────────────────────────┴───────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Image Analysis Module

**File**: `src/engine/ImageAnalyzer.ts`

```typescript
interface ImageStats {
  // Histogram data
  histogram: {
    r: number[];  // 256 bins
    g: number[];
    b: number[];
    luminance: number[];
  };

  // Percentiles
  percentiles: {
    p5: number;   // Black point
    p50: number;  // Midpoint
    p95: number;  // White point
  };

  // Color statistics (in Lab space)
  lab: {
    meanL: number;
    meanA: number;
    meanB: number;
    stdL: number;
    stdA: number;
    stdB: number;
  };

  // Derived metrics
  contrast: number;      // stdL
  saturation: number;    // sqrt(stdA² + stdB²)
  colorTemp: number;     // Estimated Kelvin or relative value
  dynamicRange: number;  // p95 - p5

  // Zone colors (for shadow/mid/highlight matching)
  zones: {
    shadows: { r: number; g: number; b: number };    // avg of pixels < p25
    midtones: { r: number; g: number; b: number };   // avg of pixels p25-p75
    highlights: { r: number; g: number; b: number }; // avg of pixels > p75
  };
}

class ImageAnalyzer {
  analyze(imageData: ImageData): ImageStats;
  analyzeFromCanvas(canvas: HTMLCanvasElement): ImageStats;
  analyzeFromURL(url: string): Promise<ImageStats>;
}
```

**Tasks**:
- [ ] Implement RGB to Lab conversion
- [ ] Implement histogram calculation
- [ ] Implement percentile extraction
- [ ] Implement mean/std calculation in Lab space
- [ ] Implement zone-based color averaging
- [ ] Create reference image analysis (store as JSON)

---

### Phase 2: Normalization Module

**File**: `src/engine/ImageNormalizer.ts`

```typescript
interface NormalizationParams {
  exposureAdjust: number;     // Stops to add/subtract
  contrastAdjust: number;     // Multiplier for contrast
  blackPoint: number;         // Target black level
  whitePoint: number;         // Target white level
  whiteBalanceShift: {        // Lab a/b shift
    a: number;
    b: number;
  };
}

class ImageNormalizer {
  // Calculate normalization params to match source to target baseline
  calculateNormalization(
    sourceStats: ImageStats,
    targetStats: ImageStats
  ): NormalizationParams;

  // Apply normalization (can be done in shader or CPU)
  applyNormalization(
    imageData: ImageData,
    params: NormalizationParams
  ): ImageData;
}
```

**Normalization Algorithm**:

```
1. Exposure Adjustment:
   exposureAdjust = log2(targetStats.lab.meanL / sourceStats.lab.meanL)

2. Contrast Adjustment:
   contrastAdjust = targetStats.contrast / sourceStats.contrast

3. Black/White Point:
   blackPoint = targetStats.percentiles.p5
   whitePoint = targetStats.percentiles.p95

4. White Balance:
   whiteBalanceShift.a = targetStats.lab.meanA - sourceStats.lab.meanA
   whiteBalanceShift.b = targetStats.lab.meanB - sourceStats.lab.meanB
```

**Tasks**:
- [ ] Implement normalization parameter calculation
- [ ] Implement CPU-based normalization (for testing)
- [ ] Implement WebGL shader for normalization
- [ ] Add UI controls for manual adjustment

---

### Phase 3: Color Transfer Module

**File**: `src/engine/ColorTransfer.ts`

```typescript
class ColorTransfer {
  // Reinhard color transfer
  reinhard(
    source: ImageData,
    sourceStats: ImageStats,
    targetStats: ImageStats
  ): ImageData;

  // Histogram matching (more accurate but slower)
  histogramMatch(
    source: ImageData,
    targetHistogram: number[]
  ): ImageData;

  // Combined approach
  adaptiveTransfer(
    source: ImageData,
    sourceStats: ImageStats,
    targetStats: ImageStats,
    options: {
      useReinhard: boolean;
      useHistogramMatch: boolean;
      preserveContrast: number;  // 0-1, how much to preserve source contrast
    }
  ): ImageData;
}
```

**Reinhard Algorithm (Lab space)**:

```
For each pixel:
  1. Convert RGB to Lab
  2. For each channel (L, a, b):
     output = (target_std / source_std) * (input - source_mean) + target_mean
  3. Convert Lab back to RGB
  4. Clamp to valid range
```

**Tasks**:
- [ ] Implement Reinhard color transfer in JavaScript
- [ ] Implement Reinhard in WebGL shader
- [ ] Implement histogram matching
- [ ] Add blending options (partial transfer)

---

### Phase 4: Reference Profile System

**File**: `src/engine/ReferenceProfile.ts`

```typescript
interface ReferenceProfile {
  name: string;
  description: string;

  // Pre-computed statistics from reference image(s)
  stats: ImageStats;

  // Film profile settings
  filmProfile: {
    contrast: number;
    saturation: number;
    shadowShift: { r: number; g: number; b: number };
    highlightShift: { r: number; g: number; b: number };
    grainAmount: number;
    grainSize: number;
    grainRoughness: number;
    halation: number;
    // ... other film params
  };

  // Optional: Multiple reference images for better averaging
  referenceImages?: string[];  // URLs or base64
}

// Pre-built profiles
const AUTUMN_BREEZE_PROFILE: ReferenceProfile = {
  name: 'Autumn Breeze',
  stats: { /* pre-computed from reference image */ },
  filmProfile: { /* film settings */ }
};
```

**Tasks**:
- [ ] Define ReferenceProfile interface
- [ ] Create tool to generate profile from reference image
- [ ] Store Autumn Breeze reference stats
- [ ] Allow users to create custom profiles from their images

---

### Phase 5: WebGL Integration

**File**: `src/engine/shaders.ts` (modifications)

Add new uniforms for adaptive processing:

```glsl
// Normalization uniforms
uniform float u_exposureAdjust;
uniform float u_contrastAdjust;
uniform vec2 u_blackWhitePoint;
uniform vec2 u_whiteBalanceShift;

// Color transfer uniforms
uniform vec3 u_sourceMean;   // Lab mean of source
uniform vec3 u_sourceStd;    // Lab std of source
uniform vec3 u_targetMean;   // Lab mean of target
uniform vec3 u_targetStd;    // Lab std of target
uniform float u_transferStrength;

// Add to main():
vec3 processAdaptive(vec3 color) {
  // 1. Convert to Lab
  vec3 lab = rgb2lab(color);

  // 2. Normalize
  lab.x += u_exposureAdjust * 10.0;  // L channel
  lab.x = mix(50.0, lab.x, u_contrastAdjust);
  lab.yz += u_whiteBalanceShift;

  // 3. Reinhard transfer
  vec3 normalized = (lab - u_sourceMean) / u_sourceStd;
  vec3 transferred = normalized * u_targetStd + u_targetMean;
  lab = mix(lab, transferred, u_transferStrength);

  // 4. Convert back to RGB
  return lab2rgb(lab);
}
```

**Tasks**:
- [ ] Add Lab conversion functions to shader
- [ ] Add normalization stage to shader pipeline
- [ ] Add Reinhard transfer to shader pipeline
- [ ] Wire up new uniforms in WebGLEngine.ts
- [ ] Add UI controls for adaptive processing

---

### Phase 6: User Interface

**New UI Components**:

1. **Reference Image Loader**
   - Upload reference image
   - Auto-analyze and store stats
   - Preview reference characteristics

2. **Adaptive Mode Toggle**
   - Enable/disable adaptive processing
   - Show before/after comparison

3. **Fine-tuning Controls**
   - Normalization strength (0-100%)
   - Color transfer strength (0-100%)
   - Preserve original contrast slider
   - Preserve original saturation slider

4. **Profile Manager**
   - Save current settings as profile
   - Load pre-built profiles
   - Export/import profiles as JSON

---

## File Structure

```
src/
├── engine/
│   ├── ImageAnalyzer.ts      # NEW: Image statistics extraction
│   ├── ImageNormalizer.ts    # NEW: Normalize to baseline
│   ├── ColorTransfer.ts      # NEW: Reinhard/histogram matching
│   ├── ReferenceProfile.ts   # NEW: Profile definition & storage
│   ├── WebGLEngine.ts        # MODIFY: Add adaptive uniforms
│   ├── shaders.ts            # MODIFY: Add adaptive processing
│   └── ...existing files
├── components/
│   ├── AdaptivePanel.tsx     # NEW: Adaptive mode UI
│   ├── ReferenceLoader.tsx   # NEW: Reference image upload
│   └── ...existing files
├── profiles/
│   └── autumn-breeze.json    # NEW: Pre-computed reference profile
└── ...
```

---

## Testing Strategy

### Automated Tests

1. **Analyzer accuracy**
   - Test with known images, verify stats match expected values

2. **Normalization consistency**
   - Apply normalization to diverse images
   - Verify output stats converge toward target

3. **Color transfer quality**
   - Use comparison script (`scripts/compare-lut.mjs`)
   - Track match score across test images

### Test Image Set

Create a diverse test set:
- Indoor/outdoor
- Day/night
- Warm/cool white balance
- High/low contrast
- Portrait/landscape

Run adaptive pipeline on all, compare to reference, track scores.

---

## Success Metrics

| Metric | Current (Static Profile) | Target (Adaptive) |
|--------|-------------------------|-------------------|
| Match Score (same scene) | 75-77/100 | 85+/100 |
| Match Score (different scene) | 50-60/100 | 75+/100 |
| Consistency across inputs | Low | High |
| User adjustment needed | High | Low |

---

## Implementation Priority

1. **Phase 1: Image Analyzer** - Foundation for everything else
2. **Phase 2: Normalizer** - Biggest impact on consistency
3. **Phase 3: Color Transfer** - Improves color matching
4. **Phase 5: WebGL Integration** - Performance optimization
5. **Phase 4: Reference Profiles** - User experience
6. **Phase 6: UI** - Polish

---

## References

- [Reinhard et al. "Color Transfer between Images" (2001)](https://www.cs.tau.ac.il/~turMDL/imagepapers/ColorTransfer.pdf)
- [PyImageSearch: Super Fast Color Transfer](https://pyimagesearch.com/2014/06/30/super-fast-color-transfer-images/)
- [fylm.ai AI Colour Grading](https://fylm.ai/ai-colour-grading/)
- [Netflix ACES Workflow Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360002088888-Color-Managed-Workflow-in-Resolve-ACES)
- [colortrans Python Library](https://github.com/dstein64/colortrans)
- [3D LUT Creator](https://3dlutcreator.com/)

---

## Next Steps

1. Review and approve this plan
2. Begin Phase 1 implementation (ImageAnalyzer)
3. Store Autumn Breeze reference image stats
4. Iterate on normalization algorithm
5. Integrate into WebGL pipeline
