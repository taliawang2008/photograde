// V-Log 色彩分级工具 - WebGL Shaders
// 完整的专业级色彩分级处理管线

export const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_texCoord;

  // 纹理
  uniform sampler2D u_image;
  uniform sampler2D u_curveLUT;      // 曲线 LUT (256x4)
  uniform sampler2D u_filmLUT;       // 胶片 3D LUT (打包为2D)
  uniform sampler2D u_inputLUT;      // 输入/IDT LUT
  uniform sampler2D u_outputLUT;     // 输出/ODT LUT

  // === 输入Log转换 ===
  uniform int u_inputLogProfile;     // 0=none, 1=S-Log3, 2=V-Log, 3=C-Log3, 4=LogC3, 5=N-Log, 6=F-Log, 7=BRAW

  // === 基础曝光控制 ===
  uniform float u_exposure;          // -2.0 to 2.0 stops
  uniform float u_contrast;          // -1.0 to 1.0

  // === 分区域亮度调整 ===
  uniform float u_highlights;        // -1.0 to 1.0
  uniform float u_shadows;           // -1.0 to 1.0
  uniform float u_whites;            // -1.0 to 1.0
  uniform float u_blacks;            // -1.0 to 1.0

  // === 色彩控制 ===
  uniform float u_temperature;       // -1.0 to 1.0
  uniform float u_tint;              // -1.0 to 1.0
  uniform float u_saturation;        // -1.0 to 1.0
  uniform float u_vibrance;          // -1.0 to 1.0

  // === 光谱控制 (Spectral Controls) ===
  uniform float u_spectralVolume;    // -1.0 to 1.0 (色彩密度)
  uniform float u_spectralLuminance; // -1.0 to 1.0 (光谱亮度)
  uniform float u_spectralHue;       // -1.0 to 1.0 (全局色相偏移)

  // === 色轮 (Lift-Gamma-Gain) ===
  uniform vec3 u_shadowLift;         // RGB offset for shadows
  uniform vec3 u_midtoneGamma;       // RGB gamma for midtones
  uniform vec3 u_highlightGain;      // RGB gain for highlights

  // === 胶片效果 ===
  uniform float u_filmStrength;      // 0.0 to 1.0
  uniform int u_filmType;            // 0=none, 1-9=各种胶片
  uniform bool u_useFilmColorMatrix; // Use advanced channel mixing
  uniform mat3 u_filmColorMatrix;    // 3x3 Color Matrix for channel crosstalk
  uniform float u_filmLUTSize;       // 3D LUT 尺寸 (通常 32)

  // === 颗粒效果 ===
  uniform float u_grainAmount;       // 0.0 to 1.0
  uniform float u_grainSize;         // 0.0 to 1.0
  uniform float u_grainRoughness;    // 0.0 to 1.0 (New: Controls noise complexity)
  uniform float u_grainChromacity;   // 0.0 to 1.0
  uniform float u_grainHighlights;   // 0.0 to 1.0
  uniform float u_grainShadows;      // 0.0 to 1.0

  uniform float u_acutance;          // 0.0 to 1.0 (Edge sharpening)
  uniform vec2 u_texSize;            // Texture dimensions for sampling
  uniform float u_time;              // 动画时间

  // === 特效 ===
  uniform float u_fade;              // 0.0 to 1.0
  uniform float u_halation;          // 0.0 to 1.0
  uniform vec3 u_halationColor;      // RGB color for halation glow
  uniform float u_halationThreshold; // 0.0 to 1.0 (higher = only brightest)
  uniform float u_halationRadius;    // 0.0 to 1.0 (blur spread)
  uniform float u_bloom;             // 0.0 to 1.0 (光晕扩散)
  uniform float u_diffusion;         // 0.0 to 1.0 (柔焦效果)
  uniform float u_vignette;          // 0.0 to 1.0 (暗角强度)
  uniform float u_vignetteRadius;    // 0.0 to 1.0 (暗角半径)

  // === 高级胶片模拟 ===
  uniform float u_filmToe;           // 0.0 to 1.0 (暗部压缩, S曲线脚部)
  uniform float u_filmShoulder;      // 0.0 to 1.0 (高光压缩, S曲线肩部)
  uniform vec3 u_crossoverShift;     // 色彩交叉偏移 (阴影偏暖/冷)

  // === LUT ===
  uniform float u_lutStrength;       // 0.0 to 1.0
  uniform bool u_useCurveLUT;
  uniform bool u_useFilmLUT;
  uniform bool u_useInputLUT;
  uniform bool u_useOutputLUT;
  uniform float u_inputLUTSize;
  uniform float u_outputLUTSize;

  // === Cinematography Filters ===
  uniform int u_filterType;          // 0=none, 1-8=filter types
  uniform float u_filterStrength;    // 0.0 to 1.0
  uniform float u_filterGlowRadius;  // 0.0 to 1.0
  uniform float u_filterGlowThreshold; // 0.0 to 1.0
  uniform float u_filterSharpness;   // 0.0 to 1.0
  uniform float u_filterStreakAngle; // 0.0 to 360.0

  // ==================== 工具函数 ====================

  // 亮度计算 (BT.709)
  float getLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  // 伪随机数生成器
  // PHI constant for Gold Noise
  const float PHI = 1.61803398874989484820459;

  // Gold Noise - static noise with no pattern artifacts
  float random(vec2 xy) {
    return fract(tan(distance(xy * PHI, xy) * 1.0) * xy.x);
  }
  
  // High-performance pseudorandom for dithering (no time dependency by default)
  float random_static(vec2 xy) {
    return fract(tan(distance(xy * PHI, xy) * 1.0) * xy.x);
  }

  // 噪声函数
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // RGB 转 HSL
  vec3 rgb2hsl(vec3 color) {
    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float l = (maxC + minC) / 2.0;
    float h = 0.0;
    float s = 0.0;

    if (maxC != minC) {
      float d = maxC - minC;
      s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

      if (maxC == color.r) {
        h = (color.g - color.b) / d + (color.g < color.b ? 6.0 : 0.0);
      } else if (maxC == color.g) {
        h = (color.b - color.r) / d + 2.0;
      } else {
        h = (color.r - color.g) / d + 4.0;
      }
      h /= 6.0;
    }

    return vec3(h, s, l);
  }

  // HSL 转 RGB
  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    if (s == 0.0) {
      return vec3(l);
    }

    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;

    return vec3(
      hue2rgb(p, q, h + 1.0/3.0),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1.0/3.0)
    );
  }

  // ==================== 调色函数 ====================

  // 0. Input Log Transform (转换相机Log到线性空间)
  // Applied FIRST in the pipeline to convert log footage to viewable/linear space
  vec3 applyInputLogTransform(vec3 color, int logProfile) {
    if (logProfile == 0) return color; // None - no transform
    
    vec3 linear = color;
    
    // 1: Sony S-Log3 to Linear
    // Reference: Sony S-Log3 White Paper
    if (logProfile == 1) {
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x >= 0.171) {
          v = pow(10.0, (x - 0.410) / 0.255) * 0.18 - 0.01;
        } else {
          v = (x - 0.092) / 5.0 * 0.18 - 0.01;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 2: Panasonic V-Log to Linear
    // Reference: Panasonic V-Log White Paper
    else if (logProfile == 2) {
      float cutInv = 0.181;
      float b = 0.00873;
      float c = 0.241;
      float d = 0.598;
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x < cutInv) {
          v = (x - 0.125) / 5.6;
        } else {
          v = pow(10.0, (x - d) / c) - b;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 3: Canon C-Log3 to Linear
    // Reference: Canon C-Log3 Technical Note
    else if (logProfile == 3) {
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x < 0.097) {
          v = -(pow(10.0, (0.073 - x) / 0.529) - 1.0) / 14.98;
        } else if (x > 0.15) {
          v = (pow(10.0, (x - 0.073) / 0.529) - 1.0) / 14.98;
        } else {
          v = (x - 0.073) / 9.0;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 4: ARRI LogC3 (EI 800) to Linear
    // Reference: ARRI LogC3 Specification
    else if (logProfile == 4) {
      float cut = 0.010591;
      float a = 5.555556;
      float b = 0.052272;
      float c = 0.247190;
      float d = 0.385537;
      float e = 5.367655;
      float f = 0.092809;
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x > e * cut + f) {
          v = (pow(10.0, (x - d) / c) - b) / a;
        } else {
          v = (x - f) / e;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 5: Nikon N-Log to Linear
    // Reference: Nikon N-Log Technical Specification
    else if (logProfile == 5) {
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x < 0.328) {
          v = pow((x / 0.328), 3.0) * 0.018;
        } else {
          v = exp((x - 0.636) / 0.181) * 0.18;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 6: Fujifilm F-Log to Linear
    // Reference: Fujifilm F-Log Specification
    else if (logProfile == 6) {
      float a = 0.555556;
      float b = 0.009468;
      float c = 0.344676;
      float d = 0.790453;
      float cutInv = 0.100537775;
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x >= cutInv) {
          v = pow(10.0, (x - d) / c) / a - b / a;
        } else {
          v = (x - 0.092864) / 8.799461;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    // 7: Blackmagic Film Gen 5 to Linear
    // Reference: Blackmagic Design Camera SDK
    else if (logProfile == 7) {
      float a = 0.09246575;
      float b = 0.5300133;
      float c = 0.149;
      float linCut = 0.005;
      for (int i = 0; i < 3; i++) {
        float x = i == 0 ? color.r : (i == 1 ? color.g : color.b);
        float v;
        if (x > c) {
          v = pow(2.0, (x - b) / a);
        } else {
          v = x / 10.44426855;
        }
        if (i == 0) linear.r = v;
        else if (i == 1) linear.g = v;
        else linear.b = v;
      }
    }
    
    return clamp(linear, 0.0, 1.0);
  }

  // 1. 曝光调整
  vec3 adjustExposure(vec3 color, float exposure) {
    return color * pow(2.0, exposure);
  }

  // 2. 对比度调整
  vec3 adjustContrast(vec3 color, float contrast) {
    // S曲线对比度
    float factor = (1.0 + contrast) / (1.0 - contrast * 0.9);
    return clamp(0.5 + (color - 0.5) * factor, 0.0, 1.0);
  }

  // 3. 分区域亮度调整 (Highlights/Shadows/Whites/Blacks)
  vec3 adjustTonalRange(vec3 color, float highlights, float shadows, float whites, float blacks) {
    float lum = getLuminance(color);

    // 阴影区域权重 (暗部)
    float shadowWeight = 1.0 - smoothstep(0.0, 0.5, lum);

    // 高光区域权重 (亮部)
    float highlightWeight = smoothstep(0.5, 1.0, lum);

    // 纯黑区域权重 (最暗)
    float blackWeight = 1.0 - smoothstep(0.0, 0.25, lum);

    // 纯白区域权重 (最亮)
    float whiteWeight = smoothstep(0.75, 1.0, lum);

    // 应用调整
    vec3 result = color;

    // Shadows: 提亮或压暗暗部
    result += shadows * shadowWeight * 0.5 * (1.0 - color);

    // Highlights: 提亮或压暗亮部
    result += highlights * highlightWeight * 0.5 * (color);

    // Blacks: 调整纯黑区域
    result += blacks * blackWeight * 0.3;

    // Whites: 调整纯白区域
    result -= whites * whiteWeight * 0.3 * (1.0 - color);

    return clamp(result, 0.0, 1.0);
  }

  // 4. 色温色调调整
  vec3 adjustTemperatureTint(vec3 color, float temperature, float tint) {
    // 色温: 蓝-橙轴
    // 正值 = 暖色 (增加橙/黄, 减少蓝)
    // 负值 = 冷色 (增加蓝, 减少橙/黄)
    vec3 warm = vec3(1.0, 0.9, 0.7);  // 暖色调
    vec3 cool = vec3(0.7, 0.9, 1.0);  // 冷色调

    vec3 tempAdjust = temperature > 0.0
      ? mix(vec3(1.0), warm, temperature)
      : mix(vec3(1.0), cool, -temperature);

    color *= tempAdjust;

    // 色调: 绿-洋红轴
    // 正值 = 洋红
    // 负值 = 绿色
    color.g -= tint * 0.1;
    color.r += tint * 0.05;
    color.b += tint * 0.05;

    return clamp(color, 0.0, 1.0);
  }

  // 5. 饱和度调整
  vec3 adjustSaturation(vec3 color, float saturation) {
    float gray = getLuminance(color);
    return mix(vec3(gray), color, 1.0 + saturation);
  }

  // 6. 智能饱和度 (Vibrance) - 保护已饱和区域和肤色
  vec3 adjustVibrance(vec3 color, float vibrance) {
    float lum = getLuminance(color);

    // 计算当前饱和度
    float maxC = max(max(color.r, color.g), color.b);
    float minC = min(min(color.r, color.g), color.b);
    float sat = (maxC - minC) / (maxC + 0.001);

    // 饱和度越低，调整越多
    float adjustAmount = vibrance * (1.0 - sat);

    // 肤色保护 (检测肤色范围)
    // 肤色通常 R > G > B，且 R 在 0.5-0.9 范围
    float skinFactor = 1.0;
    if (color.r > color.g && color.g > color.b && color.r > 0.4 && color.r < 0.95) {
      float skinLikelihood = (color.r - color.b) / (color.r + 0.001);
      skinFactor = 1.0 - skinLikelihood * 0.5;
    }

    vec3 gray = vec3(lum);
    return mix(gray, color, 1.0 + adjustAmount * skinFactor * 0.5);
  }

  // 6.5 光谱控制 (Spectral Controls) - 在HSL空间操作
  vec3 applySpectralControls(vec3 color, float volume, float luminance, float hueShift) {
    if (volume == 0.0 && luminance == 0.0 && hueShift == 0.0) return color;
    
    vec3 hsl = rgb2hsl(color);
    
    // Spectral Volume: 非线性饱和度控制 (类似 color.io 的密度控制)
    // 与普通饱和度不同，它对低饱和度区域影响更大
    if (volume != 0.0) {
      float satBoost = volume * (1.0 - hsl.y * 0.5); // 低饱和度区域增强更多
      hsl.y = clamp(hsl.y + satBoost * 0.5, 0.0, 1.0);
    }
    
    // Spectral Luminance: 基于色相的亮度调整
    // 保持色彩丰富度的同时调整亮度
    if (luminance != 0.0) {
      float lumAdjust = luminance * 0.3;
      // 对高饱和度区域影响更大
      lumAdjust *= hsl.y * 0.5 + 0.5;
      hsl.z = clamp(hsl.z + lumAdjust, 0.0, 1.0);
    }
    
    // Spectral Hue: 全局色相偏移
    if (hueShift != 0.0) {
      hsl.x = mod(hsl.x + hueShift * 0.5, 1.0);
    }
    
    return hsl2rgb(hsl);
  }

  // 7. 曲线应用 (通过 LUT 纹理)
  vec3 applyCurves(vec3 color, sampler2D curveLUT) {
    // curveLUT 是 256x4 的纹理
    // Row 0: RGB 主曲线
    // Row 1: Red 通道
    // Row 2: Green 通道
    // Row 3: Blue 通道

    // 先应用 RGB 主曲线
    float r = texture2D(curveLUT, vec2(color.r, 0.125)).r;
    float g = texture2D(curveLUT, vec2(color.g, 0.125)).g;
    float b = texture2D(curveLUT, vec2(color.b, 0.125)).b;

    // 再应用独立通道曲线
    r = texture2D(curveLUT, vec2(r, 0.375)).r;
    g = texture2D(curveLUT, vec2(g, 0.625)).g;
    b = texture2D(curveLUT, vec2(b, 0.875)).b;

    return vec3(r, g, b);
  }

  // 8. 色轮 (Lift-Gamma-Gain)
  vec3 applyColorWheels(vec3 color, vec3 lift, vec3 gamma, vec3 gain) {
    float lum = getLuminance(color);

    // Lift: 主要影响暗部 (加法操作)
    float liftWeight = pow(1.0 - lum, 2.0);
    color += lift * liftWeight * 0.5;

    // Gamma: 主要影响中间调 (幂函数)
    float midWeight = 1.0 - pow(abs(lum - 0.5) * 2.0, 2.0);
    vec3 gammaFactor = 1.0 / (1.0 + gamma * 0.5);
    color = mix(color, pow(max(color, vec3(0.001)), gammaFactor), midWeight);

    // Gain: 主要影响高光 (乘法操作)
    float gainWeight = pow(lum, 2.0);
    color *= 1.0 + gain * gainWeight * 0.5;

    return clamp(color, 0.0, 1.0);
  }

  // 9. 3D LUT 应用 (将3D打包成2D切片)
  vec3 apply3DLUT(vec3 color, sampler2D lut, float lutSize) {
    float sliceCount = lutSize;
    float sliceWidth = 1.0 / sliceCount;

    // 计算蓝色通道对应的切片
    float blueSlice = color.b * (sliceCount - 1.0);
    float slice0 = floor(blueSlice);
    float slice1 = min(slice0 + 1.0, sliceCount - 1.0);
    float sliceFrac = blueSlice - slice0;

    // 计算 UV 坐标
    float xOffset0 = (slice0 + color.r * (1.0 - 1.0/lutSize) + 0.5/lutSize) * sliceWidth;
    float xOffset1 = (slice1 + color.r * (1.0 - 1.0/lutSize) + 0.5/lutSize) * sliceWidth;
    float y = color.g * (1.0 - 1.0/lutSize) + 0.5/lutSize;

    // 三线性插值
    vec3 color0 = texture2D(lut, vec2(xOffset0, y)).rgb;
    vec3 color1 = texture2D(lut, vec2(xOffset1, y)).rgb;

    return mix(color0, color1, sliceFrac);
  }

  // 9.5 High-Precision Film Color Matrix
  vec3 applyFilmColorMatrix(vec3 color, mat3 matrix) {
    return matrix * color;
  }

  // 10. 胶片模拟效果 (内置 - 24种胶片)
  vec3 applyFilmEmulation(vec3 color, int filmType, float strength) {
    if (filmType == 0 || strength <= 0.0) return color;

    vec3 filmColor = color;
    float lum = getLuminance(color);
    vec3 hsl;

    // ==================== KODAK COLOR NEGATIVE ====================
    
    // 1: Kodak Gold 200 - 温暖，怀旧，高饱和
    if (filmType == 1) {
      filmColor.r *= 1.12;
      filmColor.g *= 1.03;
      filmColor.b *= 0.82;
      filmColor += (1.0 - lum) * vec3(0.04, 0.02, -0.01);
      filmColor = adjustContrast(filmColor, 0.12);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.25;
      filmColor = hsl2rgb(hsl);
    }
    
    // 2: Portra 160 - 极其柔和，低对比
    else if (filmType == 2) {
      filmColor.r *= 1.01;
      filmColor.g *= 1.015;
      filmColor.b *= 0.99;
      filmColor = adjustContrast(filmColor, -0.08);
      filmColor = mix(filmColor, vec3(lum), smoothstep(0.85, 1.0, lum) * 0.25);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 0.85;
      filmColor = hsl2rgb(hsl);
    }
    
    // 3: Portra 400 - 经典肖像，柔和肤色
    else if (filmType == 3) {
      filmColor.r *= 1.02;
      filmColor.g *= 1.01;
      filmColor.b *= 0.98;
      filmColor = adjustContrast(filmColor, -0.05);
      filmColor = mix(filmColor, vec3(lum), smoothstep(0.8, 1.0, lum) * 0.2);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 0.88;
      filmColor = hsl2rgb(hsl);
    }
    
    // 4: Portra 800 - 温暖，更高颗粒
    else if (filmType == 4) {
      filmColor.r *= 1.03;
      filmColor.g *= 1.02;
      filmColor.b *= 0.97;
      filmColor += (1.0 - lum) * vec3(0.02, 0.025, 0.015);
      filmColor = adjustContrast(filmColor, -0.02);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 0.9;
      filmColor = hsl2rgb(hsl);
    }
    
    // 5: Ektar 100 - 高饱和，高对比，鲜艳
    else if (filmType == 5) {
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.35;
      filmColor = hsl2rgb(hsl);
      filmColor = adjustContrast(filmColor, 0.18);
      filmColor.b *= 1.02;
    }
    
    // 6: Ultramax 400 - 经济实惠，温暖
    else if (filmType == 6) {
      filmColor.r *= 1.08;
      filmColor.g *= 1.02;
      filmColor.b *= 0.88;
      filmColor += (1.0 - lum) * vec3(0.03, 0.02, -0.02);
      filmColor = adjustContrast(filmColor, 0.1);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.2;
      filmColor = hsl2rgb(hsl);
    }
    
    // 7: ColorPlus 200 - 类似Gold但更柔和
    else if (filmType == 7) {
      filmColor.r *= 1.06;
      filmColor.g *= 1.015;
      filmColor.b *= 0.9;
      filmColor += (1.0 - lum) * vec3(0.03, 0.015, -0.015);
      filmColor = adjustContrast(filmColor, 0.08);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.15;
      filmColor = hsl2rgb(hsl);
    }
    
    // ==================== KODAK SLIDE ====================
    
    // 8: Kodachrome 64 - 传奇色彩，温暖红色
    else if (filmType == 8) {
      filmColor.r *= 1.15;
      filmColor.g *= 1.02;
      filmColor.b *= 0.85;
      filmColor += (1.0 - lum) * vec3(0.02, 0.0, -0.02);
      filmColor = adjustContrast(filmColor, 0.25);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.4;
      filmColor = hsl2rgb(hsl);
    }
    
    // 9: Ektachrome E100 - 冷色调，蓝色增强
    else if (filmType == 9) {
      filmColor.r *= 0.98;
      filmColor.g *= 1.0;
      filmColor.b *= 1.08;
      filmColor = adjustContrast(filmColor, 0.15);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.2;
      filmColor = hsl2rgb(hsl);
    }
    
    // ==================== FUJI COLOR NEGATIVE ====================
    
    // 10: Superia 400 - 绿色偏移，日系
    else if (filmType == 10) {
      filmColor.r *= 0.97;
      filmColor.g *= 1.06;
      filmColor.b *= 0.94;
      filmColor.g += (1.0 - lum) * 0.035;
      filmColor = adjustContrast(filmColor, 0.08);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.12;
      filmColor = hsl2rgb(hsl);
    }
    
    // 11: Pro 400H - 柔和，青绿阴影
    else if (filmType == 11) {
      filmColor.r *= 0.99;
      filmColor.g *= 1.02;
      filmColor.b *= 1.02;
      filmColor += (1.0 - lum) * vec3(-0.01, 0.02, 0.02);
      filmColor = adjustContrast(filmColor, -0.1);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 0.82;
      filmColor = hsl2rgb(hsl);
    }
    
    // 12: C200 - 入门级，轻微绿偏
    else if (filmType == 12) {
      filmColor.r *= 0.99;
      filmColor.g *= 1.04;
      filmColor.b *= 0.98;
      filmColor = adjustContrast(filmColor, 0.05);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.1;
      filmColor = hsl2rgb(hsl);
    }
    
    // ==================== FUJI SLIDE ====================
    
    // 13: Provia 100F - 中性，准确色彩
    else if (filmType == 13) {
      filmColor = adjustContrast(filmColor, 0.08);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.15;
      filmColor = hsl2rgb(hsl);
    }
    
    // 14: Velvia 50 - 极高饱和，风光之王
    else if (filmType == 14) {
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.6;
      filmColor = hsl2rgb(hsl);
      filmColor = adjustContrast(filmColor, 0.25);
      // 蓝天和绿色增强
      if (color.b > color.r && color.b > color.g * 0.8) {
        filmColor.b *= 1.12;
      }
      if (color.g > color.r && color.g > color.b) {
        filmColor.g *= 1.08;
      }
    }
    
    // 15: Astia 100F - 柔和幻灯片，人像友好
    else if (filmType == 15) {
      filmColor = adjustContrast(filmColor, 0.02);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.0;
      filmColor = hsl2rgb(hsl);
      filmColor = mix(filmColor, vec3(lum), smoothstep(0.85, 1.0, lum) * 0.15);
    }
    
    // ==================== CINEMA ====================
    
    // 16: CineStill 800T - 钨丝灯平衡，青色调，红色光晕
    else if (filmType == 16) {
      filmColor.r *= 0.92;
      filmColor.g *= 0.98;
      filmColor.b *= 1.15;
      filmColor += (1.0 - lum) * vec3(-0.03, 0.01, 0.05);
      filmColor = adjustContrast(filmColor, 0.05);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.1;
      filmColor = hsl2rgb(hsl);
    }
    
    // 17: CineStill 50D - 日光平衡，电影质感
    else if (filmType == 17) {
      filmColor.r *= 1.02;
      filmColor.g *= 1.01;
      filmColor.b *= 1.03;
      filmColor = adjustContrast(filmColor, 0.12);
      hsl = rgb2hsl(filmColor);
      hsl.y *= 1.2;
      filmColor = hsl2rgb(hsl);
    }
    
    // ==================== BLACK & WHITE ====================
    
    // 18: HP5 Plus - 经典黑白，中等对比
    else if (filmType == 18) {
      filmColor = vec3(lum);
      filmColor = adjustContrast(filmColor, 0.2);
    }
    
    // 19: Tri-X 400 - 传奇黑白，绿色敏感
    else if (filmType == 19) {
      float bwLum = dot(color, vec3(0.22, 0.68, 0.10));
      filmColor = vec3(bwLum);
      filmColor = adjustContrast(filmColor, 0.18);
    }
    
    // 20: Delta 3200 - 高ISO黑白，粗颗粒
    else if (filmType == 20) {
      filmColor = vec3(lum);
      filmColor = adjustContrast(filmColor, 0.28);
      filmColor = pow(filmColor, vec3(1.1));
    }
    
    // 21: T-Max 100 - 细颗粒黑白，高清晰
    else if (filmType == 21) {
      filmColor = vec3(lum);
      filmColor = adjustContrast(filmColor, 0.15);
    }
    
    // 22: Acros 100 - 富士黑白，细腻
    else if (filmType == 22) {
      float bwLum = dot(color, vec3(0.25, 0.60, 0.15));
      filmColor = vec3(bwLum);
      filmColor = adjustContrast(filmColor, 0.1);
    }
    
    // 23: Pan F 50 - 极细颗粒，高对比
    else if (filmType == 23) {
      filmColor = vec3(lum);
      filmColor = adjustContrast(filmColor, 0.22);
    }

    return mix(color, filmColor, strength);
  }

  // 11. Fade 效果 (褪色)
  vec3 applyFade(vec3 color, float fade) {
    if (fade <= 0.0) return color;

    // 提升暗部 (黑色变灰)
    color = max(color, vec3(fade * 0.15));

    // 压缩高光 (白色变暗)
    color = min(color, vec3(1.0 - fade * 0.1));

    // 降低对比度
    color = mix(color, vec3(0.5), fade * 0.1);

    return color;
  }

  // 12. Professional Halation (高质量光晕 - 多采样模拟散射)
  // Now uses user-configurable color, threshold, and radius
  vec3 applyProfessionalHalation(vec3 color, float halation, vec3 halationTint, float threshold, float radius, vec2 uv) {
    if (halation <= 0.0) return color;

    float lum = getLuminance(color);
    
    // 高光检测 - 使用用户可调阈值
    // threshold: 0.0 = low threshold (more glow), 1.0 = high threshold (only brightest)
    float thresholdLow = mix(0.3, 0.8, threshold);
    float thresholdHigh = thresholdLow + 0.2;
    float halationMask = smoothstep(thresholdLow, thresholdHigh, lum);
    
    // 多采样模拟光散射 (5x5 pattern scaled by halation amount)
    // 这模拟了真实胶片中光线穿过乳剂层时的散射
    float scatter = halation * 0.008 * (1.0 + radius);
    vec3 scattered = vec3(0.0);
    float weight = 0.0;
    
    // 采样周围像素模拟散射 (简化版卷积)
    // radius affects the spread of the scatter pattern
    float spreadFactor = 1.0 + radius * 2.0;
    for (float dx = -2.0; dx <= 2.0; dx += 1.0) {
      for (float dy = -2.0; dy <= 2.0; dy += 1.0) {
        float dist = length(vec2(dx, dy));
        if (dist > 2.5) continue;
        
        // 高斯权重 - modulated by radius
        float sigma = 0.5 + radius * 0.5;
        float w = exp(-dist * dist / (2.0 * sigma * sigma));
        weight += w;
        
        // 注意: 在单pass中我们只能访问当前像素
        // 所以这里使用当前像素值模拟散射效果
        scattered += color * w;
      }
    }
    scattered /= weight;
    
    // Halation 特有的颜色偏移 - 现在使用用户指定的颜色
    // halationTint is the user's chosen color (e.g., orange for CineStill)
    vec3 tintedColor = color * halationTint;
    
    // 径向衰减 (边缘更明显)
    vec2 center = uv - 0.5;
    float radialFactor = 1.0 + length(center) * 0.5;
    
    // 混合散射光晕 with user color
    vec3 halationGlow = tintedColor * halationMask * halation * 0.3 * radialFactor;
    
    // 添加柔和的光晕扩散
    color += halationGlow;
    
    // 次级光晕层 - 使用用户颜色的淡化版本
    vec3 secondaryGlow = halationTint * 0.1 * halationMask * halation;
    color += secondaryGlow;

    return clamp(color, 0.0, 1.0);
  }

  // 17.5 Film Acutance (Edge Sharpening)
  vec3 applyAcutance(vec3 color, vec2 uv, float strength) {
    if (strength <= 0.0) return color;
    
    vec2 step = 1.0 / u_texSize;
    
    // Sample neighbors (Cross kernel)
    vec3 n = texture2D(u_image, uv + vec2(0.0, -step.y)).rgb;
    vec3 s = texture2D(u_image, uv + vec2(0.0, step.y)).rgb;
    vec3 e = texture2D(u_image, uv + vec2(step.x, 0.0)).rgb;
    vec3 w = texture2D(u_image, uv + vec2(-step.x, 0.0)).rgb;
    
    // High-pass = Center - Average(Neighbors)
    vec3 neighbors = (n + s + e + w) * 0.25;
    vec3 detail = color - neighbors;
    
    // Add detail back to original (Unsharp Mask)
    // Multiplier 4.0 makes 'strength 1.0' quite strong
    return color + detail * strength * 4.0;
  }

  // 13. Organic Film Grain (Organic Dye Cloud Simulation)
  // Uses Simplex-like noise for natural clumping and density-dependent masking
  
  // Pseudo-random function (canonical)
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Value Noise (Standard 2D)
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  // Simplex Noise (2D Approximation) - Faster and more organic than Perlin
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  // FBM (Fractal Brownian Motion) for layering grain structure
  float fbm(vec2 uv, int octaves, float roughness) {
      float value = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      
      for (int i = 0; i < 4; i++) { // Limit to 4 loops max for perf, controlled by octaves
          if (i >= octaves) break;
          // Use Simplex for organic "cloudy" feel or Value for "digital" feel
          // Mixing them gives best film emulation
          value += snoise(uv * frequency) * amplitude;
          frequency *= 2.0;
          // Roughness controls amplitude decay (High roughness = noisier octaves)
          amplitude *= 0.5 * (1.0 + roughness); 
      }
      return value;
  }

  vec3 applyOrganicGrain(vec3 color, float amount, float size, float roughness, float chromacity, float highlights, float shadows, vec2 uv, float time) {
    if (amount <= 0.0) return color;

    // Base grain scale (smaller = finer)
    float baseScale = mix(1000.0, 200.0, size);
    
    // Animate grain (film runs at 24fps) - quantize time to create "film flutter"
    // float frameTime = floor(time * 24.0); // 24fps strobe
    float frameTime = time * 10.0; // Smooth scroll usually better for UI viewing
    
    // === Luminance Masking (Density Response) ===
    // Real film: Grain is most visible in mid-densities.
    // Negative film: Darks (transparent on neg) have less grain structure than Mids.
    // Highlights (dense on neg) can be grainy but often "blocked up".
    float lum = getLuminance(color);
    
    // Custom curve: Fade grain in deep blacks and pure whites
    // Peak grain visibility at 0.3-0.7 luminance
    float responseCurve = 1.0 - pow(abs(lum - 0.5) * 2.0, 2.5);
    
    // User overrides (Shadows/Highlights sliders)
    // Map existing uniforms (u_grainShadows/Highlights) to this response
    // If u_grainShadows is high, boost low-end response
    float shadowMask = smoothstep(0.0, 0.5, lum);
    float highlightMask = 1.0 - smoothstep(0.5, 1.0, lum);
    
    // Combined mask
    float densityMask = responseCurve; 
    // Mix in user overrides
    densityMask = mix(densityMask, 1.0, shadows * (1.0 - shadowMask)); // Boost shadow grain if requested
    densityMask = mix(densityMask, 1.0, highlights * (1.0 - highlightMask));
    
    densityMask = clamp(densityMask, 0.2, 1.0); // Never fully zero, film always has some base fog

    // === Channel Independent Grain (Dye Clouds) ===
    // offset channels to simulate dye layer depth
    vec2 uvR = uv * baseScale + vec2(0.0, frameTime);
    vec2 uvG = uv * baseScale + vec2(15.2, frameTime + 5.2);
    vec2 uvB = uv * baseScale * 0.85 + vec2(100.0, frameTime + 10.5); // Blue grain usually larger
    
    // Generate Simplex noise for each channel
    // Octaves depend on "roughness" (Tri-X uses more octaves for sharper edges)
    int octaves = int(mix(1.0, 4.0, roughness));
    
    float noiseR = fbm(uvR, octaves, roughness);
    float noiseG = fbm(uvG, octaves, roughness);
    float noiseB = fbm(uvB, octaves, roughness);
    
    vec3 grainVec = vec3(noiseR, noiseG, noiseB);
    
    // Normalize noise center (0.0 center)
    // Scale intensity
    grainVec *= amount * 0.4; // Multiplier to match previous visual scale
    
    // === Application Mode ===
    // Film grain is multiplicative in density (Log), but in Linear it looks like Soft Light
    // Simplified Overlay/SoftLight approximation:
    // color + (2*color - 1) * grain? No, simplified addition proportional to sqrt(lum) is physically close enough for real-time
    
    // Chroma Control: Mono vs Color grain
    float lumaGrain = dot(grainVec, vec3(0.333));
    vec3 finalGrain = mix(vec3(lumaGrain), grainVec, chromacity);
    
    // Apply masked grain
    color += finalGrain * densityMask;
    
    return clamp(color, 0.0, 1.0);
  }

  // 14. S-Curve 色调映射 (电影级胶片响应)
  vec3 applyFilmToneMapping(vec3 color, float toe, float shoulder) {
    if (toe <= 0.0 && shoulder <= 0.0) return color;

    // 使用 ASC CDL 启发的 S 曲线
    // toe 控制暗部压缩 (提升黑色)
    // shoulder 控制高光滚降 (压缩白色)
    
    vec3 result = color;
    
    // Toe: 暗部提升 (模拟胶片基底雾度)
    if (toe > 0.0) {
      float toeStrength = toe * 0.3;
      result = result + toeStrength * (1.0 - result) * (1.0 - result);
    }
    
    // Shoulder: 高光压缩 (模拟胶片饱和)
    if (shoulder > 0.0) {
      float shoulderStrength = shoulder * 0.5;
      // 使用 soft-knee 压缩
      vec3 compressed = 1.0 - exp(-result * (1.0 + shoulderStrength));
      result = mix(result, compressed, smoothstep(0.5, 1.0, result));
    }
    
    return clamp(result, 0.0, 1.0);
  }

  // 15. 色彩交叉偏移 (阴影/高光颜色分离)
  vec3 applyCrossover(vec3 color, vec3 crossoverShift) {
    if (length(crossoverShift) < 0.001) return color;
    
    float lum = getLuminance(color);
    
    // 阴影区域偏移 (通常偏暖或偏青)
    vec3 shadowShift = crossoverShift * (1.0 - smoothstep(0.0, 0.5, lum));
    
    // 高光区域反向偏移
    vec3 highlightShift = -crossoverShift * smoothstep(0.5, 1.0, lum);
    
    color += shadowShift * 0.1 + highlightShift * 0.05;
    
    return clamp(color, 0.0, 1.0);
  }

  // 16. Bloom 效果 (简化版 - 高光扩散)
  vec3 applyBloom(vec3 color, float bloom, vec2 uv) {
    if (bloom <= 0.0) return color;
    
    float lum = getLuminance(color);
    
    // 高光区域的发光
    float bloomMask = smoothstep(0.6, 1.0, lum);
    
    // 简化的辉光 (真实 bloom 需要多 pass)
    vec3 bloomColor = color * bloomMask * bloom * 0.3;
    
    // 添加轻微的颜色偏移 (模拟镜头色散)
    bloomColor.r *= 1.1;
    bloomColor.b *= 0.95;
    
    return clamp(color + bloomColor, 0.0, 1.0);
  }

  // 17. Diffusion 效果 (柔焦)
  vec3 applyDiffusion(vec3 color, float diffusion, vec2 uv) {
    if (diffusion <= 0.0) return color;
    
    float lum = getLuminance(color);
    
    // 降低对比度 (模拟柔焦效果)
    vec3 diffused = mix(color, vec3(lum), diffusion * 0.3);
    
    // 高光区域更明显的扩散
    float highlightMask = smoothstep(0.5, 1.0, lum);
    diffused = mix(color, diffused, 1.0 + highlightMask * diffusion * 0.5);
    
    return clamp(diffused, 0.0, 1.0);
  }

  // 18. Vignette 效果 (暗角)
  vec3 applyVignette(vec3 color, float strength, float radius, vec2 uv) {
    if (strength <= 0.0) return color;
    
    // 计算到中心的距离
    vec2 center = uv - 0.5;
    float dist = length(center);
    
    // 可调节的暗角半径
    float innerRadius = mix(0.2, 0.6, radius);
    float outerRadius = mix(0.7, 1.0, radius);
    
    // 平滑的暗角渐变
    float vignetteMask = smoothstep(innerRadius, outerRadius, dist);
    
    // 应用暗角 (降低亮度和轻微偏色)
    color *= 1.0 - vignetteMask * strength * 0.7;
    
    // 可选: 暗角区域轻微偏暖
    color.r += vignetteMask * strength * 0.02;
    color.b -= vignetteMask * strength * 0.02;
    
    return clamp(color, 0.0, 1.0);
  }

  // 19. 改进的 Halation 效果 (带径向模糊)
  vec3 applyEnhancedHalation(vec3 color, float halation, vec2 uv) {
    if (halation <= 0.0) return color;

    float lum = getLuminance(color);

    // 高光区域的红色溢出
    float halationMask = smoothstep(0.65, 0.95, lum);
    
    // 主要红色溢出
    float redBleed = halation * halationMask * 0.2;
    color.r += redBleed;
    
    // 次级橙色光晕
    color.g += redBleed * 0.3;
    
    // 模拟径向扩散 (简化版)
    vec2 center = uv - 0.5;
    float radialFalloff = 1.0 - length(center) * 0.5;
    color += halation * halationMask * vec3(0.08, 0.02, 0.01) * radialFalloff;

    return clamp(color, 0.0, 1.0);
  }

  // ==================== CINEMATOGRAPHY FILTERS ====================

  // Gaussian blur approximation for glow effects
  vec3 applyGlow(vec3 color, float threshold, float radius, float strength, vec2 uv) {
    if (strength <= 0.0) return color;
    
    // Logic changed: We don't check if current pixel is bright.
    // Instead, we check if NEIGHBORS are bright and add their light to us.
    
    vec3 glow = vec3(0.0);
    float glowWeight = 0.0;
    float blurSize = radius * 0.00005; // Reduced 5x for finer control (0.00025 -> 0.00005)
    
    // Dithering: Randomize offset per pixel to hide sample pattern
    // Generate jitter in range [-0.5, 0.5]
    float r1 = random_static(uv + vec2(0.123, 0.456));
    float r2 = random_static(uv + vec2(0.789, 0.012));
    vec2 jitter = (vec2(r1, r2) - 0.5) * 0.75; // Jitter magnitude
    
    // 5x5 Grid for better quality (wider spread)
    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        // Apply jitter to sample position
        vec2 offset = (vec2(x, y) + jitter) * blurSize;
        vec3 sample = texture2D(u_image, uv + offset).rgb;
        float sampleLum = getLuminance(sample);
        
        // Calculate how much this neighbor contributes to glow
        // Only pixels brighter than threshold emit glow
        float contribution = smoothstep(threshold, 1.0, sampleLum);
        
        if (contribution > 0.0) {
           // Distance attenuation (center is stronger) - Optional but looks better
           float dist = length(vec2(x, y));
           float weight = 1.0 / (1.0 + dist); 
           
           glow += sample * contribution * weight;
           glowWeight += weight;
        }
      }
    }
    
    if (glowWeight > 0.0) {
      glow /= glowWeight;
      // Additive blending: add the glow to the base color
      color += glow * strength;
    }
    
    return clamp(color, 0.0, 1.0);
  }

  // Sharpness reduction (blur)
  vec3 reduceSharpness(vec3 color, float amount, vec2 uv) {
    if (amount <= 0.0) return color;
    
    vec3 blurred = vec3(0.0);
    float blurSize = amount * 0.01; // Scale for softening (1.0 → 0.01 = 1% of screen)
    
    // 5-tap blur
    blurred += texture2D(u_image, uv + vec2(-blurSize, 0.0)).rgb * 0.2;
    blurred += texture2D(u_image, uv + vec2(blurSize, 0.0)).rgb * 0.2;
    blurred += texture2D(u_image, uv + vec2(0.0, -blurSize)).rgb * 0.2;
    blurred += texture2D(u_image, uv + vec2(0.0, blurSize)).rgb * 0.2;
    blurred += color * 0.2;
    
    return mix(color, blurred, amount);
  }

  // 20. Cinematography Filters
  vec3 applyCinematographyFilter(
    vec3 color, 
    int filterType, 
    float strength,
    float glowRadius,
    float glowThreshold,
    float sharpness,
    float streakAngle,
    vec2 uv
  ) {
    if (filterType == 0 || strength <= 0.0) return color; // None
    
    vec3 filtered = color;
    float lum = getLuminance(color);
    
    // 1: Black Pro-Mist (Tiffen)
    // Softens highlights, creates vintage glow, reduces contrast
    if (filterType == 1) {
      // Glow in highlights
      filtered = applyGlow(filtered, glowThreshold * 0.01, glowRadius, strength * 0.01, uv);
      
      // Reduce sharpness
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.3, uv);
      
      // Slight contrast reduction
      filtered = mix(filtered, vec3(lum), strength * 0.01 * 0.1);
      
      // Lift blacks slightly
      filtered = max(filtered, vec3(strength * 0.01 * 0.05));
    }
    
    // 2: Black Mist
    // Strong highlight bloom with dreamy quality
    else if (filterType == 2) {
      // Stronger glow
      filtered = applyGlow(filtered, glowThreshold * 0.01 * 0.8, glowRadius * 1.2, strength * 0.01 * 1.5, uv);
      
      // More sharpness reduction
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.5, uv);
      
      // Contrast reduction
      filtered = mix(filtered, vec3(lum), strength * 0.01 * 0.15);
      
      // Lift blacks
      filtered = max(filtered, vec3(strength * 0.01 * 0.08));
    }
    
    // 3: Heavy Diffusion Filter (HDF)
    // Extreme softening and glow for romantic look
    else if (filterType == 3) {
      // Very strong glow
      filtered = applyGlow(filtered, glowThreshold * 0.01 * 0.6, glowRadius * 1.5, strength * 0.01 * 2.0, uv);
      
      // Heavy sharpness reduction
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.7, uv);
      
      // Significant contrast reduction
      filtered = mix(filtered, vec3(lum), strength * 0.01 * 0.25);
      
      // Lift blacks significantly
      filtered = max(filtered, vec3(strength * 0.01 * 0.12));
      
      // Add slight warm tint
      filtered.r *= 1.0 + strength * 0.01 * 0.05;
      filtered.b *= 1.0 - strength * 0.01 * 0.03;
    }
    
    // 4: Hollywood Black Magic
    // Warm golden glow in highlights, vintage glamour
    else if (filterType == 4) {
      // Warm-tinted glow
      vec3 warmGlow = applyGlow(filtered, glowThreshold * 0.01, glowRadius, strength * 0.01, uv);
      // Add golden tint to glow
      warmGlow.r *= 1.15;
      warmGlow.g *= 1.05;
      warmGlow.b *= 0.85;
      filtered = warmGlow;
      
      // Minimal sharpness reduction
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.2, uv);
      
      // Slight contrast boost (opposite of mist)
      filtered = mix(filtered, vec3(lum), -strength * 0.01 * 0.05);
    }
    
    // 5: Glimmerglass
    // Sparkle and subtle glow, maintains detail
    else if (filterType == 5) {
      // Small radius, high intensity glow
      filtered = applyGlow(filtered, glowThreshold * 0.01 * 1.2, glowRadius * 0.5, strength * 0.01 * 0.8, uv);
      
      // Very minimal sharpness reduction
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.1, uv);
      
      // Add subtle sparkle (enhance highlights)
      float highlightMask = smoothstep(0.7, 1.0, lum);
      filtered += highlightMask * strength * 0.01 * 0.1;
    }
    
    // 6: White Diffusion / Soft FX
    // Overall softening without glow
    else if (filterType == 6) {
      // No glow, just diffusion
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.6, uv);
      
      // Slight contrast reduction
      filtered = mix(filtered, vec3(lum), strength * 0.01 * 0.12);
      
      // Skin smoothing effect (reduce texture in midtones)
      float midtoneMask = 1.0 - abs(lum - 0.5) * 2.0;
      filtered = mix(filtered, vec3(lum), midtoneMask * strength * 0.01 * 0.08);
    }
    
    // 7: Orton Effect
    // Dreamy glow overlay with enhanced colors
    else if (filterType == 7) {
      // Create blurred, saturated version
      vec3 blurred = reduceSharpness(filtered, 0.5, uv);
      vec3 hsl = rgb2hsl(blurred);
      hsl.y *= 1.0 + strength * 0.01 * 0.3; // Boost saturation
      vec3 saturatedBlur = hsl2rgb(hsl);
      
      // Screen blend mode
      vec3 orton = 1.0 - (1.0 - filtered) * (1.0 - saturatedBlur);
      filtered = mix(filtered, orton, strength * 0.01 * 0.5);
    }
    
    // 8: Streak Filter (Anamorphic)
    // Directional light streaks
    else if (filterType == 8) {
      float threshold = glowThreshold * 0.01;
      
      // Removed check for current pixel luminance
      // Streak comes from NEIGHBORS, not self
      
      // Calculate streak direction
      float angleRad = radians(streakAngle);
      vec2 streakDir = vec2(cos(angleRad), sin(angleRad));
      
      // Sample along streak direction
      vec3 streakContribution = vec3(0.0);
      float streakWeight = 0.0;
      float streakLength = glowRadius * 0.0002; // Reduced 5x (0.001 -> 0.0002)
      
      // Dither streak samples to prevent "dotted line" look
      float jitter = (random_static(uv + vec2(0.5, 0.5)) - 0.5) * 1.0;

      // Sample more points for better streak quality
      for (float i = -8.0; i <= 8.0; i += 1.0) {
        if (i == 0.0) continue; // Skip center pixel (avoid self-bloom)
        
        // Apply jitter to step
        vec2 offset = streakDir * (i + jitter) * streakLength;
        vec3 sample = texture2D(u_image, uv + offset).rgb;
        float sampleLum = getLuminance(sample);
        
        // Only bright pixels contribute to streak
        float contribution = smoothstep(threshold, 1.0, sampleLum);
        
        if (contribution > 0.0) {
           // Falloff based on distance
           float dist = abs(i);
           float weight = (1.0 / (dist * 0.5 + 1.0)) * contribution;
           
           streakContribution += sample * weight;
           streakWeight += weight;
        }
      }
      
      if (streakWeight > 0.0) {
        // Additive blending
        // Normalize slightly but allow accumulation for intense streaks
        filtered += streakContribution * strength * 0.01 * 0.4;
      }
      
      // Slight sharpness reduction for anamorphic feel
      filtered = reduceSharpness(filtered, sharpness * 0.01 * 0.2, uv);
    }
      

    
    return clamp(filtered, 0.0, 1.0);
  }

  // ==================== 主函数 ====================

  void main() {
    vec4 texColor = texture2D(u_image, v_texCoord);
    vec3 color = texColor.rgb;

    // === 处理流程 (按需求文档顺序) ===

    // 0. Input Log Transform (相机Log转换 - 最先应用)
    color = applyInputLogTransform(color, u_inputLogProfile);

    // 0.5. Input LUT (如使用LUT方式的IDT)
    if (u_useInputLUT && u_inputLUTSize > 0.0) {
      color = apply3DLUT(color, u_inputLUT, u_inputLUTSize);
    }

    // 1. 曝光
    color = adjustExposure(color, u_exposure);

    // 2. 对比度
    color = adjustContrast(color, u_contrast);

    // 3. 分区域亮度调整
    color = adjustTonalRange(color, u_highlights, u_shadows, u_whites, u_blacks);

    // 4. 色温色调
    color = adjustTemperatureTint(color, u_temperature, u_tint);

    // 5. 饱和度
    color = adjustSaturation(color, u_saturation);

    // 6. 鲜艳度
    color = adjustVibrance(color, u_vibrance);

    // 6.5 光谱控制
    color = applySpectralControls(color, u_spectralVolume, u_spectralLuminance, u_spectralHue);

    // 7. 曲线
    if (u_useCurveLUT) {
      color = applyCurves(color, u_curveLUT);
    }

    // 8. 色轮
    color = applyColorWheels(color, u_shadowLift, u_midtoneGamma, u_highlightGain);

    // 9. 自定义 3D LUT
    if (u_useFilmLUT && u_filmLUTSize > 0.0) {
      vec3 lutColor = apply3DLUT(color, u_filmLUT, u_filmLUTSize);
      color = mix(color, lutColor, u_lutStrength);
    }

    // 10. 胶片模拟
    // 10. 胶片模拟 (Hybrid: Matrix + Algorithmic)
    // First apply 3x3 Matrix if enabled (Channel Crosstalk)
    if (u_useFilmColorMatrix) {
      vec3 matColor = applyFilmColorMatrix(color, u_filmColorMatrix);
      color = mix(color, matColor, u_filmStrength);
    }
    // Then apply algorithmic adjustments (Contrast, Saturation, Tint)
    color = applyFilmEmulation(color, u_filmType, u_filmStrength);

    // 11. S-Curve 色调映射 (胶片响应)
    vec3 toneMapped = applyFilmToneMapping(color, u_filmToe, u_filmShoulder);
    color = mix(color, toneMapped, u_filmStrength);

    // 12. 色彩交叉偏移
    vec3 crossed = applyCrossover(color, u_crossoverShift);
    color = mix(color, crossed, u_filmStrength);

    // 13. Fade 褪色
    color = applyFade(color, u_fade);

    // 14. Bloom 光晕
    color = applyBloom(color, u_bloom, v_texCoord);

    // 15. Diffusion 柔焦
    color = applyDiffusion(color, u_diffusion, v_texCoord);

    // 16. Halation 红色溢出 (专业版 - 用户可调颜色/阈值/半径)
    color = applyProfessionalHalation(color, u_halation, u_halationColor, u_halationThreshold, u_halationRadius, v_texCoord);

    // 17. Vignette 暗角
    color = applyVignette(color, u_vignette, u_vignetteRadius, v_texCoord);

    // 17.5 Acutance (Edge Sharpening)
    color = applyAcutance(color, v_texCoord, u_acutance);

    // 18. 颗粒 (Organic Dye Cloud Simulation - 最后应用)
    color = applyOrganicGrain(color, u_grainAmount, u_grainSize, u_grainRoughness, u_grainChromacity, u_grainHighlights, u_grainShadows, v_texCoord, u_time);

    // 19. Output LUT (ODT / 最终色彩空间转换)
    if (u_useOutputLUT && u_outputLUTSize > 0.0) {
      // 输出转换通常不需要混合强度，直接应用
      color = apply3DLUT(color, u_outputLUT, u_outputLUTSize);
    }

    // 20. Cinematography Filters (applied last for authentic look)
    color = applyCinematographyFilter(
      color,
      u_filterType,
      u_filterStrength,
      u_filterGlowRadius,
      u_filterGlowThreshold,
      u_filterSharpness,
      u_filterStreakAngle,
      v_texCoord
    );

    // 最终 clamp
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), texColor.a);
  }
`;

// ==================== MULTI-PASS SHADERS ====================

// Halation Extraction Shader - 提取高光区域用于模糊
export const halationExtractShaderSource = `
  precision highp float;
  
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_threshold;  // 高光阈值 (0.6-0.9)
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // 提取高光并着色为红色/橙色 (典型halation颜色)
    float mask = smoothstep(u_threshold, u_threshold + 0.2, lum);
    
    // Halation 颜色偏移 - 红色/橙色为主
    vec3 halationColor = vec3(
      color.r * 1.5,
      color.g * 0.7,
      color.b * 0.3
    ) * mask;
    
    gl_FragColor = vec4(halationColor, mask);
  }
`;

// Gaussian Blur Shader - 可分离的高斯模糊 (WebGL 1.0 compatible)
export const gaussianBlurShaderSource = `
  precision highp float;
  
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform vec2 u_direction;  // (1,0) for horizontal, (0,1) for vertical
  uniform vec2 u_resolution; // 图像分辨率
  uniform float u_radius;    // 模糊半径
  
  void main() {
    vec2 texelSize = 1.0 / u_resolution;
    vec2 offset = u_direction * texelSize * u_radius;
    
    // 9-tap Gaussian blur (weights sum to 1.0)
    // Weights: 0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216
    vec4 result = texture2D(u_image, v_texCoord) * 0.227027;
    
    // Sample 1
    result += texture2D(u_image, v_texCoord + offset * 1.0) * 0.1945946;
    result += texture2D(u_image, v_texCoord - offset * 1.0) * 0.1945946;
    
    // Sample 2
    result += texture2D(u_image, v_texCoord + offset * 2.0) * 0.1216216;
    result += texture2D(u_image, v_texCoord - offset * 2.0) * 0.1216216;
    
    // Sample 3
    result += texture2D(u_image, v_texCoord + offset * 3.0) * 0.054054;
    result += texture2D(u_image, v_texCoord - offset * 3.0) * 0.054054;
    
    // Sample 4
    result += texture2D(u_image, v_texCoord + offset * 4.0) * 0.016216;
    result += texture2D(u_image, v_texCoord - offset * 4.0) * 0.016216;
    
    gl_FragColor = result;
  }
`;

// Halation Composite Shader - 将模糊的halation叠加回原图
export const halationCompositeShaderSource = `
  precision highp float;
  
  varying vec2 v_texCoord;
  uniform sampler2D u_original;   // 原始图像
  uniform sampler2D u_halation;   // 模糊后的halation
  uniform float u_intensity;      // halation强度
  
  void main() {
    vec4 original = texture2D(u_original, v_texCoord);
    vec4 halation = texture2D(u_halation, v_texCoord);
    
    // 叠加模式: 屏幕混合 (Screen blend)
    vec3 result = original.rgb + halation.rgb * u_intensity * halation.a;
    
    // 防止过曝
    result = min(result, vec3(1.0));
    
    gl_FragColor = vec4(result, original.a);
  }
`;

// ==================== TEXTURE-BASED GRAIN ====================

// Grain Shader - 使用程序化纹理实现更真实的胶片颗粒
export const grainShaderSource = `
  precision highp float;
  
  varying vec2 v_texCoord;
  uniform sampler2D u_image;
  uniform float u_grainAmount;
  uniform float u_grainSize;
  uniform float u_time;
  uniform vec2 u_resolution;
  
  // 高质量噪声函数 (模拟胶片颗粒的分布特性)
  float filmGrainNoise(vec2 co, float seed) {
    float a = 12.9898;
    float b = 78.233;
    float c = 43758.5453;
    float dt = dot(co.xy, vec2(a, b));
    float sn = mod(dt + seed, 3.14);
    return fract(sin(sn) * c);
  }
  
  // 多层噪声叠加 (模拟真实胶片颗粒的复杂结构)
  float multiLayerGrain(vec2 uv, float time) {
    float grain = 0.0;
    
    // 大颗粒层
    grain += filmGrainNoise(uv * 200.0, time) * 0.5;
    
    // 中颗粒层
    grain += filmGrainNoise(uv * 400.0, time * 1.3) * 0.3;
    
    // 细颗粒层
    grain += filmGrainNoise(uv * 800.0, time * 1.7) * 0.2;
    
    return grain - 0.5; // 中心化到 -0.5 ~ 0.5
  }
  
  void main() {
    vec4 color = texture2D(u_image, v_texCoord);
    
    if (u_grainAmount <= 0.0) {
      gl_FragColor = color;
      return;
    }
    
    // 基于颗粒大小调整采样坐标
    vec2 grainUV = v_texCoord * mix(1.0, 3.0, 1.0 - u_grainSize);
    
    // 生成多层颗粒
    float grain = multiLayerGrain(grainUV, u_time);
    
    // 亮度自适应 - 暗部颗粒更明显 (符合胶片特性)
    float lum = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    float lumFactor = 1.0 - lum * 0.6;
    
    // 颜色颗粒 (每个通道略有不同，模拟银盐分布)
    vec3 colorGrain;
    colorGrain.r = grain;
    colorGrain.g = multiLayerGrain(grainUV + vec2(0.1, 0.0), u_time);
    colorGrain.b = multiLayerGrain(grainUV + vec2(0.0, 0.1), u_time);
    
    // 应用颗粒
    color.rgb += colorGrain * u_grainAmount * 0.15 * lumFactor;
    
    gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), color.a);
  }
`;
