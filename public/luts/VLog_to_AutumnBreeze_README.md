# Autumn Breeze V-Log LUT

## Overview
A 3D LUT that transforms Panasonic V-Log footage to match the **Autumn Breeze** film aesthetic - warm, dreamy, golden hour look with lifted blacks and soft highlights.

## What It Does

### Color Characteristics
Based on analysis of the reference images from the XiaoHongShu Autumn Breeze profile:

- **Warm Golden Tones**: Orange/amber color bias (+20% warmth)
- **Lifted Blacks**: Matte shadow look (blacks lifted to ~40% instead of pure black)
- **Green → Olive Shift**: Foliage renders with golden olive tones
- **Soft Highlights**: Gentle roll-off in bright areas (max white at 245/255)
- **Halation Glow**: Simulated film halation in highlights (35% orange glow)
- **Enhanced Saturation**: +10% saturation for golden hour vibrancy

### Technical Specs
- **Input**: Panasonic V-Log
- **Output**: Rec.709
- **Resolution**: 33×33×33 (35,937 color points)
- **File Size**: 948 KB
- **Format**: .cube (industry standard)

## Usage

### DaVinci Resolve
1. Open **Color** workspace
2. Right-click on node → **3D LUT** → **Load**
3. Select `VLog_to_AutumnBreeze.cube`
4. Apply to V-Log clips

### Final Cut Pro X
1. Open **Color Inspector**
2. Under **Custom LUT** → **Choose**
3. Select `VLog_to_AutumnBreeze.cube`
4. Set **Mix** to 100%

### Adobe Premiere Pro
1. Open **Lumetri Color** panel
2. Under **Creative** → **Look** → **Browse**
3. Select `VLog_to_AutumnBreeze.cube`
4. Adjust **Intensity** to taste (start at 100%)

## Best Practices

### Recommended Workflow
1. **Expose correctly in-camera**: V-Log benefits from proper exposure
2. **White balance first**: Set white balance before applying LUT
3. **Apply LUT early**: Use LUT as your base, then fine-tune
4. **Fine-tuning**:
   - Adjust exposure ±0.5 stops as needed
   - Tweak highlights/shadows if desired
   - Add film grain in post for extra authenticity

### Ideal Shooting Conditions
This LUT excels with:
- **Golden Hour**: Late afternoon/early morning light
- **Natural Light**: Soft, diffused daylight
- **Outdoor Scenes**: Gardens, parks, natural settings
- **Portraits**: Warm skin tones, soft shadows

## Technical Details

### Color Transform Pipeline
```
V-Log Input
    ↓
Linear Light Conversion (V-Log → Linear)
    ↓
Color Matrix (Green → Olive transformation)
    ↓
Warm Shift (+20% orange/amber bias)
    ↓
Saturation Boost (+10%)
    ↓
Halation Glow (35% in highlights, orange color)
    ↓
Tone Curve (Lifted blacks + Soft highlights)
    ↓
Contrast Adjustment (0.95x for softer midtones)
    ↓
Rec.709 Output Transform
```

### Autumn Color Matrix
```python
[1.15, -0.1, -0.05]   # Red boosted, Green reduced
[0.2, 0.85, -0.05]    # Green shifts toward Red/Yellow
[-0.05, -0.05, 1.1]   # Blue slightly boosted
```

### Tone Curve Points
```
Input → Output (0-255 scale)
0    → 30   (Lifted blacks = matte look)
50   → 65   (Soft shadows)
128  → 128  (Neutral midtones)
255  → 245  (Soft whites, prevent clipping)
```

## Customization

If you want to adjust the look, you can modify `generate_autumn_breeze_lut.py`:

- **More/Less Warmth**: Change `apply_warmth(rgb, amount=0.20)` (0.0 to 0.4)
- **Saturation**: Adjust `apply_saturation(rgb, saturation=1.1)` (0.8 to 1.4)
- **Halation**: Modify `apply_halation_glow(rgb, amount=0.35)` (0.0 to 0.5)
- **Contrast**: Change `apply_contrast(value, contrast=0.95)` (0.8 to 1.1)

Then regenerate:
```bash
python3 generate_autumn_breeze_lut.py
```

## Compatibility

### Tested With
- Panasonic GH5 / GH6 (V-Log)
- Panasonic S1 / S5 / S5 II (V-Log)
- Panasonic EVA1 / AU-EVA1 (V-Log)

### Also Works With
Any camera shooting Panasonic V-Log or V-Log L

## Examples

See `content/reference_autumn_breeze/` for reference images showing the target aesthetic:
- Warm golden afternoon light
- Soft, creamy skin tones
- Olive-green foliage
- Diffused highlights with natural bloom
- Matte shadows with detail retention

## Credits

Based on the **Autumn Breeze** film profile implementation for the Film Grade Pro color grading engine. Color analysis and LUT generation by examining reference photography from the original aesthetic.

## License

This LUT is provided as-is for personal and commercial use with your V-Log footage.
