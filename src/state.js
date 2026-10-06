// The design (walls, groups of walls, furniture, colors) and what's selected. Every change is saved to localStorage.
import { CATALOG, FLOOR_PATTERNS, isSurface, limitsOf, newItemOf, normalizeItem } from './catalog.js';
import { carryStacked, findSpot, moveWithin, normAngle, preferredSpot, settle } from './layout.js';
import { OPENINGS, newOpeningOf, normalizeOpening, openingLimitsOf } from './openings.js';
import {
  JOIN,
  LIMITS,
  betterSnap,
  boundsOf,
  dist,
  endsAt,
  endsOf,
  facesOf,
  insideLengthOf,
  intersectLines,
  jointsOf,
  lengthOf,
  midpointOf,
  openingSpan,
  pointToSegment,
  rectangleWalls,
  rotatePoint,
  snapTarget,
  takesOpenings,
} from './walls.js';

const STORAGE_KEY = 'room-planner:v1';
const VIEW_KEY = 'room-planner:view';

export const ROOM_LIMITS = { width: [50, 3000], length: [50, 3000], height: LIMITS.height };

const DEFAULT_LOOK = { height: 270, floorPattern: 'planks', floorColor: '#c09a6b', wallColor: '#f1f0ea' };
const WALL_THICKNESS = 12;

// crypto.randomUUID only exists on https/localhost, and the app may be opened over plain http on a LAN.
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function newWall(ends, look, extra = {}) {
  return {
    id: newId(),
    name: '',
    thickness: WALL_THICKNESS,
    height: look.height,
    gap: 0,
    curve: 0,
    color: look.wallColor,
    group: null,
    ...ends,
    ...extra,
  };
}

function fresh() {
  const room = { ...DEFAULT_LOOK };
  const group = { id: newId(), name: 'Room 1' };
  // 400 × 500 inside: the walls' centre lines run half a thickness further out.
  const t = WALL_THICKNESS;
  const walls = rectangleWalls(400 + t, 500 + t).map((ends, i) => newWall(ends, room, { name: `Wall ${i + 1}`, group: group.id }));
  // A window in the middle of the back wall and a door near the front of the left wall.
  const openings = [
    { ...newOpeningOf('window', 'standard'), id: newId(), wall: walls[0].id, offset: (400 + t) / 2 },
    { ...newOpeningOf('door', 'single'), id: newId(), wall: walls[3].id, offset: 90 + t / 2 },
  ];
  return { room, walls, groups: [group], items: [], openings };
}

let state = loadSaved() ?? fresh();
// sel: null, { type: 'item' | 'wall' | 'group', id }, or { type: 'walls', ids } for several walls.
// several: clicks add to the selection instead of replacing it (for touch screens without Shift).
// cutaway: walls between the camera and the room are cut down so you can see in.
// locked: nothing can be moved or changed, only looked at and selected.
// Both are view settings, remembered separately from the design.
// drawing: the wall drawing tool is open (the rest of the app waits until it closes).
// measuring: the measuring tool is on (clicks in the view measure instead of selecting).
// leftOpen, rightOpen: the side panels are showing (also remembered).
const view = loadView();
let ui = {
  sel: null,
  several: false,
  cutaway: view.cutaway ?? true,
  locked: view.locked ?? false,
  drawing: false,
  measuring: false,
  leftOpen: view.leftOpen ?? true,
  rightOpen: view.rightOpen ?? true,
};
const listeners = new Set();
let saveTimer = 0;

function emit() {
  if (state !== committed) record();
  nextKey = null;
  for (const fn of listeners) fn(state, ui);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

// ---- Undo and redo ----
// The design is never edited in place, so history keeps earlier designs as they were. A drag (a
// gesture) is one step, and so is a run of quick changes to the same thing (typing a size, dragging
// a slider or a color picker), marked by the key the change sets in `nextKey`.

const HISTORY = 100;
const past = [];
const future = [];
let committed = state; // the design as of the last step in history
let gesture = { open: false, recorded: false };
let nextKey = null;
let last = { key: null, time: 0 };

function record() {
  const now = performance.now();
  const merge = (gesture.open && gesture.recorded) || (nextKey !== null && nextKey === last.key && now - last.time < 1000);
  if (!merge) {
    past.push(committed);
    if (past.length > HISTORY) past.shift();
    future.length = 0;
  }
  if (gesture.open) gesture.recorded = true;
  last = { key: nextKey, time: now };
  committed = state;
}

// Drags call these around their moves, so the whole drag undoes in one step.
export function beginGesture() {
  gesture = { open: true, recorded: false };
}

export function endGesture() {
  gesture = { open: false, recorded: false };
  last = { key: null, time: 0 };
}

export const canUndo = () => past.length > 0 && !ui.locked && !ui.drawing;
export const canRedo = () => future.length > 0 && !ui.locked && !ui.drawing;

// After stepping through history, keep only the parts of the selection that still exist.
function stillThere(sel) {
  if (!sel) return null;
  const has = (list, id) => list.some((x) => x.id === id);
  if (sel.type === 'item') return has(state.items, sel.id) ? sel : null;
  if (sel.type === 'wall') return has(state.walls, sel.id) ? sel : null;
  if (sel.type === 'group') return has(state.groups, sel.id) ? sel : null;
  if (sel.type === 'opening') return has(state.openings, sel.id) ? sel : null;
  const ids = sel.ids.filter((id) => has(state.walls, id));
  return ids.length > 1 ? { type: 'walls', ids } : ids.length ? { type: 'wall', id: ids[0] } : null;
}

function travel(from, to) {
  if (ui.locked || ui.drawing || !from.length) return;
  to.push(state);
  state = committed = from.pop();
  last = { key: null, time: 0 };
  ui = { ...ui, sel: stillThere(ui.sel) };
  emit();
}

export const undo = () => travel(past, future);
export const redo = () => travel(future, past);

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or disabled (private browsing); the design still works for this visit.
  }
}

function loadView() {
  try {
    return JSON.parse(localStorage.getItem(VIEW_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveView() {
  try {
    const { cutaway, locked, leftOpen, rightOpen } = ui;
    localStorage.setItem(VIEW_KEY, JSON.stringify({ cutaway, locked, leftOpen, rightOpen }));
  } catch {
    // Not remembered for next time, but it still applies now.
  }
}

export function setCutaway(on) {
  ui = { ...ui, cutaway: on };
  saveView();
  emit();
}

// Show or hide a side panel: 'left' (rooms, walls and furniture) or 'right' (details of the selection).
export function setPanel(side, open) {
  ui = { ...ui, [side === 'left' ? 'leftOpen' : 'rightOpen']: open };
  saveView();
  emit();
}

export function setDrawing(on) {
  ui = { ...ui, drawing: on, several: false, sel: on ? null : ui.sel, measuring: on ? false : ui.measuring };
  emit();
}

// Measuring changes nothing, so it works while locked too.
export function setMeasuring(on) {
  ui = { ...ui, measuring: on, several: false };
  emit();
}

export function setLocked(on) {
  ui = { ...ui, locked: on, several: false };
  saveView();
  emit();
}

function loadSaved() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return null;
  }
}

function nextName(list, prefix) {
  const taken = list.map((x) => Number(new RegExp(`^${prefix} (\\d+)$`).exec(x.name)?.[1] ?? 0));
  return `${prefix} ${Math.max(0, ...taken) + 1}`;
}

function uniqueIn(list, label) {
  const taken = new Set(list.map((x) => x.name));
  if (!taken.has(label)) return label;
  let n = 2;
  while (taken.has(`${label} ${n}`)) n++;
  return `${label} ${n}`;
}

function uniqueItemName(label) {
  const taken = new Set(state.items.map((i) => i.name));
  if (!taken.has(label)) return label;
  let n = 2;
  while (taken.has(`${label} ${n}`)) n++;
  return `${label} ${n}`;
}

const round = (v) => Math.round(v * 10) / 10;

export function subscribe(fn) {
  listeners.add(fn);
  fn(state, ui);
  return () => listeners.delete(fn);
}

export const getState = () => state;
export const getUI = () => ui;
export const getSelected = () => (ui.sel?.type === 'item' ? (state.items.find((i) => i.id === ui.sel.id) ?? null) : null);
export const wallById = (id) => state.walls.find((w) => w.id === id);
export const openingById = (id) => state.openings.find((o) => o.id === id);
export const selectOpening = (id) => setSel({ type: 'opening', id });

// Ids of the walls that are selected, whether one wall, a group or several.
export function selectedWallIds(sel = ui.sel) {
  if (sel?.type === 'wall') return [sel.id];
  if (sel?.type === 'group') return state.walls.filter((w) => w.group === sel.id).map((w) => w.id);
  if (sel?.type === 'walls') return sel.ids;
  return [];
}

// ---- Selection ----

function setSel(sel) {
  ui = { ...ui, sel };
  emit();
}

export const select = (id) => setSel(id ? { type: 'item', id } : null); // furniture
export const selectWall = (id) => setSel({ type: 'wall', id });
export const selectGroup = (id) => setSel({ type: 'group', id });
export const clearSelection = () => setSel(null);

export function setSeveral(on) {
  ui = { ...ui, several: on };
  emit();
}

// Add a wall to the selection, or take it out again. In the view a grouped wall brings its whole
// group (`single` is for picking one wall out of a group, as the wall list does).
export function toggleWall(id, { single = false } = {}) {
  const wall = wallById(id);
  const unitIds = wall.group && !single ? state.walls.filter((w) => w.group === wall.group).map((w) => w.id) : [id];
  const current = new Set(selectedWallIds());
  const has = unitIds.every((x) => current.has(x));
  unitIds.forEach((x) => (has ? current.delete(x) : current.add(x)));
  const ids = [...current];
  if (!ids.length) setSel(null);
  else if (ids.length === 1) setSel({ type: 'wall', id: ids[0] });
  else setSel({ type: 'walls', ids });
}

// Pressing a wall. A grouped wall selects its whole group; pressing a wall of the selected group again
// drags the group, or, if released without dragging (`drillIn`), selects just that wall.
// Returns the ids of the walls a drag starting here moves.
export function pressWall(id) {
  const wall = wallById(id);
  const sel = ui.sel;
  if (sel?.type === 'walls' && sel.ids.includes(id)) return { ids: sel.ids, drillIn: false };
  if (wall.group && sel?.type === 'group' && sel.id === wall.group) return { ids: selectedWallIds(), drillIn: true };
  if (wall.group && !(sel?.type === 'wall' && wallById(sel.id)?.group === wall.group)) {
    selectGroup(wall.group);
  } else {
    selectWall(id);
  }
  return { ids: selectedWallIds(), drillIn: false };
}

// ---- Room look ----

// Floor pattern and color, and the color and height of every wall.
export function updateRoom(patch) {
  if (ui.locked) return null;
  nextKey = `room:${Object.keys(patch).sort()}`;
  let walls = state.walls;
  if ('wallColor' in patch) walls = walls.map((w) => ({ ...w, color: patch.wallColor }));
  if ('height' in patch) walls = walls.map((w) => ({ ...w, height: patch.height, gap: Math.min(w.gap, patch.height - 20) }));
  state = { ...state, room: { ...state.room, ...patch }, walls };
  emit();
}

// ---- Walls ----

// `keepOpenings`: where a wall's start corner moved along the wall, its doors and windows stay where
// they are in the room rather than moving with the corner.
function commitWalls(walls, { live = false, keepOpenings = false } = {}) {
  const openings = keepOpenings ? openingsKept(state.walls, walls) : state.openings;
  state = { ...state, walls, openings, items: live ? state.items : state.items.map((i) => settle(i, walls, state.items)) };
  emit();
}

function openingsKept(before, after) {
  const old = new Map(before.map((w) => [w.id, w]));
  const now = new Map(after.map((w) => [w.id, w]));
  return state.openings.map((o) => {
    const a = old.get(o.wall);
    const b = now.get(o.wall);
    if (!a || !b || (a.x1 === b.x1 && a.z1 === b.z1)) return o;
    const ua = unitOf(a);
    const ub = unitOf(b);
    const centre = { x: a.x1 + ua.x * o.offset, z: a.z1 + ua.z * o.offset };
    return { ...o, offset: round((centre.x - b.x1) * ub.x + (centre.z - b.z1) * ub.z) };
  });
}

const unitOf = (w) => {
  const l = lengthOf(w) || 1;
  return { x: (w.x2 - w.x1) / l, z: (w.z2 - w.z1) / l };
};

// Move the listed wall ends ({ id, end }) by `shift`.
function moveEnds(walls, ends, shift) {
  const moving = new Set(ends.map((e) => `${e.id}:${e.end}`));
  return walls.map((w) => {
    let next = w;
    for (const end of [0, 1]) {
      if (!moving.has(`${w.id}:${end}`)) continue;
      const [x, z] = end ? ['x2', 'z2'] : ['x1', 'z1'];
      next = { ...next, [x]: round(next[x] + shift.x), [z]: round(next[z] + shift.z) };
    }
    return next;
  });
}

// Ends of other walls that butt into the side of wall w (T-junctions), as { id, end }.
function buttingInto(walls, w) {
  const a = { x: w.x1, z: w.z1 };
  const b = { x: w.x2, z: w.z2 };
  return walls.flatMap((o) =>
    o.id === w.id
      ? []
      : endsOf(o)
          .map((p, end) => ({ id: o.id, end, hit: pointToSegment(p, a, b) }))
          .filter(({ hit }) => hit.d <= JOIN + 0.5 && hit.t > 0.001 && hit.t < 0.999),
  );
}

// Tidy up after a drag: furniture a wall now runs through moves out of the way.
export function finishWallEdit() {
  if (ui.locked) return null;
  commitWalls(state.walls);
}

export function hasFreeEnd(id) {
  return jointsOf(state.walls).get(id)?.some((ends) => ends.length === 0) ?? false;
}

// A new wall whose inside face is `length` long. With one wall selected it continues from that wall's
// free end, turned a quarter clockwise with the room inside the turn. The two meet in a mitred corner
// half the new wall's thickness past the old end, so the old wall keeps its inside length; four walls
// in a row close a room with exactly the inside sizes typed. Otherwise it's centred on `focus`.
export function addWall(length, focus = { x: 0, z: 0 }) {
  if (ui.locked) return null;
  const from = ui.sel?.type === 'wall' ? wallById(ui.sel.id) : null;
  const t = WALL_THICKNESS;
  let walls = state.walls;
  let wall;
  if (from) {
    const joins = jointsOf(walls).get(from.id);
    const end = joins[1].length === 0 ? 1 : joins[0].length === 0 ? 0 : 1;
    const free = joins[end].length === 0;
    const [a, b] = endsOf(from);
    const tip = end === 1 ? b : a;
    const l = lengthOf(from) || 1;
    const away = end === 1 ? { x: (b.x - a.x) / l, z: (b.z - a.z) / l } : { x: (a.x - b.x) / l, z: (a.z - b.z) / l };
    const dir = { x: -away.z, z: away.x }; // a quarter turn clockwise in the top view
    const corner = free ? { x: round(tip.x + (away.x * t) / 2), z: round(tip.z + (away.z * t) / 2) } : tip;
    if (free) walls = moveEnds(walls, [{ id: from.id, end }], { x: corner.x - tip.x, z: corner.z - tip.z });
    // Its inside face starts at the old wall's inside face, half that wall's thickness along.
    const reach = length + (free ? from.thickness / 2 : 0);
    const ends = { x1: corner.x, z1: corner.z, x2: round(corner.x + dir.x * reach), z2: round(corner.z + dir.z * reach) };
    wall = newWall(ends, state.room, { name: nextName(walls, 'Wall'), group: from.group });
    walls = closeCorner([...walls, wall], wall);
  } else {
    const ends = { x1: round(focus.x - length / 2), z1: round(focus.z), x2: round(focus.x + length / 2), z2: round(focus.z) };
    wall = newWall(ends, state.room, { name: nextName(walls, 'Wall') });
    walls = [...walls, wall];
  }
  ui = { ...ui, sel: { type: 'wall', id: wall.id } };
  commitWalls(walls, { keepOpenings: true });
}

// When a new wall's free end has come round to another wall's free end (closing a room built wall by
// wall), the two join in a corner where their centre lines meet.
function closeCorner(walls, wall) {
  const tip = { x: wall.x2, z: wall.z2 };
  const joins = jointsOf(walls);
  let best = null;
  for (const o of walls) {
    if (o.id === wall.id || o.curve) continue;
    endsOf(o).forEach((p, end) => {
      const d = dist(p, tip);
      if (!joins.get(o.id)[end].length && d <= Math.max(wall.thickness, o.thickness) + 1 && (!best || d < best.d)) best = { o, end, p, d };
    });
  }
  if (!best) return walls;
  const hit = intersectLines(tip, unitOf(wall), best.p, unitOf(best.o));
  const p = hit && dist(hit, tip) <= 2 * Math.max(wall.thickness, best.o.thickness) + 1 ? hit : best.p;
  return moveEnds(moveEnds(walls, [{ id: wall.id, end: 1 }], { x: p.x - tip.x, z: p.z - tip.z }), [{ id: best.o.id, end: best.end }], {
    x: p.x - best.p.x,
    z: p.z - best.p.z,
  });
}

// Walls drawn with the drawing tool ({ x1, z1, x2, z2, thickness, height } each), added in one go and
// selected together, ready to group.
export function addDrawnWalls(segments) {
  if (ui.locked) return null;
  let walls = [...state.walls];
  const ids = [];
  for (const s of segments) {
    const { x1, z1, x2, z2, thickness, height } = s;
    const wall = newWall({ x1, z1, x2, z2 }, state.room, { name: nextName(walls, 'Wall'), thickness, height });
    walls = [...walls, wall];
    ids.push(wall.id);
  }
  walls = drawnInside(walls, ids, state.walls);
  ui = { ...ui, drawing: false, sel: ids.length > 1 ? { type: 'walls', ids } : ids.length ? { type: 'wall', id: ids[0] } : null };
  commitWalls(walls);
}

// The drawing tool draws the inside faces of walls. Once the drawn walls are in, each one with a room
// on one side moves out by half its thickness, away from the room, and the corners between them are
// re-cut, so the room keeps the size that was drawn. Walls meeting walls built before stay as drawn.
function drawnInside(walls, ids, existing) {
  const drawn = walls.filter((w) => ids.includes(w.id));
  const key = (p) => `${Math.round(p.x * 10)},${Math.round(p.z * 10)}`;
  const onWall = (o, p) => pointToSegment(p, { x: o.x1, z: o.z1 }, { x: o.x2, z: o.z2 }).d <= JOIN + 0.5;
  const corners = new Map();
  for (const w of drawn) endsOf(w).forEach((p, end) => corners.set(key(p), [...(corners.get(key(p)) ?? []), { w, end, p }]));
  const pinned = new Set([...corners].filter(([, list]) => list.length > 2 || existing.some((o) => onWall(o, list[0].p))).map(([k]) => k));
  const shift = new Map();
  for (const w of drawn) {
    if (endsOf(w).some((p) => pinned.has(key(p)))) continue;
    const { side, nl } = facesOf(w, walls);
    if (side) shift.set(w.id, { x: (-side * nl.x * w.thickness) / 2, z: (-side * nl.z * w.thickness) / 2 });
  }
  const none = { x: 0, z: 0 };
  const lineOf = (w) => {
    const s = shift.get(w.id) ?? none;
    return [{ x: w.x1 + s.x, z: w.z1 + s.z }, unitOf(w)];
  };
  const moved = new Map();
  for (const [k, list] of corners) {
    if (pinned.has(k)) continue;
    const { p, w } = list[0];
    // The walls meeting here: a corner, or a drawn wall this end butts into.
    const host = list.length === 1 ? drawn.find((o) => o.id !== w.id && !endsOf(o).some((q) => dist(q, p) <= JOIN) && onWall(o, p)) : null;
    const meeting = [...list.map((e) => e.w), ...(host ? [host] : [])];
    if (meeting.length === 2) {
      const [[p1, u1], [p2, u2]] = meeting.map(lineOf);
      const hit = intersectLines(p1, u1, p2, u2);
      if (hit && dist(hit, p) <= 2 * Math.max(...meeting.map((m) => m.thickness)) + 1) {
        moved.set(k, hit);
        continue;
      }
    }
    const s = shift.get(w.id) ?? none;
    moved.set(k, { x: p.x + s.x, z: p.z + s.z });
  }
  return walls.map((w) => {
    if (!ids.includes(w.id)) return w;
    const [a, b] = endsOf(w).map((p) => moved.get(key(p)) ?? p);
    return { ...w, x1: round(a.x), z1: round(a.z), x2: round(b.x), z2: round(b.z) };
  });
}

// Four walls around a room `width` × `length` inside (wall face to wall face), grouped. Their centre
// lines run half a thickness further out. Placed beside anything already built.
export function addRoom(width, length) {
  if (ui.locked) return null;
  width += WALL_THICKNESS;
  length += WALL_THICKNESS;
  let cx = 0;
  let cz = 0;
  if (state.walls.length) {
    const b = boundsOf(state.walls);
    cx = round(b.maxX + 60 + width / 2);
    cz = round(b.minZ + length / 2);
  }
  const group = { id: newId(), name: nextName(state.groups, 'Room') };
  let walls = [...state.walls];
  for (const ends of rectangleWalls(width, length, cx, cz)) {
    walls = [...walls, newWall(ends, state.room, { name: nextName(walls, 'Wall'), group: group.id })];
  }
  state = { ...state, groups: [...state.groups, group] };
  ui = { ...ui, sel: { type: 'group', id: group.id } };
  commitWalls(walls);
}

export function updateWall(id, patch) {
  if (ui.locked) return null;
  nextKey = `wall:${id}:${Object.keys(patch).sort()}`;
  const before = wallById(id);
  let walls = state.walls.map((w) => (w.id === id ? { ...w, ...patch } : w));
  if ('thickness' in patch && patch.thickness !== before.thickness) walls = thickened(walls, before, patch.thickness);
  commitWalls(walls, { keepOpenings: true });
}

// Which face of a wall stays put when its thickness changes: +1 its left, -1 its right, 0 its middle.
// The face with the room against it; for a wall between two rooms or on its own, the one in `keep`.
export function fixedFaceOf(w, walls = state.walls) {
  return facesOf(w, walls).side || (w.keep === 'left' ? 1 : w.keep === 'right' ? -1 : 0);
}

// A wall changing thickness keeps its fixed face where it is and grows or shrinks on the other side,
// so the room it faces keeps its size. Walls joined to it, or butting into its side, are trimmed or
// extended to meet it again.
function thickened(walls, before, thickness) {
  const fixed = before.curve ? 0 : fixedFaceOf(before);
  if (!fixed) return walls;
  const { nl, u } = facesOf(before, state.walls);
  const s = (-fixed * (thickness - before.thickness)) / 2;
  const shift = { x: nl.x * s, z: nl.z * s };
  const a = { x: before.x1, z: before.z1 };
  const b = { x: before.x2, z: before.z2 };
  const start = { x: a.x + shift.x, z: a.z + shift.z };
  return walls.map((w) => {
    if (w.id === before.id) return { ...w, x1: round(start.x), z1: round(start.z), x2: round(b.x + shift.x), z2: round(b.z + shift.z) };
    let next = w;
    endsOf(w).forEach((e, end) => {
      if (dist(e, a) > JOIN && dist(e, b) > JOIN && pointToSegment(e, a, b).d > JOIN + 0.5) return;
      const hit = w.curve ? null : intersectLines(e, unitOf(w), start, u);
      const q = hit && dist(hit, e) <= Math.abs(s) * 4 + 1 ? hit : { x: e.x + shift.x, z: e.z + shift.z };
      const [x, z] = end ? ['x2', 'z2'] : ['x1', 'z1'];
      next = { ...next, [x]: round(q.x), [z]: round(q.z) };
    });
    return next;
  });
}

// Move a set of wall ends (a corner) to (x, z).
function withEndsAt(ends, x, z, walls = state.walls) {
  const byId = new Map();
  for (const e of ends) byId.set(e.id, [...(byId.get(e.id) ?? []), e.end]);
  return walls.map((w) => {
    const list = byId.get(w.id);
    if (!list) return w;
    const next = { ...w };
    for (const end of list) {
      if (end === 0) Object.assign(next, { x1: round(x), z1: round(z) });
      else Object.assign(next, { x2: round(x), z2: round(z) });
    }
    return next;
  });
}

// The corner at a wall's end: that end plus every other wall end joined to it.
export function cornerAt(id, end) {
  return endsAt(state.walls, endsOf(wallById(id))[end]);
}

// Drag a corner. It connects to a nearby wall end (or onto a wall); otherwise the dragged wall snaps to
// whole centimetres and to 15° steps. Returns the point it connected to, if any.
export function dragCorner(corner, anchor, x, z) {
  if (ui.locked) return null;
  const skip = new Set(corner.map((e) => e.id));
  const target = snapTarget({ x, z }, state.walls, skip);
  let p = target;
  if (!p) {
    const wall = wallById(anchor.id);
    const other = endsOf(wall)[1 - anchor.end];
    let angle = Math.atan2(z - other.z, x - other.x);
    const step = Math.PI / 12;
    if (Math.abs(angle - Math.round(angle / step) * step) < (3 * Math.PI) / 180) angle = Math.round(angle / step) * step;
    const len = Math.max(LIMITS.length[0], Math.round(Math.hypot(x - other.x, z - other.z)));
    p = { x: other.x + Math.cos(angle) * len, z: other.z + Math.sin(angle) * len };
  }
  commitWalls(withEndsAt(corner, p.x, p.z), { live: true });
  return target;
}

// Length is the wall's inside length (wall face to wall face). Its start stays put and its end moves.
// A wall joined at the end at an angle moves along with it, keeping its own length and direction,
// together with the walls at its far corner and any butting into it, so a rectangular room stays
// rectangular. Angle turns the wall about its start, with any walls joined at its end.
export function setWallLength(id, length) {
  if (ui.locked) return null;
  let walls = state.walls;
  for (let k = 0; k < 4; k++) {
    const w = walls.find((x) => x.id === id);
    const delta = length - insideLengthOf(w, walls);
    if (Math.abs(delta) < 0.05) break;
    walls = pushEnd(walls, w, delta);
  }
  commitWalls(walls, { keepOpenings: true });
}

function pushEnd(walls, w, delta) {
  const u = unitOf(w);
  let moving = endsAt(walls, { x: w.x2, z: w.z2 });
  const others = moving.filter((e) => e.id !== w.id);
  if (others.length === 1) {
    const next = walls.find((x) => x.id === others[0].id);
    const v = unitOf(next);
    if (!next.curve && Math.abs(u.x * v.z - u.z * v.x) > 0.5) {
      const far = endsAt(walls, endsOf(next)[1 - others[0].end]);
      if (!far.some((e) => e.id === w.id)) moving = [...moving, ...far, ...buttingInto(walls, next)];
    }
  }
  return moveEnds(walls, moving, { x: u.x * delta, z: u.z * delta });
}

export function setWallAngle(id, degrees) {
  if (ui.locked) return null;
  const w = wallById(id);
  const r = (degrees * Math.PI) / 180;
  const len = lengthOf(w);
  commitWalls(withEndsAt(cornerAt(id, 1), w.x1 + Math.cos(r) * len, w.z1 + Math.sin(r) * len));
}

// Move walls by (dx, dz) from where they were when the drag started. A moved end that comes near another
// wall's end connects to it. Returns the connection point, if any.
export function dragWalls(originals, dx, dz) {
  if (ui.locked) return null;
  const ids = new Set(originals.map((w) => w.id));
  const others = state.walls.filter((w) => !ids.has(w.id));
  let best = null;
  for (const w of originals) {
    for (const e of endsOf(w)) {
      const moved = { x: e.x + dx, z: e.z + dz };
      const t = snapTarget(moved, others, new Set());
      if (t && betterSnap(t, best)) best = { ...t, ax: t.x - moved.x, az: t.z - moved.z };
    }
  }
  const sx = dx + (best?.ax ?? 0);
  const sz = dz + (best?.az ?? 0);
  const moved = new Map(originals.map((w) => [w.id, { ...w, x1: round(w.x1 + sx), z1: round(w.z1 + sz), x2: round(w.x2 + sx), z2: round(w.z2 + sz) }]));
  commitWalls(state.walls.map((w) => moved.get(w.id) ?? w), { live: true });
  return best;
}

export function nudgeWalls(ids, dx, dz) {
  if (ui.locked) return null;
  nextKey = `nudge:${ids}`;
  const set = new Set(ids);
  commitWalls(state.walls.map((w) => (set.has(w.id) ? { ...w, x1: w.x1 + dx, z1: w.z1 + dz, x2: w.x2 + dx, z2: w.z2 + dz } : w)));
}

// Turn walls about their middle (one wall) or the middle of their bounds (several).
export function rotateWalls(ids, degrees) {
  if (ui.locked) return null;
  const set = new Set(ids);
  const moving = state.walls.filter((w) => set.has(w.id));
  if (!moving.length) return;
  const b = boundsOf(moving);
  const c = moving.length === 1 ? midpointOf(moving[0]) : { x: b.cx, z: b.cz };
  commitWalls(
    state.walls.map((w) => {
      if (!set.has(w.id)) return w;
      const a = rotatePoint({ x: w.x1, z: w.z1 }, c, degrees);
      const e = rotatePoint({ x: w.x2, z: w.z2 }, c, degrees);
      return { ...w, x1: round(a.x), z1: round(a.z), x2: round(e.x), z2: round(e.z) };
    }),
  );
}

export function removeWalls(ids) {
  if (ui.locked) return null;
  const set = new Set(ids);
  const walls = state.walls.filter((w) => !set.has(w.id));
  const groups = state.groups.filter((g) => walls.some((w) => w.group === g.id));
  state = { ...state, groups, openings: state.openings.filter((o) => !set.has(o.wall)) };
  ui = { ...ui, sel: null };
  commitWalls(walls);
}

// Copies of the walls, 50 cm along; a whole group is copied as a new group.
export function duplicateWalls(ids) {
  if (ui.locked) return null;
  const set = new Set(ids);
  const source = state.walls.filter((w) => set.has(w.id));
  const groupIds = [...new Set(source.map((w) => w.group).filter(Boolean))];
  const whole = ui.sel?.type === 'group' ? groupIds[0] : null;
  let groups = state.groups;
  let newGroup = null;
  if (whole) {
    newGroup = { id: newId(), name: `${state.groups.find((g) => g.id === whole).name} copy` };
    groups = [...groups, newGroup];
  }
  let walls = [...state.walls];
  const copies = [];
  const copyOf = new Map(); // original wall id -> copy's id
  for (const w of source) {
    const copy = {
      ...w,
      id: newId(),
      name: nextName(walls, 'Wall'),
      x1: w.x1 + 50,
      z1: w.z1 + 50,
      x2: w.x2 + 50,
      z2: w.z2 + 50,
      group: newGroup ? newGroup.id : w.group,
    };
    copies.push(copy);
    copyOf.set(w.id, copy.id);
    walls = [...walls, copy];
  }
  let openings = state.openings;
  for (const o of state.openings.filter((q) => copyOf.has(q.wall))) {
    openings = [...openings, { ...o, id: newId(), wall: copyOf.get(o.wall), name: uniqueIn(openings, o.name.replace(/ \d+$/, '')) }];
  }
  state = { ...state, groups, openings };
  ui = {
    ...ui,
    sel: newGroup ? { type: 'group', id: newGroup.id } : copies.length === 1 ? { type: 'wall', id: copies[0].id } : { type: 'walls', ids: copies.map((c) => c.id) },
  };
  commitWalls(walls);
}

// ---- Groups ----

// Group the selected walls. Walls already in a group move into the new one.
export function groupWalls(ids) {
  if (ui.locked) return null;
  const set = new Set(ids);
  const group = { id: newId(), name: nextName(state.groups, 'Group') };
  const walls = state.walls.map((w) => (set.has(w.id) ? { ...w, group: group.id } : w));
  const groups = [...state.groups, group].filter((g) => walls.some((w) => w.group === g.id));
  state = { ...state, walls, groups };
  ui = { ...ui, sel: { type: 'group', id: group.id }, several: false };
  emit();
}

export function ungroup(groupId) {
  if (ui.locked) return null;
  const ids = state.walls.filter((w) => w.group === groupId).map((w) => w.id);
  state = {
    ...state,
    walls: state.walls.map((w) => (w.group === groupId ? { ...w, group: null } : w)),
    groups: state.groups.filter((g) => g.id !== groupId),
  };
  ui = { ...ui, sel: ids.length > 1 ? { type: 'walls', ids } : ids.length ? { type: 'wall', id: ids[0] } : null };
  emit();
}

export function renameGroup(id, name) {
  if (ui.locked) return null;
  nextKey = `group-name:${id}`;
  state = { ...state, groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)) };
  emit();
}

export function leaveGroup(wallId) {
  if (ui.locked) return null;
  const walls = state.walls.map((w) => (w.id === wallId ? { ...w, group: null } : w));
  state = { ...state, walls, groups: state.groups.filter((g) => walls.some((w) => w.group === g.id)) };
  emit();
}

// ---- Doors and windows ----

// The side the default 3D view looks from (as in layout.js): walls on the far side are the ones you see.
const VIEW = { x: 0.51, z: 0.86 };

// Where along a wall an opening of this width fits without overlapping the wall's other openings:
// as close to `near` (default: the middle) as possible, in 5 cm steps. Null if there's no room.
function freeOffset(w, width, others, near) {
  const len = lengthOf(w);
  const taken = others.map((o) => openingSpan(o, w));
  const fits = (c) =>
    c - width / 2 >= 5 && c + width / 2 <= len - 5 && taken.every((t) => c + width / 2 + 5 <= t.a || c - width / 2 - 5 >= t.b);
  const start = near ?? len / 2;
  for (let k = 0; k <= len / 5; k++) {
    for (const c of [start + k * 5, start - k * 5]) if (fits(c)) return c;
  }
  return null;
}

// Walls a new door or window could go in, best first: the selected wall if it can take one, otherwise
// long walls you can see from the default view.
function hostsFor() {
  const sel = ui.sel?.type === 'wall' ? wallById(ui.sel.id) : null;
  if (takesOpenings(sel)) return [sel];
  const b = boundsOf(state.walls);
  return state.walls
    .filter(takesOpenings)
    .map((w) => {
      const m = midpointOf(w);
      const seen = (m.x - b.cx) * VIEW.x + (m.z - b.cz) * VIEW.z < 0;
      return { w, score: lengthOf(w) * (seen ? 1 : 0.6) };
    })
    .sort((p, q) => q.score - p.score)
    .map((c) => c.w);
}

// Add a door or window to the selected wall, or to the best wall with room for it.
// Returns false if no wall has room.
export function addOpening(kind, style) {
  if (ui.locked) return null;
  const base = newOpeningOf(kind, style);
  for (const w of hostsFor()) {
    const offset = freeOffset(w, base.width, state.openings.filter((o) => o.wall === w.id));
    if (offset == null) continue;
    const opening = { ...base, id: newId(), wall: w.id, offset, name: uniqueIn(state.openings, base.name) };
    state = { ...state, openings: [...state.openings, opening] };
    ui = { ...ui, sel: { type: 'opening', id: opening.id } };
    emit();
    return true;
  }
  return false;
}

// Size, colors, hinges or design. A new design brings its own standard size, and a door or window
// still called by its design's name takes the new design's name.
export function updateOpening(id, patch) {
  if (ui.locked) return null;
  nextKey = `opening:${id}:${Object.keys(patch).sort()}`;
  const before = openingById(id);
  if (!before) return null;
  if (patch.style && patch.style !== before.style) {
    const next = newOpeningOf(before.kind, patch.style);
    patch = { width: next.width, height: next.height, sill: next.sill, ...patch };
    const oldName = newOpeningOf(before.kind, before.style).name;
    if (new RegExp(`^${oldName}( \\d+)?$`).test(before.name)) patch.name = uniqueIn(state.openings, next.name);
  }
  state = { ...state, openings: state.openings.map((o) => (o.id === id ? normalizeOpening({ ...o, ...patch }) : o)) };
  emit();
}

// Drag: put the opening's middle as close to (x, z) as a wall allows. It moves to another wall when
// the point is nearer that one, and won't overlap other doors and windows.
export function moveOpening(id, x, z) {
  if (ui.locked) return null;
  const o = openingById(id);
  let best = null;
  for (const w of state.walls.filter(takesOpenings)) {
    const hit = pointToSegment({ x, z }, { x: w.x1, z: w.z1 }, { x: w.x2, z: w.z2 });
    const score = hit.d - (w.id === o.wall ? 15 : 0); // stay on its own wall unless clearly nearer another
    if (hit.d < 60 && (!best || score < best.score)) best = { w, s: hit.t * lengthOf(w), score };
  }
  if (!best) return null;
  const others = state.openings.filter((q) => q.wall === best.w.id && q.id !== id);
  const offset = freeOffset(best.w, Math.min(o.width, lengthOf(best.w) - 10), others, best.s);
  if (offset == null || Math.abs(offset - best.s) > o.width) return null; // no room near the pointer
  state = { ...state, openings: state.openings.map((q) => (q.id === id ? { ...q, wall: best.w.id, offset } : q)) };
  emit();
}

// Slide along its wall, staying inside the wall.
export function slideOpening(id, offset) {
  if (ui.locked) return null;
  nextKey = `slide:${id}`;
  const o = openingById(id);
  const w = wallById(o.wall);
  const span = openingSpan({ ...o, offset }, w);
  state = { ...state, openings: state.openings.map((q) => (q.id === id ? { ...q, offset: span.centre } : q)) };
  emit();
}

export function removeOpening(id) {
  if (ui.locked) return null;
  state = { ...state, openings: state.openings.filter((o) => o.id !== id) };
  if (ui.sel?.type === 'opening' && ui.sel.id === id) ui = { ...ui, sel: null };
  emit();
}

// A copy beside it on the same wall, or on another wall if this one is full.
export function duplicateOpening(id) {
  if (ui.locked) return null;
  const o = openingById(id);
  const name = uniqueIn(state.openings, o.name.replace(/ \d+$/, ''));
  const walls = [wallById(o.wall), ...hostsFor().filter((w) => w.id !== o.wall)];
  for (const w of walls) {
    const near = w.id === o.wall ? o.offset + o.width + 20 : undefined;
    const offset = freeOffset(w, o.width, state.openings.filter((q) => q.wall === w.id), near);
    if (offset == null) continue;
    const copy = { ...o, id: newId(), wall: w.id, offset, name };
    state = { ...state, openings: [...state.openings, copy] };
    ui = { ...ui, sel: { type: 'opening', id: copy.id } };
    emit();
    return true;
  }
  return false;
}

// ---- Furniture ----

// A new piece of furniture in the given design (the type's first design if none is given).
export function addItem(type, style) {
  if (ui.locked) return null;
  const base = newItemOf(type, style);
  const draft = { id: newId(), type, x: 0, z: 0, rotation: 0, ...base, name: uniqueItemName(base.name) };
  Object.assign(draft, preferredSpot(draft, state.items, state.walls, state.openings));
  const item = findSpot(draft, state.items, state.walls);
  state = { ...state, items: [...state.items, item] };
  ui = { ...ui, sel: { type: 'item', id: item.id } };
  emit();
}

function replaceItem(before, after) {
  let items = state.items.map((i) => (i.id === before.id ? after : i));
  if (isSurface(before)) items = carryStacked(items, before, after);
  state = { ...state, items };
  emit();
}

// Design, size, color, name or rotation changes. Sizes are kept within what the design allows, and
// if the piece now runs into a wall, it moves clear of it.
export function updateItem(id, patch) {
  if (ui.locked) return null;
  nextKey = `item:${id}:${Object.keys(patch).sort()}`;
  const before = state.items.find((i) => i.id === id);
  if (!before) return;
  if ('rotation' in patch) patch = { ...patch, rotation: normAngle(patch.rotation) };
  // A piece still called by its design's name ("Round table 2") takes the new design's name.
  if (patch.style && patch.style !== before.style) {
    const oldName = newItemOf(before.type, before.style).name;
    if (new RegExp(`^${oldName}( \\d+)?$`).test(before.name)) {
      patch = { ...patch, name: uniqueItemName(newItemOf(before.type, patch.style).name) };
    }
  }
  replaceItem(before, settle(normalizeItem({ ...before, ...patch }), state.walls, state.items));
}

// Dragging furniture: it follows the pointer exactly, through walls if need be (a sofa can go through
// a narrow hallway into the next room). Letting go (`dropItem`) moves it clear of any wall it's in.
export function dragItem(id, x, z) {
  if (ui.locked) return null;
  nextKey = `move:${id}`;
  const before = state.items.find((i) => i.id === id);
  if (!before) return;
  replaceItem(before, { ...before, x: round(x), z: round(z) });
}

export function dropItem(id) {
  if (ui.locked) return null;
  const before = state.items.find((i) => i.id === id);
  const after = before && settle(before, state.walls, state.items);
  if (!after || after === before) return;
  nextKey = `move:${id}`;
  replaceItem(before, after);
}

// Arrow keys: a step at a time, stopping at walls.
export function moveItem(id, x, z) {
  if (ui.locked) return null;
  nextKey = `move:${id}`;
  const before = state.items.find((i) => i.id === id);
  if (!before) return;
  replaceItem(before, moveWithin(before, x, z, state.walls, state.items));
}

export function removeItem(id) {
  if (ui.locked) return null;
  state = { ...state, items: state.items.filter((i) => i.id !== id) };
  if (ui.sel?.type === 'item' && ui.sel.id === id) ui = { ...ui, sel: null };
  emit();
}

export function duplicateItem(id) {
  if (ui.locked) return null;
  const source = state.items.find((i) => i.id === id);
  if (!source) return;
  const copy = { ...source, id: newId(), name: uniqueItemName(newItemOf(source.type, source.style).name), x: source.x + 30, z: source.z + 30 };
  const item = findSpot(copy, state.items, state.walls);
  state = { ...state, items: [...state.items, item] };
  ui = { ...ui, sel: { type: 'item', id: item.id } };
  emit();
}

// ---- Files ----

export function exportDesign() {
  return JSON.stringify({ app: 'room-planner', version: 3, ...state }, null, 2);
}

export function importDesign(text) {
  if (ui.locked) return null;
  let data = null;
  try {
    data = sanitize(JSON.parse(text));
  } catch {
    // fall through to the error below
  }
  if (!data) throw new Error('not a design');
  state = data;
  ui = { ...ui, sel: null, several: false };
  emit();
}

export function resetDesign() {
  if (ui.locked) return null;
  state = fresh();
  ui = { ...ui, sel: null, several: false };
  emit();
}

// Accept saved or imported data only in the expected shape, with every number inside its limits.
// Older designs are converted: a width × length room (v1) or a room outline with openings (v2)
// becomes a group of walls.
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const num = (v, [lo, hi], fallback) =>
    v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : fallback;
  const hex = (v, fallback) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback);
  const coord = (v) => num(v, [-10000, 10000], NaN);

  const r = raw.room && typeof raw.room === 'object' ? raw.room : {};
  const room = {
    height: num(r.height, LIMITS.height, DEFAULT_LOOK.height),
    floorPattern: FLOOR_PATTERNS.some((p) => p.id === r.floorPattern) ? r.floorPattern : DEFAULT_LOOK.floorPattern,
    floorColor: hex(r.floorColor, DEFAULT_LOOK.floorColor),
    wallColor: hex(r.wallColor, DEFAULT_LOOK.wallColor),
  };

  let groups = [];
  let walls = [];
  if (Array.isArray(raw.walls)) {
    const groupIds = new Set();
    groups = (Array.isArray(raw.groups) ? raw.groups : [])
      .filter((g) => g && typeof g.id === 'string' && !groupIds.has(g.id) && groupIds.add(g.id))
      .map((g) => ({ id: g.id, name: typeof g.name === 'string' && g.name.trim() ? g.name.slice(0, 40) : 'Group' }));
    const ids = new Set();
    walls = raw.walls
      .slice(0, 500)
      .filter((w) => w && typeof w === 'object')
      .map((w) => ({ w, ends: { x1: coord(w?.x1), z1: coord(w?.z1), x2: coord(w?.x2), z2: coord(w?.z2) } }))
      .filter(({ ends }) => Object.values(ends).every(Number.isFinite) && Math.hypot(ends.x2 - ends.x1, ends.z2 - ends.z1) >= 1)
      .map(({ w, ends }) => {
        const id = typeof w.id === 'string' && !ids.has(w.id) ? w.id : newId();
        ids.add(id);
        const height = num(w.height, LIMITS.height, room.height);
        return {
          id,
          name: typeof w.name === 'string' ? w.name.slice(0, 40) : '',
          ...ends,
          thickness: num(w.thickness, LIMITS.thickness, WALL_THICKNESS),
          height,
          gap: num(w.gap, [0, height - 10], 0),
          curve: num(w.curve, [-5000, 5000], 0),
          color: hex(w.color, room.wallColor),
          group: groupIds.has(w.group) ? w.group : null,
          ...(w.keep === 'left' || w.keep === 'right' ? { keep: w.keep } : {}),
        };
      });
    groups = groups.filter((g) => walls.some((w) => w.group === g.id));
  } else {
    const group = { id: newId(), name: 'Room 1' };
    groups = [group];
    walls = legacyWalls(r, room, num).map((ends) => newWall(ends, room, { group: group.id }));
  }
  walls.forEach((w, i) => {
    if (!w.name) w.name = `Wall ${i + 1}`;
  });

  const itemIds = new Set();
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((i) => i && typeof i === 'object' && Object.hasOwn(CATALOG, i.type))
    .map((i) => {
      const def = CATALOG[i.type];
      const id = typeof i.id === 'string' && !itemIds.has(i.id) ? i.id : newId();
      itemIds.add(id);
      const item = {
        id,
        type: i.type,
        name: typeof i.name === 'string' && i.name.trim() ? i.name.slice(0, 40) : def.label,
        x: num(i.x, [-10000, 10000], 0),
        z: num(i.z, [-10000, 10000], 0),
        rotation: normAngle(num(i.rotation, [-3600, 3600], 0)),
      };
      // Furniture from before there were designs gets its type's first design.
      item.style = def.styles.some((s) => s.id === i.style) ? i.style : def.defaults.style;
      const limits = limitsOf(item);
      for (const [key, fallback] of Object.entries(def.defaults)) {
        if (key === 'style') continue;
        if (typeof fallback === 'boolean') item[key] = i[key] === true;
        else if (key.startsWith('color')) item[key] = hex(i[key], fallback);
        else item[key] = num(i[key], limits[key], fallback);
      }
      return normalizeItem(item);
    })
    .map((item, _, all) => settle(item, walls, all));

  const wallIds = new Set(walls.map((w) => w.id));
  const openingIds = new Set();
  const openings = (Array.isArray(raw.openings) ? raw.openings : [])
    .filter((o) => o && typeof o === 'object' && Object.hasOwn(OPENINGS, o.kind) && wallIds.has(o.wall))
    .map((o) => {
      const def = OPENINGS[o.kind];
      const id = typeof o.id === 'string' && !openingIds.has(o.id) ? o.id : newId();
      openingIds.add(id);
      const style = def.styles.some((x) => x.id === o.style) ? o.style : def.defaults.style;
      const out = { id, kind: o.kind, wall: o.wall, style, offset: num(o.offset, [0, 10000], 50) };
      out.name = typeof o.name === 'string' && o.name.trim() ? o.name.slice(0, 40) : newOpeningOf(o.kind, style).name;
      const limits = openingLimitsOf(out);
      for (const [key, fallback] of Object.entries(def.defaults)) {
        if (key === 'style') continue;
        if (typeof fallback === 'boolean') out[key] = o[key] === true;
        else if (key.startsWith('color')) out[key] = hex(o[key], fallback);
        else out[key] = num(o[key], limits[key] ?? [0, 1000], fallback);
      }
      return normalizeOpening(out);
    });

  return { room, walls, groups, items, openings };
}

// Walls from an older design: a room outline (v2) with curved walls, openings and open sides, or a
// plain width × length rectangle (v1). Each opening becomes a gap, with a beam above it if it stopped
// below the ceiling.
function legacyWalls(r, room, num) {
  const corners = Array.isArray(r.corners) ? r.corners.map((c) => ({ x: num(c?.x, [-5000, 5000], NaN), z: num(c?.z, [-5000, 5000], NaN) })) : [];
  if (corners.length < 3 || !corners.every((c) => Number.isFinite(c.x) && Number.isFinite(c.z))) {
    return rectangleWalls(num(r.width, ROOM_LIMITS.width, 400), num(r.length, ROOM_LIMITS.length, 500));
  }
  const out = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    const old = Array.isArray(r.walls) ? (r.walls[i] ?? {}) : {};
    if (old.open === true) return;
    const curve = num(old.curve, [-5000, 5000], 0);
    const len = dist(a, b);
    if (curve || !Array.isArray(old.openings) || !old.openings.length) {
      out.push({ x1: a.x, z1: a.z, x2: b.x, z2: b.z, curve });
      return;
    }
    const at = (s) => ({ x: round(a.x + ((b.x - a.x) * s) / len), z: round(a.z + ((b.z - a.z) * s) / len) });
    const piece = (s0, s1, extra = {}) => {
      if (s1 - s0 < JOIN) return;
      const p = at(s0);
      const q = at(s1);
      out.push({ x1: p.x, z1: p.z, x2: q.x, z2: q.z, ...extra });
    };
    const openings = old.openings
      .map((o) => {
        const width = Math.min(len, num(o?.width, [10, 10000], 90));
        return { at: Math.min(len - width, num(o?.at, [0, 10000], 0)), width, height: o?.height == null ? null : num(o.height, [50, 500], 210) };
      })
      .sort((p, q) => p.at - q.at);
    let s = 0;
    for (const o of openings) {
      piece(s, o.at);
      if (o.height != null && o.height < room.height) piece(o.at, o.at + o.width, { gap: o.height });
      s = Math.max(s, o.at + o.width);
    }
    piece(s, len);
  });
  return out.length ? out : rectangleWalls(400, 500);
}

