// Doors and windows: designs, sizes and the 3D models. They sit in a wall; each one is stored by its
// wall and its position along it, so it moves and turns with the wall. Sizes are in cm.
import * as THREE from 'three';

const FRAMES = [
  { name: 'White', hex: '#f4f3ef' },
  { name: 'Light grey', hex: '#c9cbcc' },
  { name: 'Anthracite', hex: '#3a3d42' },
  { name: 'Black', hex: '#1e1f22' },
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Walnut', hex: '#5d4030' },
];

const DOORS = [
  { name: 'White', hex: '#f4f3ef' },
  { name: 'Oak', hex: '#b88f5d' },
  { name: 'Walnut', hex: '#5d4030' },
  { name: 'Black', hex: '#1e1f22' },
  { name: 'Sage', hex: '#9aa88a' },
  { name: 'Navy', hex: '#2c3a57' },
];

// `sill` is how far above the floor a window starts. Doors: `flip` puts the hinges on the right,
// `swap` makes the door open toward the other side of the wall.
export const OPENINGS = {
  door: {
    label: 'Door',
    defaults: { style: 'single', width: 90, height: 210, sill: 0, color: '#f4f3ef', color2: '#f4f3ef', flip: false, swap: false },
    limits: { width: [60, 300], height: [180, 280] },
    colors: [
      { key: 'color', label: 'Frame', palette: FRAMES },
      { key: 'color2', label: 'Door', palette: DOORS },
    ],
    styles: [
      { id: 'single', label: 'Single', name: 'Door' },
      { id: 'double', label: 'Double', name: 'Double door', defaults: { width: 150 }, limits: { width: [100, 300] } },
      { id: 'sliding', label: 'Sliding glass', name: 'Sliding door', defaults: { width: 180, height: 220, color: '#3a3d42' }, limits: { width: [120, 400] } },
      { id: 'doorway', label: 'Open doorway', name: 'Doorway', defaults: { width: 100 } },
    ],
  },
  window: {
    label: 'Window',
    defaults: { style: 'standard', width: 120, height: 130, sill: 90, color: '#f4f3ef', color2: '#f4f3ef', flip: false, swap: false },
    limits: { width: [40, 400], height: [40, 280], sill: [0, 200] },
    colors: [{ key: 'color', label: 'Frame', palette: FRAMES }],
    styles: [
      { id: 'standard', label: 'Two panes', name: 'Window' },
      { id: 'picture', label: 'Picture', name: 'Picture window', defaults: { width: 160, height: 140, sill: 70 } },
      { id: 'grid', label: 'Grid', name: 'Grid window', defaults: { width: 100, height: 120 } },
      { id: 'tall', label: 'Floor to ceiling', name: 'Tall window', defaults: { width: 120, height: 240, sill: 5 } },
    ],
  },
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export const openingStyleOf = (o) => OPENINGS[o.kind].styles.find((s) => s.id === o.style) ?? OPENINGS[o.kind].styles[0];
export const openingLimitsOf = (o) => ({ ...OPENINGS[o.kind].limits, ...openingStyleOf(o).limits });

export function newOpeningOf(kind, styleId) {
  const def = OPENINGS[kind];
  const style = def.styles.find((s) => s.id === styleId) ?? def.styles[0];
  return { kind, ...def.defaults, ...style.defaults, style: style.id, name: style.name };
}

export function normalizeOpening(o) {
  const next = { ...o };
  for (const [key, [lo, hi]] of Object.entries(openingLimitsOf(o))) {
    if (typeof next[key] === 'number') next[key] = clamp(next[key], lo, hi);
  }
  if (next.kind === 'door') next.sill = 0;
  return next;
}

// ---- Models ----

const FRAME_W = 0.05; // m

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  return mesh;
}

const glassMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: '#cfe1e8',
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

// The model of a door or window, in its own frame: x along the wall (from the wall's start toward its
// end), z across the wall (toward the wall's left side), y up from the bottom of the opening.
// `span` is the opening in metres: width and height; `t` the wall's thickness.
export function buildOpening(o, { width: w, height: h }, t) {
  const g = new THREE.Group();
  const frame = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.5 });
  if (o.kind === 'window') {
    windowModel(g, o, w, h, t, frame);
  } else {
    doorModel(g, o, w, h, t, frame);
  }
  g.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = !m.material.transparent;
      m.receiveShadow = true;
    }
  });
  return g;
}

function windowModel(g, o, w, h, t, frame) {
  const depth = Math.min(0.08, t * 0.7);
  const fw = FRAME_W;
  g.add(box(fw, h, depth, frame, -w / 2 + fw / 2, 0, 0));
  g.add(box(fw, h, depth, frame, w / 2 - fw / 2, 0, 0));
  g.add(box(w, fw, depth, frame, 0, 0, 0));
  g.add(box(w, fw, depth, frame, 0, h - fw, 0));
  g.add(box(w - 2 * fw, h - 2 * fw, 0.008, glassMaterial(), 0, fw, 0));

  const bar = (bw, bh, x, y) => g.add(box(bw, bh, depth * 0.8, frame, x, y, 0));
  if (o.style === 'standard' || o.style === 'tall') bar(fw * 0.8, h - 2 * fw, 0, fw);
  if (o.style === 'tall') bar(w - 2 * fw, fw * 0.6, 0, h * 0.78);
  if (o.style === 'grid') {
    for (const k of [1, 2]) bar(0.02, h - 2 * fw, -w / 2 + (w * k) / 3, fw);
    for (const k of [1, 2]) bar(w - 2 * fw, 0.02, 0, fw + ((h - 2 * fw) * k) / 3);
  }
  // A sill board under the window, sticking out a little on both sides of the wall.
  if (o.sill > 5) g.add(box(w + 0.08, 0.025, t + 0.06, frame, 0, -0.025, 0));
}

function doorModel(g, o, w, h, t, frame) {
  const fw = FRAME_W;
  const depth = t + 0.02;
  g.add(box(fw, h, depth, frame, -w / 2 + fw / 2, 0, 0));
  g.add(box(fw, h, depth, frame, w / 2 - fw / 2, 0, 0));
  g.add(box(w, fw, depth, frame, 0, h - fw, 0));
  const inner = w - 2 * fw;
  const leafH = h - fw - 0.01;
  const side = o.swap ? -1 : 1; // the face the door is flush with, and swings toward
  if (o.style === 'doorway') return;

  if (o.style === 'sliding') {
    const glass = glassMaterial();
    const panelW = inner / 2 + 0.03;
    for (const [s, z] of [
      [-1, 0.012],
      [1, -0.012],
    ]) {
      const x = s * (inner / 2 - panelW / 2);
      g.add(box(panelW, leafH, 0.006, glass, x, 0.005, z));
      g.add(box(panelW, 0.04, 0.03, frame, x, 0.005, z));
      g.add(box(panelW, 0.04, 0.03, frame, x, leafH - 0.035, z));
      for (const e of [-1, 1]) g.add(box(0.04, leafH, 0.03, frame, x + (e * (panelW - 0.04)) / 2, 0.005, z));
    }
    return;
  }

  const leafMat = new THREE.MeshStandardMaterial({ color: o.color2, roughness: 0.6 });
  const panelMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.color2).multiplyScalar(0.88), roughness: 0.6 });
  const handleMat = new THREE.MeshStandardMaterial({ color: '#9a9c9f', roughness: 0.3, metalness: 0.8 });
  const leafT = 0.04;
  const z = side * (t / 2 - leafT / 2 - 0.005);
  // Each leaf: x0 is its hinge edge, dir the way it extends from the hinge.
  const leaves = o.style === 'double' ? [[-inner / 2, 1, inner / 2], [inner / 2, -1, inner / 2]] : [[o.flip ? inner / 2 : -inner / 2, o.flip ? -1 : 1, inner]];
  for (const [x0, dir, lw] of leaves) {
    const cx = x0 + (dir * lw) / 2;
    g.add(box(lw - 0.004, leafH, leafT, leafMat, cx, 0.005, z));
    for (const face of [-1, 1]) {
      const fz = z + face * (leafT / 2 + 0.001);
      g.add(box(lw * 0.62, leafH * 0.36, 0.002, panelMat, cx, leafH * 0.52, fz));
      g.add(box(lw * 0.62, leafH * 0.3, 0.002, panelMat, cx, leafH * 0.12, fz));
      g.add(box(0.12, 0.02, 0.025, handleMat, x0 + dir * (lw - 0.09), 1.0, z + face * (leafT / 2 + 0.0125)));
    }
  }
}

// The door's swing on the floor: a quarter circle from each hinge, on the side it opens toward.
export function buildSwing(o, { width: w }) {
  const g = new THREE.Group();
  if (o.kind !== 'door' || o.style === 'doorway' || o.style === 'sliding') return g;
  const material = new THREE.MeshBasicMaterial({ color: '#26292d', transparent: true, opacity: 0.55, depthWrite: false });
  const inner = w - 2 * FRAME_W;
  const side = o.swap ? -1 : 1;
  const leaves = o.style === 'double' ? [[-inner / 2, 1, inner / 2], [inner / 2, -1, inner / 2]] : [[o.flip ? inner / 2 : -inner / 2, o.flip ? -1 : 1, inner]];
  for (const [x0, dir, r] of leaves) {
    // Lying flat, the ring's angle a points along (cos a, -sin a) on the floor: 0 is +x, -90° is +z.
    // The arc runs from the closed leaf (along the wall) to the open leaf (straight out from it).
    const start = dir > 0 ? (side > 0 ? -Math.PI / 2 : 0) : side > 0 ? Math.PI : Math.PI / 2;
    const arc = new THREE.Mesh(new THREE.RingGeometry(r - 0.008, r, 32, 1, start, Math.PI / 2), material);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(x0, 0.004, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, r), material);
    leaf.position.set(x0, 0.004, (side * r) / 2);
    g.add(arc, leaf);
  }
  return g;
}
