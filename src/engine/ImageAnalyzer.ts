
export interface ImageStats {
    histogram: {
        r: number[];
        g: number[];
        b: number[];
        luminance: number[];
    };
    percentiles: {
        p5: number;
        p50: number;
        p95: number;
    };
    lab: {
        meanL: number;
        meanA: number;
        meanB: number;
        stdL: number;
        stdA: number;
        stdB: number;
    };
    contrast: number;
    saturation: number;
    colorTemp: number; // Approximate relative value relative to neutral
    dynamicRange: number;
    zones: {
        shadows: { r: number; g: number; b: number };
        midtones: { r: number; g: number; b: number };
        highlights: { r: number; g: number; b: number };
    };
}

export class ImageAnalyzer {
    static analyze(imageData: ImageData): ImageStats {
        const { data, width, height } = imageData;
        const pixelCount = width * height;

        // Initialize histograms
        const histR = new Float32Array(256).fill(0);
        const histG = new Float32Array(256).fill(0);
        const histB = new Float32Array(256).fill(0);
        const histL = new Float32Array(256).fill(0);

        // Lab stats accumulators
        let sumL = 0, sumA = 0, sumB = 0;
        let sumL2 = 0, sumA2 = 0, sumB2 = 0; // Sum of squares

        // Zone accumulators
        const shadows = { r: 0, g: 0, b: 0, count: 0 };
        const midtones = { r: 0, g: 0, b: 0, count: 0 };
        const highlights = { r: 0, g: 0, b: 0, count: 0 };

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Histogram
            histR[r]++;
            histG[g]++;
            histB[b]++;

            // Luminance (Rec. 709)
            const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
            histL[Math.min(255, lum)]++;

            // Lab Conversion
            const [l, a, b_lab] = this.rgbToLab(r, g, b);
            sumL += l;
            sumA += a;
            sumB += b_lab;
            sumL2 += l * l;
            sumA2 += a * a;
            sumB2 += b_lab * b_lab;

            // Zones (using rough luminance approximation 0-255)
            // Shadows: < 64 (approx 25%), Highlights: > 192 (approx 75%)
            if (lum < 64) {
                shadows.r += r; shadows.g += g; shadows.b += b; shadows.count++;
            } else if (lum > 192) {
                highlights.r += r; highlights.g += g; highlights.b += b; highlights.count++;
            } else {
                midtones.r += r; midtones.g += g; midtones.b += b; midtones.count++;
            }
        }

        // Normalize histograms
        for (let i = 0; i < 256; i++) {
            histR[i] /= pixelCount;
            histG[i] /= pixelCount;
            histB[i] /= pixelCount;
            histL[i] /= pixelCount;
        }

        // Calculate Percentiles from Luminance Histogram
        let acc = 0;
        let p5 = 0, p50 = 0, p95 = 0;
        let foundP5 = false, foundP50 = false, foundP95 = false;

        for (let i = 0; i < 256; i++) {
            acc += histL[i]; // already normalized
            if (!foundP5 && acc >= 0.05) { p5 = i; foundP5 = true; }
            if (!foundP50 && acc >= 0.50) { p50 = i; foundP50 = true; }
            if (!foundP95 && acc >= 0.95) { p95 = i; foundP95 = true; }
        }

        // Calculate Lab Stats
        const meanL = sumL / pixelCount;
        const meanA = sumA / pixelCount;
        const meanB = sumB / pixelCount;

        // Variance = E[X^2] - (E[X])^2
        const varL = (sumL2 / pixelCount) - (meanL * meanL);
        const varA = (sumA2 / pixelCount) - (meanA * meanA);
        const varB = (sumB2 / pixelCount) - (meanB * meanB);

        const stdL = Math.sqrt(Math.max(0, varL));
        const stdA = Math.sqrt(Math.max(0, varA));
        const stdB = Math.sqrt(Math.max(0, varB));

        // Calculate Zone Averages
        const zoneAvg = (z: { r: number, g: number, b: number, count: number }) =>
            z.count > 0 ? { r: z.r / z.count, g: z.g / z.count, b: z.b / z.count } : { r: 0, g: 0, b: 0 };

        return {
            histogram: {
                r: Array.from(histR),
                g: Array.from(histG),
                b: Array.from(histB),
                luminance: Array.from(histL)
            },
            percentiles: { p5, p50, p95 },
            lab: { meanL, meanA, meanB, stdL, stdA, stdB },
            contrast: stdL,
            saturation: Math.sqrt(stdA * stdA + stdB * stdB), // Chroma variance approximation
            colorTemp: meanB, // b* roughly correlates with cool-warm axis
            dynamicRange: p95 - p5,
            zones: {
                shadows: zoneAvg(shadows),
                midtones: zoneAvg(midtones),
                highlights: zoneAvg(highlights)
            }
        };
    }

    // RGB to Lab conversion (sRGB -> XYZ -> Lab)
    // Assumes r, g, b are 0-255
    static rgbToLab(r: number, g: number, b: number): [number, number, number] {
        // 1. RGB to XYZ
        let rLinear = r / 255.0;
        let gLinear = g / 255.0;
        let bLinear = b / 255.0;

        rLinear = (rLinear > 0.04045) ? Math.pow((rLinear + 0.055) / 1.055, 2.4) : rLinear / 12.92;
        gLinear = (gLinear > 0.04045) ? Math.pow((gLinear + 0.055) / 1.055, 2.4) : gLinear / 12.92;
        bLinear = (bLinear > 0.04045) ? Math.pow((bLinear + 0.055) / 1.055, 2.4) : bLinear / 12.92;

        const x = (rLinear * 0.4124 + gLinear * 0.3576 + bLinear * 0.1805) * 100;
        const y = (rLinear * 0.2126 + gLinear * 0.7152 + bLinear * 0.0722) * 100;
        const z = (rLinear * 0.0193 + gLinear * 0.1192 + bLinear * 0.9505) * 100;

        // 2. XYZ to Lab
        const xn = 95.047; // Observer= 2°, Illuminant= D65
        const yn = 100.000;
        const zn = 108.883;

        let fx = x / xn;
        let fy = y / yn;
        let fz = z / zn;

        const epsilon = 0.008856;
        const kappa = 903.3;

        fx = (fx > epsilon) ? Math.pow(fx, 1 / 3) : (kappa * fx + 16) / 116;
        fy = (fy > epsilon) ? Math.pow(fy, 1 / 3) : (kappa * fy + 16) / 116;
        fz = (fz > epsilon) ? Math.pow(fz, 1 / 3) : (kappa * fz + 16) / 116;

        const L = 116 * fy - 16;
        const a = 500 * (fx - fy);
        const b_lab = 200 * (fy - fz);

        return [L, a, b_lab];
    }

    static labToRgb(l: number, a: number, b: number): [number, number, number] {
        let y = (l + 16) / 116;
        let x = a / 500 + y;
        let z = y - b / 200;

        const xn = 95.047;
        const yn = 100.000;
        const zn = 108.883;

        const epsilon = 0.008856;
        const kappa = 903.3;

        const pow3 = (v: number) => v * v * v;

        x = (pow3(x) > epsilon) ? pow3(x) : (116 * x - 16) / kappa;
        y = (l > kappa * epsilon) ? pow3(y) : l / kappa;
        z = (pow3(z) > epsilon) ? pow3(z) : (116 * z - 16) / kappa;

        x *= xn / 100;
        y *= yn / 100;
        z *= zn / 100;

        let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
        let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
        let bVal = x * 0.0557 + y * -0.2040 + z * 1.0570;

        const toSrgb = (v: number) => {
            const val = v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
            return Math.min(255, Math.max(0, Math.round(val * 255)));
        };

        return [toSrgb(r), toSrgb(g), toSrgb(bVal)];
    }
}
