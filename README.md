# Photograde - Professional WebGL Color Grading

Photograde is a high-performance, web-based color grading application built with React, TypeScript, and WebGL. It emulates the workflow of professional grading suites (like DaVinci Resolve) and accurate film stock simulation directly in the browser.

## Key Features

### 🎞️ Film Emulation
Accurate simulation of analog film stocks using algorithmic approximation and high-precision color matrices.
-   **Color Negative**: Kodak Gold, Portra (160/400/800), Ektar, Fuji Superia, Pro 400H.
-   **Slide**: Kodachrome, Ektachrome, Velvia, Provia.
-   **Cinema**: CineStill 800T, 50D, generic motion picture film.
-   **Black & White**: HP5, Tri-X, T-Max, Acros.

### 🎬 Cinematography Filters
Optical filter emulation using custom convolution shaders with **dithering** for professional-grade smoothness.
-   **Black Mist / Pro-Mist**: Creates soft halation around highlights, reducing digital harshness.
-   **Glimmerglass**: Adds sparkle to highlights while maintaining detail.
-   **Streak (Anamorphic)**: Simulates the horizontal lens flares characteristic of anamorphic lenses.
-   **Orton Effect**: Dreamy glow overlay for landscape and portrait photography.
-   **Halation**: Physically-based simulation of light scattering in film emulsion layers.

### 🛠️ Professional Grading Tools
-   **Log Input Support**: Native transforms for S-Log3, V-Log, C-Log3, LogC3, N-Log, F-Log.
-   **ASC_CDL**: Industry-standard Lift/Gamma/Gain color wheels.
-   **Curves**: RGB and Per-Channel curves with spline interpolation.
-   **Spectral Controls**: HSL-based density and luminance adjustments.
-   **LUT Support**: Import `.cube` LUTs (3D LUTs) with high-quality trilinear interpolation.

## Performance & Architecture
Built on a custom `WebGLEngine` for maximum performance:
-   **Single-Pass "Uber-Shader"**: Optimization ensuring 60FPS+ playback even with complex stacks.
-   **Golden Noise**: Uses high-frequency noise algorithms (Gold Noise) to prevent digital patterning in film grain.
-   **Dithering**: Implements per-pixel jitter in bloom and streak calculation to eliminate banding and stacking artifacts at large radii.
-   **Precision**: 32-bit floating point color pipeline throughout.

## Getting Started

### Prerequisites
-   Node.js (v16+)
-   npm or yarn

### Installation
```bash
git clone https://github.com/taliawang2008/photograde.git
cd photograde
npm install
```

### Development
Start the local development server:
```bash
npm run dev
```

### Build
Build for production:
```bash
npm run build
```

## License
Educational research project. Non-commercial use.
