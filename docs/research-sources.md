# Research Sources for Film & Scanner Profiles

This document tracks the research sources used to create authentic film stock and scanner profiles.

## Scanner Profiles (`src/engine/labProfiles.ts`)

### Fuji Frontier SP3000
**Characteristics:**
- Enhanced contrast with intensified blacks and shadows
- Vibrant saturation ("images burst with color")
- Cooler shadows with blue/cyan lean
- Skin tones lean yellow/golden
- "Classic film look" preferred for portraits and wedding work
- Higher highlight retention

**Sources:**
- [Ikigai Film Lab - Fujifilm SP3000 vs Noritsu HS-1800](https://ikigaifilmlab.com.au/fujifilm-frontier-or-noritsu)
- [Carmencita Film Lab - Frontier vs Noritsu Round 2](https://carmencitafilmlab.com/blog/frontier-vs-noritsu-round-2/)
- [The Drunk Wedding Photographer - Noritsu vs Frontier](https://thedrunkweddingphotographer.com/summerimperfect/noritsu-vs-frontier)
- [Sebastian Schlueter - The magic Fuji Frontier SP-3000](https://www.sebastian-schlueter.com/blog/2018/3/7/the-magic-fuji-frontier-sp-3000)

**Updated Profile Values:**
- Contrast: 1.15 (punchy, enhanced)
- Saturation: 1.12 (vibrant)
- Color Cast: { r: 0.03, g: -0.01, b: -0.03 } (cyan shadows, yellow highlights)
- Warmth: 0.03 (slightly warm overall)

### Noritsu HS-1800
**Characteristics:**
- Flatter rendition preserving shadow and highlight detail
- Softer, lighter hues with gradual tonal transitions
- Peachy skin tones (vs Frontier's yellow)
- More neutral and less saturated than Frontier
- Warmer overall tone
- Better for B&W and slide film
- Higher dynamic range preservation

**Sources:**
- [Arthur G Photo - Film Lab Scanner Comparison](https://arthurgphoto.com/film-scan-comparison-noritsu-vs-frontier/)
- [Carmencita Film Lab - New Film Scan Options: Noritsu HS-1800](https://carmencitafilmlab.com/blog/new-film-scan-options-noritsu-hs-1800/)
- [JB Flanc - The Art of Film Scanning: Frontier vs. Noritsu](https://jbflanc.substack.com/p/the-art-of-film-scanning-frontier)

**Updated Profile Values:**
- Contrast: 1.02 (neutral, preserves detail)
- Saturation: 0.98 (softer, lighter)
- Color Cast: { r: 0.02, g: 0.01, b: 0.0 } (peachy skin tones)
- Warmth: 0.04 (warmer overall)

### Pakon F135
**Characteristics:**
- Excellent color rendering with "serious color smarts"
- Outstanding skin tones rivaling Frontier and Noritsu
- Heavy detail in both highlights and shadows
- Images can be slightly flat, may need contrast boost
- Occasional yellow/green tint (atypical)

**Sources:**
- [Street Wolf Photography - The Kodak/Pakon F135 Scanner](https://jcstreetwolf.wordpress.com/2014/12/21/the-kodak-pakon-f135-scanner/)
- [Toivonen Photography - Kodak Pakon F-135 PLUS Film Scanner](https://toivonenphoto.com/blog/2020/5/4/kodak-pakon-scanner)

**Updated Profile Values:**
- Contrast: 0.95 (can be flat)
- Saturation: 1.0 (good color rendering)
- Color Cast: { r: 0.01, g: 0.02, b: 0.0 } (slight yellow/green tendency)
- Brightness: 0.02 (heavy detail preservation)

### DSLR Scanning Profiles
**Characteristics:**
- Linear mode: Flat, neutral starting point for editing
- Custom camera profiles calibrated specifically for negative inversion
- Minimal cyan/blue cast correction (inverse of orange mask)
- RAW DNGs preferred for better orange mask neutralization

**Sources:**
- [Negative Lab Pro - Scanning Guide](https://www.negativelabpro.com/guide/scanning/)
- [Nate Photographic - DSLR Film Scanning: The Secret to Perfect Color Negatives](http://natephotographic.com/dslr-film-scanning-perfect-color-negatives/)
- [LearnFilm.Photography - 13 DSLR film scanning tips from Negative Lab Pro's creator](https://www.learnfilm.photography/11-film-scanning-tips-from-negative-lab-pros-creator-nate/)

**Updated Profile Values:**
- Linear Mode: Contrast 0.90, Saturation 0.95 (flat for grading)
- NLP Corrected: Contrast 1.0, Saturation 1.02 (calibrated profiles)

---

## Film Stock Profiles (`src/engine/filmProfiles.ts`)

### Kodak Portra 160
**Characteristics:**
- Lower contrast with excellent shadow detail
- Muted saturation (least saturated of Portra range)
- Very natural skin tones
- Finest grain in the series (virtually invisible at normal viewing)
- Exceptional exposure latitude

**Sources:**
- [Fstoppers - Sibling Rivalry: Kodak's Portra 160, 400, and 800](https://fstoppers.com/film/sibling-rivalry-comparison-kodaks-portra-160-400-and-800-430820)
- [Shoot Film Club - Kodak Portra Complete Guide 2025](https://shootfilmclub.com/articles/kodak-portra-complete-guide-2025/)
- [Gridfiti - Kodak Portra 160 vs. 400 vs. 800](https://gridfiti.com/kodak-portra-160-vs-400-vs-800/)

**Updated Profile Values:**
- Contrast: 0.90 (lower contrast)
- Saturation: 0.82 (most muted)
- Grain Amount: 0.008 (finest grain)
- Grain Roughness: 0.25 (very smooth T-grain)

### Kodak Portra 400
**Characteristics:**
- Moderate contrast with excellent tonal range
- Perfect balance of saturation and naturalness
- Warmer and slightly more saturated than 160
- Flawless, smooth skin tones
- Fine grain structure, pleasing at all print sizes

**Sources:**
- [Tony Wodarck - Kodak Portra 400 Film Guide](https://www.tonywodarck.com/education/2023/6/18/kodak-portra-400-film-guide)
- [Casual Photophile - Film Profile - Kodak Portra 400](https://casualphotophile.com/2015/06/12/film-profile-kodak-portra-400/)
- [The Darkroom - Portra 400 Film Reviews](https://thedarkroom.com/film/portra-400/)

**Updated Profile Values:**
- Contrast: 0.95 (moderate)
- Saturation: 0.90 (balanced, more than 160)
- Warmth: 0.05 (warmer than 160)
- Grain Amount: 0.015 (fine grain)

### Kodak Portra 800
**Characteristics:**
- More saturated than 400 (boldest of the series)
- Higher contrast than 160/400
- Visible but pleasant film-like grain
- Can be too saturated for some portrait work
- Good exposure latitude, though less than 160/400

**Sources:**
- [FilterGrade - Kodak Portra 400 vs. Kodak Portra 800](https://filtergrade.com/kodak-portra-400-vs-kodak-portra-800/)
- [Gregory Owain - Film Review: Portra 160 vs Portra 800](https://www.gregoryowain.co.uk/blog/film-review-portra-160-vs-portra-800)

**Updated Profile Values:**
- Contrast: 1.02 (higher contrast)
- Saturation: 0.95 (most saturated, can be excessive)
- Grain Amount: 0.032 (visible but pleasant)

---

## Hypothetical Profiles (No Direct Research)

The following profiles are based on general knowledge and industry reputation, but do not have specific research backing the numeric values:

- **CineStill Cs41 Home Dev** - Simulates home C-41 processing warmth
- **Vintage Drugstore** - 1990s consumer lab aesthetic
- **Pro Lab Premium** - High-end professional lab characteristics

These profiles should be considered artistic interpretations rather than scientifically accurate emulations.

---

## What's Still Missing

### Precise Lab Color Space Values
While we have qualitative descriptions ("peachy skin tones", "cyan shadows"), we don't have:
- Exact Lab color space measurements (L*a*b* values)
- ICC profiles for each scanner
- Spectral response curves
- Calibrated color reference charts

### Film Stock Spectral Data
For films, we're missing:
- Official spectral dye density curves
- Exact sensitometric data
- Lab color space measurements for skin tones
- Kodak's technical datasheets with precise values

### To Get More Accurate Data
1. Scan IT8 color charts on each scanner
2. Measure Lab values from the scans
3. Calculate transformation matrices
4. Access Kodak's technical documentation for films
5. Community-source data from film photographers

---

## Methodology Notes

Values in the profiles are derived from:
1. **Qualitative descriptions** converted to numeric estimates (e.g., "punchy contrast" → 1.15)
2. **Comparative statements** (e.g., "Noritsu is less saturated" → 0.98 vs Frontier's 1.12)
3. **Industry consensus** from multiple sources
4. **Conservative estimates** when exact data unavailable

All RGB offset values (colorCast) are educated guesses based on described color tendencies, not measured values.
