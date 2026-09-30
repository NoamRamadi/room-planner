// Furniture catalog: default sizes, color palettes and the procedural 3D models.
// Item sizes are stored in centimetres; the model builders work in metres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { seeded } from './textures.js';

export const FLOOR_PATTERNS = [
  { id: 'planks', label: 'Planks' },
  { id: 'tiles', label: 'Tiles' },
  { id: 'plain', label: 'Plain' },
];

export const FLOOR_FINISHES = [
  { name: 'Natural oak', hex: '#c09a6b' },
  { name: 'Whitewashed ash', hex: '#e2d8c8' },
  { name: 'Walnut', hex: '#6a4a35' },
  { name: 'Grey concrete', hex: '#a3a4a0' },
  { name: 'Black slate', hex: '#45484c' },
  { name: 'Terracotta', hex: '#b86b4b' },
];

export const WALL_PAINTS = [
  { name: 'Chalk white', hex: '#f1f0ea' },
  { name: 'Mist grey', hex: '#d3d6d6' },
  { name: 'Pale sage', hex: '#c9d1bf' },
  { name: 'Sand', hex: '#dccdb6' },
  { name: 'Dusty blue', hex: '#b7c4cf' },
  { name: 'Charcoal', hex: '#4b4e53' },
];

const FABRICS = [
  { name: 'Oatmeal', hex: '#d6cab5' },
  { name: 'Slate', hex: '#5d6673' },
  { name: 'Moss', hex: '#6c7657' },
  { name: 'Rust', hex: '#a4573a' },
  { name: 'Navy', hex: '#2f3c56' },
  { name: 'Blush', hex: '#d8aaa0' },
  { name: 'Mustard', hex: '#c69a33' },
  { name: 'Charcoal', hex: '#3b3e43' },
  { name: 'Cognac leather', hex: '#7a4630' },
];

const WOODS = [
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Ash', hex: '#d8c9ad' },
  { name: 'Teak', hex: '#8b5b37' },
  { name: 'Walnut', hex: '#5d4030' },
  { name: 'White lacquer', hex: '#ecebe6' },
  { name: 'Black', hex: '#2c2d30' },
];

const TRIMS = [
  { name: 'Black steel', hex: '#26272a' },
  { name: 'Brushed steel', hex: '#a9abad' },
  { name: 'Brass', hex: '#b8924a' },
  { name: 'White', hex: '#ecebe6' },
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Walnut', hex: '#5d4030' },
];

const RUG_COLORS = [
  { name: 'Ivory', hex: '#ece6d8' },
  { name: 'Sand', hex: '#d6c3a1' },
  { name: 'Terracotta', hex: '#b8674a' },
  { name: 'Burgundy', hex: '#6e2a2e' },
  { name: 'Navy', hex: '#2c3a57' },
  { name: 'Teal', hex: '#2f5d62' },
  { name: 'Sage', hex: '#9aa88a' },
  { name: 'Mustard', hex: '#c99a3a' },
  { name: 'Blush', hex: '#d9aaa0' },
  { name: 'Charcoal', hex: '#3a3c40' },
];

const RUG_SIZES = [
  { name: 'Small', w: 120, d: 170 },
  { name: 'Medium', w: 160, d: 230 },
  { name: 'Large', w: 200, d: 300 },
  { name: 'Runner', w: 80, d: 250 },
];

const TV_FINISHES = [
  { name: 'Black', hex: '#1d1e21' },
  { name: 'Graphite', hex: '#4a4c50' },
  { name: 'Silver', hex: '#b9bbbe' },
  { name: 'White', hex: '#ecebe6' },
];


const TV_FOOT_H = 8; // centre stand height, cm
const TV_FOOT_D = 24; // centre stand depth, cm

export function tvScreen(inches) {
  const diagonal = inches * 2.54;
  const k = Math.hypot(16, 9);
  return { w: (diagonal * 16) / k, h: (diagonal * 9) / k };
}

const TV_SIZES = [
  { name: '43″', inches: 43 },
  { name: '55″', inches: 55 },
  { name: '65″', inches: 65 },
  { name: '75″', inches: 75 },
  { name: '85″', inches: 85 },
];

// Each type comes in several designs (`styles`). A design can bring its own starting size and colors
// (`defaults`), size limits and size presets; `name` is what a new piece of that design is called.
// `surface`: other items can stand on it. `stackable`: rests on a surface when placed over one.
export const CATALOG = {
  sofa: {
    label: 'Sofa',
    defaults: { style: 'classic', w: 220, d: 95, h: 85, color: '#5d6673', color2: '#5d6673', flip: false },
    limits: { w: [70, 400], d: [60, 200], h: [50, 120] },
    colors: [
      { key: 'color', label: 'Fabric', palette: FABRICS },
      { key: 'color2', label: 'Cushions', palette: FABRICS },
    ],
    styles: [
      {
        id: 'classic',
        label: 'Classic',
        name: 'Sofa',
        presets: [
          { name: 'Armchair', w: 90, d: 85, h: 85 },
          { name: '2-seat', w: 170, d: 90, h: 85 },
          { name: '3-seat', w: 220, d: 95, h: 85 },
          { name: '4-seat', w: 280, d: 100, h: 85 },
        ],
      },
      {
        id: 'corner',
        label: 'Corner',
        name: 'Corner sofa',
        defaults: { w: 270, d: 170, h: 85 },
        limits: { w: [180, 400], d: [130, 300] },
        presets: [
          { name: 'Small', w: 230, d: 150, h: 85 },
          { name: 'Medium', w: 270, d: 170, h: 85 },
          { name: 'Large', w: 310, d: 200, h: 85 },
        ],
      },
      {
        id: 'armless',
        label: 'Armless',
        name: 'Armless sofa',
        defaults: { w: 200, d: 95, h: 78, color: '#d6cab5', color2: '#d6cab5' },
        presets: [
          { name: '2-seat', w: 150, d: 90, h: 78 },
          { name: '3-seat', w: 200, d: 95, h: 78 },
          { name: '4-seat', w: 250, d: 95, h: 78 },
        ],
      },
      {
        id: 'chesterfield',
        label: 'Chesterfield',
        name: 'Chesterfield',
        defaults: { w: 210, d: 95, h: 78, color: '#7a4630', color2: '#7a4630' },
        presets: [
          { name: 'Armchair', w: 110, d: 90, h: 78 },
          { name: '2-seat', w: 180, d: 95, h: 78 },
          { name: '3-seat', w: 230, d: 95, h: 78 },
        ],
      },
    ],
    build: buildSofa,
  },
  table: {
    label: 'Table',
    defaults: { style: 'rect', w: 110, d: 60, h: 45, color: '#ecebe6', color2: '#26272a' },
    limits: { w: [30, 400], d: [30, 200], h: [25, 110] },
    colors: [
      { key: 'color', label: 'Top', palette: WOODS },
      { key: 'color2', label: 'Legs', palette: TRIMS },
    ],
    styles: [
      {
        id: 'rect',
        label: 'Rectangular',
        name: 'Table',
        presets: [
          { name: 'Coffee', w: 110, d: 60, h: 45 },
          { name: 'Side', w: 50, d: 50, h: 55 },
          { name: 'Dining', w: 160, d: 90, h: 75 },
          { name: 'Desk', w: 140, d: 70, h: 75 },
        ],
      },
      {
        id: 'round',
        label: 'Round',
        name: 'Round table',
        round: true, // as deep as it is wide: one size, the diameter
        defaults: { w: 80, d: 80, h: 45, color: '#b88f5d' },
        limits: { w: [30, 200] },
        presets: [
          { name: 'Coffee', w: 80, d: 80, h: 45 },
          { name: 'Side', w: 50, d: 50, h: 55 },
          { name: 'Bistro', w: 70, d: 70, h: 75 },
          { name: 'Dining', w: 120, d: 120, h: 75 },
        ],
      },
      {
        id: 'oval',
        label: 'Oval',
        name: 'Oval table',
        defaults: { w: 120, d: 65, h: 45, color: '#5d4030' },
        presets: [
          { name: 'Coffee', w: 120, d: 65, h: 45 },
          { name: 'Dining', w: 180, d: 100, h: 75 },
          { name: 'Large dining', w: 220, d: 110, h: 75 },
        ],
      },
      {
        id: 'slab',
        label: 'Slab legs',
        name: 'Slab table',
        defaults: { w: 120, d: 60, h: 40, color: '#b88f5d', color2: '#b88f5d' },
        presets: [
          { name: 'Coffee', w: 120, d: 60, h: 40 },
          { name: 'Console', w: 140, d: 35, h: 80 },
          { name: 'Dining', w: 200, d: 95, h: 75 },
        ],
      },
    ],
    surface: true,
    build: buildTable,
  },
  tvstand: {
    label: 'TV stand',
    defaults: { style: 'cabinet', w: 180, d: 40, h: 50, color: '#5d4030', color2: '#26272a' },
    limits: { w: [60, 400], d: [25, 80], h: [20, 120] },
    colors: [
      { key: 'color', label: 'Body', palette: WOODS },
      { key: 'color2', label: 'Legs and handles', palette: TRIMS },
    ],
    styles: [
      {
        id: 'cabinet',
        label: 'Cabinet',
        name: 'TV stand',
        presets: [
          { name: 'Compact', w: 120, d: 40, h: 50 },
          { name: 'Standard', w: 180, d: 40, h: 50 },
          { name: 'Wide', w: 240, d: 45, h: 45 },
        ],
      },
      {
        id: 'open',
        label: 'Open shelves',
        name: 'Open TV stand',
        defaults: { w: 160, d: 40, h: 45, color: '#b88f5d', color2: '#26272a' },
        presets: [
          { name: 'Compact', w: 120, d: 40, h: 45 },
          { name: 'Standard', w: 160, d: 40, h: 45 },
          { name: 'Wide', w: 200, d: 40, h: 45 },
        ],
      },
      {
        id: 'floating',
        label: 'Floating',
        name: 'Floating TV stand',
        defaults: { w: 160, d: 35, h: 55, color: '#ecebe6' },
        limits: { h: [30, 150] },
        presets: [
          { name: 'Compact', w: 120, d: 35, h: 55 },
          { name: 'Standard', w: 160, d: 35, h: 55 },
          { name: 'Wide', w: 220, d: 35, h: 55 },
        ],
      },
      {
        id: 'sideboard',
        label: 'Sideboard',
        name: 'Sideboard',
        defaults: { w: 160, d: 45, h: 65, color: '#8b5b37', color2: '#b8924a' },
        presets: [
          { name: 'Compact', w: 120, d: 45, h: 65 },
          { name: 'Standard', w: 160, d: 45, h: 65 },
          { name: 'Wide', w: 200, d: 45, h: 65 },
        ],
      },
    ],
    surface: true,
    build: buildTvStand,
  },
  tv: {
    label: 'TV',
    defaults: { style: 'pedestal', inches: 55, color: '#1d1e21', mount: 90 },
    limits: { inches: [24, 100], mount: [20, 250] },
    colors: [{ key: 'color', label: 'Frame', palette: TV_FINISHES }],
    styles: [
      { id: 'pedestal', label: 'Centre stand', name: 'TV' },
      { id: 'feet', label: 'Feet', name: 'TV' },
      { id: 'wall', label: 'Wall-mounted', name: 'Wall TV', onWall: true },
      { id: 'curved', label: 'Curved', name: 'Curved TV' },
    ],
    presets: TV_SIZES,
    stackable: true,
    build: buildTv,
  },
  rug: {
    label: 'Carpet',
    defaults: { style: 'bordered', w: 160, d: 230, h: 1, color: '#d6c3a1', color2: '#3a3c40' },
    limits: { w: [40, 600], d: [40, 600], h: [1, 5] },
    colors: [
      { key: 'color', label: 'Main', palette: RUG_COLORS },
      { key: 'color2', label: 'Pattern', palette: RUG_COLORS },
    ],
    styles: [
      { id: 'bordered', label: 'Bordered', name: 'Carpet' },
      {
        id: 'round',
        label: 'Round',
        name: 'Round carpet',
        round: true,
        defaults: { w: 160, d: 160, color: '#9aa88a', color2: '#ece6d8' },
        presets: [
          { name: 'Ø 120', w: 120, d: 120 },
          { name: 'Ø 160', w: 160, d: 160 },
          { name: 'Ø 200', w: 200, d: 200 },
          { name: 'Ø 250', w: 250, d: 250 },
        ],
      },
      { id: 'striped', label: 'Striped', name: 'Striped carpet', defaults: { color: '#ece6d8', color2: '#2c3a57' } },
      { id: 'classic', label: 'Classic', name: 'Classic carpet', defaults: { color: '#6e2a2e', color2: '#2c3a57' } },
      { id: 'geometric', label: 'Geometric', name: 'Geometric carpet', defaults: { color: '#ece6d8', color2: '#3a3c40' } },
      { id: 'shaggy', label: 'Shaggy', name: 'Shaggy carpet', defaults: { h: 3, color: '#d9d4c8', color2: '#b5ad9c' } },
    ],
    presets: RUG_SIZES,
    flat: true, // lies on the floor: furniture stands on it, and it never gets in anything's way
    build: buildRug,
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const styleOf = (item) => CATALOG[item.type].styles.find((s) => s.id === item.style) ?? CATALOG[item.type].styles[0];
export const limitsOf = (item) => ({ ...CATALOG[item.type].limits, ...styleOf(item).limits });
export const presetsOf = (item) => styleOf(item).presets ?? CATALOG[item.type].presets;
// Hangs on a wall (a wall-mounted TV) rather than standing on the floor or on furniture.
export const isOnWall = (item) => Boolean(styleOf(item).onWall);
export const isStackable = (item) => Boolean(CATALOG[item.type].stackable) && !isOnWall(item);
export const isFlat = (item) => Boolean(CATALOG[item.type].flat);

// A new piece of the given design.
export function newItemOf(type, styleId) {
  const def = CATALOG[type];
  const style = def.styles.find((s) => s.id === styleId) ?? def.styles[0];
  return { ...def.defaults, ...style.defaults, style: style.id, name: style.name };
}

// Keep sizes valid for the item's design: within its limits, and round tables as deep as they are wide.
export function normalizeItem(item) {
  const next = { ...item };
  for (const [key, [lo, hi]] of Object.entries(limitsOf(item))) {
    if (typeof next[key] === 'number') next[key] = clamp(next[key], lo, hi);
  }
  if (styleOf(next).round) next.d = next.w;
  return next;
}

// Outer size of an item in cm: w along its local X, d along local Z (front faces +Z), h up.
export function dimsOf(item) {
  if (item.type === 'tv') {
    const screen = tvScreen(item.inches);
    if (item.style === 'wall') return { w: screen.w, d: 5, h: screen.h };
    if (item.style === 'feet') return { w: screen.w, d: 22, h: screen.h + 6 };
    return { w: screen.w, d: TV_FOOT_D, h: screen.h + TV_FOOT_H };
  }
  return { w: item.w, d: item.d, h: item.h };
}

export function buildItem(item) {
  const { w, d, h } = dimsOf(item);
  const group = CATALOG[item.type].build({ w: w / 100, d: d / 100, h: h / 100 }, item);
  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = !isFlat(item); // a carpet is too thin to cast a shadow worth drawing
      o.receiveShadow = true;
    }
  });
  return group;
}

const fabric = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.92 });
const leather = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.5 });
const wood = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55 });
const trim = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.45, metalness: 0.25 });
const shade = (hex, k) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(k), roughness: 0.8 });

// Box whose bottom-centre sits at (x, y, z), optionally with rounded edges of radius r.
function block(w, h, d, material, { x = 0, y = 0, z = 0, r = 0 } = {}) {
  const radius = Math.min(r, w / 2, h / 2, d / 2) - 0.001;
  const geometry = radius > 0.002 ? new RoundedBoxGeometry(w, h, d, 3, radius) : new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

// Upright cylinder whose bottom sits at (x, y, z).
function post(rTop, rBottom, h, material, x, z, y = 0, segments = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

const leg = (rTop, rBottom, h, material, x, z) => post(rTop, rBottom, h, material, x, z, 0, 14);

const CORNERS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

// ---- Sofas ----

function buildSofa(dims, item) {
  if (item.style === 'corner') {
    const g = cornerSofa(dims, item);
    if (item.flip) g.scale.x = -1; // chaise on the left
    return g;
  }
  if (item.style === 'chesterfield') return chesterfield(dims, item);
  return classicSofa(dims, item, { arms: item.style !== 'armless' });
}

// Seat and back cushions across a stretch of seat from x0 to x1.
function cushions(g, soft, { x0, x1, z0, seatD, baseTop, cushionT, seatH, backH, backD, back = true }) {
  const width = x1 - x0;
  const count = width > 1.5 ? 3 : width > 0.95 ? 2 : 1;
  const gap = 0.012;
  const cw = (width - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    const x = x0 + cw / 2 + i * (cw + gap);
    g.add(block(cw, cushionT, seatD, soft, { x, y: baseTop, z: z0 + seatD / 2, r: 0.035 }));
    if (back) {
      const b = block(cw, backH, backD, soft, { x, y: seatH - 0.01, z: z0 + backD / 2, r: 0.04 });
      b.rotation.x = -0.1; // lean back slightly
      g.add(b);
    }
  }
}

function classicSofa({ w, d, h }, item, { arms }) {
  const g = new THREE.Group();
  const body = fabric(item.color);
  const soft = fabric(item.color2);
  const legs = trim('#2b2724');

  const legH = 0.07;
  const armW = arms ? clamp(w * 0.09, 0.1, 0.2) : 0;
  const backD = clamp(d * 0.2, 0.12, 0.22);
  const seatH = clamp(h * 0.52, 0.3, 0.48);
  const cushionT = clamp((seatH - legH) * 0.4, 0.06, 0.14);
  const baseTop = seatH - cushionT;
  const armH = Math.min(h - 0.02, seatH + 0.2);
  const innerW = Math.max(0.2, w - 2 * armW);

  g.add(block(w, baseTop - legH, d, body, { y: legH, r: 0.02 }));
  g.add(block(innerW + (arms ? 0.02 : 0), h - baseTop, backD, body, { y: baseTop, z: -d / 2 + backD / 2, r: 0.03 }));
  if (arms) {
    for (const side of [-1, 1]) g.add(block(armW, armH - legH, d, body, { x: side * (w / 2 - armW / 2), y: legH, r: 0.035 }));
  }
  cushions(g, soft, {
    x0: -innerW / 2,
    x1: innerW / 2,
    z0: -d / 2 + backD,
    seatD: d - backD - 0.015,
    baseTop,
    cushionT,
    seatH,
    backH: Math.max(0.1, (h - seatH) * 0.88),
    backD: clamp(d * 0.16, 0.1, 0.18),
  });
  for (const [sx, sz] of CORNERS) g.add(leg(0.018, 0.014, legH, legs, sx * (w / 2 - 0.06), sz * (d / 2 - 0.06)));
  return g;
}

// L-shaped: a sofa along the back with a chaise running forward on the right.
function cornerSofa({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = fabric(item.color);
  const soft = fabric(item.color2);
  const legs = trim('#2b2724');

  const legH = 0.07;
  const armW = clamp(w * 0.05, 0.1, 0.16);
  const backD = 0.2;
  const seatH = clamp(h * 0.52, 0.3, 0.48);
  const cushionT = clamp((seatH - legH) * 0.4, 0.06, 0.14);
  const baseTop = seatH - cushionT;
  const armH = Math.min(h - 0.02, seatH + 0.2);
  const mainD = Math.min(0.95, d - 0.35); // depth of the part along the back
  const chaiseW = clamp(w * 0.35, 0.75, Math.max(0.75, w - armW - 0.6)); // chaise width, arm included
  const z0 = -d / 2;

  g.add(block(w, baseTop - legH, mainD, body, { y: legH, z: z0 + mainD / 2, r: 0.02 }));
  g.add(block(chaiseW, baseTop - legH, d - mainD + 0.02, body, { x: w / 2 - chaiseW / 2, y: legH, z: z0 + mainD + (d - mainD) / 2 - 0.01, r: 0.02 }));
  g.add(block(w - 2 * armW + 0.02, h - baseTop, backD, body, { y: baseTop, z: z0 + backD / 2, r: 0.03 }));
  g.add(block(armW, armH - legH, mainD, body, { x: -w / 2 + armW / 2, y: legH, z: z0 + mainD / 2, r: 0.035 }));
  g.add(block(armW, armH - legH, d, body, { x: w / 2 - armW / 2, y: legH, r: 0.035 }));

  const common = { baseTop, cushionT, seatH, backH: Math.max(0.1, (h - seatH) * 0.88), backD: clamp(mainD * 0.16, 0.1, 0.18) };
  const split = w / 2 - chaiseW; // where the main seat ends and the chaise begins
  cushions(g, soft, { ...common, x0: -w / 2 + armW, x1: split - 0.006, z0: z0 + backD, seatD: mainD - backD - 0.015 });
  cushions(g, soft, { ...common, x0: split + 0.006, x1: w / 2 - armW, z0: z0 + backD, seatD: d - backD - 0.015 });

  const feet = [
    [-w / 2 + 0.06, z0 + 0.06],
    [-w / 2 + 0.06, z0 + mainD - 0.06],
    [w / 2 - 0.06, z0 + 0.06],
    [w / 2 - 0.06, d / 2 - 0.06],
    [split + 0.06, d / 2 - 0.06],
  ];
  for (const [x, z] of feet) g.add(leg(0.018, 0.014, legH, legs, x, z));
  return g;
}

// Rolled arms as high as the back, buttoned back, bun feet, a leather look.
function chesterfield({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = leather(item.color);
  const soft = leather(item.color2);
  const button = shade(item.color, 0.55);
  const feet = wood('#3a2a20');

  const legH = 0.06;
  const armW = clamp(w * 0.1, 0.14, 0.2);
  const backD = clamp(d * 0.2, 0.16, 0.22);
  const roll = armW * 0.55; // radius of the rolled top
  const seatH = clamp(h * 0.55, 0.34, 0.46);
  const cushionT = 0.1;
  const baseTop = seatH - cushionT;
  const innerW = w - 2 * armW;
  const topY = h - roll;

  g.add(block(innerW + 0.02, baseTop - legH, d - backD, body, { y: legH, z: -d / 2 + backD + (d - backD) / 2, r: 0.02 }));
  g.add(block(w, topY - legH, backD, body, { y: legH, z: -d / 2 + backD / 2, r: 0.02 }));
  const backRoll = new THREE.Mesh(new THREE.CylinderGeometry(backD / 2, backD / 2, w, 24), body);
  backRoll.rotation.z = Math.PI / 2;
  backRoll.position.set(0, topY, -d / 2 + backD / 2);
  g.add(backRoll);
  for (const side of [-1, 1]) {
    const x = side * (w / 2 - armW / 2);
    g.add(block(armW, topY - legH, d - backD, body, { x, y: legH, z: -d / 2 + backD + (d - backD) / 2, r: 0.02 }));
    const armRoll = new THREE.Mesh(new THREE.CylinderGeometry(roll, roll, d - backD / 2, 24), body);
    armRoll.rotation.x = Math.PI / 2;
    armRoll.position.set(x + side * (roll - armW / 2) * 0.6, topY, backD / 4);
    g.add(armRoll);
  }
  g.add(block(innerW, cushionT, d - backD - 0.02, soft, { y: baseTop, z: -d / 2 + backD + (d - backD) / 2, r: 0.04 }));

  // Buttons in a diamond pattern on the inside of the back.
  const rows = 3;
  const cols = Math.max(3, Math.round(innerW / 0.16));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - (r % 2); c++) {
      const x = -innerW / 2 + (innerW / cols) * (c + 0.5 + (r % 2) * 0.5);
      const y = seatH + 0.06 + ((topY - seatH - 0.1) * r) / (rows - 1);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), button);
      dot.position.set(x, y, -d / 2 + backD + 0.002);
      g.add(dot);
    }
  }
  for (const [sx, sz] of CORNERS) g.add(post(0.03, 0.025, legH, feet, sx * (w / 2 - 0.07), sz * (d / 2 - 0.07)));
  return g;
}

// ---- Tables ----

function buildTable(dims, item) {
  if (item.style === 'round') return roundTable(dims, item);
  if (item.style === 'oval') return ovalTable(dims, item);
  if (item.style === 'slab') return slabTable(dims, item);
  return rectTable(dims, item);
}

const topThickness = (h) => clamp(h * 0.06, 0.025, 0.045);

function rectTable({ w, d, h }, item) {
  const g = new THREE.Group();
  const top = wood(item.color);
  const legs = trim(item.color2);

  const topT = topThickness(h);
  const legH = h - topT;
  const legS = clamp(Math.min(w, d) * 0.07, 0.03, 0.06);
  const inset = legS / 2 + clamp(Math.min(w, d) * 0.06, 0.02, 0.08);

  g.add(block(w, topT, d, top, { y: legH, r: 0.01 }));
  for (const [sx, sz] of CORNERS) {
    g.add(block(legS, legH, legS, legs, { x: sx * (w / 2 - inset), z: sz * (d / 2 - inset) }));
  }

  // Dining tables and desks get an apron frame under the top.
  if (h > 0.6) {
    const apronH = 0.07;
    const t = 0.02;
    const y = legH - apronH;
    for (const s of [-1, 1]) {
      g.add(block(w - 2 * inset, apronH, t, top, { y, z: s * (d / 2 - inset) }));
      g.add(block(t, apronH, d - 2 * inset, top, { x: s * (w / 2 - inset), y }));
    }
  }
  return g;
}

// Low round tables stand on four legs; taller ones on a pedestal.
function roundTable({ w, h }, item) {
  const g = new THREE.Group();
  const top = wood(item.color);
  const legs = trim(item.color2);
  const r = w / 2;
  const topT = topThickness(h);
  g.add(post(r, r, topT, top, 0, 0, h - topT, 48));
  if (h < 0.6) {
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      g.add(leg(0.02, 0.015, h - topT, legs, Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62));
    }
  } else {
    const baseT = 0.025;
    const baseR = clamp(r * 0.5, 0.18, 0.35);
    g.add(post(baseR, baseR, baseT, legs, 0, 0, 0, 36));
    g.add(post(0.035, 0.045, h - topT - baseT, legs, 0, 0, baseT, 20));
  }
  return g;
}

function ovalTable({ w, d, h }, item) {
  const g = new THREE.Group();
  const top = wood(item.color);
  const legs = trim(item.color2);
  const topT = topThickness(h);
  const slab = post(0.5, 0.5, topT, top, 0, 0, h - topT, 64);
  slab.scale.set(w, 1, d); // a unit disc stretched into an ellipse
  g.add(slab);
  for (const [sx, sz] of CORNERS) g.add(leg(0.022, 0.015, h - topT, legs, sx * w * 0.3, sz * d * 0.26));
  return g;
}

// A top resting on two solid panels at its ends.
function slabTable({ w, d, h }, item) {
  const g = new THREE.Group();
  const top = wood(item.color);
  const sides = wood(item.color2);
  const topT = clamp(h * 0.08, 0.03, 0.05);
  const t = clamp(w * 0.03, 0.03, 0.05);
  g.add(block(w, topT, d, top, { y: h - topT, r: 0.004 }));
  for (const s of [-1, 1]) g.add(block(t, h - topT, d, sides, { x: s * (w / 2 - t / 2) }));
  return g;
}

// ---- TV stands ----

function buildTvStand(dims, item) {
  if (item.style === 'open') return openStand(dims, item);
  if (item.style === 'floating') return floatingStand(dims, item);
  if (item.style === 'sideboard') return sideboard(dims, item);
  return cabinetStand(dims, item);
}

// Thin dark lines on the front of a body, between doors or drawers.
function grooves(g, material, { w, x0 = -w / 2, y0, bodyH, z, cols, rows = 1 }) {
  for (let i = 1; i < cols; i++) g.add(block(0.006, bodyH - 0.03, 0.004, material, { x: x0 + (i * w) / cols, y: y0 + 0.015, z }));
  for (let j = 1; j < rows; j++) g.add(block(w - 0.03, 0.006, 0.004, material, { y: y0 + (j * bodyH) / rows, z }));
}

function cabinetStand({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = wood(item.color);
  const hardware = trim(item.color2);

  const legH = clamp(h * 0.18, 0.04, 0.12);
  const bodyH = h - legH;
  g.add(block(w, bodyH, d, body, { y: legH, r: 0.008 }));

  const doors = Math.max(2, Math.round(w / 0.6));
  const doorW = w / doors;
  grooves(g, shade(item.color, 0.45), { w, y0: legH, bodyH, z: d / 2, cols: doors });
  const handleW = Math.min(0.14, doorW * 0.4);
  for (let i = 0; i < doors; i++) {
    g.add(block(handleW, 0.012, 0.018, hardware, { x: -w / 2 + doorW * (i + 0.5), y: legH + bodyH * 0.72, z: d / 2 + 0.009 }));
  }
  for (const [sx, sz] of CORNERS) g.add(leg(0.02, 0.013, legH, hardware, sx * (w / 2 - 0.05), sz * (d / 2 - 0.05)));
  return g;
}

// Open compartments on a recessed plinth.
function openStand({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = wood(item.color);
  const inside = shade(item.color, 0.7);
  const t = 0.02;
  const plinthH = clamp(h * 0.12, 0.03, 0.07);
  const innerH = h - plinthH - 2 * t;

  g.add(block(w - 0.06, plinthH, d - 0.06, trim(item.color2), {}));
  g.add(block(w, t, d, body, { y: plinthH }));
  g.add(block(w, t, d, body, { y: h - t }));
  for (const s of [-1, 1]) g.add(block(t, innerH, d, body, { x: s * (w / 2 - t / 2), y: plinthH + t }));
  g.add(block(w - 2 * t, innerH, 0.01, inside, { y: plinthH + t, z: -d / 2 + 0.005 }));
  const cols = Math.max(2, Math.round(w / 0.5));
  for (let i = 1; i < cols; i++) g.add(block(t, innerH, d - 0.01, body, { x: -w / 2 + (i * w) / cols, y: plinthH + t, z: 0.005 }));
  if (innerH > 0.3) g.add(block(w - 2 * t, t, d - 0.01, body, { y: plinthH + t + innerH / 2 - t / 2, z: 0.005 }));
  return g;
}

// Hung on the wall, clear of the floor; `h` is the height of its top. Push-to-open doors, no handles.
function floatingStand({ w, d, h }, item) {
  const g = new THREE.Group();
  const bodyH = clamp(h * 0.55, 0.2, 0.4);
  const y0 = h - bodyH;
  g.add(block(w, bodyH, d, wood(item.color), { y: y0, r: 0.006 }));
  grooves(g, shade(item.color, 0.5), { w, y0, bodyH, z: d / 2, cols: Math.max(2, Math.round(w / 0.6)) });
  return g;
}

// Mid-century: drawers with round knobs on splayed, tapered legs.
function sideboard({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = wood(item.color);
  const brass = trim(item.color2);
  const legH = clamp(h * 0.3, 0.1, 0.25);
  const bodyH = h - legH;
  g.add(block(w, bodyH, d, body, { y: legH, r: 0.01 }));
  const cols = Math.max(2, Math.round(w / 0.5));
  const rows = bodyH > 0.3 ? 2 : 1;
  grooves(g, shade(item.color, 0.45), { w, y0: legH, bodyH, z: d / 2, cols, rows });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), brass);
      knob.position.set(-w / 2 + (w / cols) * (i + 0.5), legH + (bodyH / rows) * (j + 0.5), d / 2 + 0.01);
      g.add(knob);
    }
  }
  for (const [sx, sz] of CORNERS) {
    const l = leg(0.022, 0.012, legH + 0.01, wood(item.color), sx * (w / 2 - 0.08), sz * (d / 2 - 0.07));
    l.rotation.set(-sz * 0.12, 0, sx * 0.12); // splay outward
    g.add(l);
  }
  return g;
}

// ---- TVs ----

function buildTv({ w, d, h }, item) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.12, metalness: 0.3 });
  const bezel = 0.008;
  const style = item.style;

  let footH = 0;
  if (style === 'pedestal' || style === 'curved') {
    footH = TV_FOOT_H / 100;
    const screenH = h - footH;
    g.add(block(Math.min(w * 0.38, 0.45), 0.018, TV_FOOT_D / 100, frame, { r: 0.006 }));
    g.add(block(0.07, footH + screenH * 0.3, 0.025, frame, { y: 0.018, z: -0.03 }));
  } else if (style === 'feet') {
    footH = 0.06;
    for (const s of [-1, 1]) {
      const x = s * (w / 2 - w * 0.1);
      g.add(block(0.025, 0.012, d, frame, { x }));
      g.add(block(0.025, footH + 0.05, 0.02, frame, { x, z: -0.02 }));
    }
  }
  const screenH = h - footH;
  const panelD = style === 'wall' ? 0.035 : 0.045;

  if (style === 'curved') {
    // A shallow arc, its edges curving toward the viewer, built from narrow strips.
    const radius = w * 1.6;
    const half = Math.asin(w / 2 / radius);
    const strips = 24;
    const stripW = 2 * radius * Math.sin(half / strips) + 0.002;
    for (let k = 0; k < strips; k++) {
      const a = -half + (2 * half * (k + 0.5)) / strips;
      const x = radius * Math.sin(a);
      const z = radius * (1 - Math.cos(a));
      const shell = block(stripW, screenH, panelD, frame, { x, y: footH, z });
      shell.rotation.y = -a;
      g.add(shell);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(stripW, screenH - 2 * bezel), glass);
      face.position.set(x - Math.sin(a) * (panelD / 2 + 0.0015), footH + screenH / 2, z + Math.cos(a) * (panelD / 2 + 0.0015));
      face.rotation.y = -a;
      g.add(face);
    }
    return g;
  }

  g.add(block(w, screenH, panelD, frame, { y: footH, r: 0.006 }));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * bezel, screenH - 2 * bezel), glass);
  screen.position.set(0, footH + screenH / 2, panelD / 2 + 0.0015);
  g.add(screen);
  return g;
}

// ---- Carpets ----

const IVORY = '#ece6d8';
const mix = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

// A stable number from an id, so a carpet's fibres don't change every time it's redrawn.
function hashOf(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Fine fibres: short light and dark strokes over the whole carpet.
function weave(g, w, d, rnd, alpha) {
  const count = Math.round((w * d) / 12);
  for (let i = 0; i < count; i++) {
    g.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    g.fillRect(rnd() * w, rnd() * d, 1.2, 0.35);
  }
}

function diamond(g, x, y, rx, ry) {
  g.beginPath();
  g.moveTo(x, y - ry);
  g.lineTo(x + rx, y);
  g.lineTo(x, y + ry);
  g.lineTo(x - rx, y);
  g.closePath();
}

// Each pattern draws a w × d carpet (cm) on a canvas scaled to centimetres; x across, y along.
const RUG_PATTERNS = {
  bordered(g, w, d, c1, c2, rnd) {
    const b = clamp(Math.min(w, d) * 0.07, 5, 16);
    g.fillStyle = c2;
    g.fillRect(0, 0, w, d);
    g.fillStyle = c1;
    g.fillRect(b, b, w - 2 * b, d - 2 * b);
    g.strokeStyle = c2;
    g.lineWidth = 1;
    g.strokeRect(b + 3, b + 3, w - 2 * b - 6, d - 2 * b - 6);
    weave(g, w, d, rnd, 0.06);
  },

  round(g, w, d, c1, c2, rnd) {
    const r = w / 2;
    const b = clamp(r * 0.1, 5, 14);
    g.fillStyle = c2;
    g.fillRect(0, 0, w, d);
    g.fillStyle = c1;
    g.beginPath();
    g.arc(r, r, r - b, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = c2;
    g.lineWidth = 1.2;
    for (const k of [r - b - 4, r * 0.3, r * 0.3 - 4]) {
      g.beginPath();
      g.arc(r, r, Math.max(1, k), 0, Math.PI * 2);
      g.stroke();
    }
    weave(g, w, d, rnd, 0.06);
  },

  // Bands across the carpet's length, in the pattern color and a blend of both colors.
  striped(g, w, d, c1, c2, rnd) {
    g.fillStyle = c1;
    g.fillRect(0, 0, w, d);
    const along = d >= w;
    const length = along ? d : w;
    const band = (at, size, color) => {
      g.fillStyle = color;
      if (along) g.fillRect(0, at, w, size);
      else g.fillRect(at, 0, size, d);
    };
    for (let s = 8; s < length; s += 36) {
      band(s, 10, c2);
      band(s + 14, 2.5, c2);
      band(s + 19.5, 2.5, mix(c1, c2, 0.5));
    }
    weave(g, w, d, rnd, 0.06);
  },

  // Persian-style: a patterned border, a central medallion and corner pieces on a plain field.
  classic(g, w, d, c1, c2, rnd) {
    const b = clamp(Math.min(w, d) * 0.11, 8, 30);
    g.fillStyle = c2;
    g.fillRect(0, 0, w, d);
    g.fillStyle = c1;
    g.fillRect(b, b, w - 2 * b, d - 2 * b);
    g.strokeStyle = IVORY;
    g.lineWidth = 0.8;
    for (const i of [b * 0.2, b * 0.8, b + 2.5]) g.strokeRect(i, i, w - 2 * i, d - 2 * i);

    // Small diamonds along the border band.
    g.fillStyle = IVORY;
    const step = b * 0.9;
    const size = b * 0.16;
    for (let x = b; x <= w - b; x += step) {
      for (const y of [b / 2, d - b / 2]) {
        diamond(g, x, y, size, size);
        g.fill();
      }
    }
    for (let y = b + step; y <= d - b - step; y += step) {
      for (const x of [b / 2, w - b / 2]) {
        diamond(g, x, y, size, size);
        g.fill();
      }
    }

    // Corner pieces and the medallion, in the border color outlined in ivory.
    const fw = w - 2 * b;
    const fd = d - 2 * b;
    g.fillStyle = c2;
    g.strokeStyle = IVORY;
    for (const [x, y, a0] of [
      [b, b, 0],
      [w - b, b, Math.PI / 2],
      [w - b, d - b, Math.PI],
      [b, d - b, (Math.PI * 3) / 2],
    ]) {
      g.beginPath();
      g.moveTo(x, y);
      g.ellipse(x, y, fw * 0.18, fd * 0.14, 0, a0, a0 + Math.PI / 2);
      g.closePath();
      g.fill();
      g.stroke();
    }
    g.beginPath();
    g.ellipse(w / 2, d / 2, fw * 0.24, fd * 0.2, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = IVORY;
    diamond(g, w / 2, d / 2, fw * 0.13, fd * 0.12);
    g.fill();
    g.fillStyle = c1;
    diamond(g, w / 2, d / 2, fw * 0.08, fd * 0.07);
    g.fill();

    // A scatter of small motifs over the field.
    g.fillStyle = 'rgba(236,230,216,0.35)';
    for (let x = b + 10; x < w - b - 5; x += 14) {
      for (let y = b + 10; y < d - b - 5; y += 14) {
        g.beginPath();
        g.arc(x, y, 1.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    weave(g, w, d, rnd, 0.08);
  },

  // Hand-drawn diamond lattice, like a Berber carpet.
  geometric(g, w, d, c1, c2, rnd) {
    g.fillStyle = c1;
    g.fillRect(0, 0, w, d);
    g.strokeStyle = c2;
    g.lineWidth = 2.2;
    g.lineCap = 'round';
    const run = d * 0.75; // each line crosses the carpet at this slope
    for (const dir of [1, -1]) {
      for (let x0 = -run; x0 < w + run; x0 += 30) {
        g.beginPath();
        for (let t = 0; t <= 1.0001; t += 0.05) {
          const x = x0 + dir * run * t + (rnd() - 0.5) * 1.6;
          const y = d * t + (rnd() - 0.5) * 1.6;
          if (t === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    weave(g, w, d, rnd, 0.07);
  },

  // Deep pile: short strands of lighter, darker and pattern-colored yarn.
  shaggy(g, w, d, c1, c2, rnd) {
    g.fillStyle = c1;
    g.fillRect(0, 0, w, d);
    const light = mix(c1, '#ffffff', 0.35);
    const dark = mix(c1, '#000000', 0.25);
    g.lineWidth = 0.8;
    g.lineCap = 'round';
    const count = Math.round((w * d) / 3);
    for (let i = 0; i < count; i++) {
      const pick = rnd();
      g.strokeStyle = pick < 0.3 ? c2 : pick < 0.65 ? light : dark;
      g.globalAlpha = 0.5;
      const x = rnd() * w;
      const y = rnd() * d;
      const a = rnd() * Math.PI * 2;
      const l = 1.5 + rnd() * 2.5;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.globalAlpha = 1;
  },
};

// The carpet's pattern as a texture, at up to 4 pixels per centimetre.
function rugTexture(item, w, d) {
  if (typeof document === 'undefined') return null; // no canvas outside a browser
  const scale = Math.min(4, 1024 / Math.max(w, d));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(16, Math.round(w * scale));
  canvas.height = Math.max(16, Math.round(d * scale));
  const g = canvas.getContext('2d');
  g.scale(canvas.width / w, canvas.height / d);
  (RUG_PATTERNS[item.style] ?? RUG_PATTERNS.bordered)(g, w, d, item.color, item.color2, seeded(hashOf(item.id)));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function buildRug({ w, d, h }, item) {
  const g = new THREE.Group();
  const top = new THREE.MeshStandardMaterial({ color: item.color, map: rugTexture(item, w * 100, d * 100), roughness: 1 });
  if (top.map) top.color.set('#ffffff'); // the texture carries the colors
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.style === 'classic' ? item.color2 : item.color).multiplyScalar(0.8), roughness: 1 });

  let rug;
  if (styleOf(item).round) {
    rug = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 72), [edge, top, edge]);
  } else if (item.style === 'shaggy') {
    rug = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, h / 2 - 0.001), top);
  } else {
    rug = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [edge, edge, top, edge, edge, edge]);
  }
  rug.position.y = h / 2;
  g.add(rug);

  // Fringes on the short ends of a classic carpet.
  if (item.style === 'classic') {
    const fringe = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 1 });
    const along = d >= w;
    for (const s of [-1, 1]) {
      const strip = along ? block(w * 0.96, 0.003, 0.05, fringe, { z: s * (d / 2 + 0.025) }) : block(0.05, 0.003, d * 0.96, fringe, { x: s * (w / 2 + 0.025) });
      g.add(strip);
    }
  }
  return g;
}
