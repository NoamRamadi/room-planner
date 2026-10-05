// Furniture rules: footprints, not passing through walls, stacking and auto-placement. All values in cm.
import { CATALOG, dimsOf, isFlat, isOnWall, isStackable, isSurface, limitsOf, styleOf } from './catalog.js';
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
// on the tallest surface under their centre (which may itself hang on the wall, like a floating
// bedside table; surfaces are never stackable, so this goes one level deep).
export function elevationOf(item, items) {
  if (isOnWall(item)) return item.mount;
  if (!isStackable(item)) return 0;
  let top = 0;
  for (const other of items) {
    if (other.id !== item.id && isSurface(other) && !isStackable(other) && containsPoint(other, item.x, item.z)) {
      top = Math.max(top, elevationOf(other, items) + dimsOf(other).h);
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
// base cabinet fits under a wall cabinet, a fridge doesn't. Curtains and sockets lie flat on the wall:
// furniture can stand in front of them, so they keep clear only of each other and of what hangs on
// the wall.
function blockersOf(item, items) {
  const bottom = elevationOf(item, items);
  const top = bottom + dimsOf(item).h;
  const flatOnWall = (o) => Boolean(CATALOG[o.type].behind);
  return items.filter((o) => {
    if (o.id === item.id || isFlat(o) || isStackable(o)) return false;
    if (flatOnWall(o) && !flatOnWall(item)) return false;
    if (flatOnWall(item) && !flatOnWall(o) && !isOnWall(o)) return false;
    const from = elevationOf(o, items);
    return from < top && from + dimsOf(o).h > bottom;
  });
}

// Would a piece at this spot stand in a doorway or in front of a window (at the window's height)?
function blocksOpening(spot, walls, openings, items) {
  const { w, d, h } = dimsOf(spot);
  const bottom = elevationOf(spot, items);
  return openings.some((o) => {
    const wall = walls.find((x) => x.id === o.wall);
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
  const pad = CATALOG[item.type].sides ?? 0; // room kept clear of doors either side (for bedside tables)
  for (const s of roomWalls(walls, floor, centroid(floor))) {
    const u = { x: (s.w.x2 - s.w.x1) / s.len, z: (s.w.z2 - s.w.z1) / s.len };
    const reach = s.len / 2 - w / 2 - 7; // stay clear of the walls at each end
    if (reach < 0) continue;
    const spans = openings.filter((o) => o.wall === s.w.id).map((o) => ({ kind: o.kind, ...openingSpan(o, s.w) }));
    const offsets = [];
    for (let t = 0; t <= reach; t += 5) offsets.push(corner ? reach - t : t);
    for (const t of offsets.flatMap((t) => (t ? [t, -t] : [0]))) {
      const along = s.len / 2 + t; // distance of the piece's middle from the wall's start
      const inTheWay = spans.some((o) => along + w / 2 + pad > o.a && along - w / 2 - pad < o.b && (o.kind === 'door' || (bottom < o.top && top > o.bottom)));
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
// it yet, unless that would cover a window or a door. It takes that piece's width where it can.
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
    if (!blocksOpening({ ...item, ...spot }, walls, openings, items)) return spot;
  }
  return null;
}

// The point (lx, lz) in a piece's own frame (x across its front, z out of its front), on the floor.
function localToFloor(host, lx, lz) {
  const a = rad(host.rotation);
  return { x: host.x + Math.cos(a) * lx + Math.sin(a) * lz, z: host.z - Math.sin(a) * lx + Math.cos(a) * lz };
}

// The first of the spots that's clear of walls, doors, windows and other furniture.
function firstFree(item, spots, items, walls, openings) {
  const blockers = blockersOf(item, items);
  for (const spot of spots) {
    const at = { ...item, ...spot };
    if (!hitsWall(at, walls, items) && !blockers.some((o) => overlaps(at, o)) && !blocksOpening(at, walls, openings, items)) return spot;
  }
  return null;
}

// Seats in a row along the front of an island or a desk, facing it: bar stools, desk chairs.
function seatAt(item, items, walls, openings, hostType) {
  const { w, d } = dimsOf(item);
  const spots = items
    .filter((o) => o.type === hostType)
    .flatMap((host) => {
      const size = dimsOf(host);
      const spacing = Math.max(w + 12, 55);
      const seats = Math.max(1, Math.floor((size.w - 10) / spacing));
      return Array.from({ length: seats }, (_, k) => ({
        ...localToFloor(host, (k - (seats - 1) / 2) * spacing, size.d / 2 + d / 2 + 2),
        rotation: normAngle(host.rotation + 180),
      }));
    });
  return firstFree(item, spots, items, walls, openings);
}

// Bedside tables either side of the head of a bed, against the same wall.
function besideBed(item, items, walls, openings) {
  const { w, d } = dimsOf(item);
  const spots = items
    .filter((o) => o.type === 'bed')
    .flatMap((bed) => {
      const size = dimsOf(bed);
      return [-1, 1].map((side) => ({ ...localToFloor(bed, side * (size.w / 2 + w / 2 + 3), -size.d / 2 + d / 2), rotation: bed.rotation }));
    });
  return firstFree(item, spots, items, walls, openings);
}

// A table lamp on a bedside table without one, else at the back corner of a desk or chest of drawers.
function onSurface(item, items) {
  const { w, d } = dimsOf(item);
  const lamps = items.filter((o) => o.type === item.type && o.id !== item.id);
  const hosts = ['nightstand', 'desk', 'dresser'].flatMap((type) => items.filter((o) => o.type === type && o.style !== 'dressing'));
  const host = hosts.find((o) => !lamps.some((l) => containsPoint(o, l.x, l.z)));
  if (!host) return null;
  const size = dimsOf(host);
  const corner = host.type !== 'nightstand' && size.w > w + 20;
  const lx = corner ? -(size.w / 2 - w / 2 - 5) : 0;
  const lz = corner ? -(size.d / 2 - d / 2 - 5) : 0;
  return { ...localToFloor(host, lx, lz), rotation: host.rotation };
}

// A curtain or blind over the first window that doesn't have one, on the room side of the wall:
// curtains from just above the window to the floor and wider than it, blinds just around the window.
function atWindow(item, items, walls, openings) {
  const others = items.filter((o) => o.type === item.type && o.id !== item.id);
  const floors = floorsOf(walls);
  const main = mainFloor(walls);
  const blind = styleOf(item).blind;
  const limits = limitsOf(item);
  const fit = (v, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(v)));
  const { d } = dimsOf(item);
  for (const o of openings) {
    const wall = o.kind === 'window' && walls.find((x) => x.id === o.wall);
    if (!wall) continue;
    const span = openingSpan(o, wall);
    const len = lengthOf(wall);
    const u = { x: (wall.x2 - wall.x1) / len, z: (wall.z2 - wall.z1) / len };
    const mid = { x: wall.x1 + u.x * span.centre, z: wall.z1 + u.z * span.centre };
    // The room side: into the main floor if the wall borders it, else into any floor.
    let n = { x: -u.z, z: u.x };
    const into = (floor, m) => contains(floor, mid.x + m.x * 20, mid.z + m.z * 20);
    const flipped = { x: -n.x, z: -n.z };
    if ((main && into(main, flipped) && !into(main, n)) || (!floors.some((f) => into(f, n)) && floors.some((f) => into(f, flipped)))) n = flipped;
    const off = wall.thickness / 2 + d / 2 + 0.5;
    const x = mid.x + n.x * off;
    const z = mid.z + n.z * off;
    if (others.some((c) => containsPoint(c, x, z))) continue;
    // Not past the wall's ends, where it meets the next wall.
    const room = 2 * Math.min(span.centre, len - span.centre) - 16;
    const top = Math.min(wall.height - (blind ? 2 : 3), span.top + (blind ? 8 : 15));
    const bottom = blind ? Math.max(0, span.bottom - 5) : 1;
    return {
      x,
      z,
      rotation: normAngle(Math.round(deg(Math.atan2(n.x, n.z)))),
      w: fit(Math.min(room, span.width + (blind ? 10 : 40)), limits.w),
      h: fit(top - bottom, limits.h),
      mount: fit(bottom, limits.mount),
    };
  }
  return null;
}

// Where a counter's sink is, as [from, to] in cm from its left end; a sink unit's top is all sink.
function sinkSpanOf(host) {
  const width = styleOf(host).sink;
  if (host.type === 'counter') return width ? [host.sink - width / 2, host.sink + width / 2] : null;
  return host.type === 'sinkunit' ? [0, dimsOf(host).w] : null;
}

// A countertop appliance (a microwave, a water dispenser) on a kitchen worktop, against the back,
// clear of the sink and of what already stands there: from the left end along, or, for a water
// dispenser, as close to a sink as it can be. Any other surface (a table) will do if there's no
// worktop free.
function onCounter(item, items, walls) {
  const { w, d } = dimsOf(item);
  const nearSink = styleOf(item).nearSink ?? CATALOG[item.type].nearSink;
  const kitchen = (o) => (CATALOG[o.type].room === 'kitchen' ? 1 : 0);
  const hosts = items.filter((o) => o.id !== item.id && isSurface(o) && !isOnWall(o) && !isStackable(o));
  hosts.sort((a, b) => kitchen(b) - kitchen(a) || (nearSink ? Number(Boolean(sinkSpanOf(b))) - Number(Boolean(sinkSpanOf(a))) : 0));
  const standing = items.filter((o) => o.id !== item.id && isStackable(o));
  for (const host of hosts) {
    const size = dimsOf(host);
    const sink = sinkSpanOf(host);
    const lz = -(size.d / 2 - d / 2 - 3);
    const along = [];
    for (let t = w / 2 + 3; t <= size.w - w / 2 - 3; t += 5) {
      if (!sink || t + w / 2 <= sink[0] - 3 || t - w / 2 >= sink[1] + 3) along.push(t);
    }
    if (nearSink && sink) along.sort((p, q) => Math.min(Math.abs(p - sink[0]), Math.abs(p - sink[1])) - Math.min(Math.abs(q - sink[0]), Math.abs(q - sink[1])));
    for (const t of along) {
      const spot = { ...item, ...localToFloor(host, t - size.w / 2, lz), rotation: host.rotation };
      if (!hitsWall(spot, walls, items) && !standing.some((o) => overlaps(spot, o))) return { x: spot.x, z: spot.z, rotation: spot.rotation };
    }
  }
  return null;
}

// Where a new piece naturally goes: bathroom, kitchen and bedroom pieces along the walls (showers,
// baths and armchairs in corners, hanging pieces over what they belong above), curtains over windows,
// a ceiling air conditioner in the middle of the ceiling, bar stools at the
// island, desk chairs at the desk, bedside tables beside the bed with a lamp on top, the TV stand
// against the main wall, the TV on a free stand (or on the main wall if it's wall-mounted), the sofa
// against the opposite wall facing it, anything else in the middle of the floor.
export function preferredSpot(item, items, walls, openings = []) {
  const floor = mainFloor(walls);
  if (!floor) {
    const b = boundsOf(walls);
    return { x: b.cx, z: b.cz, rotation: 0 };
  }
  const place = styleOf(item).place ?? CATALOG[item.type].place;
  const corner = place === 'corner';
  let spot = null;
  if (place === 'island' || place === 'desk') spot = seatAt(item, items, walls, openings, place);
  else if (place === 'surface') spot = onSurface(item, items);
  else if (place === 'counter') spot = onCounter(item, items, walls);
  else if (place === 'bed') spot = besideBed(item, items, walls, openings) ?? alongWalls(item, items, walls, openings);
  else if (place === 'window') spot = atWindow(item, items, walls, openings) ?? alongWalls(item, items, walls, openings);
  else if (place === 'ceiling') {
    // In the middle of the room, up against the ceiling (the top of its tallest wall).
    const ceiling = Math.max(...walls.filter((w) => !w.gap).map((w) => w.height));
    const [lo, hi] = limitsOf(item).mount;
    spot = { ...centroid(floor), rotation: 0, mount: Math.min(hi, Math.max(lo, ceiling - dimsOf(item).h - 1)) };
  }
  else if (place) spot = overSpot(item, items, walls, openings) ?? alongWalls(item, items, walls, openings, { corner });
  if (spot) return spot;
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
      : items.filter((o) => o.id !== item.id && !isStackable(o) && !isOnWall(o) && !isFlat(o) && !(stacks && isSurface(o)));
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
