export type SpectralClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface NebulaBlob {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
}

export interface StarfieldStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  layer: 0 | 1 | 2;
  twinkleOffset: number;
}

const SPECTRAL_COLORS: Record<SpectralClass, string> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffcc6f',
  M: '#ff6b4a',
};

const NEBULA_PALETTES = [
  ['rgba(61, 30, 90, 0.12)', 'rgba(30, 60, 120, 0.10)', 'rgba(90, 40, 100, 0.08)'],
  ['rgba(20, 50, 80, 0.14)', 'rgba(60, 20, 70, 0.10)', 'rgba(30, 80, 100, 0.08)'],
  ['rgba(80, 30, 60, 0.11)', 'rgba(40, 30, 90, 0.09)', 'rgba(20, 60, 70, 0.10)'],
];

function hash(seed: number, n: number): number {
  const x = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function getSpectralClass(systemId: string, seed: number): SpectralClass {
  const idx = parseInt(systemId.replace('s-', ''), 10) || 0;
  const roll = hash(seed, idx * 17 + 3);
  if (roll < 0.02) return 'O';
  if (roll < 0.06) return 'B';
  if (roll < 0.14) return 'A';
  if (roll < 0.28) return 'F';
  if (roll < 0.55) return 'G';
  if (roll < 0.82) return 'K';
  return 'M';
}

export function getStarColor(spectral: SpectralClass): string {
  return SPECTRAL_COLORS[spectral];
}

export function getNebulaPaletteForRegion(seed: number, regionX: number, regionY: number): string[] {
  const idx = Math.abs(Math.floor(Math.sin(seed * 0.17 + regionX * 0.31 + regionY * 0.47) * 43758.5453)) % NEBULA_PALETTES.length;
  return NEBULA_PALETTES[idx];
}

export function generateNebulaBlobs(
  seed: number,
  width: number,
  height: number,
  count = 5,
  regionIndex = 0,
): NebulaBlob[] {
  const palette = NEBULA_PALETTES[regionIndex % NEBULA_PALETTES.length];
  const blobs: NebulaBlob[] = [];

  for (let i = 0; i < count; i++) {
    blobs.push({
      x: hash(seed, i * 3) * width,
      y: hash(seed, i * 3 + 1) * height,
      radius: 120 + hash(seed, i * 3 + 2) * 280,
      color: palette[i % palette.length],
      alpha: 0.6 + hash(seed, i * 7) * 0.4,
    });
  }

  return blobs;
}

export function generateStarfield(
  seed: number,
  width: number,
  height: number,
  count = 400,
): StarfieldStar[] {
  const stars: StarfieldStar[] = [];

  for (let i = 0; i < count; i++) {
    const layer = (i % 3) as 0 | 1 | 2;
    const layerScale = layer === 0 ? 0.5 : layer === 1 ? 0.75 : 1;
    stars.push({
      x: hash(seed, i * 5) * width,
      y: hash(seed, i * 5 + 1) * height,
      size: (0.4 + hash(seed, i * 5 + 2) * 1.6) * layerScale,
      alpha: (0.15 + hash(seed, i * 5 + 3) * 0.55) * layerScale,
      layer,
      twinkleOffset: hash(seed, i * 5 + 4) * Math.PI * 2,
    });
  }

  return stars;
}

export function drawNebulaLayer(
  ctx: CanvasRenderingContext2D,
  blobs: NebulaBlob[],
  time = 0,
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  for (const blob of blobs) {
    const pulse = 1 + Math.sin(time * 0.0003 + blob.x * 0.01) * 0.05;
    const r = blob.radius * pulse;
    const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, r);
    gradient.addColorStop(0, blob.color.replace(/[\d.]+\)$/, `${blob.alpha * 0.8})`));
    gradient.addColorStop(0.4, blob.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawStarfieldLayer(
  ctx: CanvasRenderingContext2D,
  stars: StarfieldStar[],
  time = 0,
  parallax = { x: 0, y: 0 },
): void {
  for (const star of stars) {
    const parallaxFactor = star.layer === 0 ? 0.02 : star.layer === 1 ? 0.05 : 0.1;
    const x = star.x + parallax.x * parallaxFactor;
    const y = star.y + parallax.y * parallaxFactor;
    const twinkle = 0.7 + 0.3 * Math.sin(time * 0.002 + star.twinkleOffset);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawStarGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  intensity = 1,
): void {
  const glowRadius = radius * (3 + intensity);

  // Parse hex color for gradient
  const hex = color.startsWith('#') ? color : '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  grad.addColorStop(0, `rgba(${r},${g},${b},${0.9 * intensity})`);
  grad.addColorStop(0.25, `rgba(${r},${g},${b},${0.35 * intensity})`);
  grad.addColorStop(0.6, `rgba(${r},${g},${b},${0.08 * intensity})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawJumpLane(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  alpha: number,
  glow = false,
): void {
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
  }
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = glow ? 2 : 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function drawFogMask(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
): void {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 2.5);
  gradient.addColorStop(0, 'rgba(4, 6, 12, 0.85)');
  gradient.addColorStop(0.5, 'rgba(4, 6, 12, 0.6)');
  gradient.addColorStop(1, 'rgba(4, 6, 12, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  ctx.fill();
}