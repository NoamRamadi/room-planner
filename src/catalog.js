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

const CERAMICS = [
  { name: 'White', hex: '#f4f4f1' },
  { name: 'Ivory', hex: '#ebe5d6' },
  { name: 'Light grey', hex: '#cfd1d2' },
  { name: 'Sand', hex: '#d8c9ad' },
  { name: 'Black', hex: '#2a2b2e' },
];

const SEATS = [
  { name: 'White', hex: '#f4f4f1' },
  { name: 'Black', hex: '#2a2b2e' },
  { name: 'Grey', hex: '#9a9c9f' },
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Walnut', hex: '#5d4030' },
];

const FITTINGS = [
  { name: 'Chrome', hex: '#d5d8db' },
  { name: 'Matt black', hex: '#26272a' },
  { name: 'Brushed gold', hex: '#c2a061' },
  { name: 'White', hex: '#f4f4f1' },
];

const APPLIANCES = [
  { name: 'White', hex: '#f2f2ef' },
  { name: 'Silver', hex: '#b9bbbe' },
  { name: 'Graphite', hex: '#4a4c50' },
  { name: 'Black', hex: '#1e1f22' },
];

const FRONTS = [
  { name: 'White', hex: '#f2f1ec' },
  { name: 'Light grey', hex: '#cfd2d3' },
  { name: 'Sage', hex: '#9fae94' },
  { name: 'Navy', hex: '#2f3c56' },
  { name: 'Charcoal', hex: '#3b3e43' },
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Walnut', hex: '#5d4030' },
];

const WORKTOPS = [
  { name: 'White quartz', hex: '#efeee9' },
  { name: 'Marble', hex: '#e2e0da' },
  { name: 'Concrete', hex: '#a7a8a5' },
  { name: 'Black granite', hex: '#2b2c2f' },
  { name: 'Oak block', hex: '#c09a6b' },
  { name: 'Terrazzo', hex: '#d9d2c5' },
];

const FINISHES = [
  { name: 'Stainless steel', hex: '#c3c6c9' },
  { name: 'White', hex: '#f2f2ef' },
  { name: 'Black', hex: '#1e1f22' },
  { name: 'Graphite', hex: '#4a4c50' },
  { name: 'Cream', hex: '#ece3c8' },
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
// (`defaults`), size limits, size presets and color choices; `name` is what a new piece of that
// design is called. `surface`: other items can stand on it. `stackable`: rests on a surface when
// placed over one. `room`: the furniture set it's listed under. `place`: where a new one goes
// ('wall', 'corner', or 'island' for stools); a hanging design's `over` lists what it hangs above.
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

  // ---- Bathroom: `place` says where a new one goes: along a wall, or into a corner ----

  toilet: {
    label: 'Toilet',
    room: 'bath',
    place: 'wall',
    defaults: { style: 'floor', w: 38, d: 68, h: 78, color: '#f4f4f1', color2: '#f4f4f1' },
    limits: { w: [30, 50], d: [45, 80], h: [35, 100] },
    colors: [
      { key: 'color', label: 'Ceramic', palette: CERAMICS },
      { key: 'color2', label: 'Seat', palette: SEATS },
    ],
    styles: [
      {
        id: 'floor',
        label: 'With cistern',
        name: 'Toilet',
        presets: [
          { name: 'Compact', w: 36, d: 60, h: 75 },
          { name: 'Standard', w: 38, d: 68, h: 78 },
        ],
      },
      {
        id: 'wall',
        label: 'Wall-hung',
        name: 'Wall-hung toilet',
        defaults: { w: 36, d: 54, h: 42 },
        presets: [
          { name: 'Short', w: 36, d: 49, h: 42 },
          { name: 'Standard', w: 36, d: 54, h: 42 },
        ],
      },
      { id: 'bidet', label: 'Bidet', name: 'Bidet', defaults: { w: 36, d: 54, h: 40 }, presets: [{ name: 'Standard', w: 36, d: 54, h: 40 }] },
    ],
    build: buildToilet,
  },
  sink: {
    label: 'Sink',
    room: 'bath',
    place: 'wall',
    defaults: { style: 'pedestal', w: 60, d: 46, h: 85, color: '#f4f4f1', color2: '#b88f5d' },
    limits: { w: [35, 200], d: [30, 65], h: [60, 100] },
    colors: [
      { key: 'color', label: 'Ceramic', palette: CERAMICS },
      { key: 'color2', label: 'Cabinet or counter', palette: WOODS },
    ],
    styles: [
      {
        id: 'pedestal',
        label: 'Pedestal',
        name: 'Sink',
        presets: [
          { name: 'Small', w: 50, d: 40, h: 85 },
          { name: 'Standard', w: 60, d: 46, h: 85 },
        ],
      },
      {
        id: 'vanity',
        label: 'On a cabinet',
        name: 'Vanity',
        defaults: { w: 80, d: 47, h: 85 },
        presets: [
          { name: '60 cm', w: 60, d: 46, h: 85 },
          { name: '80 cm', w: 80, d: 47, h: 85 },
          { name: '100 cm', w: 100, d: 48, h: 85 },
        ],
      },
      {
        id: 'wall',
        label: 'Wall-hung',
        name: 'Wall-hung sink',
        defaults: { w: 55, d: 42, h: 85 },
        presets: [
          { name: 'Small', w: 45, d: 35, h: 85 },
          { name: 'Standard', w: 55, d: 42, h: 85 },
        ],
      },
      {
        id: 'double',
        label: 'Double',
        name: 'Double vanity',
        defaults: { w: 140, d: 50, h: 85 },
        limits: { w: [110, 200] },
        presets: [
          { name: '120 cm', w: 120, d: 50, h: 85 },
          { name: '140 cm', w: 140, d: 50, h: 85 },
          { name: '160 cm', w: 160, d: 50, h: 85 },
        ],
      },
      {
        id: 'vessel',
        label: 'Countertop bowl',
        name: 'Countertop sink',
        defaults: { w: 80, d: 46, h: 90, color2: '#5d4030' },
        presets: [
          { name: '60 cm', w: 60, d: 46, h: 90 },
          { name: '80 cm', w: 80, d: 46, h: 90 },
          { name: '120 cm', w: 120, d: 50, h: 90 },
        ],
      },
    ],
    build: buildSink,
  },
  shower: {
    label: 'Shower',
    room: 'bath',
    place: 'corner',
    defaults: { style: 'enclosure', w: 90, d: 90, h: 200, color: '#d5d8db', color2: '#f4f4f1', mount: 100 },
    limits: { w: [70, 200], d: [70, 160], h: [180, 230], mount: [60, 140] },
    colors: [
      { key: 'color', label: 'Fittings', palette: FITTINGS },
      { key: 'color2', label: 'Tray and panels', palette: CERAMICS },
    ],
    styles: [
      {
        id: 'enclosure',
        label: 'Enclosure',
        name: 'Shower',
        presets: [
          { name: '80 × 80', w: 80, d: 80 },
          { name: '90 × 90', w: 90, d: 90 },
          { name: '120 × 80', w: 120, d: 80 },
        ],
      },
      {
        id: 'quadrant',
        label: 'Curved corner',
        name: 'Corner shower',
        round: true, // a quarter circle: as deep as it is wide
        presets: [
          { name: '80 cm', w: 80, d: 80 },
          { name: '90 cm', w: 90, d: 90 },
          { name: '100 cm', w: 100, d: 100 },
        ],
      },
      {
        id: 'walkin',
        label: 'Walk-in',
        name: 'Walk-in shower',
        defaults: { w: 140, d: 90 },
        presets: [
          { name: '120 × 80', w: 120, d: 80 },
          { name: '140 × 90', w: 140, d: 90 },
          { name: '160 × 90', w: 160, d: 90 },
        ],
      },
      {
        id: 'cabin',
        label: 'Shower cabin',
        name: 'Shower cabin',
        defaults: { h: 215 },
        presets: [
          { name: '80 × 80', w: 80, d: 80 },
          { name: '90 × 90', w: 90, d: 90 },
          { name: '100 × 80', w: 100, d: 80 },
        ],
      },
      {
        id: 'head',
        label: 'Shower head',
        name: 'Shower head',
        onWall: true, // `mount` is the height of the mixer; the head is `h` above it
        defaults: { w: 25, d: 35, h: 110 },
        limits: { w: [15, 40], d: [20, 50], h: [60, 140] },
        presets: [
          { name: 'Hand shower', w: 20, d: 25, h: 90 },
          { name: 'Rain shower', w: 30, d: 45, h: 115 },
        ],
      },
    ],
    build: buildShower,
  },
  bathtub: {
    label: 'Bathtub',
    room: 'bath',
    place: 'corner',
    defaults: { style: 'builtin', w: 170, d: 75, h: 58, color: '#f4f4f1', color2: '#d5d8db' },
    limits: { w: [120, 200], d: [65, 100], h: [45, 70] },
    colors: [
      { key: 'color', label: 'Tub', palette: CERAMICS },
      { key: 'color2', label: 'Fittings', palette: FITTINGS },
    ],
    styles: [
      {
        id: 'builtin',
        label: 'Built-in',
        name: 'Bathtub',
        presets: [
          { name: '150 cm', w: 150, d: 70, h: 58 },
          { name: '170 cm', w: 170, d: 75, h: 58 },
          { name: '180 cm', w: 180, d: 80, h: 58 },
        ],
      },
      {
        id: 'freestanding',
        label: 'Freestanding',
        name: 'Freestanding bath',
        defaults: { w: 170, d: 78, h: 62 },
        presets: [
          { name: '160 cm', w: 160, d: 75, h: 60 },
          { name: '170 cm', w: 170, d: 78, h: 62 },
          { name: '180 cm', w: 180, d: 80, h: 62 },
        ],
      },
      {
        id: 'screen',
        label: 'With shower screen',
        name: 'Shower bath',
        presets: [
          { name: '170 cm', w: 170, d: 75, h: 58 },
          { name: '180 cm', w: 180, d: 80, h: 58 },
        ],
      },
    ],
    build: buildBathtub,
  },
  washer: {
    label: 'Washing machine',
    room: 'bath',
    place: 'wall',
    defaults: { style: 'front', w: 60, d: 60, h: 85, color: '#f2f2ef' },
    limits: { w: [40, 70], d: [40, 75], h: [80, 200] },
    colors: [{ key: 'color', label: 'Body', palette: APPLIANCES }],
    styles: [
      {
        id: 'front',
        label: 'Front-loading',
        name: 'Washing machine',
        presets: [
          { name: 'Slim', w: 60, d: 45, h: 85 },
          { name: 'Standard', w: 60, d: 60, h: 85 },
        ],
      },
      { id: 'top', label: 'Top-loading', name: 'Top-loading washer', defaults: { w: 40, d: 60, h: 90 }, presets: [{ name: 'Standard', w: 40, d: 60, h: 90 }] },
      { id: 'stack', label: 'Washer and dryer', name: 'Washer and dryer', defaults: { h: 172 }, presets: [{ name: 'Standard', w: 60, d: 60, h: 172 }] },
    ],
    build: buildWasher,
  },
  bathcabinet: {
    label: 'Bathroom cabinet',
    room: 'bath',
    place: 'wall',
    defaults: { style: 'tall', w: 40, d: 33, h: 170, color: '#ecebe6', color2: '#a9abad', mount: 120 },
    limits: { w: [30, 150], d: [12, 60], h: [40, 220], mount: [40, 200] },
    colors: [
      { key: 'color', label: 'Body', palette: WOODS },
      { key: 'color2', label: 'Handles', palette: TRIMS },
    ],
    styles: [
      {
        id: 'tall',
        label: 'Tall cabinet',
        name: 'Tall cabinet',
        presets: [
          { name: 'Narrow', w: 30, d: 33, h: 160 },
          { name: 'Standard', w: 40, d: 33, h: 170 },
          { name: 'Wide', w: 60, d: 35, h: 180 },
        ],
      },
      {
        id: 'mirror',
        label: 'Mirror cabinet',
        name: 'Mirror cabinet',
        onWall: true, // `mount` is the height of its bottom edge
        over: ['sink'], // hung above a sink, if there is one
        defaults: { w: 60, d: 15, h: 70 },
        presets: [
          { name: '60 cm', w: 60, d: 15, h: 70 },
          { name: '80 cm', w: 80, d: 15, h: 70 },
          { name: '100 cm', w: 100, d: 15, h: 70 },
        ],
      },
      {
        id: 'shelves',
        label: 'Open shelves',
        name: 'Bathroom shelves',
        defaults: { w: 60, d: 30, h: 150 },
        presets: [
          { name: 'Low', w: 60, d: 30, h: 90 },
          { name: 'Tall', w: 60, d: 30, h: 150 },
        ],
      },
    ],
    build: buildBathCabinet,
  },

  // ---- Kitchen ----

  kitchen: {
    label: 'Kitchen cabinet',
    room: 'kitchen',
    place: 'wall',
    defaults: { style: 'base', w: 60, d: 60, h: 90, color: '#f2f1ec', color2: '#efeee9', mount: 145 },
    limits: { w: [30, 300], d: [15, 70], h: [20, 240], mount: [40, 220] },
    colors: [
      { key: 'color', label: 'Fronts', palette: FRONTS },
      { key: 'color2', label: 'Countertop', palette: WORKTOPS },
    ],
    styles: [
      {
        id: 'base',
        label: 'Base cabinet',
        name: 'Base cabinet',
        limits: { d: [45, 70], h: [70, 100] },
        presets: [
          { name: '40 cm', w: 40, d: 60, h: 90 },
          { name: '60 cm', w: 60, d: 60, h: 90 },
          { name: '80 cm', w: 80, d: 60, h: 90 },
          { name: '120 cm', w: 120, d: 60, h: 90 },
        ],
      },
      {
        id: 'drawers',
        label: 'Drawers',
        name: 'Drawer cabinet',
        limits: { d: [45, 70], h: [70, 100] },
        presets: [
          { name: '40 cm', w: 40, d: 60, h: 90 },
          { name: '60 cm', w: 60, d: 60, h: 90 },
          { name: '80 cm', w: 80, d: 60, h: 90 },
        ],
      },
      {
        id: 'wall',
        label: 'Wall cabinet',
        name: 'Wall cabinet',
        onWall: true, // `mount` is the height of its bottom edge
        over: ['kitchen', 'sinkunit', 'dishwasher'], // hung above a base unit with nothing above it yet
        defaults: { w: 60, d: 35, h: 70 },
        limits: { d: [25, 40], h: [30, 100] },
        colors: [{ key: 'color', label: 'Fronts', palette: FRONTS }],
        presets: [
          { name: '40 cm', w: 40, d: 35, h: 70 },
          { name: '60 cm', w: 60, d: 35, h: 70 },
          { name: '80 cm', w: 80, d: 35, h: 70 },
        ],
      },
      {
        id: 'tall',
        label: 'Tall pantry',
        name: 'Pantry',
        defaults: { h: 210 },
        limits: { d: [45, 70], h: [150, 240] },
        colors: [{ key: 'color', label: 'Fronts', palette: FRONTS }],
        presets: [
          { name: '40 cm', w: 40, d: 60, h: 210 },
          { name: '60 cm', w: 60, d: 60, h: 210 },
        ],
      },
      {
        id: 'shelf',
        label: 'Open shelf',
        name: 'Kitchen shelf',
        onWall: true,
        defaults: { w: 80, d: 25, h: 40, mount: 150, color: '#b88f5d' },
        limits: { d: [15, 35], h: [20, 60] },
        colors: [{ key: 'color', label: 'Shelves', palette: FRONTS }],
        presets: [
          { name: '60 cm', w: 60, d: 25, h: 40 },
          { name: '80 cm', w: 80, d: 25, h: 40 },
          { name: '120 cm', w: 120, d: 25, h: 40 },
        ],
      },
    ],
    build: buildKitchenCabinet,
  },
  sinkunit: {
    label: 'Sink unit',
    room: 'kitchen',
    place: 'wall',
    defaults: { style: 'single', w: 80, d: 60, h: 90, color: '#f2f1ec', color2: '#efeee9' },
    limits: { w: [50, 200], d: [50, 70], h: [80, 100] },
    colors: [
      { key: 'color', label: 'Fronts', palette: FRONTS },
      { key: 'color2', label: 'Countertop', palette: WORKTOPS },
    ],
    styles: [
      {
        id: 'single',
        label: 'Single bowl',
        name: 'Sink unit',
        presets: [
          { name: '60 cm', w: 60, d: 60, h: 90 },
          { name: '80 cm', w: 80, d: 60, h: 90 },
        ],
      },
      {
        id: 'double',
        label: 'Double bowl',
        name: 'Double sink unit',
        defaults: { w: 120 },
        limits: { w: [90, 200] },
        presets: [
          { name: '100 cm', w: 100, d: 60, h: 90 },
          { name: '120 cm', w: 120, d: 60, h: 90 },
        ],
      },
      {
        id: 'farmhouse',
        label: 'Farmhouse',
        name: 'Farmhouse sink',
        defaults: { w: 90, color: '#9fae94', color2: '#c09a6b' },
        presets: [
          { name: '80 cm', w: 80, d: 60, h: 90 },
          { name: '90 cm', w: 90, d: 60, h: 90 },
        ],
      },
    ],
    build: buildSinkUnit,
  },
  cooking: {
    label: 'Cooking',
    room: 'kitchen',
    place: 'wall',
    defaults: { style: 'range', w: 60, d: 60, h: 90, color: '#c3c6c9', color2: '#f2f1ec', color3: '#efeee9', mount: 150 },
    limits: { w: [45, 120], d: [30, 70], h: [40, 240], mount: [120, 200] },
    colors: [
      { key: 'color', label: 'Appliance', palette: FINISHES },
      { key: 'color2', label: 'Fronts', palette: FRONTS },
      { key: 'color3', label: 'Countertop', palette: WORKTOPS },
    ],
    styles: [
      {
        id: 'range',
        label: 'Freestanding range',
        name: 'Range cooker',
        limits: { d: [55, 70], h: [85, 100] },
        colors: [{ key: 'color', label: 'Appliance', palette: FINISHES }],
        presets: [
          { name: '60 cm', w: 60, d: 60, h: 90 },
          { name: '90 cm', w: 90, d: 60, h: 90 },
        ],
      },
      {
        id: 'hob',
        label: 'Hob with oven',
        name: 'Hob and oven',
        limits: { d: [55, 70], h: [80, 100] },
        presets: [
          { name: '60 cm', w: 60, d: 60, h: 90 },
          { name: '80 cm', w: 80, d: 60, h: 90 },
        ],
      },
      {
        id: 'hood',
        label: 'Extractor hood',
        name: 'Extractor hood',
        onWall: true, // `mount` is the height of its bottom edge
        over: ['cooking'], // hung above the cooker
        defaults: { d: 50, h: 90 },
        limits: { d: [30, 60], h: [40, 120] },
        colors: [{ key: 'color', label: 'Appliance', palette: FINISHES }],
        presets: [
          { name: '60 cm', w: 60, d: 50, h: 90 },
          { name: '90 cm', w: 90, d: 50, h: 90 },
        ],
      },
      {
        id: 'oven',
        label: 'Tall oven',
        name: 'Oven tower',
        defaults: { h: 210 },
        limits: { d: [55, 70], h: [150, 240] },
        colors: [
          { key: 'color', label: 'Appliance', palette: FINISHES },
          { key: 'color2', label: 'Fronts', palette: FRONTS },
        ],
        presets: [{ name: '60 cm', w: 60, d: 60, h: 210 }],
      },
    ],
    build: buildCooking,
  },
  fridge: {
    label: 'Fridge',
    room: 'kitchen',
    place: 'wall',
    defaults: { style: 'combi', w: 60, d: 65, h: 185, color: '#c3c6c9' },
    limits: { w: [45, 120], d: [55, 80], h: [80, 210] },
    colors: [{ key: 'color', label: 'Finish', palette: FINISHES }],
    styles: [
      { id: 'single', label: 'Single door', name: 'Fridge', presets: [{ name: 'Standard', w: 60, d: 65, h: 185 }] },
      {
        id: 'combi',
        label: 'Fridge-freezer',
        name: 'Fridge-freezer',
        presets: [
          { name: '60 cm', w: 60, d: 65, h: 185 },
          { name: '70 cm', w: 70, d: 68, h: 200 },
        ],
      },
      { id: 'american', label: 'Side by side', name: 'American fridge', defaults: { w: 91, d: 72, h: 178 }, presets: [{ name: 'Standard', w: 91, d: 72, h: 178 }] },
      { id: 'under', label: 'Under-counter', name: 'Under-counter fridge', defaults: { w: 60, d: 60, h: 85 }, presets: [{ name: 'Standard', w: 60, d: 60, h: 85 }] },
      { id: 'retro', label: 'Retro', name: 'Retro fridge', defaults: { w: 60, d: 70, h: 150, color: '#ece3c8' }, presets: [{ name: 'Standard', w: 60, d: 70, h: 150 }] },
    ],
    build: buildFridge,
  },
  dishwasher: {
    label: 'Dishwasher',
    room: 'kitchen',
    place: 'wall',
    defaults: { style: 'integrated', w: 60, d: 60, h: 90, color: '#f2f1ec', color2: '#efeee9' },
    limits: { w: [45, 60], d: [55, 65], h: [80, 90] },
    colors: [
      { key: 'color', label: 'Front', palette: FRONTS },
      { key: 'color2', label: 'Countertop', palette: WORKTOPS },
    ],
    styles: [
      {
        id: 'integrated',
        label: 'Integrated',
        name: 'Dishwasher',
        presets: [
          { name: 'Slim', w: 45, d: 60, h: 90 },
          { name: 'Standard', w: 60, d: 60, h: 90 },
        ],
      },
      {
        id: 'freestanding',
        label: 'Freestanding',
        name: 'Freestanding dishwasher',
        defaults: { h: 85, color: '#c3c6c9' },
        colors: [{ key: 'color', label: 'Finish', palette: FINISHES }],
        presets: [
          { name: 'Slim', w: 45, d: 60, h: 85 },
          { name: 'Standard', w: 60, d: 60, h: 85 },
        ],
      },
    ],
    build: buildDishwasher,
  },
  island: {
    label: 'Kitchen island',
    room: 'kitchen',
    defaults: { style: 'island', w: 180, d: 90, h: 90, color: '#2f3c56', color2: '#efeee9' },
    limits: { w: [80, 400], d: [60, 150], h: [75, 110] },
    colors: [
      { key: 'color', label: 'Fronts', palette: FRONTS },
      { key: 'color2', label: 'Countertop', palette: WORKTOPS },
    ],
    styles: [
      {
        id: 'island',
        label: 'Island',
        name: 'Kitchen island',
        presets: [
          { name: 'Small', w: 120, d: 80, h: 90 },
          { name: 'Medium', w: 180, d: 90, h: 90 },
          { name: 'Large', w: 240, d: 100, h: 90 },
        ],
      },
      {
        id: 'bar',
        label: 'With breakfast bar',
        name: 'Island with bar',
        defaults: { w: 200, d: 100 },
        presets: [
          { name: 'Medium', w: 180, d: 100, h: 90 },
          { name: 'Large', w: 240, d: 110, h: 90 },
        ],
      },
      {
        id: 'table',
        label: 'Island table',
        name: 'Island table',
        defaults: { w: 160, d: 80, color: '#b88f5d', color2: '#c09a6b' },
        presets: [
          { name: 'Medium', w: 160, d: 80, h: 90 },
          { name: 'Large', w: 220, d: 90, h: 90 },
        ],
      },
    ],
    surface: true,
    build: buildIsland,
  },
  stool: {
    label: 'Bar stool',
    room: 'kitchen',
    place: 'island', // in a row along the seating side of the island, if there is one
    defaults: { style: 'wood', w: 40, d: 40, h: 75, color: '#b88f5d', color2: '#26272a' },
    limits: { w: [30, 55], d: [30, 55], h: [55, 85] },
    colors: [
      { key: 'color', label: 'Seat', palette: [...WOODS, ...FABRICS.slice(0, 4)] },
      { key: 'color2', label: 'Frame', palette: TRIMS },
    ],
    styles: [
      { id: 'wood', label: 'Wooden', name: 'Bar stool', presets: [{ name: 'Counter', w: 40, d: 40, h: 65 }, { name: 'Bar', w: 40, d: 40, h: 75 }] },
      { id: 'metal', label: 'Metal', name: 'Metal stool', defaults: { color: '#3b3e43' }, presets: [{ name: 'Counter', w: 40, d: 40, h: 65 }, { name: 'Bar', w: 40, d: 40, h: 75 }] },
      { id: 'back', label: 'With backrest', name: 'Bar chair', defaults: { w: 44, d: 44, color: '#5d6673' }, presets: [{ name: 'Counter', w: 44, d: 44, h: 65 }, { name: 'Bar', w: 44, d: 44, h: 75 }] },
    ],
    build: buildStool,
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const styleOf = (item) => CATALOG[item.type].styles.find((s) => s.id === item.style) ?? CATALOG[item.type].styles[0];
export const limitsOf = (item) => ({ ...CATALOG[item.type].limits, ...styleOf(item).limits });
export const presetsOf = (item) => styleOf(item).presets ?? CATALOG[item.type].presets;
// The colors that can be set: a design can have fewer (a hood has no countertop).
export const colorsOf = (item) => styleOf(item).colors ?? CATALOG[item.type].colors;
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
  for (let j = 1; j < rows; j++) g.add(block(w - 0.03, 0.006, 0.004, material, { x: x0 + w / 2, y: y0 + (j * bodyH) / rows, z }));
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

// ---- Bathroom ----

const ceramic = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.15, metalness: 0.02 });
const metal = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.18, metalness: 0.9 });
const glassPane = (frosted = false) =>
  new THREE.MeshStandardMaterial({
    color: frosted ? '#eef3f4' : '#cfe1e8',
    roughness: frosted ? 0.6 : 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: frosted ? 0.55 : 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

// An oval block w × d, h tall, its bottom at y; `taper` narrows its bottom (a bowl).
function oval(w, h, d, material, { x = 0, y = 0, z = 0, taper = 1 } = {}) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5 * taper, h, 40), material);
  mesh.scale.set(w, 1, d);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

// A tap: an upright with a spout reaching forward (+z), standing at (x, y, z).
function tap(g, material, { x = 0, y, z, reach = 0.12, height = 0.14 }) {
  g.add(post(0.016, 0.02, height, material, x, z, y, 16));
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, reach, 12), material);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(x, y + height - 0.012, z + reach / 2);
  g.add(spout);
}

// A shower on the wall at z: mixer at `bottom`, a riser up the wall, and an arm with the head at `top`.
function showerHead(g, fit, { x = 0, z, bottom, top, rain = false }) {
  g.add(block(0.14, 0.06, 0.05, fit, { x, y: bottom, z: z + 0.025, r: 0.01 }));
  g.add(post(0.012, 0.012, top - bottom, fit, x, z + 0.03, bottom, 12));
  const arm = rain ? 0.35 : 0.2;
  g.add(block(0.02, 0.02, arm, fit, { x, y: top - 0.02, z: z + 0.03 + arm / 2 }));
  if (rain) g.add(block(0.26, 0.012, 0.26, fit, { x, y: top - 0.035, z: z + 0.03 + arm - 0.1, r: 0.004 }));
  else g.add(post(0.09, 0.06, 0.035, fit, x, z + 0.03 + arm, top - 0.06, 24));
}

function buildToilet({ w, d, h }, item) {
  const g = new THREE.Group();
  const white = ceramic(item.color);
  const seat = new THREE.MeshStandardMaterial({ color: item.color2, roughness: 0.35 });
  const style = item.style;
  const rim = style === 'floor' ? 0.42 : h; // seat height
  const bowlD = style === 'floor' ? d - 0.17 : d; // a floor toilet's cistern takes the back
  const bz = d / 2 - bowlD / 2;
  g.add(oval(w, 0.17, bowlD, white, { y: rim - 0.17, z: bz, taper: 0.8 }));
  if (style === 'wall') {
    // Hung from the wall, with the flush plate on the wall above.
    g.add(block(w * 0.7, 0.16, bowlD * 0.5, white, { y: rim - 0.3, z: -d / 2 + bowlD * 0.25, r: 0.05 }));
    g.add(block(0.22, 0.15, 0.012, white, { y: 0.95, z: -d / 2 + 0.006 }));
    for (const s of [-1, 1]) g.add(block(0.085, 0.11, 0.008, metal('#d5d8db'), { x: s * 0.048, y: 0.97, z: -d / 2 + 0.014 }));
  } else {
    g.add(block(w * 0.5, rim - 0.17, bowlD * 0.55, white, { z: bz - bowlD * 0.05, r: 0.04 }));
  }
  if (style === 'bidet') {
    tap(g, metal('#d5d8db'), { y: rim, z: -d / 2 + 0.07, reach: 0.08, height: 0.08 });
  } else {
    g.add(oval(w * 0.98, 0.02, bowlD * 0.94, seat, { y: rim, z: bz + 0.005 }));
    g.add(oval(w * 0.95, 0.015, bowlD * 0.9, seat, { y: rim + 0.02, z: bz + 0.01 }));
  }
  if (style === 'floor') {
    g.add(block(w * 0.95, h - rim + 0.06, 0.17, white, { y: rim - 0.06, z: -d / 2 + 0.085, r: 0.02 }));
    g.add(post(0.022, 0.022, 0.008, metal('#d5d8db'), 0, -d / 2 + 0.085, h, 20));
  }
  return g;
}

function buildSink({ w, d, h }, item) {
  const g = new THREE.Group();
  const white = ceramic(item.color);
  const bowl = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.color).multiplyScalar(0.86), roughness: 0.2 });
  const chrome = metal('#d5d8db');
  const style = item.style;
  // A basin: a rounded block with an oval bowl set into its top, and a tap at the back.
  const basin = (bw, x, top, withBlock = true) => {
    if (withBlock) g.add(block(bw, 0.14, d, white, { x, y: top - 0.14, r: 0.025 }));
    g.add(oval(Math.min(bw * 0.7, 0.5), 0.004, d * 0.58, bowl, { x, y: top - 0.002, z: 0.03 }));
    tap(g, chrome, { x, y: top, z: -d / 2 + 0.06, reach: 0.11 });
  };

  if (style === 'pedestal') {
    basin(w, 0, h);
    g.add(post(0.07, 0.1, h - 0.14, white, 0, -d * 0.1, 0, 24));
  } else if (style === 'wall') {
    basin(w, 0, h);
    g.add(post(0.02, 0.02, 0.28, chrome, 0, -d * 0.2, h - 0.42, 12)); // the trap under it
  } else if (style === 'vessel') {
    // A bowl standing on a wall-mounted counter, with a tall tap.
    const counter = h - 0.14;
    g.add(block(w, 0.04, d, wood(item.color2), { y: counter - 0.04, r: 0.005 }));
    g.add(oval(Math.min(0.42, w * 0.6), 0.14, Math.min(0.36, d * 0.8), white, { y: counter, z: 0.02, taper: 0.6 }));
    g.add(oval(Math.min(0.36, w * 0.52), 0.004, Math.min(0.3, d * 0.68), bowl, { y: h - 0.006, z: 0.02 }));
    tap(g, chrome, { y: counter, z: -d / 2 + 0.07, height: 0.28, reach: 0.16 });
  } else {
    // Vanity: a cabinet on a plinth, with one or two basins in the countertop.
    const plinth = 0.08;
    const bodyH = h - 0.14 - plinth;
    g.add(block(w - 0.04, plinth, d - 0.08, shade(item.color2, 0.6), { z: -0.02 }));
    g.add(block(w, bodyH, d - 0.02, wood(item.color2), { y: plinth, z: -0.01, r: 0.006 }));
    const doors = style === 'double' ? 4 : w > 0.7 ? 2 : 1;
    grooves(g, shade(item.color2, 0.45), { w, y0: plinth, bodyH, z: d / 2 - 0.01, cols: doors });
    for (let i = 0; i < doors; i++) {
      const x = -w / 2 + (w / doors) * (i + 0.5) + (i % 2 ? -1 : 1) * (w / doors) * 0.35;
      g.add(block(0.012, 0.1, 0.018, trim('#a9abad'), { x: doors === 1 ? w * 0.35 : x, y: plinth + bodyH - 0.16, z: d / 2 }));
    }
    if (style === 'double') {
      g.add(block(w, 0.14, d, white, { y: h - 0.14, r: 0.02 }));
      for (const s of [-1, 1]) basin(w / 2, (s * w) / 4, h, false);
    } else {
      basin(w, 0, h);
    }
  }
  return g;
}

function buildShower({ w, d, h }, item) {
  const g = new THREE.Group();
  const fit = metal(item.color);
  const tray = ceramic(item.color2);
  const style = item.style;
  if (style === 'head') {
    showerHead(g, fit, { z: -d / 2, bottom: 0, top: h, rain: w >= 0.28 });
    return g;
  }
  const trayH = style === 'walkin' ? 0.02 : 0.05;

  if (style === 'quadrant') {
    // A quarter circle in the corner behind it: tray, curved glass and a rail along its top.
    const slice = (r, height, y, material, open) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 36, 1, open, 0, Math.PI / 2), material);
      mesh.position.set(-w / 2, y + height / 2, -d / 2);
      return mesh;
    };
    g.add(slice(w, trayH, 0, tray, false));
    g.add(slice(w - 0.01, h - trayH, trayH, glassPane(), true));
    g.add(slice(w - 0.01, 0.02, h - 0.02, fit, true));
    showerHead(g, fit, { x: -w * 0.15, z: -d / 2, bottom: 1.0, top: h - 0.08 });
    return g;
  }

  g.add(block(w, trayH, d, tray, { r: 0.008 }));
  if (style === 'walkin') {
    // One fixed pane, held by a bar to the wall behind, and a rain shower.
    const gw = w * 0.6;
    g.add(block(gw, h - trayH, 0.008, glassPane(), { x: w / 2 - gw / 2, y: trayH, z: d / 2 - 0.03 }));
    g.add(block(0.015, 0.015, d - 0.03, fit, { x: w / 2 - 0.01, y: h - 0.03, z: -0.015 }));
    g.add(block(gw, 0.012, 0.015, fit, { x: w / 2 - gw / 2, y: trayH, z: d / 2 - 0.03 }));
    showerHead(g, fit, { x: -w * 0.1, z: -d / 2, bottom: 1.0, top: h - 0.05, rain: true });
    return g;
  }

  // Enclosure and cabin: glass on the front and the right, framed at the top and the corner.
  const cabin = style === 'cabin';
  const glass = glassPane(cabin);
  g.add(block(w, h - trayH, 0.008, glass, { y: trayH, z: d / 2 - 0.02 }));
  g.add(block(0.008, h - trayH, d, glass, { x: w / 2 - 0.02, y: trayH }));
  g.add(block(w, 0.02, 0.02, fit, { y: h - 0.02, z: d / 2 - 0.02 }));
  g.add(block(0.02, 0.02, d, fit, { x: w / 2 - 0.02, y: h - 0.02 }));
  g.add(block(0.02, h - trayH, 0.02, fit, { x: w / 2 - 0.02, y: trayH, z: d / 2 - 0.02 }));
  g.add(block(0.015, 0.3, 0.03, fit, { x: w * 0.1, y: 0.95, z: d / 2 }));
  if (cabin) {
    // Solid panels at the back and left, and a roof.
    g.add(block(w, h - trayH, 0.02, tray, { y: trayH, z: -d / 2 + 0.01 }));
    g.add(block(0.02, h - trayH, d, tray, { x: -w / 2 + 0.01, y: trayH }));
    g.add(block(w, 0.03, d, tray, { y: h - 0.03 }));
  }
  showerHead(g, fit, { x: -w * 0.2, z: -d / 2 + (cabin ? 0.02 : 0), bottom: 1.0, top: h - (cabin ? 0.12 : 0.08) });
  return g;
}

function buildBathtub({ w, d, h }, item) {
  const g = new THREE.Group();
  const tub = ceramic(item.color);
  const fit = metal(item.color2);
  const inside = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.color).multiplyScalar(0.93), roughness: 0.15 });

  if (item.style === 'freestanding') {
    // An oval shell on four small feet, with a tap on the rim.
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.42, h - 0.06, 48, 1, true),
      new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.15, side: THREE.DoubleSide }),
    );
    shell.scale.set(w, 1, d);
    shell.position.y = 0.06 + (h - 0.06) / 2;
    const lip = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 48), tub);
    lip.rotation.x = -Math.PI / 2;
    lip.scale.set(w, d, 1);
    lip.position.y = h;
    g.add(shell, lip, oval(w * 0.8, 0.02, d * 0.78, inside, { y: 0.08 }));
    for (const [sx, sz] of CORNERS) g.add(post(0.025, 0.02, 0.07, fit, sx * w * 0.3, sz * d * 0.24));
    tap(g, fit, { y: h, z: -d / 2 + 0.06 });
    return g;
  }

  // Built in: four sides around a raised floor, so it reads as hollow from above.
  const t = 0.07;
  g.add(block(w, h, t, tub, { z: -d / 2 + t / 2 }));
  g.add(block(w, h, t, tub, { z: d / 2 - t / 2 }));
  for (const s of [-1, 1]) g.add(block(t, h, d - 2 * t, tub, { x: s * (w / 2 - t / 2) }));
  g.add(block(w - 2 * t, 0.12, d - 2 * t, inside, {}));
  tap(g, fit, { x: -w / 2 + 0.14, y: h, z: -d / 2 + 0.035, reach: 0.12 });
  if (item.style === 'screen') {
    // A glass screen on the rim at the tap end, and a shower on the wall behind it.
    g.add(block(w * 0.45, 1.4, 0.008, glassPane(), { x: -w / 2 + w * 0.225, y: h, z: d / 2 - 0.03 }));
    g.add(block(w * 0.45, 0.015, 0.02, fit, { x: -w / 2 + w * 0.225, y: h, z: d / 2 - 0.03 }));
    showerHead(g, fit, { x: -w / 2 + 0.3, z: -d / 2, bottom: h + 0.3, top: h + 1.4 });
  }
  return g;
}

function buildWasher({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.3, metalness: 0.1 });
  const panel = new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.25, metalness: 0.2 });
  const door = new THREE.MeshStandardMaterial({ color: '#1a1d22', roughness: 0.05, metalness: 0.4 });
  const chrome = metal('#c9ccd0');

  // One machine, uh tall from y0: a control strip with a dial at the top, and a round door.
  const machine = (y0, uh, doorScale) => {
    g.add(block(w, uh, d, body, { y: y0, r: 0.015 }));
    g.add(block(w - 0.04, 0.08, 0.006, panel, { y: y0 + uh - 0.11, z: d / 2 }));
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 20), chrome);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(w * 0.25, y0 + uh - 0.07, d / 2 + 0.012);
    g.add(dial);
    const r = Math.min(w, uh) * doorScale;
    const cy = y0 + (uh - 0.12) / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 12, 40), chrome);
    ring.position.set(0, cy, d / 2 + 0.01);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(r - 0.01, 40), door);
    glass.position.set(0, cy, d / 2 + 0.004);
    g.add(ring, glass);
  };

  if (item.style === 'top') {
    // Loaded from above: a lid on top and the controls along the back.
    g.add(block(w, h, d, body, { r: 0.015 }));
    g.add(block(w - 0.06, 0.006, d * 0.55, panel, { y: h, z: d * 0.12 }));
    g.add(block(w - 0.04, 0.006, 0.1, panel, { y: h, z: -d / 2 + 0.07 }));
  } else if (item.style === 'stack') {
    machine(0, h / 2 - 0.005, 0.3);
    machine(h / 2 + 0.005, h / 2 - 0.005, 0.26);
  } else {
    machine(0, h, 0.32);
  }
  return g;
}

function buildBathCabinet({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = wood(item.color);
  const handles = trim(item.color2);
  const groove = shade(item.color, 0.45);

  if (item.style === 'mirror') {
    // Hung on the wall: a shallow box with mirror doors.
    g.add(block(w, h, d, body, { r: 0.005 }));
    // A light, slightly blue-grey silver: a fully metallic mirror only reflects the dark surroundings.
    const mirror = new THREE.MeshStandardMaterial({ color: '#d4dde1', roughness: 0.1, metalness: 0.45 });
    const doors = w > 0.5 ? 2 : 1;
    for (let i = 0; i < doors; i++) {
      g.add(block(w / doors - 0.006, h - 0.02, 0.006, mirror, { x: -w / 2 + (w / doors) * (i + 0.5), y: 0.01, z: d / 2 + 0.003 }));
    }
    return g;
  }

  if (item.style === 'shelves') {
    const t = 0.02;
    for (const s of [-1, 1]) g.add(block(t, h, d, body, { x: s * (w / 2 - t / 2) }));
    g.add(block(w - 2 * t, h, 0.01, shade(item.color, 0.85), { z: -d / 2 + 0.005 }));
    const shelves = Math.max(3, Math.round(h / 0.35));
    for (let k = 0; k <= shelves; k++) g.add(block(w - 2 * t, t, d - 0.01, body, { y: ((h - t) * k) / shelves, z: 0.005 }));
    return g;
  }

  // Tall cabinet: doors above and below on a recessed plinth.
  const plinth = 0.06;
  const bodyH = h - plinth;
  g.add(block(w - 0.04, plinth, d - 0.04, groove, {}));
  g.add(block(w, bodyH, d, body, { y: plinth, r: 0.005 }));
  const cols = w > 0.55 ? 2 : 1;
  grooves(g, groove, { w, y0: plinth, bodyH, z: d / 2, cols, rows: 2 });
  for (let i = 0; i < cols; i++) {
    const x = cols === 1 ? w / 2 - 0.05 : i === 0 ? -0.04 : 0.04;
    for (const y of [plinth + bodyH * 0.38, plinth + bodyH * 0.58]) g.add(block(0.012, 0.12, 0.02, handles, { x, y, z: d / 2 + 0.01 }));
  }
  return g;
}

// ---- Kitchen ----

const painted = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.42 });
const stone = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3 });
// Stainless steel shines; other appliance finishes are enamel.
const appliance = (hex) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, metalness: hex === '#c3c6c9' ? 0.55 : 0.1 });
const darkGlass = () => new THREE.MeshStandardMaterial({ color: '#16181b', roughness: 0.08, metalness: 0.3 });
const steel = () => metal('#b9bcbf');
const PLINTH = 0.1;
const WORKTOP = 0.04;

// A cylinder from point a to point b (arrays [x, y, z]): a slanted leg, a rail.
function rod(a, b, radius, material) {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 12), material);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

// A bar handle across a front at z, centred at (x, y); upright ones run up the front.
function barHandle(g, material, { x = 0, y, z, length, upright = false }) {
  g.add(upright ? block(0.012, length, 0.02, material, { x, y: y - length / 2, z: z + 0.01 }) : block(length, 0.012, 0.02, material, { x, y, z: z + 0.01 }));
}

// A kitchen base unit: a recessed plinth, the carcass, fronts with handles, and a countertop.
// `layout`: 'doors' (a drawer over doors), 'drawers', 'panel' (one front, as on a dishwasher),
// 'sink' (doors only, below `apron` taken by a farmhouse sink's front), or 'plain' (fronts added by
// the caller).
function baseCabinet(g, { w, d, h }, { fronts, top, layout = 'doors', apron = 0 }) {
  const body = painted(fronts);
  const line = shade(fronts, 0.45);
  const handle = steel();
  const bodyH = h - PLINTH - WORKTOP;
  const z = d / 2 - 0.01; // the fronts, set back under the countertop's edge
  g.add(block(w - 0.02, PLINTH, d - 0.08, shade(fronts, 0.55), { z: -0.04 }));
  g.add(block(w, bodyH, d - 0.02, body, { y: PLINTH, z: -0.01 }));
  g.add(block(w, WORKTOP, d, stone(top), { y: h - WORKTOP }));

  const cols = w > 0.65 ? 2 : 1;
  const colW = w / cols;
  const handleW = Math.min(0.16, colW * 0.5);
  const doorTop = PLINTH + bodyH - apron;
  if (layout === 'drawers') {
    // Three drawers, deeper towards the floor.
    const cuts = [0.42, 0.75].map((k) => PLINTH + bodyH * k);
    for (const y of cuts) g.add(block(w - 0.02, 0.006, 0.004, line, { y, z }));
    for (const edge of [...cuts, PLINTH + bodyH]) barHandle(g, handle, { y: edge - 0.05, z, length: Math.min(0.3, w * 0.5) });
    return;
  }
  if (layout === 'plain') return;
  if (layout === 'panel') {
    barHandle(g, handle, { y: doorTop - 0.05, z, length: Math.min(0.3, w * 0.5) });
    return;
  }
  let below = doorTop;
  if (layout === 'doors') {
    below = doorTop - 0.16;
    g.add(block(w - 0.02, 0.006, 0.004, line, { y: below, z }));
    barHandle(g, handle, { y: doorTop - 0.07, z, length: Math.min(0.3, w * 0.5) });
  }
  grooves(g, line, { w, y0: PLINTH, bodyH: below - PLINTH, z, cols });
  for (let i = 0; i < cols; i++) {
    const x = cols === 1 ? w / 2 - 0.06 : (i === 0 ? -1 : 1) * 0.06;
    barHandle(g, handle, { x, y: below - 0.1, z, length: Math.min(0.14, handleW), upright: true });
  }
}

function buildKitchenCabinet({ w, d, h }, item) {
  const g = new THREE.Group();
  const style = item.style;
  if (style === 'base' || style === 'drawers') {
    baseCabinet(g, { w, d, h }, { fronts: item.color, top: item.color2, layout: style === 'drawers' ? 'drawers' : 'doors' });
    return g;
  }
  const body = painted(item.color);
  const line = shade(item.color, 0.45);
  const handle = steel();

  if (style === 'shelf') {
    // Two floating shelves with a few jars and bowls on them.
    const t = 0.03;
    const shelf = wood(item.color);
    for (const y of [0, h - t]) g.add(block(w, t, d, shelf, { y }));
    const jar = ceramic('#e9e6df');
    const rnd = seeded(Math.round(w * 100));
    for (let x = -w / 2 + 0.08; x < w / 2 - 0.06; x += 0.1 + rnd() * 0.08) {
      const tall = Math.min(h - 2 * t - 0.03, 0.08 + rnd() * 0.1);
      g.add(post(0.03, 0.03, tall, jar, x, -d * 0.1, t, 18));
    }
    g.add(oval(Math.min(0.24, w * 0.3), 0.06, Math.min(0.2, d * 0.8), jar, { x: w * 0.2, y: h, taper: 0.6 }));
    return g;
  }

  if (style === 'wall') {
    // A box on the wall with doors, the handles along their bottom edge.
    g.add(block(w, h, d, body, { r: 0.004 }));
    const cols = w > 0.65 ? 2 : 1;
    grooves(g, line, { w, y0: 0, bodyH: h, z: d / 2, cols });
    for (let i = 0; i < cols; i++) barHandle(g, handle, { x: -w / 2 + (w / cols) * (i + 0.5), y: 0.04, z: d / 2, length: Math.min(0.14, (w / cols) * 0.5) });
    return g;
  }

  // Tall pantry: doors above and below on a plinth.
  const bodyH = h - PLINTH;
  g.add(block(w - 0.02, PLINTH, d - 0.06, shade(item.color, 0.55), { z: -0.03 }));
  g.add(block(w, bodyH, d, body, { y: PLINTH, r: 0.004 }));
  const cols = w > 0.65 ? 2 : 1;
  const split = PLINTH + bodyH * 0.38;
  g.add(block(w - 0.02, 0.006, 0.004, line, { y: split, z: d / 2 }));
  grooves(g, line, { w, y0: PLINTH, bodyH, z: d / 2, cols });
  for (let i = 0; i < cols; i++) {
    const x = cols === 1 ? w / 2 - 0.06 : (i === 0 ? -1 : 1) * 0.06;
    for (const y of [split - 0.12, split + 0.12]) barHandle(g, handle, { x, y, z: d / 2, length: 0.16, upright: true });
  }
  return g;
}

// A tall tap curving over the sink at (x, y, z), its spout reaching forward (+z).
function gooseneck(g, material, { x = 0, y, z, height = 0.26, reach = 0.2 }) {
  g.add(post(0.018, 0.024, height, material, x, z, y, 16));
  const r = reach / 2;
  const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 10, 24, Math.PI), material);
  arc.rotation.y = Math.PI / 2;
  arc.position.set(x, y + height, z + r);
  g.add(arc);
  g.add(post(0.014, 0.012, 0.05, material, x, z + reach, y + height - 0.05, 12));
}

// A sink bowl set into the countertop at height y: a rim and a darker bowl.
function sinkBowl(g, { bw, bd, x = 0, y, z }) {
  g.add(block(bw + 0.03, 0.004, bd + 0.03, metal('#c6c9cc'), { x, y, z, r: 0.002 }));
  g.add(block(bw, 0.004, bd, new THREE.MeshStandardMaterial({ color: '#a9adb1', roughness: 0.35, metalness: 0.4 }), { x, y: y + 0.001, z, r: 0.002 }));
}

function buildSinkUnit({ w, d, h }, item) {
  const g = new THREE.Group();
  const chrome = steel();
  const bd = Math.min(0.42, d - 0.16);
  const bz = 0.02;
  if (item.style === 'farmhouse') {
    // A deep ceramic sink whose front shows below the countertop.
    const bw = Math.min(0.76, w - 0.1);
    const apron = 0.24;
    baseCabinet(g, { w, d, h }, { fronts: item.color, top: item.color2, layout: 'sink', apron });
    g.add(block(bw, apron + 0.02, d - 0.06, ceramic('#f4f3ef'), { y: h - apron, z: 0.04, r: 0.012 }));
    g.add(block(bw - 0.05, 0.004, d - 0.16, ceramic('#dcdbd6'), { y: h + 0.02, z: 0.05 }));
    gooseneck(g, chrome, { y: h, z: -d / 2 + 0.05 });
    return g;
  }
  baseCabinet(g, { w, d, h }, { fronts: item.color, top: item.color2, layout: 'sink' });
  if (item.style === 'double') {
    const bw = Math.min(0.42, (w - 0.24) / 2);
    for (const s of [-1, 1]) sinkBowl(g, { bw, bd, x: s * (bw / 2 + 0.03), y: h, z: bz });
  } else {
    sinkBowl(g, { bw: Math.min(0.5, w - 0.2), bd, y: h, z: bz });
  }
  gooseneck(g, chrome, { y: h, z: -d / 2 + 0.06 });
  return g;
}

// Control knobs in a row along a front at z, centred at height y.
function knobs(g, material, { w, y, z, count }) {
  for (let i = 0; i < count; i++) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 20), material);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(-w / 2 + (w * (i + 0.5)) / count, y, z + 0.012);
    g.add(knob);
  }
}

// An oven at y0, oh tall: a dark glass door with a bar handle along its top.
function ovenFront(g, finish, { w, y0, oh, z }) {
  g.add(block(w - 0.02, oh, 0.02, finish, { y: y0, z: z + 0.01 }));
  g.add(block(w - 0.1, oh * 0.55, 0.006, darkGlass(), { y: y0 + oh * 0.12, z: z + 0.021 }));
  barHandle(g, steel(), { y: y0 + oh - 0.05, z: z + 0.02, length: w - 0.12 });
}

// Cooking zones on a hob at height y: gas burners, or rings drawn on black glass.
function burners(g, { w, d, y, z = 0, gas }) {
  const cols = w > 0.75 ? 3 : 2;
  const ring = new THREE.MeshStandardMaterial({ color: gas ? '#25272a' : '#55585d', roughness: 0.4 });
  for (let i = 0; i < cols; i++) {
    for (const row of [-1, 1]) {
      const x = -w / 2 + (w * (i + 0.5)) / cols;
      const r = (cols === 3 && i === 1 ? 0.06 : 0.045) * (row < 0 ? 1.1 : 0.85);
      if (gas) {
        g.add(post(r, r + 0.005, 0.014, ring, x, z + row * d * 0.22, y, 24));
        g.add(post(r * 0.45, r * 0.45, 0.02, metal('#8f9397'), x, z + row * d * 0.22, y, 18));
      } else {
        const zone = new THREE.Mesh(new THREE.RingGeometry(r * 0.94, r, 40), ring);
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(x, y + 0.002, z + row * d * 0.22);
        g.add(zone);
      }
    }
  }
}

function buildCooking({ w, d, h }, item) {
  const g = new THREE.Group();
  const finish = appliance(item.color);
  const style = item.style;

  if (style === 'hood') {
    // A slanted canopy at the bottom and a chimney up the wall.
    const canopyH = Math.min(0.26, h * 0.6);
    const shape = new THREE.Shape();
    // Drawn as a side view (across: from the wall at the left to the front at the right; up), then
    // extruded across the hood's width.
    shape.moveTo(0, 0);
    shape.lineTo(d, 0);
    shape.lineTo(d, 0.05);
    shape.lineTo(Math.min(d, 0.26), canopyH);
    shape.lineTo(0, canopyH);
    shape.closePath();
    const canopy = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false }), finish);
    canopy.rotation.y = -Math.PI / 2;
    canopy.position.set(w / 2, 0, -d / 2);
    g.add(canopy);
    if (h > canopyH) g.add(block(Math.min(0.3, w * 0.45), h - canopyH, Math.min(0.24, d), finish, { y: canopyH, z: -d / 2 + Math.min(0.24, d) / 2 }));
    g.add(block(w - 0.06, 0.004, d - 0.06, darkGlass(), { y: -0.002, z: 0 })); // the grease filter underneath
    return g;
  }

  if (style === 'oven') {
    // A tall housing in the cabinet fronts: a door below, the oven, a compact oven above, a door on top.
    const body = painted(item.color2);
    const line = shade(item.color2, 0.45);
    g.add(block(w - 0.02, PLINTH, d - 0.06, shade(item.color2, 0.55), { z: -0.03 }));
    g.add(block(w, h - PLINTH, d - 0.02, body, { y: PLINTH, z: -0.01 }));
    const z = d / 2 - 0.01;
    const ovenY = Math.min(0.85, h - 1.05);
    ovenFront(g, finish, { w, y0: ovenY, oh: 0.6, z });
    ovenFront(g, finish, { w, y0: ovenY + 0.62, oh: 0.42, z });
    g.add(block(w - 0.02, 0.006, 0.004, line, { y: ovenY - 0.004, z }));
    barHandle(g, steel(), { y: ovenY - 0.06, z, length: Math.min(0.3, w * 0.5) });
    if (h - ovenY - 1.06 > 0.12) {
      g.add(block(w - 0.02, 0.006, 0.004, line, { y: ovenY + 1.06, z }));
      barHandle(g, steel(), { y: ovenY + 1.12, z, length: Math.min(0.3, w * 0.5) });
    }
    return g;
  }

  if (style === 'hob') {
    // An oven under the counter, a drawer below it, and a glass hob on top.
    baseCabinet(g, { w, d, h }, { fronts: item.color2, top: item.color3, layout: 'plain' });
    const oh = Math.min(0.6, h - PLINTH - WORKTOP - 0.16);
    const ovenY = h - WORKTOP - oh - 0.01;
    ovenFront(g, finish, { w, y0: ovenY, oh, z: d / 2 - 0.01 });
    barHandle(g, steel(), { y: ovenY - 0.06, z: d / 2 - 0.01, length: Math.min(0.3, w * 0.5) });
    const hw = Math.min(w - 0.08, 0.78);
    g.add(block(hw, 0.006, Math.min(0.52, d - 0.08), darkGlass(), { y: h, z: 0.01, r: 0.003 }));
    burners(g, { w: hw, d: Math.min(0.52, d - 0.08), y: h + 0.006, z: 0.01, gas: false });
    return g;
  }

  // Freestanding range: a storage drawer at the bottom, the oven, knobs, gas burners and a backguard.
  const top = h - 0.02;
  g.add(block(w, top, d - 0.02, finish, { z: -0.01, r: 0.006 }));
  const z = d / 2 - 0.01;
  g.add(block(w - 0.03, 0.006, 0.004, shade(item.color, 0.45), { y: 0.14, z: z + 0.002 }));
  ovenFront(g, finish, { w, y0: 0.15, oh: top - 0.3, z });
  knobs(g, metal('#2a2c2f'), { w: w - 0.1, y: top - 0.07, z: z + 0.002, count: w > 0.75 ? 6 : 4 });
  g.add(block(w, 0.02, d - 0.02, new THREE.MeshStandardMaterial({ color: '#1f2124', roughness: 0.35 }), { y: top, z: -0.01 }));
  burners(g, { w: w - 0.06, d, y: h, z: 0.01, gas: true });
  g.add(block(w, 0.08, 0.02, finish, { y: h, z: -d / 2 + 0.01 }));
  return g;
}

function buildFridge({ w, d, h }, item) {
  const g = new THREE.Group();
  const finish = appliance(item.color);
  const line = shade(item.color, 0.45);
  const handle = steel();
  const z = d / 2;
  const style = item.style;

  if (style === 'retro') {
    // Rounded, on short legs, with a small freezer door on top and chunky chrome handles.
    const legH = 0.05;
    for (const [sx, sz] of CORNERS) g.add(leg(0.015, 0.012, legH, metal('#c9ccd0'), sx * (w / 2 - 0.06), sz * (d / 2 - 0.08)));
    g.add(block(w, h - legH, d, finish, { y: legH, r: 0.06 }));
    const split = legH + (h - legH) * 0.7;
    g.add(block(w - 0.06, 0.008, 0.004, line, { y: split, z }));
    const chrome = metal('#d5d8db');
    for (const [y, len] of [[split - 0.08, 0.22], [split + 0.04, 0.12]]) g.add(block(0.03, len, 0.035, chrome, { x: -w / 2 + 0.06, y: y - (y < split ? len : 0), z: z + 0.01, r: 0.012 }));
    return g;
  }

  g.add(block(w, h, d, finish, { r: 0.012 }));
  if (style === 'american') {
    // Two tall doors side by side: the freezer on the left with a water and ice dispenser.
    const x = -w * 0.08;
    g.add(block(0.008, h - 0.04, 0.004, line, { x, y: 0.02, z }));
    g.add(block(0.2, 0.3, 0.006, darkGlass(), { x: -w / 2 + (w / 2 + x) / 2, y: h * 0.52, z: z + 0.002 }));
    for (const s of [-1, 1]) barHandle(g, handle, { x: x + s * 0.04, y: h * 0.78, z, length: h * 0.5, upright: true });
    return g;
  }
  if (style === 'under') {
    barHandle(g, handle, { y: h - 0.06, z, length: w * 0.6 });
    return g;
  }
  if (style === 'single') {
    barHandle(g, handle, { x: -w / 2 + 0.05, y: h * 0.72, z, length: 0.4, upright: true });
    return g;
  }
  // Fridge-freezer: the fridge on top, the freezer drawers below.
  const split = h * 0.38;
  g.add(block(w - 0.02, 0.008, 0.004, line, { y: split, z }));
  g.add(block(w - 0.02, 0.006, 0.004, line, { y: split / 2, z }));
  barHandle(g, handle, { x: -w / 2 + 0.05, y: split + 0.45, z, length: 0.4, upright: true });
  barHandle(g, handle, { y: split - 0.04, z, length: w * 0.5 });
  barHandle(g, handle, { y: split / 2 - 0.04, z, length: w * 0.5 });
  return g;
}

function buildDishwasher({ w, d, h }, item) {
  const g = new THREE.Group();
  if (item.style === 'integrated') {
    // Behind a cabinet front, under the countertop.
    baseCabinet(g, { w, d, h }, { fronts: item.color, top: item.color2, layout: 'panel' });
    return g;
  }
  const finish = appliance(item.color);
  g.add(block(w, h, d, finish, { r: 0.01 }));
  g.add(block(w - 0.04, 0.07, 0.006, new THREE.MeshStandardMaterial({ color: '#2a2c2f', roughness: 0.25 }), { y: h - 0.1, z: d / 2 }));
  g.add(block(w - 0.03, 0.006, 0.004, shade(item.color, 0.45), { y: 0.1, z: d / 2 }));
  barHandle(g, steel(), { y: h - 0.16, z: d / 2, length: w * 0.6 });
  return g;
}

function buildIsland({ w, d, h }, item) {
  const g = new THREE.Group();
  const body = painted(item.color);
  const line = shade(item.color, 0.45);
  const top = stone(item.color2);
  const handle = steel();
  const style = item.style;
  const bodyH = h - PLINTH - WORKTOP;
  // The cabinet: the working side faces back (-z); the front (+z) is where people sit.
  const overhang = style === 'bar' ? Math.min(0.3, d * 0.35) : 0.03;
  const cw = style === 'table' ? Math.max(0.5, w * 0.55) : w - 0.06;
  const cx = style === 'table' ? -w / 2 + cw / 2 : 0;
  const cd = d - overhang - 0.03;
  const cz = -d / 2 + 0.03 + cd / 2;
  g.add(block(cw - 0.08, PLINTH, cd - 0.08, shade(item.color, 0.55), { x: cx, z: cz }));
  g.add(block(cw, bodyH, cd, body, { x: cx, y: PLINTH, z: cz }));
  g.add(block(w, WORKTOP, d, top, { y: h - WORKTOP }));

  // Drawers on the working side, plain doors on the other.
  const cols = Math.max(1, Math.round(cw / 0.6));
  const back = cz - cd / 2;
  grooves(g, line, { w: cw, x0: cx - cw / 2, y0: PLINTH, bodyH, z: back, cols, rows: 3 });
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 3; j++) {
      const x = cx - cw / 2 + (cw * (i + 0.5)) / cols;
      g.add(block(Math.min(0.2, (cw / cols) * 0.5), 0.012, 0.02, handle, { x, y: PLINTH + (bodyH * (j + 1)) / 3 - 0.05, z: back - 0.01 }));
    }
  }
  if (style !== 'bar') grooves(g, line, { w: cw, x0: cx - cw / 2, y0: PLINTH, bodyH, z: cz + cd / 2, cols });

  if (style === 'table') {
    // The countertop runs on as a table, down to the floor at the end in one piece.
    g.add(block(WORKTOP, h - WORKTOP, d, top, { x: w / 2 - WORKTOP / 2 }));
  }
  return g;
}

function buildStool({ w, d, h }, item) {
  const g = new THREE.Group();
  const frame = trim(item.color2);
  const style = item.style;
  const r = Math.min(w, d) / 2;
  const seatT = 0.045;
  const seatY = h - seatT;

  if (style === 'wood') {
    // A round wooden seat on four splayed legs, with a metal foot ring.
    const seat = wood(item.color);
    g.add(post(r * 0.92, r * 0.88, seatT, seat, 0, 0, seatY, 32));
    for (const [sx, sz] of CORNERS) {
      const a = [sx * r * 0.45, seatY, sz * r * 0.45];
      const b = [sx * r * 0.82, 0, sz * r * 0.82];
      g.add(rod(a, b, 0.016, seat));
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.72, 0.008, 8, 32), frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * 0.33;
    g.add(ring);
    return g;
  }

  if (style === 'metal') {
    // A round padded seat on a single column with a foot ring and a round base.
    g.add(post(r * 0.9, r * 0.9, seatT, leather(item.color), 0, 0, seatY, 32));
    g.add(post(0.025, 0.025, seatY, frame, 0, 0, 0, 16));
    g.add(post(r * 0.85, r * 0.9, 0.015, frame, 0, 0, 0, 32));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.65, 0.009, 8, 32), frame);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = h * 0.38;
    g.add(ring);
    return g;
  }

  // Bar chair: a padded seat and backrest on four thin legs with a foot rail.
  const soft = fabric(item.color);
  g.add(block(w * 0.94, seatT + 0.02, d * 0.9, soft, { y: seatY - 0.02, z: 0.01, r: 0.02 }));
  g.add(block(w * 0.94, 0.26, 0.05, soft, { y: h + 0.04, z: -d / 2 + 0.04, r: 0.02 }));
  for (const [sx, sz] of CORNERS) {
    g.add(leg(0.01, 0.01, seatY, frame, sx * (w / 2 - 0.04), sz * (d / 2 - 0.04)));
    if (sz < 0) g.add(rod([sx * (w / 2 - 0.04), seatY, -d / 2 + 0.04], [sx * (w / 2 - 0.05), h + 0.08, -d / 2 + 0.03], 0.009, frame));
  }
  g.add(block(w - 0.08, 0.016, 0.016, frame, { y: h * 0.3, z: d / 2 - 0.04 }));
  for (const s of [-1, 1]) g.add(block(0.016, 0.016, d - 0.08, frame, { x: s * (w / 2 - 0.04), y: h * 0.3 }));
  return g;
}
