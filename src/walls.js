// Walls are independent pieces: a run from (x1, z1) to (x2, z2) in cm, with its own thickness, height,
// gap below (a beam over an opening) and color, optionally curved. Walls whose ends meet are joined:
// their corners are mitred, and dragging the corner moves every end that meets there. The floor is
// filled wherever walls enclose an area.

export const JOIN = 0.5; // ends closer than this (cm) are joined
export const SNAP = 20; // cm: a dragged end this close to another wall connects to it
export const LIMITS = { length: [10, 3000], thickness: [4, 60], height: [20, 500], gap: [0, 450] };

export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const endsOf = (w) => [
  { x: w.x1, z: w.z1 },
  { x: w.x2, z: w.z2 },
];
export const lengthOf = (w) => Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
export const normDeg = (d) => ((d % 360) + 360) % 360;
// Angle in the floor plan: 0° points along +x, 90° along +z (down the screen in the top view).
export const angleOf = (w) => normDeg((Math.atan2(w.z2 - w.z1, w.x2 - w.x1) * 180) / Math.PI);
export const maxCurve = (w) => Math.floor(lengthOf(w) / 2); // a half circle

const left = (u) => ({ x: -u.z, z: u.x });
const unit = (dx, dz) => {
  const l = Math.hypot(dx, dz) || 1;
  return { x: dx / l, z: dz / l };
};

// ---- Path: the wall's centre line, an arc if it is curved ----

const paths = new WeakMap();

// Points along the centre line. A curved wall is an arc through both ends whose middle sits `curve` cm
// to the right of the straight line (negative: to the left).
export function pathOf(w) {
  let points = paths.get(w);
  if (points) return points;
  const a = { x: w.x1, z: w.z1 };
  const b = { x: w.x2, z: w.z2 };
  const chord = dist(a, b);
  const limit = chord / 2;
  const curve = Math.max(-limit, Math.min(limit, w.curve || 0));
  if (Math.abs(curve) < 0.5 || chord < 1) {
    points = [a, b];
  } else {
    const normal = { x: (b.z - a.z) / chord, z: -(b.x - a.x) / chord };
    const half = chord / 2;
    const s = Math.abs(curve);
    const sign = Math.sign(curve);
    const radius = (half * half + s * s) / (2 * s);
    const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const centre = { x: mid.x + normal.x * (curve - sign * radius), z: mid.z + normal.z * (curve - sign * radius) };
    const sweep = Math.atan2(half, radius - s);
    const apex = Math.atan2(mid.z + normal.z * curve - centre.z, mid.x + normal.x * curve - centre.x);
    const miss = (angle) => Math.hypot(centre.x + radius * Math.cos(angle) - a.x, centre.z + radius * Math.sin(angle) - a.z);
    const dir = miss(apex - sweep) < miss(apex + sweep) ? 1 : -1;
    const steps = Math.max(6, Math.ceil((2 * sweep) / (Math.PI / 24)));
    points = [];
    for (let k = 0; k <= steps; k++) {
      const angle = apex - dir * sweep + (dir * 2 * sweep * k) / steps;
      points.push(k === 0 ? a : k === steps ? b : { x: centre.x + radius * Math.cos(angle), z: centre.z + radius * Math.sin(angle) });
    }
  }
  paths.set(w, points);
  return points;
}

export function pathLength(w) {
  const p = pathOf(w);
  let l = 0;
  for (let k = 1; k < p.length; k++) l += dist(p[k - 1], p[k]);
  return l;
}

export function midpointOf(w) {
  const p = pathOf(w);
  if (p.length === 2) return { x: (p[0].x + p[1].x) / 2, z: (p[0].z + p[1].z) / 2 };
  return p[Math.floor(p.length / 2)];
}

// ---- Joints ----

// For every wall, the other wall ends that meet each of its two ends: joins.get(id) = [[...], [...]].
export function jointsOf(walls) {
  const joins = new Map(walls.map((w) => [w.id, [[], []]]));
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const a = endsOf(walls[i]);
      const b = endsOf(walls[j]);
      for (let ea = 0; ea < 2; ea++) {
        for (let eb = 0; eb < 2; eb++) {
          if (dist(a[ea], b[eb]) <= JOIN) {
            joins.get(walls[i].id)[ea].push({ wall: walls[j], end: eb });
            joins.get(walls[j].id)[eb].push({ wall: walls[i], end: ea });
          }
        }
      }
    }
  }
  return joins;
}

// Every wall end within JOIN of point p: the corner that moves together when dragged.
export function endsAt(walls, p) {
  const found = [];
  for (const w of walls) {
    endsOf(w).forEach((e, end) => {
      if (dist(e, p) <= JOIN) found.push({ id: w.id, end });
    });
  }
  return found;
}

// Direction pointing away from the given end, along the wall.
function awayFrom(w, end) {
  const p = pathOf(w);
  return end === 0 ? unit(p[1].x - p[0].x, p[1].z - p[0].z) : unit(p[p.length - 2].x - p.at(-1).x, p[p.length - 2].z - p.at(-1).z);
}

function intersectLines(p, u, q, v) {
  const den = u.x * v.z - u.z * v.x;
  if (Math.abs(den) < 1e-6) return null;
  const t = ((q.x - p.x) * v.z - (q.z - p.z) * v.x) / den;
  return { x: p.x + u.x * t, z: p.z + u.z * t };
}

// Outer corners where this wall's end meets exactly one other wall, so the two join with a clean mitre.
// Returns [corner on this wall's left side, corner on its right side] (left/right of the direction
// pointing away from the end), or null for a square end.
function mitre(w, end, joins) {
  const others = joins.get(w.id)[end];
  if (others.length !== 1) return null;
  const { wall: v, end: ve } = others[0];
  const P = end === 0 ? { x: w.x1, z: w.z1 } : { x: w.x2, z: w.z2 };
  const u = awayFrom(w, end);
  const uv = awayFrom(v, ve);
  const h = w.thickness / 2;
  const hv = v.thickness / 2;
  const lu = left(u);
  const lv = left(uv);
  const leftCorner = intersectLines({ x: P.x + lu.x * h, z: P.z + lu.z * h }, u, { x: P.x - lv.x * hv, z: P.z - lv.z * hv }, uv);
  const rightCorner = intersectLines({ x: P.x - lu.x * h, z: P.z - lu.z * h }, u, { x: P.x + lv.x * hv, z: P.z + lv.z * hv }, uv);
  if (!leftCorner || !rightCorner) return null;
  const reach = 3 * Math.max(h, hv);
  if (dist(leftCorner, P) > reach || dist(rightCorner, P) > reach) return null; // very sharp angle: keep it square
  return [leftCorner, rightCorner];
}

// The wall's outline on the floor (cm), mitred where it meets one other wall.
export function footprintOf(w, joins) {
  const p = pathOf(w);
  const h = w.thickness / 2;
  const n = p.length;
  const tangents = p.map((_, k) => unit(p[Math.min(n - 1, k + 1)].x - p[Math.max(0, k - 1)].x, p[Math.min(n - 1, k + 1)].z - p[Math.max(0, k - 1)].z));
  const L = p.map((q, k) => ({ x: q.x + left(tangents[k]).x * h, z: q.z + left(tangents[k]).z * h }));
  const R = p.map((q, k) => ({ x: q.x - left(tangents[k]).x * h, z: q.z - left(tangents[k]).z * h }));
  if (joins) {
    // At the start, "away" runs along the wall, so its left is the wall's left.
    const start = mitre(w, 0, joins);
    if (start) [L[0], R[0]] = start;
    // At the end, "away" runs backwards, so its left is the wall's right.
    const end = mitre(w, 1, joins);
    if (end) [R[n - 1], L[n - 1]] = end;
  }
  return [...L, ...R.reverse()];
}

// ---- Floor ----

export function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

export function contains(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

function hull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// Where to split segment a–b: crossings with c–d and ends of c–d touching it. Returns t values along a–b.
function splitsOn(a, b, c, d) {
  const ts = [];
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const len2 = ex * ex + ez * ez;
  if (len2 < 1e-9) return ts;
  for (const p of [c, d]) {
    const t = ((p.x - a.x) * ex + (p.z - a.z) * ez) / len2;
    if (t > 0 && t < 1 && Math.hypot(a.x + ex * t - p.x, a.z + ez * t - p.z) <= JOIN) ts.push(t);
  }
  const fx = d.x - c.x;
  const fz = d.z - c.z;
  const den = ex * fz - ez * fx;
  if (Math.abs(den) > 1e-9) {
    const t = ((c.x - a.x) * fz - (c.z - a.z) * fx) / den;
    const s = ((c.x - a.x) * ez - (c.z - a.z) * ex) / den;
    if (t > 0 && t < 1 && s > 0 && s < 1) ts.push(t);
  }
  return ts;
}

const floorCache = new WeakMap();

// Floor outlines (cm): every area enclosed by walls. A group of connected walls that encloses nothing
// (a room with an open side) gets the floor inside its outer outline instead.
export function floorsOf(walls) {
  let floors = floorCache.get(walls);
  if (floors) return floors;

  // Centre-line segments, split wherever walls cross or touch.
  const segs = walls.flatMap((w) => {
    const p = pathOf(w);
    return p.slice(1).map((q, k) => [p[k], q]);
  });
  const pieces = [];
  segs.forEach(([a, b], i) => {
    const ts = [0, 1];
    segs.forEach(([c, d], j) => {
      if (i !== j) ts.push(...splitsOn(a, b, c, d));
    });
    ts.sort((x, y) => x - y);
    for (let k = 1; k < ts.length; k++) {
      if (ts[k] - ts[k - 1] < 1e-6) continue;
      const at = (t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      pieces.push([at(ts[k - 1]), at(ts[k])]);
    }
  });

  // Vertices (merging points closer than JOIN) and undirected edges.
  const verts = [];
  const vertex = (p) => {
    let i = verts.findIndex((v) => dist(v, p) <= JOIN);
    if (i < 0) i = verts.push({ x: p.x, z: p.z }) - 1;
    return i;
  };
  const adj = new Map();
  const link = (i, j) => {
    if (i === j) return;
    if (!adj.has(i)) adj.set(i, new Set());
    if (!adj.has(j)) adj.set(j, new Set());
    adj.get(i).add(j);
    adj.get(j).add(i);
  };
  for (const [a, b] of pieces) link(vertex(a), vertex(b));

  // Connected components, before pruning.
  const component = new Map();
  let nComponents = 0;
  for (const start of adj.keys()) {
    if (component.has(start)) continue;
    const stack = [start];
    component.set(start, nComponents);
    while (stack.length) {
      const v = stack.pop();
      for (const u of adj.get(v)) {
        if (!component.has(u)) {
          component.set(u, nComponents);
          stack.push(u);
        }
      }
    }
    nComponents++;
  }

  // Loose ends can't enclose anything: prune them away.
  const pruned = new Map([...adj].map(([v, set]) => [v, new Set(set)]));
  const queue = [...pruned.keys()].filter((v) => pruned.get(v).size <= 1);
  while (queue.length) {
    const v = queue.pop();
    const set = pruned.get(v);
    if (!set) continue;
    for (const u of set) {
      pruned.get(u).delete(v);
      if (pruned.get(u).size === 1) queue.push(u);
    }
    pruned.delete(v);
  }

  // Trace faces: from each directed edge, turn to the next edge clockwise at every vertex. Enclosed areas
  // come out with positive signed area; the outside of each cluster comes out negative.
  const angle = (i, j) => Math.atan2(verts[j].z - verts[i].z, verts[j].x - verts[i].x);
  const sorted = new Map([...pruned].map(([v, set]) => [v, [...set].sort((a, b) => angle(v, a) - angle(v, b))]));
  const used = new Set();
  floors = [];
  const hasFloor = new Set();
  for (const [u, around] of sorted) {
    for (const v of around) {
      if (used.has(`${u}>${v}`)) continue;
      const face = [];
      let [a, b] = [u, v];
      for (let guard = 0; guard < 10000 && !used.has(`${a}>${b}`); guard++) {
        used.add(`${a}>${b}`);
        face.push(verts[a]);
        const list = sorted.get(b);
        const k = list.indexOf(a);
        const c = list[(k - 1 + list.length) % list.length];
        [a, b] = [b, c];
      }
      const area = signedArea(face);
      if (area > 2500) {
        floors.push(face);
        hasFloor.add(component.get(u));
      }
    }
  }

  // Connected walls that enclose nothing: fill their outer outline.
  for (let c = 0; c < nComponents; c++) {
    if (hasFloor.has(c)) continue;
    const pts = [...component].filter(([, comp]) => comp === c).map(([v]) => verts[v]);
    if (pts.length < 3) continue;
    const outline = hull(pts);
    if (Math.abs(signedArea(outline)) >= 10000) floors.push(signedArea(outline) < 0 ? outline.reverse() : outline);
  }

  floorCache.set(walls, floors);
  return floors;
}

// ---- Snapping and hit tests ----

export function pointToSegment(p, a, b) {
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.z - a.z) * ez) / (ex * ex + ez * ez || 1)));
  return { d: Math.hypot(p.x - (a.x + ex * t), p.z - (a.z + ez * t)), t, x: a.x + ex * t, z: a.z + ez * t };
}

// Where a dragged end at p should connect: another wall's end (kind 'end'), or else a point along
// another straight wall (kind 'wall', a T-junction). `skip` holds the ids of walls that are moving.
export function snapTarget(p, walls, skip) {
  let best = null;
  for (const w of walls) {
    if (skip.has(w.id)) continue;
    for (const e of endsOf(w)) {
      const d = dist(p, e);
      if (d < SNAP && (!best || d < best.d)) best = { x: e.x, z: e.z, d, kind: 'end' };
    }
  }
  if (best) return best;
  for (const w of walls) {
    if (skip.has(w.id) || w.curve) continue;
    const hit = pointToSegment(p, { x: w.x1, z: w.z1 }, { x: w.x2, z: w.z2 });
    if (hit.d < SNAP * 0.6 && hit.t > 0.01 && hit.t < 0.99 && (!best || hit.d < best.d)) best = { ...hit, kind: 'wall' };
  }
  return best;
}

// Does snap target a beat snap target b? Meeting another wall's end beats landing on a wall's side.
export const betterSnap = (a, b) => !b || (a.kind === b.kind ? a.d < b.d : a.kind === 'end');

// Straight pieces of the wall as boxes: centre, direction along the wall, half length, half thickness.
export function boxesOf(w) {
  const p = pathOf(w);
  return p.slice(1).map((q, k) => {
    const a = p[k];
    const u = unit(q.x - a.x, q.z - a.z);
    return { cx: (a.x + q.x) / 2, cz: (a.z + q.z) / 2, u, hu: dist(a, q) / 2, hv: w.thickness / 2 };
  });
}

// Separating-axis test for two boxes { cx, cz, u, hu, hv } (v is u turned 90°).
export function boxesOverlap(a, b, slack = 0.5) {
  const dx = b.cx - a.cx;
  const dz = b.cz - a.cz;
  const axes = [a.u, left(a.u), b.u, left(b.u)];
  for (const ax of axes) {
    const r = (box) => box.hu * Math.abs(box.u.x * ax.x + box.u.z * ax.z) + box.hv * Math.abs(-box.u.z * ax.x + box.u.x * ax.z);
    if (Math.abs(dx * ax.x + dz * ax.z) >= r(a) + r(b) - slack) return false;
  }
  return true;
}

// Distance from (ox, oz) along (dx, dz) to the nearest edge of any of the outlines.
export function rayDistance(outlines, ox, oz, dx, dz) {
  let best = Infinity;
  for (const poly of outlines) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const ex = q.x - p.x;
      const ez = q.z - p.z;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const wx = p.x - ox;
      const wz = p.z - oz;
      const t = (wx * ez - wz * ex) / den;
      const u = (wx * dz - wz * dx) / den;
      if (t > 1e-6 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
  }
  return best;
}

export function boundsOf(walls) {
  if (!walls.length) return { minX: -200, maxX: 200, minZ: -250, maxZ: 250, width: 400, length: 500, cx: 0, cz: 0 };
  const pts = walls.flatMap(pathOf);
  const xs = pts.map((p) => p.x);
  const zs = pts.map((p) => p.z);
  const b = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  return { ...b, width: b.maxX - b.minX, length: b.maxZ - b.minZ, cx: (b.minX + b.maxX) / 2, cz: (b.minZ + b.maxZ) / 2 };
}

// Turn points about a centre by `deg` degrees in the floor plan (positive: clockwise in the top view).
export function rotatePoint(p, c, deg) {
  const r = (deg * Math.PI) / 180;
  const dx = p.x - c.x;
  const dz = p.z - c.z;
  return { x: c.x + dx * Math.cos(r) - dz * Math.sin(r), z: c.z + dx * Math.sin(r) + dz * Math.cos(r) };
}

// Four walls around a width × length rectangle centred on (cx, cz), each starting where the last ends.
export function rectangleWalls(width, length, cx = 0, cz = 0) {
  const c = [
    [cx - width / 2, cz - length / 2],
    [cx + width / 2, cz - length / 2],
    [cx + width / 2, cz + length / 2],
    [cx - width / 2, cz + length / 2],
  ];
  return c.map(([x1, z1], i) => {
    const [x2, z2] = c[(i + 1) % 4];
    return { x1, z1, x2, z2 };
  });
}

// ---- Doors and windows ----

const END_MARGIN = 5; // cm kept solid at each end of a wall

// Doors and windows go in straight walls that stand on the floor (not curved walls or beams).
export const takesOpenings = (w) => Boolean(w) && !w.curve && !w.gap;

// Where a door or window sits in its wall, in cm: a–b along the wall from its start, bottom–top in
// height. Kept inside the wall and below its top.
export function openingSpan(o, w) {
  const len = lengthOf(w);
  const width = Math.max(10, Math.min(o.width, len - 2 * END_MARGIN));
  const centre = Math.max(width / 2 + END_MARGIN, Math.min(len - width / 2 - END_MARGIN, o.offset));
  const top = Math.min(w.height - 5, (o.kind === 'window' ? o.sill : 0) + o.height);
  const bottom = o.kind === 'window' ? Math.max(0, Math.min(o.sill, top - 10)) : 0;
  return { a: centre - width / 2, b: centre + width / 2, centre, width, bottom, top };
}

// The solid parts of a straight wall around its doors and windows: full height beside them, a lintel
// above, and wall below a window's sill. Each piece is a floor outline (cm) and a height range.
export function wallPieces(w, outline, spans) {
  if (!spans.length) return [{ outline, y0: w.gap, y1: w.height }];
  const len = lengthOf(w);
  const u = { x: (w.x2 - w.x1) / len, z: (w.z2 - w.z1) / len };
  const n = left(u);
  const h = w.thickness / 2;
  const [L0, L1, R1, R0] = outline; // a straight wall's outline: its left side, then its right side back
  // Left and right sides of the wall at distance s; the ends keep their mitred corners.
  const across = (s) => {
    if (s <= 0) return [L0, R0];
    if (s >= len) return [L1, R1];
    const p = { x: w.x1 + u.x * s, z: w.z1 + u.z * s };
    return [
      { x: p.x + n.x * h, z: p.z + n.z * h },
      { x: p.x - n.x * h, z: p.z - n.z * h },
    ];
  };
  const strip = (s0, s1) => {
    const [a0, b0] = across(s0);
    const [a1, b1] = across(s1);
    return [a0, a1, b1, b0];
  };
  const pieces = [];
  let s = 0;
  for (const o of [...spans].sort((p, q) => p.a - q.a)) {
    if (o.a > s) pieces.push({ outline: strip(s, o.a), y0: 0, y1: w.height });
    const a = Math.max(o.a, s);
    if (o.b > a) {
      if (o.bottom > 0) pieces.push({ outline: strip(a, o.b), y0: 0, y1: o.bottom });
      if (o.top < w.height) pieces.push({ outline: strip(a, o.b), y0: o.top, y1: w.height });
    }
    s = Math.max(s, o.b);
  }
  if (s < len) pieces.push({ outline: strip(s, len), y0: 0, y1: w.height });
  return pieces;
}
