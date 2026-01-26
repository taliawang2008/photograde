#!/usr/bin/env node
/**
 * Automated LUT/Film Profile Conversion & Comparison
 *
 * Runs the WebGL app headlessly, applies a film profile, exports the result,
 * and compares it against a reference image.
 *
 * Usage:
 *   node scripts/run-conversion.mjs <input-image> <reference-image> [film-type]
 *
 * Example:
 *   node scripts/run-conversion.mjs ~/Downloads/P1004454.JPG ~/reference.jpg autumn-breeze
 */

import puppeteer from 'puppeteer';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration
const CONFIG = {
  devServerPort: 5173,
  devServerUrl: 'http://localhost:5173',
  outputDir: path.join(projectRoot, 'test-output'),
  timeout: 60000,
};

async function waitForServer(url, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${url} did not start within ${maxAttempts} seconds`);
}

async function startDevServer() {
  console.log('Starting Vite dev server...');

  // Check if server is already running
  try {
    const response = await fetch(CONFIG.devServerUrl);
    if (response.ok) {
      console.log('Dev server already running.');
      return null; // No process to manage
    }
  } catch (e) {
    // Not running, start it
  }

  const server = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  server.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:')) {
      console.log('Dev server started.');
    }
  });

  server.stderr.on('data', (data) => {
    // Vite outputs to stderr for some messages
  });

  await waitForServer(CONFIG.devServerUrl);
  return server;
}

async function runConversion(inputImage, filmType = 'autumn-breeze') {
  console.log(`\nProcessing: ${inputImage}`);
  console.log(`Film Type: ${filmType}`);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();

    // Set viewport to a reasonable size
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to app
    console.log('Loading app...');
    await page.goto(CONFIG.devServerUrl, { waitUntil: 'networkidle0', timeout: CONFIG.timeout });

    // Wait for the app to fully load
    await page.waitForSelector('canvas', { timeout: CONFIG.timeout });
    await new Promise(r => setTimeout(r, 1000)); // Extra wait for WebGL init

    // Read the input image and convert to base64 data URL
    const imageBuffer = fs.readFileSync(inputImage);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = inputImage.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    // Inject the image into the app by simulating file load
    console.log('Loading image into app...');

    // Create a file input if not visible, or use existing one
    const loaded = await page.evaluate(async (dataUrl, fileName) => {
      return new Promise((resolve, reject) => {
        // Convert data URL to blob
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], fileName, { type: blob.type });

            // Find file input or create one
            let input = document.querySelector('input[type="file"]');
            if (!input) {
              // Try to find hidden input
              input = document.querySelector('input[accept*="image"]');
            }

            if (input) {
              // Create a DataTransfer to set files
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;

              // Dispatch change event
              const event = new Event('change', { bubbles: true });
              input.dispatchEvent(event);

              // Wait for image to load
              setTimeout(() => resolve(true), 2000);
            } else {
              reject(new Error('Could not find file input'));
            }
          })
          .catch(reject);
      });
    }, dataUrl, path.basename(inputImage));

    if (!loaded) {
      throw new Error('Failed to load image');
    }

    console.log('Image loaded, waiting for render...');
    await new Promise(r => setTimeout(r, 2000));

    // Select the film type
    console.log(`Selecting film type: ${filmType}...`);

    await page.evaluate((filmType) => {
      // Find the film selector dropdown
      const selects = document.querySelectorAll('select');
      for (const select of selects) {
        // Check if this is the film selector by looking at options
        const options = Array.from(select.options);
        const filmOption = options.find(opt => opt.value === filmType);
        if (filmOption) {
          select.value = filmType;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    }, filmType);

    // Wait for effect to apply
    await new Promise(r => setTimeout(r, 2000));

    // Set film strength to 100%
    console.log('Setting film strength to 100%...');
    await page.evaluate(() => {
      // Find film strength slider
      const sliders = document.querySelectorAll('input[type="range"]');
      for (const slider of sliders) {
        const label = slider.closest('div')?.querySelector('label, span');
        if (label && label.textContent?.toLowerCase().includes('film strength')) {
          slider.value = '100';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      // Try by checking nearby text
      for (const slider of sliders) {
        const parent = slider.parentElement;
        if (parent && parent.textContent?.toLowerCase().includes('film strength')) {
          slider.value = '100';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    });

    // Wait for render
    await new Promise(r => setTimeout(r, 2000));

    // Export the canvas
    console.log('Exporting result...');

    const outputFileName = `graded_${filmType}_${Date.now()}.jpg`;
    const outputPath = path.join(CONFIG.outputDir, outputFileName);

    const canvasData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        return canvas.toDataURL('image/jpeg', 0.95);
      }
      return null;
    });

    if (!canvasData) {
      throw new Error('Could not get canvas data');
    }

    // Save the image
    const base64Data = canvasData.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

    console.log(`Saved: ${outputPath}`);

    return outputPath;

  } finally {
    await browser.close();
  }
}

async function runComparison(gradedImage, referenceImage) {
  console.log('\n--- Running Comparison ---\n');

  return new Promise((resolve, reject) => {
    const compareScript = path.join(__dirname, 'compare-lut.mjs');
    const proc = exec(`node "${compareScript}" "${gradedImage}" "${referenceImage}"`, {
      cwd: projectRoot,
    }, (error, stdout, stderr) => {
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve(error ? error.code : 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: node scripts/run-conversion.mjs <input-image> <reference-image> [film-type]

Arguments:
  input-image     Path to the original image to process
  reference-image Path to the reference image to compare against
  film-type       Film profile to apply (default: autumn-breeze)

Available film types:
  amber-gold, portrait-160, portrait-400, portrait-800, vivid-100,
  max-400, budget-color, vintage-chrome, chrome-100, verdant-400,
  f-portrait-400, f-c200, natural-100, vivid-50, soft-100,
  motion-800t, motion-50d, mono-classic-400, mono-classic-tx,
  mono-grain-3200, mono-fine-100, mono-fine-ac, mono-fine-pf,
  cinema-2383, lomochrome-purple, reala-ace, autumn-breeze

Example:
  node scripts/run-conversion.mjs ~/Downloads/P1004454.JPG ~/reference.jpg autumn-breeze
`);
    process.exit(1);
  }

  const inputImage = path.resolve(args[0]);
  const referenceImage = path.resolve(args[1]);
  const filmType = args[2] || 'autumn-breeze';

  // Validate inputs
  if (!fs.existsSync(inputImage)) {
    console.error(`Error: Input image not found: ${inputImage}`);
    process.exit(1);
  }

  if (!fs.existsSync(referenceImage)) {
    console.error(`Error: Reference image not found: ${referenceImage}`);
    process.exit(1);
  }

  let server = null;

  try {
    // Start dev server
    server = await startDevServer();

    // Run conversion
    const gradedImage = await runConversion(inputImage, filmType);

    // Run comparison
    const exitCode = await runComparison(gradedImage, referenceImage);

    console.log(`\nOutput saved to: ${gradedImage}`);

    process.exit(exitCode);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);

  } finally {
    // Kill dev server if we started it
    if (server) {
      console.log('\nStopping dev server...');
      process.kill(-server.pid);
    }
  }
}

main();
