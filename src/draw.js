// Draw walls: a flat floor plan on a grid of squares. Click to start a wall and again at every
// corner; each click ends one wall and starts the next. Done adds the drawn walls to the design.
import { h, measureField } from './dom.js';
import { GRID_MAJOR, NEW_WALL, PAPER, createPlan } from './plan.js';
import * as store from './state.js';
import { LIMITS, dist, endsOf, footprintOf, jointsOf, pointToSegment } from './walls.js';

const SNAP_PX = 14; // how close (screen pixels) the pointer must come to a wall end to connect to it

const round = (v) => Math.round(v * 10) / 10;

export function createDrawMode(stage, { onClose }) {
  // `divider`: draw room dividers (dashed lines that close a room without a wall) instead of walls.
  const settings = { thickness: 12, height: 270, divider: false };
  let segments = []; // drawn walls: { x1, z1, x2, z2, thickness, height, divider }
  let chain = null; // the line being drawn: its first corner, its last corner, and how many walls it has
  let cursor = null; // the pointer on the plan (cm), after snapping: { x, z, kind }
  let typed = ''; // a length typed while drawing

  // ---- Toolbar ----

  const thickness = measureField({
    label: 'Thickness',
    min: LIMITS.thickness[0],
    max: LIMITS.thickness[1],
    get: () => settings.thickness,
    set: (v) => {
      settings.thickness = v;
      render();
    },
  });
  const height = measureField({
    label: 'Height',
    min: LIMITS.height[0],
    max: LIMITS.height[1],
    get: () => settings.height,
    set: (v) => (settings.height = v),
  });
  const kindButtons = [
    ['Walls', false],
    ['Room divider', true],
  ].map(([label, divider]) =>
    h('button', {
      type: 'button',
      onclick: () => {
        settings.divider = divider;
        syncKind();
        render();
      },
    }, label),
  );
  const kind = h('div', { class: 'segmented draw__kind', role: 'group', 'aria-label': 'Draw' }, kindButtons);
  function syncKind() {
    kindButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(settings.divider === (i === 1))));
    thickness.el.hidden = height.el.hidden = settings.divider;
  }
  syncKind();
  const undoBtn = h('button', { type: 'button', class: 'btn', onclick: () => act(undo) }, 'Undo');
  const finishBtn = h('button', { type: 'button', class: 'btn', onclick: () => act(finishLine) }, 'Finish line');
  const count = h('span', { class: 'draw__count', 'aria-live': 'polite' });
  const legend = h('p', { class: 'draw__legend' });
  const canvas = h('canvas', { class: 'draw__canvas', 'aria-label': 'Floor plan. Click to place wall corners.' });

  const bar = h(
    'div',
    { class: 'draw__bar' },
    h('div', { class: 'draw__fields' }, kind, thickness.el, height.el),
    h('div', { class: 'draw__actions' }, undoBtn, finishBtn, count),
    h(
      'div',
      { class: 'draw__exit' },
      h('button', { type: 'button', class: 'btn', onclick: cancel }, 'Cancel'),
      h('button', { type: 'button', class: 'btn btn--tape', onclick: done }, 'Done'),
    ),
  );
  const root = h(
    'div',
    { class: 'draw', hidden: true },
    canvas,
    bar,
    h(
      'p',
      { class: 'draw__hint' },
      'Draw along the inside of the room: click to start, then click at each corner. Click the last corner again (or press Enter) to end the line. Type a number for an exact length. Drag to move around, scroll to zoom. Hold Alt to place freely.',
    ),
    legend,
  );
  stage.append(root);

  function sync() {
    thickness.sync();
    height.sync();
    const total = segments.reduce((sum, s) => sum + Math.hypot(s.x2 - s.x1, s.z2 - s.z1), 0);
    count.textContent = segments.length ? `${segments.length} new ${segments.length === 1 ? 'wall' : 'walls'}, ${(total / 100).toFixed(1)} m` : 'No new walls yet';
    undoBtn.disabled = !segments.length && !chain;
    finishBtn.disabled = !chain;
  }

  const act = (fn) => {
    fn();
    sync();
    render();
  };

  const plan = createPlan({
    root,
    canvas,
    legend,
    render: () => render(),
    hover: (p, e) => {
      cursor = snap(p, e.altKey);
    },
    click: () => act(() => place(cursor)),
    leave: () => {
      cursor = null;
    },
  });
  const { g, toScreen } = plan;

  // ---- Snapping ----

  // Where a corner at `raw` should go: onto a wall end, onto a wall, in a 45° direction from the last
  // corner (with the length rounded to whole centimetres), or onto the 10 cm grid.
  function snap(raw, free) {
    if (free) return { x: raw.x, z: raw.z, kind: null };
    const tol = SNAP_PX / plan.scale;
    const { walls } = store.getState();
    let best = null;
    for (const e of [...walls.flatMap(endsOf), ...segments.flatMap(endsOf), ...(chain ? [chain.start] : [])]) {
      const d = dist(e, raw);
      if (d < tol && (!best || d < best.d)) best = { x: e.x, z: e.z, d, kind: 'end' };
    }
    if (best) return best;
    // Onto another wall, at a whole centimetre along it.
    for (const w of [...walls.filter((x) => !x.curve), ...segments]) {
      const hit = pointToSegment(raw, { x: w.x1, z: w.z1 }, { x: w.x2, z: w.z2 });
      if (hit.d < tol * 0.7 && hit.t > 0.01 && hit.t < 0.99 && (!best || hit.d < best.d)) {
        const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
        const s = Math.round(hit.t * len) / len;
        best = { x: w.x1 + (w.x2 - w.x1) * s, z: w.z1 + (w.z2 - w.z1) * s, d: hit.d, kind: 'wall', w };
      }
    }
    if (best && chain) {
      // If the wall being drawn is close to straight or 45°, meet the other wall exactly where that
      // direction crosses it, so the new wall stays straight.
      const from = chain.last;
      const angle = Math.atan2(best.z - from.z, best.x - from.x);
      const square = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      if (Math.abs(angle - square) < (6 * Math.PI) / 180) {
        const d = { x: Math.cos(square), z: Math.sin(square) };
        const e = { x: best.w.x2 - best.w.x1, z: best.w.z2 - best.w.z1 };
        const den = d.x * e.z - d.z * e.x;
        if (Math.abs(den) > 1e-9) {
          const u = ((best.w.x1 - from.x) * d.z - (best.w.z1 - from.z) * d.x) / den;
          const cross = { x: best.w.x1 + e.x * u, z: best.w.z1 + e.z * u };
          if (u > 0 && u < 1 && dist(cross, raw) < tol) best = { ...best, x: cross.x, z: cross.z };
        }
      }
    }
    if (best) return best;
    if (chain) {
      const from = chain.last;
      const angle = Math.atan2(raw.z - from.z, raw.x - from.x);
      const len = Math.hypot(raw.x - from.x, raw.z - from.z);
      const step = Math.PI / 4;
      const square = Math.round(angle / step) * step;
      if (Math.abs(angle - square) < (6 * Math.PI) / 180) {
        const l = Math.round(len * Math.cos(angle - square));
        return { x: from.x + Math.cos(square) * l, z: from.z + Math.sin(square) * l, kind: 'angle', angle: square };
      }
      const l = Math.round(len);
      return { x: from.x + Math.cos(angle) * l, z: from.z + Math.sin(angle) * l, kind: null };
    }
    return { x: Math.round(raw.x / 10) * 10, z: Math.round(raw.z / 10) * 10, kind: 'grid' };
  }

  // ---- Drawing ----

  function addWall(a, b) {
    if (dist(a, b) < LIMITS.length[0]) return false;
    segments.push({ x1: round(a.x), z1: round(a.z), x2: round(b.x), z2: round(b.z), thickness: settings.divider ? 4 : settings.thickness, height: settings.height, divider: settings.divider });
    chain.count++;
    chain.last = { x: round(b.x), z: round(b.z) };
    return true;
  }

  // A click on the plan: start a line, or end the current wall here and start the next one.
  function place(p) {
    typed = '';
    if (!chain) {
      chain = { start: { x: round(p.x), z: round(p.z) }, last: { x: round(p.x), z: round(p.z) }, count: 0 };
      return;
    }
    if (dist(p, chain.last) < 1) return finishLine(); // the last corner again: a double-click
    if (!addWall(chain.last, p)) return;
    if (dist(chain.last, chain.start) < 1) finishLine(); // back at the start: the room is closed
  }

  function finishLine() {
    chain = null;
    typed = '';
  }

  // Place the next corner at the typed length, in the direction the pointer is pointing.
  function placeTyped() {
    const length = Number(typed);
    typed = '';
    if (!chain || !(length >= LIMITS.length[0])) return;
    const target = cursor ?? { x: chain.last.x + 1, z: chain.last.z };
    const d = Math.hypot(target.x - chain.last.x, target.z - chain.last.z) || 1;
    const dir = { x: (target.x - chain.last.x) / d, z: (target.z - chain.last.z) / d };
    addWall(chain.last, { x: chain.last.x + dir.x * length, z: chain.last.z + dir.z * length });
  }

  // Step back one wall at a time (the line being drawn first), or drop a line's starting corner.
  function undo() {
    if (typed) {
      typed = '';
      return;
    }
    if (chain && chain.count === 0) {
      chain = null;
      return;
    }
    const last = segments.pop();
    if (!last) return;
    if (chain) {
      chain.count--;
      chain.last = { x: last.x1, z: last.z1 };
    }
  }

  // ---- Drawing the plan ----

  function render() {
    if (root.hidden) return;
    // Existing walls in grey, new ones in graphite, the one being drawn in tape yellow, all joined
    // with mitred corners where they meet.
    const { walls } = store.getState();
    const drawn = segments.map((s, i) => ({ ...s, id: `new${i}`, gap: 0, curve: 0 }));
    const live =
      chain && cursor && dist(cursor, chain.last) >= 1
        ? { id: 'live', x1: chain.last.x, z1: chain.last.z, x2: cursor.x, z2: cursor.z, thickness: settings.divider ? 4 : settings.thickness, gap: 0, curve: 0, divider: settings.divider }
        : null;
    const all = [...walls, ...drawn, ...(live ? [live] : [])];
    const joins = jointsOf(all.filter((w) => !w.divider)); // room dividers aren't built, so they don't join
    plan.background(joins);
    for (const w of drawn) {
      if (w.divider) plan.dashed(w, NEW_WALL);
      else plan.polygon(footprintOf(w, joins), NEW_WALL);
    }
    if (live?.divider) plan.dashed(live, '#c9940a');
    else if (live) plan.polygon(footprintOf(live, joins), 'rgba(244,194,27,0.85)', NEW_WALL);

    for (const w of drawn) plan.lengthLabel(w, `${Math.round(Math.hypot(w.x2 - w.x1, w.z2 - w.z1))}`, { fill: PAPER, ink: NEW_WALL, edge: GRID_MAJOR });

    // A guide along the 45° direction the wall has snapped to.
    if (chain && cursor?.kind === 'angle') {
      const s = toScreen(chain.last);
      const far = Math.max(plan.size.w, plan.size.h) * 2;
      g.save();
      g.setLineDash([4, 5]);
      g.strokeStyle = 'rgba(38,41,45,0.35)';
      g.beginPath();
      g.moveTo(s.x - Math.cos(cursor.angle) * far, s.y - Math.sin(cursor.angle) * far);
      g.lineTo(s.x + Math.cos(cursor.angle) * far, s.y + Math.sin(cursor.angle) * far);
      g.stroke();
      g.restore();
    }

    if (live) plan.lengthLabel(live, typed ? `${typed}▏cm` : `${Math.round(dist(cursor, chain.last))} cm`);
    if (chain) {
      for (const p of [chain.start, chain.last]) {
        const s = toScreen(p);
        g.fillStyle = PAPER;
        g.strokeStyle = NEW_WALL;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(s.x, s.y, 4, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
    if (cursor) {
      const s = toScreen(cursor);
      if (cursor.kind === 'end' || cursor.kind === 'wall') {
        g.fillStyle = 'rgba(244,194,27,0.35)';
        g.strokeStyle = NEW_WALL;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(s.x, s.y, 10, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
      g.strokeStyle = NEW_WALL;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(s.x - 7, s.y);
      g.lineTo(s.x + 7, s.y);
      g.moveTo(s.x, s.y - 7);
      g.lineTo(s.x, s.y + 7);
      g.stroke();
    }
  }

  // ---- Keys: type a length, Enter to place it or end the line, Backspace or Ctrl/Cmd+Z to undo ----

  function onKey(e) {
    if (e.target.closest?.('input, textarea, select')) return;
    const mod = e.metaKey || e.ctrlKey;
    if (chain && !mod && /^[0-9.]$/.test(e.key)) {
      if (e.key !== '.' || !typed.includes('.')) typed += e.key;
    } else if (e.key === 'Enter') {
      if (typed) placeTyped();
      else finishLine();
    } else if (e.key === 'Escape') {
      if (typed) typed = '';
      else finishLine();
    } else if (e.key === 'Backspace' && typed) {
      typed = typed.slice(0, -1);
    } else if (e.key === 'Backspace' || ((e.key === 'z' || e.key === 'Z') && mod)) {
      undo();
    } else {
      return;
    }
    e.preventDefault();
    sync();
    render();
  }

  // ---- Opening and closing ----

  function open() {
    if (store.getUI().locked) return;
    settings.height = store.getState().room.height;
    segments = [];
    chain = null;
    cursor = null;
    typed = '';
    root.hidden = false;
    store.setDrawing(true);
    plan.fit({ top: bar.offsetHeight + 24 });
    plan.resize();
    sync();
    window.addEventListener('keydown', onKey);
    canvas.focus?.();
  }

  function close(added) {
    root.hidden = true;
    window.removeEventListener('keydown', onKey);
    plan.clearPointers();
    if (!added) store.setDrawing(false);
    onClose(added);
  }

  function done() {
    if (segments.length) {
      store.addDrawnWalls(segments);
      close(true);
    } else {
      close(false);
    }
  }

  function cancel() {
    if (segments.length && !confirm(`Discard the ${segments.length === 1 ? 'wall' : `${segments.length} walls`} you drew?`)) return;
    close(false);
  }

  return { open };
}
