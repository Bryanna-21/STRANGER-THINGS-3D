import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export interface PbrTextureSet {
  map: CanvasTexture;
  bumpMap: CanvasTexture;
  roughnessMap: CanvasTexture;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean
): CanvasTexture {
  const tex = new CanvasTexture(canvas);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  if (isColor) {
    tex.colorSpace = SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createAsphaltTextures(repeatX = 2, repeatY = 24): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const rand = seededRand(101);

  aCtx.fillStyle = '#252830';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#b8b8b8';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 18000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1 + rand() * 3;
    const h = 1 + rand() * 3;
    const shade = 28 + Math.floor(rand() * 34);
    aCtx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
    aCtx.fillRect(x, y, w, h);

    const bVal = 70 + Math.floor(rand() * 120);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(x, y, w, h);

    const rVal = 140 + Math.floor(rand() * 95);
    rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
    rCtx.fillRect(x, y, w, h);
  }

  // Subtle wet tire-track patches with lower roughness
  for (let i = 0; i < 42; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 28 + rand() * 70;
    const grad = rCtx.createRadialGradient(x, y, 4, x, y, rad);
    grad.addColorStop(0, 'rgba(55,55,55,0.45)');
    grad.addColorStop(1, 'rgba(190,190,190,0)');
    rCtx.fillStyle = grad;
    rCtx.beginPath();
    rCtx.arc(x, y, rad, 0, Math.PI * 2);
    rCtx.fill();
  }

  return {
    map: finalizeTexture(albedoC, repeatX, repeatY, true),
    bumpMap: finalizeTexture(bumpC, repeatX, repeatY, false),
    roughnessMap: finalizeTexture(roughC, repeatX, repeatY, false),
  };
}

export function createSidingTextures(repeatX = 2, repeatY = 2): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const rand = seededRand(202);

  aCtx.fillStyle = '#dcdcdc';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#a8a8a8';
  rCtx.fillRect(0, 0, size, size);

  const planks = 32;
  const plankH = size / planks;
  for (let p = 0; p < planks; p++) {
    const y = p * plankH;
    const toneShift = (rand() - 0.5) * 14;
    const v = Math.max(170, Math.min(245, 224 + toneShift));
    aCtx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    aCtx.fillRect(0, y, size, plankH - 3);

    // Shadow groove under each clapboard
    aCtx.fillStyle = 'rgba(20, 22, 28, 0.35)';
    aCtx.fillRect(0, y + plankH - 3, size, 3);

    bCtx.fillStyle = '#d4d4d4';
    bCtx.fillRect(0, y, size, plankH - 4);
    bCtx.fillStyle = '#242424';
    bCtx.fillRect(0, y + plankH - 4, size, 4);

    const rTone = 145 + Math.floor(rand() * 55);
    rCtx.fillStyle = `rgb(${rTone},${rTone},${rTone})`;
    rCtx.fillRect(0, y, size, plankH);
  }

  // Fine wood grain streaks
  for (let i = 0; i < 3200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 16 + rand() * 48;
    aCtx.fillStyle = 'rgba(0,0,0,0.04)';
    aCtx.fillRect(x, y, len, 1.5);
    bCtx.fillStyle = 'rgba(255,255,255,0.06)';
    bCtx.fillRect(x, y, len, 1.5);
  }

  return {
    map: finalizeTexture(albedoC, repeatX, repeatY, true),
    bumpMap: finalizeTexture(bumpC, repeatX, repeatY, false),
    roughnessMap: finalizeTexture(roughC, repeatX, repeatY, false),
  };
}

export function createConcreteTextures(repeatX = 2, repeatY = 2): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const rand = seededRand(303);

  aCtx.fillStyle = '#9aa1ad';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#d0d0d0';
  rCtx.fillRect(0, 0, size, size);

  // Formwork panel seams
  const cols = 4;
  const rows = 8;
  const cw = size / cols;
  const rh = size / rows;
  for (let gx = 0; gx < cols; gx++) {
    for (let gy = 0; gy < rows; gy++) {
      const delta = (rand() - 0.5) * 18;
      const base = Math.max(115, Math.min(185, 152 + delta));
      aCtx.fillStyle = `rgb(${base},${base + 3},${base + 8})`;
      aCtx.fillRect(gx * cw + 2, gy * rh + 2, cw - 4, rh - 4);

      aCtx.strokeStyle = 'rgba(25,28,36,0.45)';
      aCtx.lineWidth = 3;
      aCtx.strokeRect(gx * cw, gy * rh, cw, rh);

      bCtx.strokeStyle = '#2b2b2b';
      bCtx.lineWidth = 4;
      bCtx.strokeRect(gx * cw, gy * rh, cw, rh);
    }
  }

  for (let i = 0; i < 12000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1 + rand() * 2.5;
    const dark = rand() > 0.5;
    aCtx.fillStyle = dark ? 'rgba(20,22,28,0.12)' : 'rgba(255,255,255,0.08)';
    aCtx.fillRect(x, y, r, r);
    bCtx.fillStyle = dark ? 'rgba(40,40,40,0.35)' : 'rgba(220,220,220,0.35)';
    bCtx.fillRect(x, y, r, r);
  }

  return {
    map: finalizeTexture(albedoC, repeatX, repeatY, true),
    bumpMap: finalizeTexture(bumpC, repeatX, repeatY, false),
    roughnessMap: finalizeTexture(roughC, repeatX, repeatY, false),
  };
}

export function createGroundTextures(repeatX = 28, repeatY = 28): PbrTextureSet {
  const size = 1024;
  const [albedoC, aCtx] = makeCanvas(size);
  const [bumpC, bCtx] = makeCanvas(size);
  const [roughC, rCtx] = makeCanvas(size);
  const rand = seededRand(404);

  aCtx.fillStyle = '#4c7a48';
  aCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e2e2e2';
  rCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 24000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const w = 1 + rand() * 4;
    const h = 1 + rand() * 4;
    const g = 95 + Math.floor(rand() * 75);
    const r = Math.floor(g * 0.62);
    const b = Math.floor(g * 0.55);
    aCtx.fillStyle = `rgba(${r},${g},${b},0.45)`;
    aCtx.fillRect(x, y, w, h);

    const bVal = 55 + Math.floor(rand() * 155);
    bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
    bCtx.fillRect(x, y, w, h);

    const rVal = 185 + Math.floor(rand() * 65);
    rCtx.fillStyle = `rgb(${rVal},${rVal},${rVal})`;
    rCtx.fillRect(x, y, w, h);
  }

  return {
    map: finalizeTexture(albedoC, repeatX, repeatY, true),
    bumpMap: finalizeTexture(bumpC, repeatX, repeatY, false),
    roughnessMap: finalizeTexture(roughC, repeatX, repeatY, false),
  };
}

export function disposeTextureSet(set: PbrTextureSet): void {
  set.map.dispose();
  set.bumpMap.dispose();
  set.roughnessMap.dispose();
}
