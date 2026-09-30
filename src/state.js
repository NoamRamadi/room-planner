// The design (walls, groups of walls, furniture, colors) and what's selected. Every change is saved to localStorage.
import { CATALOG, FLOOR_PATTERNS, limitsOf, newItemOf, normalizeItem } from './catalog.js';
import { carryStacked, findSpot, moveWithin, normAngle, preferredSpot, settle } from './layout.js';
import {
  JOIN,
  LIMITS,
  betterSnap,
  boundsOf,
  dist,
  endsAt,
  endsOf,
  jointsOf,
  lengthOf,
  midpointOf,
  rectangleWalls,
  rotatePoint,
  snapTarget,
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
  const walls = rectangleWalls(400, 500).map((ends, i) => newWall(ends, room, { name: `Wall ${i + 1}`, group: group.id }));
  return { room, walls, groups: [group], items: [] };
}

let state = loadSaved() ?? fresh();
// sel: null, { type: 'item' | 'wall' | 'group', id }, or { type: 'walls', ids } for several walls.
// several: clicks add to the selection instead of replacing it (for touch screens without Shift).
// cutaway: walls between the camera and the room are cut down so you can see in (a view setting,
// remembered separately from the design).
let ui = { sel: null, several: false, cutaway: loadView().cutaway ?? true };
const listeners = new Set();
let saveTimer = 0;

function emit() {
  for (const fn of listeners) fn(state, ui);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 250);
}

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

export function setCutaway(on) {
  ui = { ...ui, cutaway: on };
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ cutaway: on }));
  } catch {
    // Not remembered for next time, but it still applies now.
  }
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
  let walls = state.walls;
  if ('wallColor' in patch) walls = walls.map((w) => ({ ...w, color: patch.wallColor }));
  if ('height' in patch) walls = walls.map((w) => ({ ...w, height: patch.height, gap: Math.min(w.gap, patch.height - 20) }));
  state = { ...state, room: { ...state.room, ...patch }, walls };
  emit();
}

// ---- Walls ----

function commitWalls(walls, { live = false } = {}) {
  state = { ...state, walls, items: live ? state.items : state.items.map((i) => settle(i, walls, state.items)) };
  emit();
}

// Tidy up after a drag: furniture a wall now runs through moves out of the way.
export function finishWallEdit() {
  commitWalls(state.walls);
}

export function hasFreeEnd(id) {
  return jointsOf(state.walls).get(id)?.some((ends) => ends.length === 0) ?? false;
}

// A new wall of the given length. With one wall selected it starts at that wall's free end, turned 90°
// (so adding four walls in a row closes a room); otherwise it's centred on `focus`.
export function addWall(length, focus = { x: 0, z: 0 }) {
  const from = ui.sel?.type === 'wall' ? wallById(ui.sel.id) : null;
  let ends;
  let group = null;
  if (from) {
    const joins = jointsOf(state.walls).get(from.id);
    const end = joins[1].length === 0 ? 1 : joins[0].length === 0 ? 0 : 1;
    const [a, b] = endsOf(from);
    const start = end === 1 ? b : a;
    const away = end === 1 ? { x: b.x - a.x, z: b.z - a.z } : { x: a.x - b.x, z: a.z - b.z };
    const l = Math.hypot(away.x, away.z) || 1;
    const dir = { x: -away.z / l, z: away.x / l }; // a quarter turn clockwise in the top view
    ends = { x1: start.x, z1: start.z, x2: round(start.x + dir.x * length), z2: round(start.z + dir.z * length) };
    group = from.group;
  } else {
    ends = { x1: round(focus.x - length / 2), z1: round(focus.z), x2: round(focus.x + length / 2), z2: round(focus.z) };
  }
  const wall = newWall(ends, state.room, { name: nextName(state.walls, 'Wall'), group });
  ui = { ...ui, sel: { type: 'wall', id: wall.id } };
  commitWalls([...state.walls, wall]);
}

// Four walls around a width × length room, grouped. Placed beside anything already built.
export function addRoom(width, length) {
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
  commitWalls(state.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)));
}

// Move a set of wall ends (a corner) to (x, z).
function withEndsAt(ends, x, z) {
  const byId = new Map();
  for (const e of ends) byId.set(e.id, [...(byId.get(e.id) ?? []), e.end]);
  return state.walls.map((w) => {
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

// Length and angle keep the wall's start where it is and move its end, with any walls joined there.
export function setWallLength(id, length) {
  const w = wallById(id);
  const u = { x: (w.x2 - w.x1) / lengthOf(w), z: (w.z2 - w.z1) / lengthOf(w) };
  commitWalls(withEndsAt(cornerAt(id, 1), w.x1 + u.x * length, w.z1 + u.z * length));
}

export function setWallAngle(id, degrees) {
  const w = wallById(id);
  const r = (degrees * Math.PI) / 180;
  const len = lengthOf(w);
  commitWalls(withEndsAt(cornerAt(id, 1), w.x1 + Math.cos(r) * len, w.z1 + Math.sin(r) * len));
}

// Move walls by (dx, dz) from where they were when the drag started. A moved end that comes near another
// wall's end connects to it. Returns the connection point, if any.
export function dragWalls(originals, dx, dz) {
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
  const set = new Set(ids);
  commitWalls(state.walls.map((w) => (set.has(w.id) ? { ...w, x1: w.x1 + dx, z1: w.z1 + dz, x2: w.x2 + dx, z2: w.z2 + dz } : w)));
}

// Turn walls about their middle (one wall) or the middle of their bounds (several).
export function rotateWalls(ids, degrees) {
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
  const set = new Set(ids);
  const walls = state.walls.filter((w) => !set.has(w.id));
  const groups = state.groups.filter((g) => walls.some((w) => w.group === g.id));
  state = { ...state, groups };
  ui = { ...ui, sel: null };
  commitWalls(walls);
}

// Copies of the walls, 50 cm along; a whole group is copied as a new group.
export function duplicateWalls(ids) {
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
    walls = [...walls, copy];
  }
  state = { ...state, groups };
  ui = {
    ...ui,
    sel: newGroup ? { type: 'group', id: newGroup.id } : copies.length === 1 ? { type: 'wall', id: copies[0].id } : { type: 'walls', ids: copies.map((c) => c.id) },
  };
  commitWalls(walls);
}

// ---- Groups ----

// Group the selected walls. Walls already in a group move into the new one.
export function groupWalls(ids) {
  const set = new Set(ids);
  const group = { id: newId(), name: nextName(state.groups, 'Group') };
  const walls = state.walls.map((w) => (set.has(w.id) ? { ...w, group: group.id } : w));
  const groups = [...state.groups, group].filter((g) => walls.some((w) => w.group === g.id));
  state = { ...state, walls, groups };
  ui = { ...ui, sel: { type: 'group', id: group.id }, several: false };
  emit();
}

export function ungroup(groupId) {
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
  state = { ...state, groups: state.groups.map((g) => (g.id === id ? { ...g, name } : g)) };
  emit();
}

export function leaveGroup(wallId) {
  const walls = state.walls.map((w) => (w.id === wallId ? { ...w, group: null } : w));
  state = { ...state, walls, groups: state.groups.filter((g) => walls.some((w) => w.group === g.id)) };
  emit();
}

// ---- Furniture ----

// A new piece of furniture in the given design (the type's first design if none is given).
export function addItem(type, style) {
  const base = newItemOf(type, style);
  const draft = { id: newId(), type, x: 0, z: 0, rotation: 0, ...base, name: uniqueItemName(base.name) };
  Object.assign(draft, preferredSpot(draft, state.items, state.walls));
  const item = findSpot(draft, state.items, state.walls);
  state = { ...state, items: [...state.items, item] };
  ui = { ...ui, sel: { type: 'item', id: item.id } };
  emit();
}

function replaceItem(before, after) {
  let items = state.items.map((i) => (i.id === before.id ? after : i));
  if (CATALOG[before.type].surface) items = carryStacked(items, before, after);
  state = { ...state, items };
  emit();
}

// Design, size, color, name or rotation changes. Sizes are kept within what the design allows, and
// if the piece now runs into a wall, it moves clear of it.
export function updateItem(id, patch) {
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

export function moveItem(id, x, z) {
  const before = state.items.find((i) => i.id === id);
  if (!before) return;
  replaceItem(before, moveWithin(before, x, z, state.walls, state.items));
}

export function removeItem(id) {
  state = { ...state, items: state.items.filter((i) => i.id !== id) };
  if (ui.sel?.type === 'item' && ui.sel.id === id) ui = { ...ui, sel: null };
  emit();
}

export function duplicateItem(id) {
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

  return { room, walls, groups, items };
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

