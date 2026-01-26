#!/usr/bin/env node
/**
 * Create Reference Profile
 *
 * Analyzes a reference image and outputs ImageStats as JSON.
 * This profile can be loaded in the app for adaptive color matching.
 *
 * Usage:
 *   node scripts/create-reference-profile.mjs <reference-image> <profile-name> [output-path]
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// --- Color Space Conversion (matching AutoGrade.ts) ---

function srgbToLinear(value) {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab(r, g, b) {
    let rLin = srgbToLinear(r);
    let gLin = srgbToLinear(g);
    let bLin = srgbToLinear(b);

    const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
    const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750);
    const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + 16 / 116;

    return {
        L: (116 * fy) - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz)
    };
}

function getPercentile(hist, total, percentile) {
    let count = 0;
    const target = total * percentile;
    for (let i = 0; i < 256; i++) {
        count += hist[i];
        if (count >= target) return i;
    }
    return 255;
}

async function analyzeImage(imagePath) {
    console.log(`Analyzing: ${imagePath}`);

    const { data, info } = await sharp(imagePath)
        .raw()
        .toBuffer({ resolveWithObject: true });

    console.log(`Image size: ${info.width}x${info.height}, channels: ${info.channels}`);

    const stats = {
        histogram: {
            r: new Array(256).fill(0),
            g: new Array(256).fill(0),
            b: new Array(256).fill(0),
            l: new Array(256).fill(0)
        },
        average: { r: 0, g: 0, b: 0 },
        min: { r: 255, g: 255, b: 255 },
        max: { r: 0, g: 0, b: 0 },
        exposure: 0,
        percentiles: { p5: 0, p50: 0, p95: 0 },
        lab: { meanL: 0, meanA: 0, meanB: 0, stdL: 0, stdA: 0, stdB: 0 },
        zones: {
            shadows: { r: 0, g: 0, b: 0 },
            midtones: { r: 0, g: 0, b: 0 },
            highlights: { r: 0, g: 0, b: 0 }
        },
        contrast: 0,
        saturation: 0
    };

    let totalR = 0, totalG = 0, totalB = 0;
    let totalL = 0, totalA = 0, totalLabB = 0;
    let pixelCount = 0;

    const labLValues = [];
    const labAValues = [];
    const labBValues = [];
    const lumValues = [];

    let shadowR = 0, shadowG = 0, shadowB = 0, shadowCount = 0;
    let midR = 0, midG = 0, midB = 0, midCount = 0;
    let highR = 0, highG = 0, highB = 0, highCount = 0;

    const channels = info.channels;
    const sampleRate = 4; // Sample every 4th pixel for speed
    const step = sampleRate;

    for (let i = 0; i < data.length; i += channels * step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        lumValues.push(l);

        const lab = rgbToLab(r, g, b);
        labLValues.push(lab.L);
        labAValues.push(lab.a);
        labBValues.push(lab.b);
        totalL += lab.L;
        totalA += lab.a;
        totalLabB += lab.b;

        stats.histogram.r[r]++;
        stats.histogram.g[g]++;
        stats.histogram.b[b]++;
        stats.histogram.l[l]++;

        totalR += r;
        totalG += g;
        totalB += b;

        stats.min.r = Math.min(stats.min.r, r);
        stats.min.g = Math.min(stats.min.g, g);
        stats.min.b = Math.min(stats.min.b, b);

        stats.max.r = Math.max(stats.max.r, r);
        stats.max.g = Math.max(stats.max.g, g);
        stats.max.b = Math.max(stats.max.b, b);

        if (l < 64) {
            shadowR += r; shadowG += g; shadowB += b; shadowCount++;
        } else if (l < 192) {
            midR += r; midG += g; midB += b; midCount++;
        } else {
            highR += r; highG += g; highB += b; highCount++;
        }

        pixelCount++;
    }

    console.log(`Processed ${pixelCount} pixels`);

    if (pixelCount > 0) {
        stats.average.r = totalR / pixelCount;
        stats.average.g = totalG / pixelCount;
        stats.average.b = totalB / pixelCount;

        stats.exposure = 0.2126 * stats.average.r + 0.7152 * stats.average.g + 0.0722 * stats.average.b;

        stats.lab.meanL = totalL / pixelCount;
        stats.lab.meanA = totalA / pixelCount;
        stats.lab.meanB = totalLabB / pixelCount;

        let sumSqL = 0, sumSqA = 0, sumSqB = 0, sumSqLum = 0;
        for (let j = 0; j < pixelCount; j++) {
            sumSqL += Math.pow(labLValues[j] - stats.lab.meanL, 2);
            sumSqA += Math.pow(labAValues[j] - stats.lab.meanA, 2);
            sumSqB += Math.pow(labBValues[j] - stats.lab.meanB, 2);
            sumSqLum += Math.pow(lumValues[j] - stats.exposure, 2);
        }
        stats.lab.stdL = Math.sqrt(sumSqL / pixelCount);
        stats.lab.stdA = Math.sqrt(sumSqA / pixelCount);
        stats.lab.stdB = Math.sqrt(sumSqB / pixelCount);
        stats.contrast = Math.sqrt(sumSqLum / pixelCount);

        stats.saturation = Math.sqrt(stats.lab.stdA * stats.lab.stdA + stats.lab.stdB * stats.lab.stdB);

        const totalPixels = stats.histogram.l.reduce((a, b) => a + b, 0);
        stats.percentiles.p5 = getPercentile(stats.histogram.l, totalPixels, 0.05);
        stats.percentiles.p50 = getPercentile(stats.histogram.l, totalPixels, 0.50);
        stats.percentiles.p95 = getPercentile(stats.histogram.l, totalPixels, 0.95);

        if (shadowCount > 0) {
            stats.zones.shadows = {
                r: shadowR / shadowCount,
                g: shadowG / shadowCount,
                b: shadowB / shadowCount
            };
        }
        if (midCount > 0) {
            stats.zones.midtones = {
                r: midR / midCount,
                g: midG / midCount,
                b: midB / midCount
            };
        }
        if (highCount > 0) {
            stats.zones.highlights = {
                r: highR / highCount,
                g: highG / highCount,
                b: highB / highCount
            };
        }
    }

    // Remove histogram from output (too large for JSON)
    // Keep only essential stats
    const compactStats = {
        average: stats.average,
        min: stats.min,
        max: stats.max,
        exposure: stats.exposure,
        percentiles: stats.percentiles,
        lab: stats.lab,
        zones: stats.zones,
        contrast: stats.contrast,
        saturation: stats.saturation
    };

    return compactStats;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log(`
Usage: node scripts/create-reference-profile.mjs <reference-image> <profile-name> [output-path]

Arguments:
  reference-image   Path to the reference image
  profile-name      Name for the profile (e.g., "autumn-breeze")
  output-path       Output JSON path (default: src/profiles/<name>.json)

Example:
  node scripts/create-reference-profile.mjs ~/reference.jpg autumn-breeze
`);
        process.exit(1);
    }

    const imagePath = path.resolve(args[0]);
    const profileName = args[1];
    const defaultOutput = path.join(
        path.dirname(new URL(import.meta.url).pathname),
        '..',
        'src',
        'profiles',
        `${profileName}.json`
    );
    const outputPath = args[2] ? path.resolve(args[2]) : defaultOutput;

    if (!fs.existsSync(imagePath)) {
        console.error(`Error: Image not found: ${imagePath}`);
        process.exit(1);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        const stats = await analyzeImage(imagePath);

        const profile = {
            name: profileName,
            description: `Reference profile generated from ${path.basename(imagePath)}`,
            createdAt: new Date().toISOString(),
            sourceImage: path.basename(imagePath),
            stats: stats
        };

        fs.writeFileSync(outputPath, JSON.stringify(profile, null, 2));
        console.log(`\nProfile saved to: ${outputPath}`);

        // Print summary
        console.log('\n--- Profile Summary ---');
        console.log(`Name: ${profile.name}`);
        console.log(`Exposure: ${stats.exposure.toFixed(1)}`);
        console.log(`Contrast: ${stats.contrast.toFixed(1)}`);
        console.log(`Saturation: ${stats.saturation.toFixed(1)}`);
        console.log(`Dynamic Range: ${stats.percentiles.p95 - stats.percentiles.p5}`);
        console.log(`Lab Mean: L=${stats.lab.meanL.toFixed(1)}, a=${stats.lab.meanA.toFixed(1)}, b=${stats.lab.meanB.toFixed(1)}`);
        console.log(`Lab StdDev: L=${stats.lab.stdL.toFixed(1)}, a=${stats.lab.stdA.toFixed(1)}, b=${stats.lab.stdB.toFixed(1)}`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
