/** ~app background oklch(0.06 0.03 285) for contrast checks */
const BG_RGB = { r: 15, g: 12, b: 28 };

export type CoverPalette = {
  titleColor: string;
  progressGradient: string;
  trackStyle: {
    backgroundColor: string;
    backgroundImage: string;
    boxShadow?: string;
  };
};

const cache = new Map<string, CoverPalette>();

function rgbCss(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r},${c.g},${c.b})`;
}

function relLum(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastWithBg(r: number, g: number, b: number): number {
  const L1 = relLum(r, g, b);
  const L2 = relLum(BG_RGB.r, BG_RGB.g, BG_RGB.b);
  const hi = Math.max(L1, L2);
  const lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB 0–255 → HSL (H degrees, S/L 0–1) */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function lerpHue(h0: number, h1: number, t: number): number {
  let d = (((h1 - h0) % 360) + 360) % 360;
  if (d > 180) d -= 360;
  let h = h0 + d * t;
  h = ((h % 360) + 360) % 360;
  return h;
}

function hueFromAcc(cosSum: number, sinSum: number, w: number): number | null {
  if (w < 1e-6) return null;
  const ang = Math.atan2(sinSum / w, cosSum / w) * (180 / Math.PI);
  return ang < 0 ? ang + 360 : ang;
}

/**
 * Lenient weight — used only to measure “is this cover mostly grey/black?” (coverage probe).
 */
function chromaticWeight(r: number, g: number, b: number, a: number): number {
  if (a < 40) return 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 40) return 0;
  if (min > 248) return 0;
  const spread = max - min;
  const sat = max < 1e-6 ? 0 : spread / max;
  if (sat < 0.13) return 0;
  if (spread < 18 && sat < 0.22) return 0;
  const lum = relLum(r, g, b);
  if (lum > 0.93) return 0;
  const satBoost = sat * sat;
  const midTone = 1 - Math.min(1, Math.abs(lum - 0.36) * 2.2);
  return satBoost * (a / 255) * (0.28 + 0.72 * midTone);
}

/**
 * Stricter weight for colorful covers — drops greys, near-blacks, and dark muddy browns so
 * progress gradients follow real color, not silhouette noise.
 */
function chromaticWeightVibrant(r: number, g: number, b: number, a: number): number {
  if (a < 40) return 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 48) return 0;
  if (min > 248) return 0;
  const spread = max - min;
  const sat = max < 1e-6 ? 0 : spread / max;
  if (sat < 0.175) return 0;
  if (spread < 24 && sat < 0.32) return 0;
  const lum = relLum(r, g, b);
  if (lum > 0.92) return 0;
  // Dark near-grey / black regions with weak tint
  if (lum < 0.2 && sat < 0.55) return 0;
  if (lum < 0.28 && sat < 0.28) return 0;
  const satBoost = sat * sat;
  const midTone = 1 - Math.min(1, Math.abs(lum - 0.38) * 2.0);
  return satBoost * (a / 255) * (0.22 + 0.78 * midTone);
}

/** True when too few pixels read as chromatic — then we should lean on neutral greys from the art. */
function isPrimarilyAchromaticCover(data: Uint8ClampedArray, w: number, h: number): boolean {
  let opaque = 0;
  let chromatic = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 40) continue;
      opaque++;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (chromaticWeight(r, g, b, a) > 0) chromatic++;
    }
  }
  if (opaque < 20) return true;
  return chromatic / opaque < 0.06;
}

type RgbAcc = { r: number; g: number; b: number; w: number };

function emptyRgbAcc(): RgbAcc {
  return { r: 0, g: 0, b: 0, w: 0 };
}

function addRgb(acc: RgbAcc, r: number, g: number, b: number, wt: number) {
  acc.r += r * wt;
  acc.g += g * wt;
  acc.b += b * wt;
  acc.w += wt;
}

function meanRgb(acc: RgbAcc): { r: number; g: number; b: number } | null {
  if (acc.w < 1e-6) return null;
  return { r: acc.r / acc.w, g: acc.g / acc.w, b: acc.b / acc.w };
}

/** Greyscale / near-monochrome covers: gradient from the actual art (no random theme colors). */
function buildNeutralPaletteFromCover(data: Uint8ClampedArray, w: number, h: number): CoverPalette | null {
  const global = emptyRgbAcc();
  const left = emptyRgbAcc();
  const center = emptyRgbAcc();
  const right = emptyRgbAcc();
  const xThird = w / 3;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 40) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const wt = a / 255;
      addRgb(global, r, g, b, wt);
      if (x < xThird) addRgb(left, r, g, b, wt);
      else if (x < 2 * xThird) addRgb(center, r, g, b, wt);
      else addRgb(right, r, g, b, wt);
    }
  }
  const gMean = meanRgb(global);
  const lMean = meanRgb(left);
  const rMean = meanRgb(right);
  if (!gMean || !lMean || !rMean) return null;

  const hl = rgbToHsl(lMean.r, lMean.g, lMean.b);
  const hm = rgbToHsl(gMean.r, gMean.g, gMean.b);
  const hr = rgbToHsl(rMean.r, rMean.g, rMean.b);
  const sAvg = (hl.s + hm.s + hr.s) / 3;
  let hLeft = hl.h;
  let hMid = lerpHue(hl.h, hr.h, 0.5);
  let hRight = hr.h;
  let satBase = Math.min(0.42, Math.max(0.1, sAvg * 2.2 + 0.1));
  if (sAvg < 0.055) {
    hLeft = lerpHue(265, hMid, 0.15);
    hMid = 265;
    hRight = lerpHue(255, hMid, 0.12);
    satBase = 0.14;
  }

  const leftStop = hslToRgb(hLeft, Math.min(0.55, satBase * 1.1), 0.73);
  const midStop = hslToRgb(hMid, Math.min(0.5, satBase * 1.05), 0.48);
  const rightStop = hslToRgb(hRight, Math.min(0.48, satBase * 0.95), 0.31);

  const progressGradient = `linear-gradient(90deg, ${rgbCss(leftStop)} 0%, ${rgbCss(midStop)} 45%, ${rgbCss(rightStop)} 100%)`;
  const titleSrc = titleColorForDarkUi(gMean.r, gMean.g, gMean.b);
  return {
    titleColor: rgbCss(titleSrc),
    progressGradient,
    trackStyle: trackStyleFromHsl(hMid, satBase, 0.16),
  };
}

type ChromaticAcc = {
  cosH: number;
  sinH: number;
  sumS: number;
  sumL: number;
  sumR: number;
  sumG: number;
  sumB: number;
  w: number;
};

function emptyAcc(): ChromaticAcc {
  return { cosH: 0, sinH: 0, sumS: 0, sumL: 0, sumR: 0, sumG: 0, sumB: 0, w: 0 };
}

function addChromatic(acc: ChromaticAcc, r: number, g: number, b: number, wt: number) {
  const { h, s, l } = rgbToHsl(r, g, b);
  const rad = (h * Math.PI) / 180;
  acc.cosH += Math.cos(rad) * wt;
  acc.sinH += Math.sin(rad) * wt;
  acc.sumS += s * wt;
  acc.sumL += l * wt;
  acc.sumR += r * wt;
  acc.sumG += g * wt;
  acc.sumB += b * wt;
  acc.w += wt;
}

function accHueSL(acc: ChromaticAcc): { h: number; s: number; l: number } | null {
  const h = hueFromAcc(acc.cosH, acc.sinH, acc.w);
  if (h == null || acc.w < 1e-6) return null;
  return { h, s: acc.sumS / acc.w, l: acc.sumL / acc.w };
}

function accRgb(acc: ChromaticAcc): { r: number; g: number; b: number } | null {
  if (acc.w < 1e-6) return null;
  return { r: acc.sumR / acc.w, g: acc.sumG / acc.w, b: acc.sumB / acc.w };
}

function scanChromaticRegions(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  minSat: number,
  weightFn: (r: number, g: number, b: number, a: number) => number
): { global: ChromaticAcc; left: ChromaticAcc; center: ChromaticAcc; right: ChromaticAcc } {
  const global = emptyAcc();
  const left = emptyAcc();
  const center = emptyAcc();
  const right = emptyAcc();
  const xThird = w / 3;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let wt = weightFn(r, g, b, a);
      if (wt <= 0) continue;
      const { s } = rgbToHsl(r, g, b);
      if (s < minSat) continue;
      addChromatic(global, r, g, b, wt);
      if (x < xThird) addChromatic(left, r, g, b, wt);
      else if (x < 2 * xThird) addChromatic(center, r, g, b, wt);
      else addChromatic(right, r, g, b, wt);
    }
  }
  return { global, left, center, right };
}

function titleColorForDarkUi(r: number, g: number, b: number): { r: number; g: number; b: number } {
  let rr = r;
  let gg = g;
  let bb = b;
  const target = 4.35;
  for (let step = 0; step < 28 && contrastWithBg(rr, gg, bb) < target; step++) {
    const t = 0.11;
    rr = rr + (255 - rr) * t;
    gg = gg + (255 - gg) * t;
    bb = bb + (255 - bb) * t;
  }
  const keep = 0.2;
  rr = Math.round(rr * (1 - keep) + r * keep);
  gg = Math.round(gg * (1 - keep) + g * keep);
  bb = Math.round(bb * (1 - keep) + b * keep);
  return { r: rr, g: gg, b: bb };
}

function trackStyleFromHsl(h: number, s: number, l: number): CoverPalette['trackStyle'] {
  const base = hslToRgb(h, Math.min(1, s * 0.75), Math.max(0.12, Math.min(0.22, l)));
  return {
    backgroundColor: `rgba(${base.r},${base.g},${base.b},0.22)`,
    backgroundImage:
      'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.28) 100%)',
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.06)`,
  };
}

/**
 * Build Spotify-like gradient: only chromatic pixels, spatial left/right hues blended,
 * dark end stays saturated (no crushing to black).
 */
function buildVibrantPalette(
  global: ChromaticAcc,
  left: ChromaticAcc,
  center: ChromaticAcc,
  right: ChromaticAcc
): CoverPalette | null {
  const gRgb = accRgb(global);
  const gHsl = accHueSL(global);
  if (!gRgb || !gHsl) return null;

  const lH = accHueSL(left) ?? gHsl;
  const cH = accHueSL(center) ?? gHsl;
  const rH = accHueSL(right) ?? gHsl;

  const sLeft = Math.min(1, Math.max(0.5, (lH.s + gHsl.s) / 2 * 1.2));
  const sRight = Math.min(1, Math.max(0.5, (rH.s + gHsl.s) / 2 * 1.2));
  const sMid = Math.min(
    1,
    Math.max(0.5, (cH.s + gHsl.s + (lH.s + rH.s) / 2) / 3 * 1.12)
  );

  const hLeft = lH.h;
  const hRight = rH.h;
  const hMid = lerpHue(hLeft, hRight, 0.5);

  const leftStop = hslToRgb(hLeft, sLeft, 0.74);
  const midStop = hslToRgb(hMid, sMid, 0.5);
  let rightStop = hslToRgb(hRight, sRight, 0.34);

  if (relLum(rightStop.r, rightStop.g, rightStop.b) < relLum(leftStop.r, leftStop.g, leftStop.b)) {
    rightStop = hslToRgb(hRight, Math.min(1, sRight * 1.08), 0.4);
  }

  if (relLum(rightStop.r, rightStop.g, rightStop.b) < 0.08) {
    rightStop = hslToRgb(hRight, sRight, 0.38);
  }

  const progressGradient = `linear-gradient(90deg, ${rgbCss(leftStop)} 0%, ${rgbCss(midStop)} 45%, ${rgbCss(rightStop)} 100%)`;

  const titleSrc = titleColorForDarkUi(gRgb.r, gRgb.g, gRgb.b);

  return {
    titleColor: rgbCss(titleSrc),
    progressGradient,
    trackStyle: trackStyleFromHsl(hMid, sMid, gHsl.l * 0.35 + 0.12),
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Fallback when we cannot read pixels — still chromatic HSL, not black crush */
export function fallbackCoverPalette(primary: string, secondary: string): CoverPalette {
  const p = hexToRgb(primary) ?? { r: 99, g: 102, b: 241 };
  const s = hexToRgb(secondary) ?? { r: 16, g: 185, b: 129 };
  const hl = rgbToHsl(p.r, p.g, p.b);
  const hr = rgbToHsl(s.r, s.g, s.b);
  const hMid = lerpHue(hl.h, hr.h, 0.5);
  const sL = Math.min(1, Math.max(0.55, (hl.s + hr.s) / 2 * 1.1));
  const leftStop = hslToRgb(hl.h, Math.min(1, hl.s * 1.1 + 0.1), 0.72);
  const midStop = hslToRgb(hMid, sL, 0.48);
  const rightStop = hslToRgb(hr.h, Math.min(1, hr.s * 1.1 + 0.08), 0.34);
  const vibrantRgb = {
    r: (p.r + s.r) / 2,
    g: (p.g + s.g) / 2,
    b: (p.b + s.b) / 2,
  };
  const titleSrc = titleColorForDarkUi(vibrantRgb.r, vibrantRgb.g, vibrantRgb.b);
  return {
    titleColor: rgbCss(titleSrc),
    progressGradient: `linear-gradient(90deg, ${rgbCss(leftStop)} 0%, ${rgbCss(midStop)} 45%, ${rgbCss(rightStop)} 100%)`,
    trackStyle: trackStyleFromHsl(hMid, sL, 0.18),
  };
}

export function getCoverPalette(coverUrl: string): Promise<CoverPalette | null> {
  if (!coverUrl.trim()) return Promise.resolve(null);
  const hit = cache.get(coverUrl);
  if (hit) return Promise.resolve(hit);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (value: CoverPalette | null) => {
      if (value) cache.set(coverUrl, value);
      resolve(value);
    };

    const t = window.setTimeout(() => done(null), 12_000);

    img.onload = () => {
      window.clearTimeout(t);
      try {
        const w = 112;
        const h = 112;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return done(null);

        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        if (isPrimarilyAchromaticCover(data, w, h)) {
          const neutral = buildNeutralPaletteFromCover(data, w, h);
          done(neutral);
          return;
        }

        let palette: CoverPalette | null = null;
        let minSat = 0.15;
        let regions = scanChromaticRegions(data, w, h, minSat, chromaticWeightVibrant);
        palette = buildVibrantPalette(regions.global, regions.left, regions.center, regions.right);
        if (!palette || regions.global.w < 90) {
          minSat = 0.12;
          regions = scanChromaticRegions(data, w, h, minSat, chromaticWeightVibrant);
          palette = buildVibrantPalette(regions.global, regions.left, regions.center, regions.right);
        }
        if (!palette || regions.global.w < 55) {
          minSat = 0.1;
          regions = scanChromaticRegions(data, w, h, minSat, chromaticWeightVibrant);
          palette = buildVibrantPalette(regions.global, regions.left, regions.center, regions.right);
        }
        if (!palette || regions.global.w < 40) {
          minSat = 0.12;
          regions = scanChromaticRegions(data, w, h, minSat, chromaticWeight);
          palette = buildVibrantPalette(regions.global, regions.left, regions.center, regions.right);
        }
        if (!palette) {
          palette = buildNeutralPaletteFromCover(data, w, h);
        }
        done(palette);
      } catch {
        done(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(t);
      done(null);
    };

    img.src = coverUrl;
  });
}
