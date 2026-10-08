// Named rooms: a name and a type on a floor area. A room is stored as the point its label stands on
// (cm); it belongs to whichever enclosed floor that point is in, so it stays with its room when walls
// move. Areas are measured inside the walls.
import { contains, intersectLines, pathOf, pointToSegment, signedArea } from './walls.js';

// `set`: the furniture set that suits the room, opened under Add when the room is selected.
// `tint`: a light color for the room's floor in the plan.
export const ROOM_TYPES = [
  { id: 'living', label: 'Living room', tint: '#f2dfb8', set: 'living' },
  { id: 'kitchen', label: 'Kitchen', tint: '#f3cfae', set: 'kitchen' },
  { id: 'bedroom', label: 'Bedroom', tint: '#d4d3f0', set: 'bedroom' },
  { id: 'bathroom', label: 'Bathroom', tint: '#c3e1ec', set: 'bath' },
  { id: 'work', label: 'Work room', tint: '#cbe6d6', set: 'bedroom' },
  { id: 'kids', label: 'Kids’ room', tint: '#f3cdd9', set: 'bedroom' },
  { id: 'dining', label: 'Dining room', tint: '#ead9be', set: 'living' },
  { id: 'hallway', label: 'Hallway', tint: '#dedfd8', set: 'any' },
  { id: 'laundry', label: 'Laundry', tint: '#cfe3e8', set: 'bath' },
  { id: 'storage', label: 'Storage', tint: '#e2dccd', set: 'any' },
  { id: 'balcony', label: 'Balcony', tint: '#d3e6c3', set: 'any' },
  { id: 'other', label: 'Room', tint: '#e3e3dd', set: null },
];

export const roomTypeOf = (room) => ROOM_TYPES.find((t) => t.id === room.type) ?? ROOM_TYPES.at(-1);

// The floor outline a room's label stands in, if any.
export const floorOfRoom = (room, floors) => floors.find((f) => contains(f, room.x, room.z)) ?? null;

// The room whose label stands in this floor outline (the first, if two do).
export const roomOnFloor = (floor, rooms) => rooms.find((r) => contains(floor, r.x, r.z)) ?? null;

// The room a floor point is in, if it's in a named one.
export function roomAt(p, rooms, floors) {
  const floor = floors.find((f) => contains(f, p.x, p.z));
  return floor ? roomOnFloor(floor, rooms) : null;
}

// A good spot for a label well inside an outline: its centroid if that's inside, else the point of a
// coarse grid furthest from the outline's edges.
export function labelSpot(poly) {
  let a = 0;
  let cx = 0;
  let cz = 0;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const f = p.x * q.z - q.x * p.z;
    a += f;
    cx += (p.x + q.x) * f;
    cz += (p.z + q.z) * f;
  });
  const c = a ? { x: cx / (3 * a), z: cz / (3 * a) } : poly[0];
  const clearance = (p) => Math.min(...poly.map((q, i) => pointToSegment(p, q, poly[(i + 1) % poly.length]).d));
  if (contains(poly, c.x, c.z) && clearance(c) > 40) return c;
  const xs = poly.map((p) => p.x);
  const zs = poly.map((p) => p.z);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  let best = c;
  let bestD = contains(poly, c.x, c.z) ? clearance(c) : -1;
  for (let i = 1; i < 12; i++) {
    for (let j = 1; j < 12; j++) {
      const p = { x: x0 + ((x1 - x0) * i) / 12, z: z0 + ((z1 - z0) * j) / 12 };
      if (!contains(poly, p.x, p.z)) continue;
      const d = clearance(p);
      if (d > bestD) [best, bestD] = [p, d];
    }
  }
  return { x: Math.round(best.x), z: Math.round(best.z) };
}

// The floor outline pulled in to the walls' faces: each edge moves in by half the thickness of the
// wall it runs along (floor outlines follow the walls' centre lines).
export function insideOutline(poly, walls) {
  const n = poly.length;
  const sign = signedArea(poly) >= 0 ? 1 : -1; // which side of each edge is inside
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const len = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    const u = { x: (q.x - p.x) / len, z: (q.z - p.z) / len };
    const inward = { x: -u.z * sign, z: u.x * sign };
    const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
    const wall = walls.find((w) => {
      const path = pathOf(w);
      return path.slice(1).some((b, k) => pointToSegment(mid, path[k], b).d < 1);
    });
    const d = wall && !wall.divider ? wall.thickness / 2 : 0; // a room divider has no thickness
    const shift = { x: inward.x * d, z: inward.z * d };
    return { p: { x: p.x + shift.x, z: p.z + shift.z }, u, shift };
  });
  // Each corner where the pulled-in edges meet; where two edges run on in a straight line but are
  // pulled in by different amounts (a wall, then a divider), a small step between them.
  return poly.flatMap((p, i) => {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const hit = intersectLines(a.p, a.u, b.p, b.u);
    if (hit) return [hit];
    const pa = { x: p.x + a.shift.x, z: p.z + a.shift.z };
    const pb = { x: p.x + b.shift.x, z: p.z + b.shift.z };
    return Math.hypot(pa.x - pb.x, pa.z - pb.z) < 0.01 ? [pb] : [pa, pb];
  });
}

// Inside floor area in m², and the inside width × length (cm) when the room is a plain rectangle
// lined up with the plan.
export function roomSize(poly, walls) {
  const inside = insideOutline(poly, walls);
  const area = Math.abs(signedArea(inside)) / 10000;
  let box = null;
  if (inside.length === 4 && inside.every((p, i) => {
    const q = inside[(i + 1) % 4];
    return Math.abs(p.x - q.x) < 0.5 || Math.abs(p.z - q.z) < 0.5;
  })) {
    const xs = inside.map((p) => p.x);
    const zs = inside.map((p) => p.z);
    box = { width: Math.max(...xs) - Math.min(...xs), length: Math.max(...zs) - Math.min(...zs) };
  }
  return { area, box };
}

export const formatArea = (m2) => `${m2 < 10 ? m2.toFixed(1) : Math.round(m2 * 10) / 10} m²`;
