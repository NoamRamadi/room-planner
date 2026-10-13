// Type walls: walls typed in from a floor plan's measurements. Each line is a walk along the inside
// of the walls, a direction and a length for each piece: a wall, an opening (no wall), or a door. A
// line starts at a free point or on a wall. The plan redraws as you type; Done adds the walls, with
// their doors, to the design.
import { h, measureField } from './dom.js';
import { OPENINGS } from './openings.js';
import { fitHeadings, wrap } from './fit.js';
import { GRID_MAJOR, NEW_WALL, PAPER, TAPE, createPlan } from './plan.js';
import * as store from './state.js';
import { LIMITS, boundsOf, dist, facesOf, footprintOf, jointsOf, markOf, pointToSegment, signedArea } from './walls.js';

const OPENING = '#b07a16';
const WARN = '#c2410c';
const CLOSE = 5; // cm: a line ending this close to its start, or to a wall, meets it exactly
const NEAR = 150; // cm: a line ending this close to its start is reported as not quite meeting it
const PICK_PX = 14; // how close (screen pixels) the pointer must come to a wall to pick it
const FRAME = 5; // cm, a new door's frame on each side
const DOOR_WIDTH = OPENINGS.door.limits.width;

// Eight directions on the plan, 45° apart: 0 is right, 2 down, 4 left, 6 up.
export const DIRS = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return { x: Math.round(Math.cos(a) * 1e9) / 1e9, z: Math.round(Math.sin(a) * 1e9) / 1e9 };
});
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const DIR_NAMES = ['Right', 'Down and right', 'Down', 'Down and left', 'Left', 'Up and left', 'Up', 'Up and right'];
const KINDS = [
  { id: 'wall', label: 'Wall', key: 'w' },
  { id: 'opening', label: 'Opening', key: 'o' },
  { id: 'door', label: 'Door', key: 'd' },
];
const solid = (kind) => kind !== 'opening'; // walls and doors are built; openings aren't

const nearestDir = (v) => DIRS.reduce((best, d, i) => (d.x * v.x + d.z * v.z > DIRS[best].x * v.x + DIRS[best].z * v.z ? i : best), 0);
const lerp = (a, b, s) => ({ x: a.x + (b.x - a.x) * s, z: a.z + (b.z - a.z) * s });
const round1 = (v) => Math.round(v * 10) / 10;

let nextId = 1;
const newId = () => nextId++;

// A built wall's face on one side (1: its left, -1: its right), from end to end as the rooms see it.
function faceOf(w, side, walls) {
  const f = facesOf(w, walls);
  const [s0, s1] = side === 1 ? f.left : f.right;
  const off = (side * w.thickness) / 2;
  const at = (s) => ({ x: w.x1 + f.u.x * s + f.nl.x * off, z: w.z1 + f.u.z * s + f.nl.z * off });
  return { a: at(s0), b: at(s1), n: { x: f.nl.x * side, z: f.nl.z * side }, wall: w };
}

// Faces of built walls, worked out once per set of walls.
function facesFor(walls) {
  const cache = new Map();
  return (id, side) => {
    const key = `${id}:${side}`;
    if (!cache.has(key)) {
      const w = walls.find((x) => x.id === id);
      cache.set(key, w && !w.divider && !w.curve ? faceOf(w, side, walls) : null);
    }
    return cache.get(key);
  };
}

// The point `offset` cm along a segment from its start (`from` 0) or its end (`from` 1).
function along(seg, from, offset) {
  const len = dist(seg.a, seg.b) || 1;
  const s = Math.min(len, Math.max(0, from ? len - offset : offset));
  return lerp(seg.a, seg.b, s / len);
}

// Where every piece of every line goes. A line starts at `start`, or on a built wall's face
// (`on.wall`, `on.side`) or on a piece of an earlier line (`on.line`, `on.step`, by id), `on.offset` cm
// from that wall's start or end (`on.from`).
// A line that comes back near its start closes there (`line.close`: true closes it however far off,
// false leaves it open): its sides keep their lengths and its corners bend as little as they can so
// it meets, and so its diagonals (`line.diagonals`: [{ a, b, length }], between corners a and b, 0 at
// the start) are the right length. A line that ends near a wall has its last piece made longer or
// shorter to meet it.
export function layoutLines(lines, walls = []) {
  const faces = facesFor(walls);
  const out = [];
  const pieceById = (lineId, stepId) => out.find((l) => l.id === lineId)?.pieces.find((p) => p.id === stepId);
  for (const line of lines) {
    let start = line.start;
    let anchor = null;
    if (line.on) {
      const seg = line.on.wall ? faces(line.on.wall, line.on.side) : pieceById(line.on.line, line.on.step);
      if (seg && (line.on.wall || solid(seg.kind))) {
        start = along(seg, line.on.from, line.on.offset);
        anchor = seg;
      }
    }
    // Sides: pieces going the same way, one after another. Corners are where sides meet.
    const sides = [];
    for (const step of line.steps) {
      const last = sides.at(-1);
      if (last && last.dir === step.dir) {
        last.steps.push(step);
        last.length += step.length;
      } else {
        sides.push({ dir: step.dir, steps: [step], length: step.length });
      }
    }
    const typed = sides.map((s) => (s.dir * Math.PI) / 4);
    const total = sides.reduce((sum, s) => sum + s.length, 0);
    const endWith = (headings) =>
      headings.reduce((p, h, i) => ({ x: p.x + Math.cos(h) * sides[i].length, z: p.z + Math.sin(h) * sides[i].length }), start);
    const off = sides.length ? dist(endWith(typed), start) : 0;
    const closes = sides.length >= 3 && (line.close === true || (line.close !== false && off <= closeReach(total)));
    let headings = typed;
    let fit = null;
    if (closes) {
      const diagonals = (line.diagonals ?? []).filter((d) => d.a !== d.b && d.a < sides.length && d.b < sides.length && d.length > 0);
      fit = fitHeadings({ start, lengths: sides.map((s) => s.length), headings: typed, diagonals });
      fit.used = diagonals;
      headings = fit.headings;
    }
    const pieces = [];
    const corners = [];
    let p = start;
    sides.forEach((side, i) => {
      corners.push(p);
      const u = { x: Math.cos(headings[i]), z: Math.sin(headings[i]) };
      for (const step of side.steps) {
        const b = { x: p.x + u.x * step.length, z: p.z + u.z * step.length };
        pieces.push({ ...step, a: p, b, u, line: line.id, side: i });
        p = b;
      }
    });
    let end = null;
    let miss = null;
    const last = pieces.at(-1);
    if (last && closes) {
      last.b = { ...start }; // what's left of the gap after fitting: a fraction of a millimetre
      end = { closed: true, typedOff: off };
    } else if (last) {
      end = landing(last, line, pieces, out, walls, faces);
      if (end) last.b = end.at;
      else if (sides.length >= 3 && off < NEAR) miss = off;
    }
    // A line going round a room knows which side the room is on: 1 to the left of each piece, -1 to
    // the right (on the plan, left of the way it goes).
    const inside = closes ? Math.sign(signedArea(corners)) : 0;
    out.push({ id: line.id, start, anchor, pieces, corners, headings, end, miss, inside, fit });
  }
  return out;
}

// How far off a line can end and still close by itself: 3% of its length, 5 to 40 cm.
const closeReach = (total) => Math.max(CLOSE, Math.min(40, total * 0.03));

// A wall the end of a line meets: a built wall's face or a piece of a line, straight ahead of its
// last piece or just behind its end (up to a tenth of that piece, 5 to 30 cm). The last piece is made
// that much longer or shorter (`stretch`, cm). Failing that, a wall the end is within CLOSE of.
function landing(last, line, pieces, out, walls, faces) {
  const reach = Math.max(CLOSE, Math.min(30, last.length * 0.1));
  const p = last.b;
  const u = last.u;
  let best = null;
  const consider = (seg, what) => {
    const v = { x: seg.b.x - seg.a.x, z: seg.b.z - seg.a.z };
    const den = u.x * v.z - u.z * v.x;
    if (Math.abs(den) > 1e-6) {
      const w = { x: seg.a.x - p.x, z: seg.a.z - p.z };
      const t = (w.x * v.z - w.z * v.x) / den; // along the last piece, from its end
      const s = (w.x * u.z - w.z * u.x) / den; // along the wall
      if (Math.abs(t) <= reach && s >= -0.001 && s <= 1.001 && (!best || Math.abs(t) < Math.abs(best.stretch))) {
        best = { ...what, at: { x: p.x + u.x * t, z: p.z + u.z * t }, stretch: t };
        return;
      }
    }
    const hit = pointToSegment(p, seg.a, seg.b);
    if (hit.d <= CLOSE && !best) best = { ...what, at: lerp(seg.a, seg.b, hit.t), stretch: 0 };
  };
  for (const w of walls) {
    if (w.divider || w.curve) continue;
    for (const side of [1, -1]) {
      const f = faces(w.id, side);
      if (f) consider(f, { wall: w.id, side, n: f.n, thickness: w.thickness });
    }
  }
  for (const l of out) for (const q of l.pieces) if (solid(q.kind)) consider(q, { line: l.id, step: q.id });
  for (const q of pieces.slice(0, -2)) if (solid(q.kind)) consider(q, { line: line.id, step: q.id });
  return best;
}

// The walls to build: each run of walls and doors going the same way is one wall (doors sit in it),
// openings leave a gap. A line starting or ending on a built wall's face reaches on to its middle, so
// the two join. `height` for all of them. A line that goes round a room knows which side the room is
// on (`inside`: 1 for the wall's left, -1 for its right), even with openings in it; its openings get
// a room divider across them, so the room is closed for its floor, name and area.
export function segmentsOf(lines, layout, height) {
  const segments = [];
  const doors = [];
  layout.forEach((l, i) => {
    const line = lines[i];
    const first = segments.length;
    const inside = l.inside;
    let run = null;
    const flush = () => {
      if (!run) return;
      segments.push(run.seg);
      for (const d of run.doors) doors.push({ ...d, segment: segments.length - 1 });
      run = null;
    };
    for (const p of l.pieces) {
      if (!solid(p.kind)) {
        flush();
        if (inside) segments.push({ x1: p.a.x, z1: p.a.z, x2: p.b.x, z2: p.b.z, thickness: 4, height, divider: true });
        continue;
      }
      if (run && p.dir === run.dir) {
        run.seg.x2 = p.b.x;
        run.seg.z2 = p.b.z;
      } else {
        flush();
        run = { dir: p.dir, seg: { x1: p.a.x, z1: p.a.z, x2: p.b.x, z2: p.b.z, thickness: line.thickness, height, divider: false, ...(inside ? { inside } : {}) }, doors: [] };
      }
      if (p.kind === 'door') run.doors.push({ centre: lerp(p.a, p.b, 0.5), width: p.length, frame: p.frame ?? FRAME });
    }
    flush();
    // Reach into a built wall the line starts or ends on.
    const reach = (seg, end, u, n, t) => {
      const dot = (u.x * n.x + u.z * n.z) * (end ? -1 : 1); // leaving the wall at the start, coming at it at the end
      if (dot < 0.3) return;
      const k = t / 2 / dot;
      if (end) {
        seg.x2 += u.x * k;
        seg.z2 += u.z * k;
      } else {
        seg.x1 -= u.x * k;
        seg.z1 -= u.z * k;
      }
    };
    const firstPiece = l.pieces[0];
    const lastPiece = l.pieces.at(-1);
    if (l.anchor?.wall && firstPiece && solid(firstPiece.kind) && segments[first]) reach(segments[first], false, firstPiece.u, l.anchor.n, l.anchor.wall.thickness);
    if (l.end?.wall && lastPiece && solid(lastPiece.kind) && segments.length > first) reach(segments.at(-1), true, lastPiece.u, l.end.n, l.end.thickness);
  });
  for (const s of segments) for (const k of ['x1', 'z1', 'x2', 'z2']) s[k] = round1(s[k]);
  return { segments: segments.filter((s) => Math.hypot(s.x2 - s.x1, s.z2 - s.z1) >= 1), doors };
}

export function createTypeMode(stage, { onClose }) {
  const settings = { thickness: 12, height: 270, replace: false };
  let lines = []; // { id, thickness, start, on, steps: [{ id, dir, kind, length, frame? }] }
  let current = null; // id of the line new pieces go on
  const next = { dir: 0, kind: 'wall' };
  let picking = null; // 'wall' or 'point': the next click on the plan starts a line
  let hoverPick = null; // what that click would start the line on
  let hoverPoint = null;
  let focus = null; // { line, step }: the row being looked at, shown in the plan
  let layout = [];
  let message = '';
  const held = new Set(); // arrow keys held down, for diagonals

  const cur = () => lines.find((l) => l.id === current) ?? null;
  const lineNo = (id) => lines.findIndex((l) => l.id === id) + 1;
  const builtWalls = () => (settings.replace ? [] : store.getState().walls);

  // ---- Bar above the plan: the walls' thickness and height, and the next piece ----

  const thickness = measureField({
    label: 'Thickness',
    min: LIMITS.thickness[0],
    max: LIMITS.thickness[1],
    get: () => cur()?.thickness ?? settings.thickness,
    set: (v) => {
      settings.thickness = v;
      if (cur()) cur().thickness = v;
      refresh();
    },
  });
  const height = measureField({
    label: 'Height',
    min: LIMITS.height[0],
    max: LIMITS.height[1],
    get: () => settings.height,
    set: (v) => (settings.height = v),
  });
  // Directions as a 3 × 3 pad around the middle.
  const padOrder = [5, 6, 7, 4, null, 0, 3, 2, 1];
  const dirButtons = new Map();
  const pad = h(
    'div',
    { class: 'type-pad', role: 'group', 'aria-label': 'Direction' },
    padOrder.map((d) => {
      if (d == null) return h('span', { class: 'type-pad__mid', 'aria-hidden': 'true' });
      const b = h('button', { type: 'button', title: DIR_NAMES[d], 'aria-label': DIR_NAMES[d], onclick: () => setDir(d) }, ARROWS[d]);
      dirButtons.set(d, b);
      return b;
    }),
  );
  const kindButtons = KINDS.map((k) => h('button', { type: 'button', title: `${k.label} (${k.key.toUpperCase()})`, onclick: () => setKind(k.id) }, k.label));
  const kind = h('div', { class: 'segmented draw__kind', role: 'group', 'aria-label': 'Next piece' }, kindButtons);
  const lengthInput = h('input', { class: 'type-length', type: 'text', inputmode: 'numeric', autocomplete: 'off', placeholder: 'Length', 'aria-label': 'Length in cm' });
  const addBtn = h('button', { type: 'button', class: 'btn', onclick: () => act(addPiece) }, 'Add');
  const count = h('span', { class: 'draw__count', 'aria-live': 'polite' });
  const legend = h('p', { class: 'draw__legend' });
  const canvas = h('canvas', { class: 'draw__canvas', 'aria-label': 'Floor plan of the walls you type' });
  const note = h('p', { class: 'type-note', 'aria-live': 'polite' });

  const bar = h(
    'div',
    { class: 'draw__bar' },
    h('div', { class: 'draw__fields' }, thickness.el, height.el),
    h(
      'div',
      { class: 'type-next' },
      pad,
      h('div', { class: 'type-next__piece' }, kind, h('div', { class: 'type-next__length' }, lengthInput, h('span', { class: 'measure__unit' }, 'cm'), addBtn)),
    ),
    h(
      'div',
      { class: 'draw__exit' },
      count,
      h('button', { type: 'button', class: 'btn', onclick: cancel }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn--tape', onclick: done }, 'Done'),
    ),
  );
  const root = h(
    'div',
    { class: 'draw type', hidden: true },
    canvas,
    bar,
    note,
    h('p', { class: 'draw__hint' }, 'Type each length from your plan along the inside of the walls: an arrow key for the direction, the length, Enter. Two arrow keys together go diagonally. Drag to move around, scroll to zoom.'),
    legend,
  );
  stage.append(root);

  // ---- The list of lines, shown in the side panel ----

  const panel = h('div', { class: 'typer', 'data-always': '' });

  const act = (fn) => {
    fn();
    refresh();
  };

  function setDir(d) {
    next.dir = d;
    syncBar();
    render();
    lengthInput.focus();
  }

  function setKind(k) {
    next.kind = k;
    syncBar();
    render();
    lengthInput.focus();
  }

  function syncBar() {
    thickness.sync();
    height.sync();
    for (const [d, b] of dirButtons) b.setAttribute('aria-pressed', String(d === next.dir));
    kindButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(KINDS[i].id === next.kind)));
    const pieces = layout.flatMap((l) => l.pieces);
    const wallsN = pieces.filter((p) => p.kind === 'wall').length;
    const doorsN = pieces.filter((p) => p.kind === 'door').length;
    count.textContent = pieces.length ? `${wallsN} ${wallsN === 1 ? 'wall' : 'walls'}${doorsN ? `, ${doorsN} ${doorsN === 1 ? 'door' : 'doors'}` : ''}` : '';
    lengthInput.placeholder = next.kind === 'door' ? 'Door width' : next.kind === 'opening' ? 'Opening' : 'Length';
    note.textContent = message || (picking === 'wall' ? 'Click the wall the new line starts on, where it starts.' : picking === 'point' ? 'Click where the new line starts.' : '');
    note.hidden = !note.textContent;
    note.style.top = `${bar.offsetTop + bar.offsetHeight + 10}px`; // just below the bar, however tall it wraps
  }

  // A new line, free or on a wall, becomes the one pieces are added to.
  function newLine(start, on = null) {
    const line = { id: newId(), thickness: settings.thickness, start, on, steps: [] };
    lines.push(line);
    current = line.id;
    picking = null;
    hoverPick = null;
    return line;
  }

  // Where a first line starts: beside anything built, or in the middle of an empty plan.
  function freeStart() {
    const walls = builtWalls();
    if (!walls.length) return { x: 0, z: 0 };
    const b = boundsOf(walls);
    return { x: Math.round((b.cx + b.width / 2 + 200) / 10) * 10, z: Math.round((b.cz - b.length / 2) / 10) * 10 };
  }

  function addPiece() {
    message = '';
    const length = Math.round(Number(lengthInput.value.replace(',', '.')) * 10) / 10;
    if (!(length > 0)) {
      message = 'Type a length in cm first.';
      return;
    }
    if (next.kind === 'wall' && length < LIMITS.length[0]) {
      message = `A wall is at least ${LIMITS.length[0]} cm long.`;
      return;
    }
    if (next.kind === 'door' && (length < DOOR_WIDTH[0] || length > DOOR_WIDTH[1])) {
      message = `A door is ${DOOR_WIDTH[0]} to ${DOOR_WIDTH[1]} cm wide, frame included.`;
      return;
    }
    const line = cur() ?? newLine(freeStart());
    line.steps.push({ id: newId(), dir: next.dir, kind: next.kind, length, ...(next.kind === 'door' ? { frame: FRAME } : {}) });
    if (next.kind !== 'wall') next.kind = 'wall'; // a wall usually comes next
    lengthInput.value = '';
    focus = null;
  }

  // Step back: the last piece of the current line, or the line itself once it has none.
  function removeLast() {
    message = '';
    const line = cur();
    if (!line) return;
    if (line.steps.length) line.steps.pop();
    else if (lines.length > 1) removeLine(line.id);
  }

  function removeLine(id) {
    lines = lines.filter((l) => l.id !== id);
    if (current === id) current = lines.at(-1)?.id ?? null;
  }

  // ---- Plan ----

  const plan = createPlan({
    root,
    canvas,
    legend,
    render: () => render(),
    hover: (p) => {
      hoverPoint = p;
      hoverPick = picking === 'wall' ? pickAt(p) : null;
    },
    click: (p) => {
      if (picking === 'wall') {
        if (hoverPick) act(() => startOn(hoverPick));
      } else if (picking === 'point') {
        act(() => newLine(snapPoint(p)));
      } else {
        const hit = pieceAt(p);
        if (hit) {
          current = hit.line;
          focus = { line: hit.line, step: hit.id };
          refresh();
          panel.querySelector(`[data-row="${hit.id}"] .type-row__length`)?.focus();
        }
      }
      lengthInput.focus({ preventScroll: true });
    },
    leave: () => {
      hoverPoint = null;
      hoverPick = null;
    },
  });
  const { g, toScreen } = plan;

  // The typed piece under a plan point, if any.
  function pieceAt(p) {
    const tol = PICK_PX / plan.scale;
    let best = null;
    for (const l of layout) {
      for (const q of l.pieces) {
        const hit = pointToSegment(p, q.a, q.b);
        const t = lines.find((x) => x.id === l.id)?.thickness ?? 0;
        if (hit.d <= t / 2 + tol && (!best || hit.d < best.d)) best = { ...q, d: hit.d };
      }
    }
    return best;
  }

  // A wall to start a line on, under the pointer: a typed piece, or a built wall's face on the
  // pointer's side. The line starts where the pointer is, measured from the nearer end.
  function pickAt(p) {
    const tol = PICK_PX / plan.scale;
    const walls = builtWalls();
    const faces = facesFor(walls);
    // A saved point on a built wall: the line starts exactly there.
    for (const m of settings.replace ? [] : store.getState().marks) {
      const pos = markOf(m, walls);
      const seg = pos && faces(m.wall, m.side);
      if (seg && dist(pos.at, p) <= tol) return { wall: m.wall, side: m.side, from: m.from, offset: m.offset, n: seg.n, seg, at: pos.at, d: 0, name: pos.wall.name };
    }
    let best = null;
    const consider = (seg, reach, what) => {
      const hit = pointToSegment(p, seg.a, seg.b);
      if (hit.d > reach + tol || (best && hit.d >= best.d)) return;
      const len = dist(seg.a, seg.b);
      const s = Math.round(hit.t * len);
      const from = s > len / 2 ? 1 : 0;
      best = { ...what, d: hit.d, seg, from, offset: from ? Math.round(len - s) : s, at: lerp(seg.a, seg.b, s / (len || 1)) };
    };
    // The new line goes into the side of the wall the pointer is on, or into the room when the
    // pointer is on the wall itself.
    for (const l of layout) {
      const half = (lines.find((x) => x.id === l.id)?.thickness ?? 0) / 2;
      for (const q of l.pieces) {
        if (!solid(q.kind)) continue;
        const across = (p.x - q.a.x) * -q.u.z + (p.z - q.a.z) * q.u.x;
        const side = Math.abs(across) <= half && l.inside ? l.inside : across >= 0 ? 1 : -1;
        consider(q, half, { line: l.id, step: q.id, n: { x: -q.u.z * side, z: q.u.x * side } });
      }
    }
    for (const w of walls) {
      if (w.divider || w.curve) continue;
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1) || 1;
      const across = (p.x - w.x1) * (-(w.z2 - w.z1) / len) + (p.z - w.z1) * ((w.x2 - w.x1) / len);
      const room = Math.abs(across) <= w.thickness / 2 ? facesOf(w, walls).side : 0;
      const side = room || (across >= 0 ? 1 : -1);
      const f = faces(w.id, side);
      if (f) consider(f, w.thickness, { wall: w.id, side, n: f.n, name: w.name });
    }
    return best;
  }

  function startOn(pick) {
    const on = pick.wall ? { wall: pick.wall, side: pick.side, from: pick.from, offset: pick.offset } : { line: pick.line, step: pick.step, from: pick.from, offset: pick.offset };
    newLine(pick.at, on);
    next.dir = nearestDir(pick.n);
    next.kind = 'wall';
  }

  // A free starting point: a typed corner nearby, or the 10 cm grid.
  function snapPoint(p) {
    const tol = PICK_PX / plan.scale;
    for (const l of layout) for (const q of [l.start, ...l.pieces.map((x) => x.b)]) if (dist(q, p) <= tol) return { ...q };
    return { x: Math.round(p.x / 10) * 10, z: Math.round(p.z / 10) * 10 };
  }

  const pieceWall = (q, t) => ({ id: `t${q.id}`, x1: q.a.x, z1: q.a.z, x2: q.b.x, z2: q.b.z, thickness: t, gap: 0, curve: 0 });

  function render() {
    if (root.hidden) return;
    const built = builtWalls();
    const thicknessOf = (id) => lines.find((l) => l.id === id)?.thickness ?? settings.thickness;
    const typed = layout.flatMap((l) => l.pieces.filter((q) => solid(q.kind)).map((q) => pieceWall(q, thicknessOf(l.id))));
    const joins = jointsOf([...built.filter((w) => !w.divider), ...typed]);
    plan.background(joins, { faded: settings.replace });
    if (!settings.replace) plan.marks();

    const focusId = focus?.step;
    for (const l of layout) {
      const t = thicknessOf(l.id);
      for (const q of l.pieces) {
        const lit = q.id === focusId;
        if (q.kind === 'opening') {
          plan.dashed(pieceWall(q, t), lit ? TAPE : OPENING, 2.5);
          continue;
        }
        plan.polygon(footprintOf(pieceWall(q, t), joins), lit ? '#c9940a' : NEW_WALL);
        if (q.kind === 'door') doorMark(q, t);
      }
    }
    // Lengths beside each piece, and each line's number at its start.
    for (const l of layout) {
      const t = thicknessOf(l.id);
      for (const q of l.pieces) {
        const len = Math.round(q.length * 10) / 10;
        const text = q.kind === 'door' ? `door ${len}` : q.kind === 'opening' ? `opening ${len}` : `${len}`;
        plan.lengthLabel(pieceWall(q, t), text, q.id === focusId ? undefined : { fill: PAPER, ink: q.kind === 'opening' ? OPENING : NEW_WALL, edge: GRID_MAJOR });
      }
      startMark(l);
      if (l.miss != null) missMark(l);
    }

    // The current line's corners by letter, the angle of each corner bent to close it, its diagonals.
    const line = layout.find((l) => l.id === current);
    if (line?.end?.closed && !picking) cornerMarks(line);

    // Where the next piece goes: a dot at the end of the current line and the piece to come.
    if (line && !picking) {
      const from = line.pieces.at(-1)?.b ?? line.start;
      const u = DIRS[next.dir];
      const typedLen = Number(lengthInput.value.replace(',', '.'));
      const len = typedLen > 0 ? typedLen : 40 / plan.scale;
      const to = { x: from.x + u.x * len, z: from.z + u.z * len };
      const a = toScreen(from);
      const b = toScreen(to);
      g.save();
      g.setLineDash(typedLen > 0 ? [] : [5, 5]);
      g.strokeStyle = next.kind === 'opening' ? OPENING : '#c9940a';
      g.lineWidth = typedLen > 0 ? Math.max(3, thicknessOf(line.id) * plan.scale) : 2;
      g.globalAlpha = typedLen > 0 ? 0.75 : 1;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
      g.restore();
      if (!(typedLen > 0)) arrowHead(b, u);
      dot(a, TAPE);
    }

    // Picking a wall to start a line on: the wall lit up and how far along it the line would start.
    if (picking === 'wall' && hoverPick) {
      const { seg, at } = hoverPick;
      const a = toScreen(seg.a);
      const b = toScreen(seg.b);
      g.save();
      g.strokeStyle = TAPE;
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
      g.restore();
      const end = toScreen(hoverPick.from ? seg.b : seg.a);
      dot(end, NEW_WALL, 3);
      dot(toScreen(at), TAPE);
      plan.label(`${hoverPick.offset} cm`, { x: (end.x + toScreen(at).x) / 2, y: (end.y + toScreen(at).y) / 2 - 16 });
    } else if (picking === 'point' && hoverPoint) {
      dot(toScreen(snapPoint(hoverPoint)), TAPE);
    }
  }

  function cornerMarks(l) {
    const n = l.corners.length;
    const mid = { x: l.corners.reduce((s, c) => s + c.x, 0) / n, z: l.corners.reduce((s, c) => s + c.z, 0) / n };
    (l.fit?.used ?? []).forEach((d, k) => {
      const a = toScreen(l.corners[d.a]);
      const b = toScreen(l.corners[d.b]);
      const off = Math.abs(l.fit.diagonals[k]) > 2;
      g.save();
      g.setLineDash([6, 5]);
      g.strokeStyle = off ? WARN : '#8a5d0d';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
      g.restore();
      // A third of the way from its first corner, so crossing diagonals keep their labels apart.
      plan.label(`${cornerName(d.a)}–${cornerName(d.b)} ${d.length}`, { x: a.x + (b.x - a.x) / 3, y: a.y + (b.y - a.y) / 3 }, off ? { fill: '#fde7dc', ink: WARN, edge: WARN } : { fill: PAPER, ink: '#8a5d0d', edge: '#8a5d0d' });
    });
    l.corners.forEach((c, k) => {
      const turn = wrap(l.headings[k] - l.headings[(k - 1 + n) % n]);
      const angle = 180 - (l.inside * turn * 180) / Math.PI;
      const bent = Math.abs(l.fit?.bends[k] ?? 0) * (180 / Math.PI) >= 0.05;
      const s = toScreen(c);
      const towards = { x: mid.x - c.x, z: mid.z - c.z };
      const len = Math.hypot(towards.x, towards.z) || 1;
      const at = { x: s.x + (towards.x / len) * 26, y: s.y + (towards.z / len) * 26 };
      plan.label(bent ? `${cornerName(k)} ${angle.toFixed(1)}°` : cornerName(k), at, { fill: bent ? '#f9e6a6' : PAPER, ink: NEW_WALL, edge: GRID_MAJOR });
    });
  }

  function dot(s, fill, r = 5) {
    g.fillStyle = fill;
    g.strokeStyle = NEW_WALL;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(s.x, s.y, r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function arrowHead(s, u) {
    const a = Math.atan2(u.z, u.x);
    g.fillStyle = '#c9940a';
    g.beginPath();
    g.moveTo(s.x + Math.cos(a) * 7, s.y + Math.sin(a) * 7);
    g.lineTo(s.x + Math.cos(a + 2.5) * 7, s.y + Math.sin(a + 2.5) * 7);
    g.lineTo(s.x + Math.cos(a - 2.5) * 7, s.y + Math.sin(a - 2.5) * 7);
    g.closePath();
    g.fill();
  }

  // A door in the plan: the gap between its frames, and its swing to the right of the way the line
  // goes (into the room, going round it clockwise).
  function doorMark(q, t) {
    const f = Math.min(q.frame ?? FRAME, q.length / 2);
    const u = q.u;
    const r = { x: -u.z, z: u.x };
    const at = (s, k) => ({ x: q.a.x + u.x * s + r.x * k, z: q.a.z + u.z * s + r.z * k });
    plan.polygon([at(f, t / 2 + 0.5), at(q.length - f, t / 2 + 0.5), at(q.length - f, -t / 2 - 0.5), at(f, -t / 2 - 0.5)], PAPER);
    const leaf = q.length - 2 * f;
    const hinge = toScreen(at(f, t / 2));
    const angle = Math.atan2(u.z, u.x);
    g.save();
    g.strokeStyle = NEW_WALL;
    g.lineWidth = 1.2;
    g.beginPath();
    g.arc(hinge.x, hinge.y, leaf * plan.scale, angle, angle + Math.PI / 2);
    g.stroke();
    const open = toScreen(at(f, t / 2 + leaf));
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(hinge.x, hinge.y);
    g.lineTo(open.x, open.y);
    g.stroke();
    g.restore();
  }

  function startMark(l) {
    const s = toScreen(l.start);
    const isCurrent = l.id === current;
    g.fillStyle = isCurrent ? TAPE : PAPER;
    g.strokeStyle = NEW_WALL;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(s.x, s.y, 9, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = NEW_WALL;
    g.font = '600 11px Archivo, system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(lineNo(l.id)), s.x, s.y + 0.5);
  }

  // A line that ends near its start without meeting it: the gap between them, in red.
  function missMark(l) {
    const a = toScreen(l.pieces.at(-1).b);
    const b = toScreen(l.start);
    g.save();
    g.setLineDash([4, 4]);
    g.strokeStyle = WARN;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.restore();
    plan.label(`${Math.round(l.miss)} cm off`, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 16 }, { fill: '#fde7dc', ink: WARN, edge: WARN });
  }

  // ---- The list ----

  function renderList() {
    const active = document.activeElement;
    const keep = panel.contains(active) ? active.dataset.key : null;
    const wallsBuilt = store.getState().walls.length;
    const parts = [
      h('h2', { class: 'inspector__title' }, 'Type walls'),
      h('p', { class: 'help help--first' }, 'Lengths are inside lengths, from wall face to wall face, as on your plan. Go round each room clockwise.'),
      lines.map((line, i) => lineBlock(line, layout[i], i)),
      h(
        'div',
        { class: 'typer__add' },
        h('button', { type: 'button', class: 'btn', 'aria-pressed': String(picking === 'wall'), onclick: () => act(() => togglePicking('wall')) }, '+ Line from a wall'),
        h('button', { type: 'button', class: 'btn', 'aria-pressed': String(picking === 'point'), onclick: () => act(() => togglePicking('point')) }, '+ Line from a point'),
      ),
      wallsBuilt
        ? h(
            'label',
            { class: 'check typer__replace' },
            checkbox(settings.replace, (on) => {
              settings.replace = on;
            }),
            `Replace the ${wallsBuilt} ${wallsBuilt === 1 ? 'wall' : 'walls'} already built`,
          )
        : null,
      h(
        'dl',
        { class: 'keys' },
        [
          ['Arrow keys', 'Direction'],
          ['Two arrows', 'Diagonal'],
          ['W, O, D', 'Wall, opening, door'],
          ['Numbers, Enter', 'Add a piece'],
          ['Backspace', 'Remove the last piece'],
        ].flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]),
      ),
    ];
    panel.replaceChildren(...parts.flat().filter(Boolean)); // native, so no arrays or nulls
    if (keep) panel.querySelector(`[data-key="${keep}"]`)?.focus();
    else panel.querySelector('.typer__line.is-current .type-row:last-child, .typer__line.is-current')?.scrollIntoView({ block: 'nearest' });
  }

  function togglePicking(kind) {
    picking = picking === kind ? null : kind;
    hoverPick = null;
    message = '';
  }

  function checkbox(on, set) {
    const box = h('input', { type: 'checkbox' });
    box.checked = on;
    box.addEventListener('change', () => act(() => set(box.checked)));
    return box;
  }

  function lineBlock(line, l, i) {
    const isCurrent = line.id === current;
    let where = 'From a free point';
    if (line.on?.wall) {
      const w = store.wallById(line.on.wall);
      where = w ? `On ${w.name}` : 'From a free point';
    } else if (line.on?.line) {
      const host = lines.find((x) => x.id === line.on.line);
      const row = host?.steps.findIndex((s) => s.id === line.on.step);
      where = host && row >= 0 ? `On line ${lineNo(host.id)}, row ${row + 1}` : 'From a free point';
    }
    const anchored = Boolean(line.on && l?.anchor);
    const header = h(
      'div',
      { class: 'typer__head' },
      h('button', { type: 'button', class: 'typer__name', onclick: () => act(() => (current = line.id)) }, `Line ${i + 1}`),
      h('span', { class: 'typer__where' }, where),
      h('button', {
        type: 'button',
        class: 'icon-btn icon-btn--small',
        'aria-label': `Remove line ${i + 1}`,
        title: 'Remove this line',
        html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        onclick: () => {
          if (line.steps.length && !confirm(`Remove line ${i + 1} and its ${line.steps.length} ${line.steps.length === 1 ? 'piece' : 'pieces'}?`)) return;
          act(() => removeLine(line.id));
        },
      }),
    );
    // Where a line on a wall starts: how far from which end of it.
    const anchorRow = anchored
      ? h(
          'div',
          { class: 'typer__anchor' },
          numberInput(`anchor-${line.id}`, line.on.offset, (v) => (line.on.offset = Math.max(0, v)), 'Distance along the wall'),
          h('span', {}, 'cm from its'),
          h(
            'select',
            { 'aria-label': 'Measured from', 'data-key': `from-${line.id}`, onchange: (e) => act(() => (line.on.from = Number(e.target.value))) },
            [
              ['0', 'start'],
              ['1', 'end'],
            ].map(([v, label]) => {
              const o = h('option', { value: v }, label);
              o.selected = String(line.on.from) === v;
              return o;
            }),
          ),
        )
      : null;
    const rows = line.steps.map((step, j) => stepRow(line, step, j));
    return h(
      'section',
      { class: `typer__line${isCurrent ? ' is-current' : ''}`, onclick: () => !isCurrent && act(() => (current = line.id)) },
      header,
      anchorRow,
      rows.length ? h('ol', { class: 'typer__steps' }, rows) : h('p', { class: 'typer__empty' }, isCurrent ? 'Pick a direction above the plan, type a length and press Enter.' : 'No pieces yet.'),
      thicknessNote(line),
      statusOf(line, l),
      l?.end?.closed && l.corners.length >= 4 ? diagonalsBlock(line, l) : null,
    );
  }

  // How the line ends: closed (and how much its corners bent to close it), on a wall, or near its
  // start, with a button to close it or leave it open.
  function statusOf(line, l) {
    if (!l?.pieces.length) return null;
    const say = (ok, text, button) =>
      h('p', { class: `typer__status typer__status--${ok ? 'ok' : 'warn'}` }, text, button ? [' ', button] : null);
    const toggle = (label, close) =>
      h('button', { type: 'button', class: 'typer__link', onclick: (e) => (e.stopPropagation(), act(() => (line.close = close))) }, label);
    if (l.end?.closed) {
      const leave = toggle('Leave it open', false);
      const f = l.fit;
      const bend = Math.max(...f.bends.map((b) => Math.abs((b * 180) / Math.PI)));
      const off = f.diagonals.map((r, k) => ({ r, d: f.used[k] })).filter(({ r }) => Math.abs(r) > 2);
      if (f.miss > 1) return say(false, `These lengths can't close the room: the walls end ${Math.round(f.miss)} cm apart. Check them.`, leave);
      if (off.length) return say(false, `The ${off.length === 1 ? 'diagonal doesn’t' : 'diagonals don’t'} fit the lengths: ${off.map(({ r, d }) => `${cornerName(d.a)}–${cornerName(d.b)} is ${Math.abs(Math.round(r))} cm ${r > 0 ? 'longer' : 'shorter'}`).join(', ')}. Check the measurements.`, leave);
      if (l.end.typedOff < 0.5 && bend < 0.05) return say(true, 'Back at its start: the room is closed.', leave);
      const gap = Math.round(l.end.typedOff * 10) / 10;
      // Measured diagonals settle the corners, however far from square the room really is.
      if (f.used.length && f.used.length >= l.corners.length - 3) return say(true, `Closed, exactly: the ${f.used.length === 1 ? 'diagonal sets' : 'diagonals set'} the corners.`, leave);
      if (bend > 3) return say(false, `Closed, but its corners bend up to ${bend.toFixed(1)}° to close a ${gap} cm gap. Check the lengths, or measure a diagonal if the room really isn’t square.`, leave);
      return say(true, `Closed: its corners bend up to ${bend.toFixed(1)}° to close a ${gap} cm gap.${l.corners.length > 3 ? ' Measure a diagonal to make it exact.' : ''}`, leave);
    }
    if (l.end?.wall || l.end?.line) {
      const name = l.end.wall ? (store.wallById(l.end.wall)?.name ?? 'a wall') : `line ${lineNo(l.end.line)}`;
      const s = Math.round(Math.abs(l.end.stretch) * 10) / 10;
      return say(true, s >= 0.5 ? `Ends on ${name}; its last piece is ${s} cm ${l.end.stretch > 0 ? 'longer' : 'shorter'} to meet it.` : `Ends on ${name}.`);
    }
    if (l.miss != null) return say(false, `Ends ${Math.round(l.miss)} cm from its start.`, toggle('Close it', true));
    return null;
  }

  // Corners are named by letter, A at the line's start, as on the plan.
  const cornerName = (k) => String.fromCharCode(65 + k);

  // Diagonals: corner-to-corner measurements across a closed room that make its shape exact.
  function diagonalsBlock(line, l) {
    line.diagonals ??= [];
    const n = l.corners.length;
    const options = (value, set, key) =>
      h(
        'select',
        { 'aria-label': 'Corner', 'data-key': key, onchange: (e) => act(() => set(Number(e.target.value))) },
        l.corners.map((_, k) => {
          const o = h('option', { value: String(k) }, cornerName(k));
          o.selected = k === value;
          return o;
        }),
      );
    const rows = line.diagonals.map((d, k) => {
      const used = l.fit?.used.indexOf(d) ?? -1;
      const r = used >= 0 ? l.fit.diagonals[used] : 0;
      return h(
        'li',
        { class: `typer__diagonal${Math.abs(r) > 2 ? ' is-off' : ''}` },
        options(d.a, (v) => (d.a = v), `da-${line.id}-${k}`),
        h('span', {}, 'to'),
        options(d.b, (v) => (d.b = v), `db-${line.id}-${k}`),
        numberInput(`dl-${line.id}-${k}`, d.length || '', (v) => (d.length = v), 'Diagonal length in cm', 'typer__diag-length'),
        h('span', { class: 'type-row__unit' }, 'cm'),
        h('button', {
          type: 'button',
          class: 'icon-btn icon-btn--small',
          'aria-label': 'Remove this diagonal',
          html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
          onclick: (e) => (e.stopPropagation(), act(() => line.diagonals.splice(k, 1))),
        }),
      );
    });
    const needed = Math.max(0, n - 3 - line.diagonals.filter((d) => d.length > 0).length);
    return h(
      'div',
      { class: 'typer__diagonals' },
      h('p', { class: 'typer__sub' }, 'Diagonals', h('span', {}, needed ? ` · ${needed} more ${needed === 1 ? 'makes' : 'make'} it exact` : ' · exact')),
      rows.length ? h('ol', { class: 'typer__steps' }, rows) : null,
      h(
        'button',
        {
          type: 'button',
          class: 'typer__link',
          onclick: (e) => {
            e.stopPropagation();
            act(() => {
              current = line.id;
              // Two corners not measured yet, as far round the room from each other as can be.
              const taken = new Set(line.diagonals.map((d) => `${Math.min(d.a, d.b)}-${Math.max(d.a, d.b)}`));
              const pairs = [];
              for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) if (!(a === 0 && b === n - 1)) pairs.push([a, b]);
              pairs.sort((p, q) => Math.abs(p[1] - p[0] - n / 2) - Math.abs(q[1] - q[0] - n / 2));
              const [a, b] = pairs.find(([x, y]) => !taken.has(`${x}-${y}`)) ?? pairs[0];
              line.diagonals.push({ a, b, length: 0 });
            });
            panel.querySelector(`[data-key="dl-${line.id}-${line.diagonals.length - 1}"]`)?.focus();
          },
        },
        '+ Add a diagonal',
      ),
    );
  }

  const thicknessNote = (line) => h('p', { class: 'typer__thick' }, `Walls ${line.thickness} cm thick`);

  function numberInput(key, value, set, label, cls = '') {
    const input = h('input', { type: 'text', inputmode: 'numeric', class: `typer__num ${cls}`, value: String(value), 'aria-label': label, 'data-key': key, autocomplete: 'off' });
    input.addEventListener('change', () => {
      const v = Number(input.value.replace(',', '.'));
      if (Number.isFinite(v) && v >= 0) act(() => set(Math.round(v * 10) / 10));
      else input.value = String(value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
    return input;
  }

  function stepRow(line, step, j) {
    const dir = h(
      'select',
      { class: 'type-row__dir', 'aria-label': 'Direction', 'data-key': `dir-${step.id}`, onchange: (e) => act(() => (step.dir = Number(e.target.value))) },
      ARROWS.map((a, d) => {
        const o = h('option', { value: String(d), title: DIR_NAMES[d] }, a);
        o.selected = d === step.dir;
        return o;
      }),
    );
    const kindSel = h(
      'select',
      {
        class: 'type-row__kind',
        'aria-label': 'Piece',
        'data-key': `kind-${step.id}`,
        onchange: (e) =>
          act(() => {
            step.kind = e.target.value;
            if (step.kind === 'door') {
              step.frame ??= FRAME;
              step.length = Math.min(DOOR_WIDTH[1], Math.max(DOOR_WIDTH[0], step.length));
            }
          }),
      },
      KINDS.map((k) => {
        const o = h('option', { value: k.id }, k.label);
        o.selected = k.id === step.kind;
        return o;
      }),
    );
    const length = numberInput(`len-${step.id}`, step.length, (v) => {
      const [lo, hi] = step.kind === 'door' ? DOOR_WIDTH : [step.kind === 'wall' ? LIMITS.length[0] : 1, LIMITS.length[1]];
      step.length = Math.min(hi, Math.max(lo, v));
      if (step.kind === 'door') step.frame = Math.min(step.frame, Math.floor((step.length - 40) / 2));
    }, 'Length in cm', 'type-row__length');
    const remove = h('button', {
      type: 'button',
      class: 'icon-btn icon-btn--small',
      'aria-label': `Remove row ${j + 1}`,
      title: 'Remove',
      html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      onclick: (e) => {
        e.stopPropagation();
        act(() => {
          line.steps = line.steps.filter((s) => s.id !== step.id);
          current = line.id;
        });
      },
    });
    // A door's parts: the part that opens and the frame on each side make up its whole width.
    const parts =
      step.kind === 'door'
        ? h(
            'div',
            { class: 'type-row__door' },
            h('label', {}, 'Opens', numberInput(`leaf-${step.id}`, step.length - 2 * step.frame, (v) => {
              step.length = Math.min(DOOR_WIDTH[1], Math.max(DOOR_WIDTH[0], v + 2 * step.frame));
            }, 'The part that opens, in cm')),
            h('label', {}, 'Frame', numberInput(`frame-${step.id}`, step.frame, (v) => {
              step.frame = Math.min(20, Math.max(2, Math.min(v, Math.floor((step.length - 40) / 2))));
            }, 'Frame on each side, in cm'), 'each side'),
          )
        : null;
    const lit = focus?.step === step.id;
    return h(
      'li',
      {
        class: `type-row type-row--${step.kind}${lit ? ' is-lit' : ''}`,
        'data-row': String(step.id),
        onmouseenter: () => {
          focus = { line: line.id, step: step.id };
          render();
        },
        onmouseleave: () => {
          focus = null;
          render();
        },
      },
      h('span', { class: 'type-row__no' }, String(j + 1)),
      dir,
      kindSel,
      length,
      h('span', { class: 'type-row__unit' }, 'cm'),
      remove,
      parts,
    );
  }

  // ---- Keys: arrows for the direction (two together go diagonally), W/O/D for the piece, numbers
  // for its length, Enter to add it, Backspace (with nothing typed) or Ctrl/Cmd+Z to step back ----

  const ARROW_DIRS = { ArrowRight: 0, ArrowDown: 2, ArrowLeft: 4, ArrowUp: 6 };
  function arrowDir() {
    const dirs = [...held].map((k) => ARROW_DIRS[k]);
    const last = dirs.at(-1);
    if (dirs.length < 2) return last;
    const [a, b] = dirs.slice(-2).sort((x, y) => x - y);
    if (b - a === 4) return last; // opposite arrows: the later one
    return a === 0 && b === 6 ? 7 : (a + b) / 2; // between the two
  }

  function onKey(e) {
    if (root.hidden) return;
    const t = e.target;
    const inLength = t === lengthInput;
    if (!inLength && t.closest?.('input, textarea, select, button')) return; // editing the list
    const mod = e.metaKey || e.ctrlKey;
    if (e.key in ARROW_DIRS && !mod) {
      held.add(e.key);
      if (held.size > 2) held.delete([...held][0]);
      setDir(arrowDir());
    } else if (e.key === 'Enter') {
      act(addPiece);
    } else if (e.key === 'Escape') {
      if (picking) act(() => togglePicking(picking));
      else if (lengthInput.value) lengthInput.value = '';
      else return;
    } else if ((e.key === 'Backspace' && !lengthInput.value) || ((e.key === 'z' || e.key === 'Z') && mod)) {
      act(removeLast);
    } else if (!mod && KINDS.some((k) => k.key === e.key.toLowerCase())) {
      setKind(KINDS.find((k) => k.key === e.key.toLowerCase()).id);
    } else if (!inLength && !mod && /^[0-9.,]$/.test(e.key)) {
      lengthInput.focus();
      lengthInput.value += e.key;
      render();
    } else {
      if (inLength) requestAnimationFrame(render); // the piece to come follows the typed length
      return;
    }
    e.preventDefault();
  }
  const onKeyUp = (e) => held.delete(e.key);
  lengthInput.addEventListener('input', () => render());

  // ---- Refresh, open and close ----

  function refresh() {
    const wasClosed = new Set(layout.filter((l) => l.end?.closed).map((l) => l.id));
    layout = layoutLines(lines, builtWalls());
    // A line that has just closed: say so, and where the next one starts.
    const closedNow = layout.find((l) => l.id === current && l.end?.closed && !wasClosed.has(l.id));
    if (closedNow) message = `Line ${lineNo(closedNow.id)} is closed. Start the next one with + Line from a wall, or from a point.`;
    // A line whose wall is gone stays where it was, as a free line.
    layout.forEach((l, i) => {
      lines[i].start = { ...l.start };
      if (lines[i].on && !l.anchor) lines[i].on = null;
    });
    syncBar();
    renderList();
    // Everything typed stays in view as the plan grows.
    plan.keepInView(layout.flatMap((l) => [l.start, ...l.pieces.map((q) => q.b)]), { top: bar.offsetHeight + 24, margin: 70 });
    render();
  }

  function open() {
    if (store.getUI().locked) return;
    settings.height = store.getState().room.height;
    settings.replace = false;
    lines = [];
    current = null;
    next.dir = 0;
    next.kind = 'wall';
    picking = null;
    focus = null;
    message = '';
    lengthInput.value = '';
    newLine(freeStart());
    root.hidden = false;
    store.setDrawing('type');
    if (!store.getUI().rightOpen) store.setPanel('right', true);
    plan.fit({ top: bar.offsetHeight + 24 }, builtWalls().length ? builtWalls() : [{ x1: -100, z1: -100, x2: 900, z2: 700, thickness: 0 }]);
    plan.resize();
    refresh();
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    lengthInput.focus();
  }

  function close(added) {
    root.hidden = true;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('keyup', onKeyUp);
    held.clear();
    plan.clearPointers();
    if (!added) store.setDrawing(false);
    onClose(added);
  }

  function done() {
    const { segments, doors } = segmentsOf(lines, layout, settings.height);
    if (!segments.length) return close(false);
    store.addDrawnWalls(segments, { doors, replace: settings.replace });
    close(true);
  }

  function cancel() {
    const n = lines.reduce((sum, l) => sum + l.steps.length, 0);
    if (n && !confirm(`Discard the ${n === 1 ? 'piece' : `${n} pieces`} you typed?`)) return;
    close(false);
  }

  return { open, panel };
}
