#!/usr/bin/env node
/**
 * Apply Film Profile - Direct Image Processing
 *
 * Applies film profile color grading directly using Sharp,
 * simulating the WebGL shader transformations.
 *
 * Usage:
 *   node scripts/apply-film-profile.mjs <input-image> [output-image] [film-type]
 */

import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Film profiles matching shaders.ts
const FILM_PROFILES = {
  'autumn-breeze': {
    name: 'Autumn Breeze',
    // Shadow shift: neutral/slightly cool (reference shadows RGB 44,44,43)
    shadowShift: { r: -0.01, g: 0.01, b: 0.02 },
    // Highlight shift: strong green-yellow (reference highlights RGB 206,216,174)
    // Blue needs to go from 205 to 174, so stronger reduction
    highlightShift: { r: 0.0, g: 0.03, b: -0.15 },
    // Higher contrast but with shadow protection
    contrast: 1.45,
    // Saturation close to reference 17.2%
    saturation: 0.90,
    // Brightness boost for highlights
    highlightBrightness: 1.30,
    // Lift shadows slightly to prevent crushing
    shadowLift: 0.03,
  },
};

// sRGB to Linear
function srgbToLinear(value) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

// Linear to sRGB
function linearToSrgb(value) {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308
    ? Math.round(v * 12.92 * 255)
    : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
}

// Get luminance (Rec. 709)
function getLuminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

// HSL to RGB
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Smoothstep function (GLSL equivalent)
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Apply contrast adjustment (matches shader adjustContrast)
function adjustContrast(r, g, b, amount) {
  const mid = 0.5;
  return {
    r: Math.max(0, Math.min(1, mid + (r - mid) * (1 + amount))),
    g: Math.max(0, Math.min(1, mid + (g - mid) * (1 + amount))),
    b: Math.max(0, Math.min(1, mid + (b - mid) * (1 + amount)))
  };
}

// Apply film profile to a single pixel
function applyFilmProfile(r, g, b, profile, strength = 1.0) {
  // Normalize to 0-1
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  // Get luminance
  const lum = getLuminance(rNorm, gNorm, bNorm);

  // Apply shadow shift (stronger in dark areas)
  const shadowWeight = 1.0 - smoothstep(0.0, 0.4, lum);
  rNorm += profile.shadowShift.r * shadowWeight;
  gNorm += profile.shadowShift.g * shadowWeight;
  bNorm += profile.shadowShift.b * shadowWeight;

  // Apply highlight shift (stronger in bright areas)
  const highlightWeight = smoothstep(0.5, 1.0, lum);
  rNorm += profile.highlightShift.r * highlightWeight;
  gNorm += profile.highlightShift.g * highlightWeight;
  bNorm += profile.highlightShift.b * highlightWeight;

  // Apply contrast
  const contrasted = adjustContrast(rNorm, gNorm, bNorm, profile.contrast - 1);
  rNorm = contrasted.r;
  gNorm = contrasted.g;
  bNorm = contrasted.b;

  // Apply shadow lift to prevent crushing blacks
  if (profile.shadowLift && profile.shadowLift > 0) {
    const lift = profile.shadowLift;
    rNorm = Math.max(lift, rNorm);
    gNorm = Math.max(lift, gNorm);
    bNorm = Math.max(lift, bNorm);
  }

  // Apply highlight brightness boost (lift highlights)
  if (profile.highlightBrightness && profile.highlightBrightness !== 1.0) {
    const brightWeight = smoothstep(0.5, 0.9, lum);
    const boost = profile.highlightBrightness;
    rNorm = rNorm + (rNorm * (boost - 1)) * brightWeight;
    gNorm = gNorm + (gNorm * (boost - 1)) * brightWeight;
    bNorm = bNorm + (bNorm * (boost - 1)) * brightWeight;
  }

  // Apply saturation via HSL
  const hsl = rgbToHsl(
    Math.round(Math.min(255, rNorm * 255)),
    Math.round(Math.min(255, gNorm * 255)),
    Math.round(Math.min(255, bNorm * 255))
  );
  hsl.s = Math.min(1, hsl.s * profile.saturation);
  const saturated = hslToRgb(hsl.h, hsl.s, hsl.l);

  // Mix with original based on strength
  const finalR = Math.round(r + (saturated.r - r) * strength);
  const finalG = Math.round(g + (saturated.g - g) * strength);
  const finalB = Math.round(b + (saturated.b - b) * strength);

  return {
    r: Math.max(0, Math.min(255, finalR)),
    g: Math.max(0, Math.min(255, finalG)),
    b: Math.max(0, Math.min(255, finalB))
  };
}

async function processImage(inputPath, outputPath, filmType, strength = 1.0) {
  const profile = FILM_PROFILES[filmType];
  if (!profile) {
    throw new Error(`Unknown film type: ${filmType}`);
  }

  console.log(`Processing: ${inputPath}`);
  console.log(`Film Profile: ${profile.name}`);
  console.log(`Strength: ${strength * 100}%`);

  // Load image
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`Image size: ${info.width}x${info.height}`);
  console.log(`Channels: ${info.channels}`);

  // Process each pixel
  const outputData = Buffer.alloc(data.length);
  const channels = info.channels;
  const totalPixels = info.width * info.height;
  let processedPixels = 0;
  let lastProgress = 0;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const result = applyFilmProfile(r, g, b, profile, strength);

    outputData[i] = result.r;
    outputData[i + 1] = result.g;
    outputData[i + 2] = result.b;

    // Copy alpha if present
    if (channels === 4) {
      outputData[i + 3] = data[i + 3];
    }

    // Progress
    processedPixels++;
    const progress = Math.floor((processedPixels / totalPixels) * 100);
    if (progress >= lastProgress + 10) {
      process.stdout.write(`\rProcessing: ${progress}%`);
      lastProgress = progress;
    }
  }

  console.log('\rProcessing: 100%');

  // Save output
  await sharp(outputData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels
    }
  })
    .jpeg({ quality: 95 })
    .toFile(outputPath);

  console.log(`Saved: ${outputPath}`);
  return outputPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node scripts/apply-film-profile.mjs <input-image> [output-image] [film-type]

Arguments:
  input-image   Path to the image to process
  output-image  Output path (default: input_graded.jpg)
  film-type     Film profile to apply (default: autumn-breeze)

Available film types:
  autumn-breeze

Example:
  node scripts/apply-film-profile.mjs photo.jpg photo_graded.jpg autumn-breeze
`);
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const filmType = args[2] || 'autumn-breeze';

  // Default output name
  const inputExt = path.extname(inputPath);
  const inputBase = path.basename(inputPath, inputExt);
  const defaultOutput = path.join(path.dirname(inputPath), `${inputBase}_graded.jpg`);
  const outputPath = args[1] ? path.resolve(args[1]) : defaultOutput;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    await processImage(inputPath, outputPath, filmType);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
