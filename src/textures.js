// Tileable greyscale floor patterns, tinted by the floor material's color.
import * as THREE from 'three';

export const PATTERN_SIZE = 1.2; // metres covered by one texture tile

const SIZE = 512;
const cache = new Map();

export function floorTexture(pattern) {
  if (pattern === 'plain') return null;
  if (!cache.has(pattern)) {
    const texture = new THREE.CanvasTexture(pattern === 'tiles' ? tiles() : planks());
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    cache.set(pattern, texture);
  }
  return cache.get(pattern);
}

export function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, SIZE, SIZE);
  return [c, g];
}

// fillRect that wraps around the right edge so the texture tiles seamlessly.
function wrapRect(g, x, y, w, h) {
  g.fillRect(x, y, w, h);
  if (x + w > SIZE) g.fillRect(x - SIZE, y, w, h);
}

// 20 cm wide planks of varying length, staggered row by row.
function planks() {
  const [c, g] = canvas();
  const rnd = seeded(7);
  const rows = 6;
  const rowH = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    let x = rnd() * SIZE;
    let covered = 0;
    while (covered < SIZE) {
      let len = SIZE * (0.55 + rnd() * 0.45);
      if (SIZE - covered - len < SIZE * 0.3) len = SIZE - covered;
      const v = Math.round(255 * (0.92 + rnd() * 0.08));
      g.fillStyle = `rgb(${v},${v},${v})`;
      wrapRect(g, x, y, len, rowH);
      for (let k = 0; k < 6; k++) {
        g.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`;
        wrapRect(g, x, y + 3 + rnd() * (rowH - 6), len, 1);
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      wrapRect(g, x, y, 2, rowH);
      x = (x + len) % SIZE;
      covered += len;
    }
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.fillRect(0, y, SIZE, 2);
  }
  return c;
}

// 60 × 60 cm tiles with grout lines.
function tiles() {
  const [c, g] = canvas();
  const rnd = seeded(3);
  const n = 2;
  const tile = SIZE / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const v = Math.round(255 * (0.93 + rnd() * 0.07));
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.fillRect(i * tile, j * tile, tile, tile);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.22)';
  for (let k = 0; k <= n; k++) {
    g.fillRect(k * tile - 2, 0, 4, SIZE);
    g.fillRect(0, k * tile - 2, SIZE, 4);
  }
  return c;
}
