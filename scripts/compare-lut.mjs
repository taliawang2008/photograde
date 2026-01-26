#!/usr/bin/env node
/**
 * LUT/Film Profile Comparison Script
 *
 * Compares color grading characteristics between a graded image and a reference.
 * Since scenes may differ, we compare tonal and color properties, not pixels.
 *
 * Usage:
 *   node scripts/compare-lut.mjs <comparison-image.jpg>
 *   node scripts/compare-lut.mjs <graded.jpg> <reference.jpg>
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Color science utilities
function rgbToLab(r, g, b) {
  // RGB to XYZ (sRGB D65)
  let rLin = r / 255;
  let gLin = g / 255;
  let bLin = b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750);
  const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

  const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

  return {
    L: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s, l };
}

function deltaE(lab1, lab2) {
  // CIE76 Delta E
  return Math.sqrt(
    Math.pow(lab1.L - lab2.L, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

async function analyzeImage(imageBuffer, name) {
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const channels = info.channels;

  // Accumulators
  let totalR = 0, totalG = 0, totalB = 0;
  let totalL = 0, totalA = 0, totalLab_b = 0;
  let totalSat = 0;

  // Histogram buckets (0-255)
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);
  const histLum = new Array(256).fill(0);

  // Shadow/midtone/highlight accumulators
  let shadowR = 0, shadowG = 0, shadowB = 0, shadowCount = 0;
  let midR = 0, midG = 0, midB = 0, midCount = 0;
  let highR = 0, highG = 0, highB = 0, highCount = 0;

  // Process pixels
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    totalR += r;
    totalG += g;
    totalB += b;

    histR[r]++;
    histG[g]++;
    histB[b]++;

    // Luminance (Rec.709)
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    histLum[lum]++;

    // HSL for saturation
    const hsl = rgbToHsl(r, g, b);
    totalSat += hsl.s;

    // Lab for color analysis
    const lab = rgbToLab(r, g, b);
    totalL += lab.L;
    totalA += lab.a;
    totalLab_b += lab.b;

    // Categorize by luminance
    if (lum < 64) {
      shadowR += r; shadowG += g; shadowB += b; shadowCount++;
    } else if (lum < 192) {
      midR += r; midG += g; midB += b; midCount++;
    } else {
      highR += r; highG += g; highB += b; highCount++;
    }
  }

  // Calculate histogram percentiles
  let cumulative = 0;
  let p5 = 0, p50 = 0, p95 = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += histLum[i];
    if (p5 === 0 && cumulative >= pixels * 0.05) p5 = i;
    if (p50 === 0 && cumulative >= pixels * 0.50) p50 = i;
    if (p95 === 0 && cumulative >= pixels * 0.95) p95 = i;
  }

  // Calculate standard deviation of luminance (contrast measure)
  const avgLum = (0.2126 * totalR + 0.7152 * totalG + 0.0722 * totalB) / pixels;
  let lumVariance = 0;
  for (let i = 0; i < data.length; i += channels) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    lumVariance += Math.pow(lum - avgLum, 2);
  }
  const lumStdDev = Math.sqrt(lumVariance / pixels);

  // Shadow/highlight distribution
  const shadowPct = (shadowCount / pixels) * 100;
  const midPct = (midCount / pixels) * 100;
  const highPct = (highCount / pixels) * 100;

  return {
    name,
    dimensions: { width: info.width, height: info.height },
    avgRgb: {
      r: totalR / pixels,
      g: totalG / pixels,
      b: totalB / pixels
    },
    avgLab: {
      L: totalL / pixels,
      a: totalA / pixels,
      b: totalLab_b / pixels
    },
    avgSaturation: totalSat / pixels,
    contrast: lumStdDev,
    percentiles: { p5, p50, p95 },
    dynamicRange: p95 - p5,
    toneDistribution: {
      shadows: shadowPct,
      midtones: midPct,
      highlights: highPct
    },
    shadowColor: shadowCount > 0 ? {
      r: shadowR / shadowCount,
      g: shadowG / shadowCount,
      b: shadowB / shadowCount
    } : null,
    midtoneColor: midCount > 0 ? {
      r: midR / midCount,
      g: midG / midCount,
      b: midB / midCount
    } : null,
    highlightColor: highCount > 0 ? {
      r: highR / highCount,
      g: highG / highCount,
      b: highB / highCount
    } : null,
    colorTemperature: (totalR / pixels) - (totalB / pixels), // Simplified warm/cool
  };
}

function formatColor(rgb) {
  if (!rgb) return 'N/A';
  return `RGB(${rgb.r.toFixed(0)}, ${rgb.g.toFixed(0)}, ${rgb.b.toFixed(0)})`;
}

function compareMetrics(graded, reference) {
  const avgLabGraded = graded.avgLab;
  const avgLabRef = reference.avgLab;

  const colorDiff = deltaE(avgLabGraded, avgLabRef);
  const contrastDiff = graded.contrast - reference.contrast;
  const satDiff = graded.avgSaturation - reference.avgSaturation;
  const tempDiff = graded.colorTemperature - reference.colorTemperature;
  const drDiff = graded.dynamicRange - reference.dynamicRange;
  const blackPointDiff = graded.percentiles.p5 - reference.percentiles.p5;

  // Shadow color difference
  let shadowColorDiff = null;
  if (graded.shadowColor && reference.shadowColor) {
    const gradedShadowLab = rgbToLab(graded.shadowColor.r, graded.shadowColor.g, graded.shadowColor.b);
    const refShadowLab = rgbToLab(reference.shadowColor.r, reference.shadowColor.g, reference.shadowColor.b);
    shadowColorDiff = deltaE(gradedShadowLab, refShadowLab);
  }

  // Highlight color difference
  let highlightColorDiff = null;
  if (graded.highlightColor && reference.highlightColor) {
    const gradedHighLab = rgbToLab(graded.highlightColor.r, graded.highlightColor.g, graded.highlightColor.b);
    const refHighLab = rgbToLab(reference.highlightColor.r, reference.highlightColor.g, reference.highlightColor.b);
    highlightColorDiff = deltaE(gradedHighLab, refHighLab);
  }

  return {
    overallColorDiff: colorDiff,
    contrastDiff,
    saturationDiff: satDiff,
    temperatureDiff: tempDiff,
    dynamicRangeDiff: drDiff,
    blackPointDiff,
    shadowColorDiff,
    highlightColorDiff
  };
}

function generateReport(original, graded, reference, comparison) {
  console.log('\n' + '='.repeat(70));
  console.log('  LUT/FILM PROFILE COMPARISON REPORT');
  console.log('='.repeat(70));

  // Image info
  console.log('\n--- IMAGE ANALYSIS ---\n');

  const images = [
    { label: 'Original', data: original },
    { label: 'Graded (LUT)', data: graded },
    { label: 'Reference', data: reference }
  ];

  // Table header
  console.log('Metric'.padEnd(22) + 'Original'.padEnd(18) + 'Graded'.padEnd(18) + 'Reference'.padEnd(18));
  console.log('-'.repeat(70));

  // Metrics
  console.log('Black Point (5%)'.padEnd(22) +
    original.percentiles.p5.toString().padEnd(18) +
    graded.percentiles.p5.toString().padEnd(18) +
    reference.percentiles.p5.toString().padEnd(18));

  console.log('Mid Point (50%)'.padEnd(22) +
    original.percentiles.p50.toString().padEnd(18) +
    graded.percentiles.p50.toString().padEnd(18) +
    reference.percentiles.p50.toString().padEnd(18));

  console.log('White Point (95%)'.padEnd(22) +
    original.percentiles.p95.toString().padEnd(18) +
    graded.percentiles.p95.toString().padEnd(18) +
    reference.percentiles.p95.toString().padEnd(18));

  console.log('Dynamic Range'.padEnd(22) +
    original.dynamicRange.toString().padEnd(18) +
    graded.dynamicRange.toString().padEnd(18) +
    reference.dynamicRange.toString().padEnd(18));

  console.log('Contrast (StdDev)'.padEnd(22) +
    original.contrast.toFixed(1).padEnd(18) +
    graded.contrast.toFixed(1).padEnd(18) +
    reference.contrast.toFixed(1).padEnd(18));

  console.log('Saturation'.padEnd(22) +
    (original.avgSaturation * 100).toFixed(1).padEnd(18) +
    (graded.avgSaturation * 100).toFixed(1).padEnd(18) +
    (reference.avgSaturation * 100).toFixed(1).padEnd(18));

  console.log('Color Temp (R-B)'.padEnd(22) +
    original.colorTemperature.toFixed(1).padEnd(18) +
    graded.colorTemperature.toFixed(1).padEnd(18) +
    reference.colorTemperature.toFixed(1).padEnd(18));

  console.log('Avg Luminance (L*)'.padEnd(22) +
    original.avgLab.L.toFixed(1).padEnd(18) +
    graded.avgLab.L.toFixed(1).padEnd(18) +
    reference.avgLab.L.toFixed(1).padEnd(18));

  console.log('\n--- TONE ZONE COLORS ---\n');
  console.log('Zone'.padEnd(15) + 'Original'.padEnd(25) + 'Graded'.padEnd(25) + 'Reference'.padEnd(25));
  console.log('-'.repeat(85));
  console.log('Shadows'.padEnd(15) +
    formatColor(original.shadowColor).padEnd(25) +
    formatColor(graded.shadowColor).padEnd(25) +
    formatColor(reference.shadowColor).padEnd(25));
  console.log('Midtones'.padEnd(15) +
    formatColor(original.midtoneColor).padEnd(25) +
    formatColor(graded.midtoneColor).padEnd(25) +
    formatColor(reference.midtoneColor).padEnd(25));
  console.log('Highlights'.padEnd(15) +
    formatColor(original.highlightColor).padEnd(25) +
    formatColor(graded.highlightColor).padEnd(25) +
    formatColor(reference.highlightColor).padEnd(25));

  console.log('\n--- GRADED vs REFERENCE COMPARISON ---\n');

  const sign = (n) => n > 0 ? '+' : '';

  console.log(`Overall Color Difference (ΔE): ${comparison.overallColorDiff.toFixed(1)}`);
  console.log(`  (< 5 = imperceptible, 5-10 = slight, 10-20 = noticeable, > 20 = significant)`);
  console.log('');
  console.log(`Contrast Difference:      ${sign(comparison.contrastDiff)}${comparison.contrastDiff.toFixed(1)}`);
  console.log(`Saturation Difference:    ${sign(comparison.saturationDiff * 100)}${(comparison.saturationDiff * 100).toFixed(1)}%`);
  console.log(`Temperature Difference:   ${sign(comparison.temperatureDiff)}${comparison.temperatureDiff.toFixed(1)} (+ = warmer)`);
  console.log(`Dynamic Range Difference: ${sign(comparison.dynamicRangeDiff)}${comparison.dynamicRangeDiff}`);
  console.log(`Black Point Difference:   ${sign(comparison.blackPointDiff)}${comparison.blackPointDiff} (+ = lifted blacks)`);

  if (comparison.shadowColorDiff !== null) {
    console.log(`Shadow Color Difference:  ΔE ${comparison.shadowColorDiff.toFixed(1)}`);
  }
  if (comparison.highlightColorDiff !== null) {
    console.log(`Highlight Color Difference: ΔE ${comparison.highlightColorDiff.toFixed(1)}`);
  }

  // Recommendations
  console.log('\n--- RECOMMENDATIONS ---\n');

  const recommendations = [];

  if (comparison.blackPointDiff > 10) {
    recommendations.push(`- BLACK POINT too high (lifted blacks): Lower the shadow curve or increase contrast`);
  } else if (comparison.blackPointDiff < -10) {
    recommendations.push(`- BLACK POINT too low (crushed blacks): Lift shadows or reduce contrast`);
  }

  if (comparison.contrastDiff < -10) {
    recommendations.push(`- CONTRAST too low: Increase contrast parameter`);
  } else if (comparison.contrastDiff > 10) {
    recommendations.push(`- CONTRAST too high: Decrease contrast parameter`);
  }

  if (comparison.saturationDiff < -0.05) {
    recommendations.push(`- SATURATION too low: Increase saturation`);
  } else if (comparison.saturationDiff > 0.05) {
    recommendations.push(`- SATURATION too high: Decrease saturation`);
  }

  if (comparison.temperatureDiff > 15) {
    recommendations.push(`- Too WARM: Decrease warmth/temperature or add blue to shadows`);
  } else if (comparison.temperatureDiff < -15) {
    recommendations.push(`- Too COOL: Increase warmth/temperature or add warmth to highlights`);
  }

  if (comparison.shadowColorDiff !== null && comparison.shadowColorDiff > 15) {
    recommendations.push(`- SHADOW COLOR mismatch: Adjust shadow color shift in film profile`);
  }

  if (comparison.highlightColorDiff !== null && comparison.highlightColorDiff > 15) {
    recommendations.push(`- HIGHLIGHT COLOR mismatch: Adjust highlight color shift in film profile`);
  }

  if (recommendations.length === 0) {
    console.log('Graded image is reasonably close to reference!');
  } else {
    recommendations.forEach(r => console.log(r));
  }

  // Overall score
  console.log('\n--- MATCH SCORE ---\n');

  // Calculate a simple match score (0-100)
  let score = 100;
  score -= Math.min(comparison.overallColorDiff, 30); // Max -30 for color
  score -= Math.min(Math.abs(comparison.contrastDiff) / 2, 20); // Max -20 for contrast
  score -= Math.min(Math.abs(comparison.saturationDiff) * 100, 15); // Max -15 for saturation
  score -= Math.min(Math.abs(comparison.blackPointDiff) / 2, 20); // Max -20 for black point
  score -= Math.min(Math.abs(comparison.temperatureDiff) / 3, 15); // Max -15 for temperature
  score = Math.max(0, Math.round(score));

  const scoreBar = '█'.repeat(Math.floor(score / 5)) + '░'.repeat(20 - Math.floor(score / 5));
  console.log(`Match Score: ${score}/100 [${scoreBar}]`);

  if (score >= 80) {
    console.log('Excellent match!');
  } else if (score >= 60) {
    console.log('Good match with minor differences.');
  } else if (score >= 40) {
    console.log('Moderate match - review recommendations above.');
  } else {
    console.log('Significant differences - major adjustments needed.');
  }

  console.log('\n' + '='.repeat(70) + '\n');

  return { score, comparison };
}

async function extractPanelsFromComparison(imagePath) {
  // Load the comparison image and split into 3 panels
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const panelWidth = Math.floor(metadata.width / 3);
  const height = metadata.height;

  // Extract each panel
  const original = await sharp(imagePath)
    .extract({ left: 0, top: 0, width: panelWidth, height })
    .toBuffer();

  const graded = await sharp(imagePath)
    .extract({ left: panelWidth, top: 0, width: panelWidth, height })
    .toBuffer();

  const reference = await sharp(imagePath)
    .extract({ left: panelWidth * 2, top: 0, width: panelWidth, height })
    .toBuffer();

  return { original, graded, reference };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/compare-lut.mjs <comparison-image.jpg>');
    console.log('    (Image with 3 horizontal panels: Original | Graded | Reference)');
    console.log('');
    console.log('  node scripts/compare-lut.mjs <graded.jpg> <reference.jpg>');
    console.log('    (Two separate images to compare)');
    process.exit(1);
  }

  let originalData, gradedData, referenceData;

  if (args.length === 1) {
    // Single comparison image with 3 panels
    const imagePath = path.resolve(args[0]);

    if (!fs.existsSync(imagePath)) {
      console.error(`Error: File not found: ${imagePath}`);
      process.exit(1);
    }

    console.log(`\nAnalyzing comparison image: ${imagePath}`);
    console.log('Extracting panels (Original | Graded | Reference)...\n');

    const panels = await extractPanelsFromComparison(imagePath);

    originalData = await analyzeImage(panels.original, 'Original');
    gradedData = await analyzeImage(panels.graded, 'Graded');
    referenceData = await analyzeImage(panels.reference, 'Reference');

  } else if (args.length >= 2) {
    // Two separate images
    const gradedPath = path.resolve(args[0]);
    const referencePath = path.resolve(args[1]);

    if (!fs.existsSync(gradedPath)) {
      console.error(`Error: File not found: ${gradedPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(referencePath)) {
      console.error(`Error: File not found: ${referencePath}`);
      process.exit(1);
    }

    console.log(`\nAnalyzing images:`);
    console.log(`  Graded: ${gradedPath}`);
    console.log(`  Reference: ${referencePath}\n`);

    const gradedBuffer = await sharp(gradedPath).toBuffer();
    const referenceBuffer = await sharp(referencePath).toBuffer();

    // For two-image mode, graded IS the original (no separate original)
    originalData = await analyzeImage(gradedBuffer, 'Graded');
    gradedData = originalData;
    referenceData = await analyzeImage(referenceBuffer, 'Reference');
  }

  // Compare graded vs reference
  const comparison = compareMetrics(gradedData, referenceData);

  // Generate report
  const result = generateReport(originalData, gradedData, referenceData, comparison);

  // Return score for CI/scripting
  process.exit(result.score >= 60 ? 0 : 1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
