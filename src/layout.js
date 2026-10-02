// Furniture rules: footprints, not passing through walls, stacking and auto-placement. All values in cm.
import { CATALOG, dimsOf, isFlat, isOnWall, isStackable, limitsOf, styleOf } from './catalog.js';
import { boundsOf, boxesOf, boxesOverlap, contains, floorsOf, lengthOf, midpointOf, openingSpan, signedArea } from './walls.js';

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

export const normAngle = (d) => ((d % 360) + 360) % 360;

// Half-size of the item's axis-aligned footprint after rotation.
export function halfExtents(item) {
  const { w, d } = dimsOf(item);
  const c = Math.abs(Math.cos(rad(item.rotation)));
  const s = Math.abs(Math.sin(rad(item.rotation)));
  return { hx: (c * w + s * d) / 2, hz: (s * w + c * d) / 2 };
}

// The item's footprint as a box: its local x axis on the floor is (cos r, -sin r).
function boxOf(item) {
  const { w, d } = dimsOf(item);
  const r = rad(item.rotation);
  return { cx: item.x, cz: item.z, u: { x: Math.cos(r), z: -Math.sin(r) }, hu: w / 2, hv: d / 2 };
}

// Is the floor point (x, z) inside the item's rotated footprint?
export function containsPoint(item, x, z) {
  const { w, d } = dimsOf(item);
  const a = rad(item.rotation);
  const dx = x - item.x;
  const dz = z - item.z;
  const lx = Math.cos(a) * dx - Math.sin(a) * dz;
  const lz = Math.sin(a) * dx + Math.cos(a) * dz;
  return Math.abs(lx) < w / 2 && Math.abs(lz) < d / 2;
}

// Does the item run into a wall? Beams high enough to pass under don't count.
export function hitsWall(item, walls, items = []) {
  const box = boxOf(item);
  const top = elevationOf(item, items) + dimsOf(item).h;
  return walls.some((w) => w.gap < top && boxesOf(w).some((b) => boxesOverlap(box, b)));
}

const at = (item, x, z) => ({ ...item, x, z });

// Move towards (x, z) until a wall is in the way, then slide along it in each axis.
export function moveWithin(item, x, z, walls, items) {
  if (hitsWall(item, walls, items)) return at(item, x, z); // already stuck in a wall: let it be dragged out
  // Walk the path in short steps so a long move can't jump through a wall, then home in on the contact.
  const reach = (from, tx, tz) => {
    const along = (t) => at(from, from.x + (tx - from.x) * t, from.z + (tz - from.z) * t);
    const steps = Math.max(1, Math.ceil(Math.hypot(tx - from.x, tz - from.z) / 5));
    let lo = 0;
    let hi = null;
    for (let k = 1; k <= steps; k++) {
      if (hitsWall(along(k / steps), walls, items)) {
        hi = k / steps;
        break;
      }
      lo = k / steps;
    }
    if (hi === null) return along(1);
    for (let k = 0; k < 10; k++) {
      const mid = (lo + hi) / 2;
      if (hitsWall(along(mid), walls, items)) hi = mid;
      else lo = mid;
    }
    return along(lo);
  };
  let p = reach(item, x, z);
  p = reach(p, x, p.z);
  p = reach(p, p.x, z);
  return p;
}

// The nearest position clear of walls, searching outward in square rings.
function nearestClear(item, walls, items) {
  const b = boundsOf(walls);
  const limit = Math.max(b.width, b.length) + 200;
  let r = 0;
  while (r <= limit) {
    const step = r < 100 ? 5 : r < 400 ? 10 : 25;
    r += step;
    let best = null;
    let bestDist = Infinity;
    for (let k = -r; k <= r; k += step) {
      for (const [dx, dz] of [
        [k, -r],
        [k, r],
        [-r, k],
        [r, k],
      ]) {
        const dist = Math.hypot(dx, dz);
        if (dist < bestDist && !hitsWall(at(item, item.x + dx, item.z + dz), walls, items)) {
          best = at(item, item.x + dx, item.z + dz);
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return item;
}

// Keep an item where it is unless a wall now runs through it; then move it to the nearest clear spot.
export function settle(item, walls, items) {
  return hitsWall(item, walls, items) ? nearestClear(item, walls, items) : item;
}

function overlaps(a, b) {
  const ea = halfExtents(a);
  const eb = halfExtents(b);
  return Math.abs(a.x - b.x) < ea.hx + eb.hx - 1 && Math.abs(a.z - b.z) < ea.hz + eb.hz - 1;
}

// Height (cm) the item stands at: a wall-mounted TV hangs at its mount height; stackable items rest
// on the tallest surface under their centre.
export function elevationOf(item, items) {
  if (isOnWall(item)) return item.mount;
  if (!isStackable(item)) return 0;
  let top = 0;
  for (const other of items) {
    if (other.id !== item.id && CATALOG[other.type].surface && containsPoint(other, item.x, item.z)) {
      top = Math.max(top, dimsOf(other).h);
    }
  }
  return top;
}

// When a surface moves or turns, whatever stands on it goes along.
export function carryStacked(items, before, after) {
  const turn = rad(after.rotation - before.rotation);
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return items.map((o) => {
    if (o.id === before.id || !isStackable(o) || !containsPoint(before, o.x, o.z)) return o;
    const rx = o.x - before.x;
    const rz = o.z - before.z;
    return {
      ...o,
      x: after.x + rx * cos + rz * sin,
      z: after.z - rx * sin + rz * cos,
      rotation: normAngle(o.rotation + after.rotation - before.rotation),
    };
  });
}

// The biggest floor area, where new furniture goes.
function mainFloor(walls) {
  const floors = floorsOf(walls);
  return floors.length ? floors.reduce((a, b) => (Math.abs(signedArea(b)) > Math.abs(signedArea(a)) ? b : a)) : null;
}

function centroid(poly) {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const f = p.x * q.z - q.x * p.z;
    a += f;
    cx += (p.x + q.x) * f;
    cz += (p.z + q.z) * f;
  }
  return { x: cx / (3 * a), z: cz / (3 * a) };
}

// The side the default 3D view looks from; walls you see face away from it.
const VIEW = { x: 0.51, z: 0.86 };

// Straight, full-height walls around the main floor, each with the direction pointing into the room.
function roomWalls(walls, floor, centre) {
  return walls
    .filter((w) => !w.curve && !w.gap)
    .map((w) => {
      const mid = midpointOf(w);
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      let n = { x: -(w.z2 - w.z1) / len, z: (w.x2 - w.x1) / len };
      if (n.x * (centre.x - mid.x) + n.z * (centre.z - mid.z) < 0) n = { x: -n.x, z: -n.z };
      const inside = contains(floor, mid.x + n.x * 20, mid.z + n.z * 20);
      const seen = n.x * VIEW.x + n.z * VIEW.z > 0; // faces the camera, so you see its front
      return { w, mid, n, len, inside, score: len * (seen ? 1 : 0.7) };
    })
    .filter((s) => s.inside)
    .sort((a, b) => b.score - a.score);
}

// Backed against the wall at its middle, facing into the room.
function againstWall(item, s) {
  const { d } = dimsOf(item);
  const off = s.w.thickness / 2 + d / 2 + 1;
  return { x: s.mid.x + s.n.x * off, z: s.mid.z + s.n.z * off, rotation: normAngle(Math.round(deg(Math.atan2(s.n.x, s.n.z)))) };
}

// Floor-standing and hanging pieces get in each other's way only where their heights overlap: a
// base cabinet fits under a wall cabinet, a fridge doesn't.
function blockersOf(item, items) {
  const bottom = elevationOf(item, items);
  const top = bottom + dimsOf(item).h;
  return items.filter((o) => {
    if (o.id === item.id || isFlat(o) || isStackable(o)) return false;
    const from = elevationOf(o, items);
    return from < top && from + dimsOf(o).h > bottom;
  });
}

// Is a window in the way of a hanging piece at this spot?
function coversWindow(spot, walls, openings, items) {
  const { w, d, h } = dimsOf(spot);
  const bottom = elevationOf(spot, items);
  return openings.some((o) => {
    const wall = o.kind === 'window' && walls.find((x) => x.id === o.wall);
    if (!wall) return false;
    const len = lengthOf(wall);
    const u = { x: (wall.x2 - wall.x1) / len, z: (wall.z2 - wall.z1) / len };
    const along = (spot.x - wall.x1) * u.x + (spot.z - wall.z1) * u.z;
    const across = Math.abs((spot.x - wall.x1) * u.z - (spot.z - wall.z1) * u.x);
    const span = openingSpan(o, wall);
    return across < wall.thickness / 2 + d + 5 && along + w / 2 > span.a && along - w / 2 < span.b && bottom < span.top && bottom + h > span.bottom;
  });
}

// The first free place along the room's walls, backed against a wall and facing into the room:
// along each wall from its middle outward (or from its corners inward, for `corner` pieces such as
// showers). Doors stay clear, and so do windows unless the piece is low enough to sit under them.
function alongWalls(item, items, walls, openings, { corner = false } = {}) {
  const floor = mainFloor(walls);
  if (!floor) return null;
  const { w, d, h } = dimsOf(item);
  const bottom = elevationOf(item, items);
  const top = bottom + h;
  const blockers = blockersOf(item, items);
  for (const s of roomWalls(walls, floor, centroid(floor))) {
    const u = { x: (s.w.x2 - s.w.x1) / s.len, z: (s.w.z2 - s.w.z1) / s.len };
    const reach = s.len / 2 - w / 2 - 7; // stay clear of the walls at each end
    if (reach < 0) continue;
    const spans = openings.filter((o) => o.wall === s.w.id).map((o) => ({ kind: o.kind, ...openingSpan(o, s.w) }));
    const offsets = [];
    for (let t = 0; t <= reach; t += 5) offsets.push(corner ? reach - t : t);
    for (const t of offsets.flatMap((t) => (t ? [t, -t] : [0]))) {
      const along = s.len / 2 + t; // distance of the piece's middle from the wall's start
      const inTheWay = spans.some((o) => along + w / 2 > o.a && along - w / 2 < o.b && (o.kind === 'door' || (bottom < o.top && top > o.bottom)));
      if (inTheWay) continue;
      const off = s.w.thickness / 2 + d / 2 + 1;
      const spot = { ...item, x: s.mid.x + u.x * t + s.n.x * off, z: s.mid.z + u.z * t + s.n.z * off, rotation: normAngle(Math.round(deg(Math.atan2(s.n.x, s.n.z)))) };
      if (hitsWall(spot, walls, items)) continue;
      if (blockers.some((o) => overlaps(spot, o))) continue;
      return { x: spot.x, z: spot.z, rotation: spot.rotation };
    }
  }
  return null;
}

// On the wall right behind the first piece it hangs `over` (a mirror cabinet over the sink, a hood
// over the cooker, wall cabinets over the base units) that is low enough and has nothing hanging above
// it yet, unless that would cover a window. It takes that piece's width where it can.
function overSpot(item, items, walls, openings) {
  const over = styleOf(item).over;
  if (!over) return null;
  const hanging = items.filter((o) => isOnWall(o) && o.id !== item.id);
  for (const base of items) {
    if (!over.includes(base.type) || isOnWall(base) || dimsOf(base).h > item.mount) continue;
    if (hanging.some((t) => containsPoint(base, t.x, t.z))) continue;
    const r = rad(base.rotation);
    const back = dimsOf(base).d / 2 - dimsOf(item).d / 2;
    const [lo, hi] = limitsOf(item).w;
    const spot = { x: base.x - Math.sin(r) * back, z: base.z - Math.cos(r) * back, rotation: base.rotation, w: Math.min(hi, Math.max(lo, dimsOf(base).w)) };
    if (!coversWindow({ ...item, ...spot }, walls, openings, items)) return spot;
  }
  return null;
}

// Bar stools in a row along the island's front (its seating side), facing it.
function atIsland(item, items, walls) {
  const { w, d } = dimsOf(item);
  const blockers = blockersOf(item, items);
  for (const island of items.filter((o) => o.type === 'island')) {
    const size = dimsOf(island);
    const lz = size.d / 2 + d / 2 + 2;
    const spacing = Math.max(w + 12, 55);
    const seats = Math.max(1, Math.floor((size.w - 10) / spacing));
    const a = rad(island.rotation);
    for (let k = 0; k < seats; k++) {
      const lx = (k - (seats - 1) / 2) * spacing;
      const spot = {
        ...item,
        x: island.x + Math.cos(a) * lx + Math.sin(a) * lz,
        z: island.z - Math.sin(a) * lx + Math.cos(a) * lz,
        rotation: normAngle(island.rotation + 180),
      };
      if (!hitsWall(spot, walls, items) && !blockers.some((o) => overlaps(spot, o))) return { x: spot.x, z: spot.z, rotation: spot.rotation };
    }
  }
  return null;
}

// Where a new piece naturally goes: bathroom and kitchen pieces along the walls (showers and baths in
// corners, hanging pieces over what they belong above), bar stools at the island, the TV stand against
// the main wall, the TV on a free stand (or on the main wall if it's wall-mounted), the sofa against
// the opposite wall facing it, anything else in the middle of the floor.
export function preferredSpot(item, items, walls, openings = []) {
  const floor = mainFloor(walls);
  if (!floor) {
    const b = boundsOf(walls);
    return { x: b.cx, z: b.cz, rotation: 0 };
  }
  const place = CATALOG[item.type].place;
  if (place === 'island') {
    const spot = atIsland(item, items, walls);
    if (spot) return spot;
  } else if (place) {
    const spot = overSpot(item, items, walls, openings) ?? alongWalls(item, items, walls, openings, { corner: place === 'corner' });
    if (spot) return spot;
  }
  const centre = centroid(floor);
  const sides = roomWalls(walls, floor, centre);
  const main = sides[0];
  const middle = { x: centre.x, z: centre.z, rotation: main ? againstWall(item, main).rotation : 0 };
  if (!main) return middle;
  switch (item.type) {
    case 'tvstand':
      return againstWall(item, main);
    case 'tv': {
      if (isOnWall(item)) return againstWall(item, main);
      const stand = items.find(
        (s) => s.type === 'tvstand' && !items.some((t) => t.type === 'tv' && containsPoint(s, t.x, t.z)),
      );
      return stand ? { x: stand.x, z: stand.z, rotation: stand.rotation } : againstWall(item, main);
    }
    case 'sofa': {
      const opposite = sides.find((s) => s.n.x * main.n.x + s.n.z * main.n.z < -0.7 && s.len >= dimsOf(item).w);
      return opposite ? againstWall(item, opposite) : { ...middle, rotation: normAngle(middle.rotation + 180) };
    }
    default:
      return middle;
  }
}

// The item's position if it's free, otherwise the nearest free spot on a 25 cm grid. Wall-mounted
// pieces hang above the furniture and carpets lie under it, so only walls get in their way; carpets
// never get in the way of anything else either.
export function findSpot(item, items, walls) {
  const stacks = isStackable(item);
  const blockers =
    isOnWall(item) || isFlat(item)
      ? []
      : items.filter((o) => o.id !== item.id && !isStackable(o) && !isOnWall(o) && !isFlat(o) && !(stacks && CATALOG[o.type].surface));
  const isFree = (c) => !hitsWall(c, walls, items) && !blockers.some((o) => overlaps(c, o));
  if (isFree(item)) return item;

  const floor = mainFloor(walls);
  const b = boundsOf(walls);
  const step = 25;
  const candidates = [];
  for (let x = b.minX; x <= b.maxX; x += step) {
    for (let z = b.minZ; z <= b.maxZ; z += step) {
      if (!floor || contains(floor, x, z)) candidates.push(at(item, x, z));
    }
  }
  const distance = (c) => Math.hypot(c.x - item.x, c.z - item.z);
  candidates.sort((p, q) => distance(p) - distance(q));
  return candidates.find(isFree) ?? settle(item, walls, items);
}
