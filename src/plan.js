// A flat floor plan on a grid of squares, shared by Draw walls and Type walls: moving around it (drag,
// scroll or pinch to zoom), the grid, the walls already built, and labels and dashed lines on top.
import { clamp } from './dom.js';
import * as store from './state.js';
import { boundsOf, footprintOf, markOf, openingSpan, takesOpenings } from './walls.js';

export const PAPER = '#f7f7f3';
export const GRID_MINOR = '#e6e8e2';
export const GRID_MAJOR = '#ccd0c8';
export const OLD_WALL = '#b3b6b9';
export const NEW_WALL = '#26292d';
export const DIVIDER = '#b07a16'; // room dividers already in the plan
export const TAPE = '#f4c21b';

// `root` holds the canvas and sizes it; `legend` shows the grid's scale. `render` redraws everything
// (the owner's drawing, using the helpers here). `hover(p, e)` gets the plan point (cm) under the
// pointer, `click(p, e)` a click that didn't move, and `leave()` the pointer leaving the plan.
export function createPlan({ root, canvas, legend, render, hover, click, leave }) {
  const g = canvas.getContext('2d');
  let view = { x: 0, z: 0, scale: 0.6 }; // the plan point at the middle of the screen (cm), and pixels per cm
  let size = { w: 1, h: 1 };

  const toScreen = (p) => ({ x: (p.x - view.x) * view.scale + size.w / 2, y: (p.z - view.z) * view.scale + size.h / 2 });
  const toPlan = (sx, sy) => ({ x: (sx - size.w / 2) / view.scale + view.x, z: (sy - size.h / 2) / view.scale + view.z });
  const pointOf = (e) => {
    const r = canvas.getBoundingClientRect();
    return toPlan(e.clientX - r.left, e.clientY - r.top);
  };

  // Show everything built (or a 10 × 8 m area on an empty plan) in the space left free by `inset`
  // (screen pixels taken at the top and on the right).
  function fit({ top = 0, right = 0 } = {}, walls = store.getState().walls) {
    const r = root.getBoundingClientRect();
    size = { w: r.width || 1, h: r.height || 1 };
    const b = walls.length ? boundsOf(walls) : { cx: 0, cz: 0, width: 1000, length: 800 };
    const scale = clamp(Math.min((size.w - right) / (b.width + 400), (size.h - top) / (b.length + 400)), 0.05, 4);
    view = { x: b.cx + right / 2 / scale, z: b.cz - top / 2 / scale, scale };
  }

  function polygon(points, fill, stroke) {
    g.beginPath();
    points.forEach((p, i) => {
      const s = toScreen(p);
      if (i) g.lineTo(s.x, s.y);
      else g.moveTo(s.x, s.y);
    });
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1.2;
      g.stroke();
    }
  }

  function label(text, at, { fill = TAPE, ink = NEW_WALL, edge = NEW_WALL } = {}) {
    g.font = '600 12px Archivo, system-ui, sans-serif';
    if ('fontStretch' in g) g.fontStretch = 'condensed';
    const w = g.measureText(text).width + 12;
    g.fillStyle = fill;
    g.strokeStyle = edge;
    g.lineWidth = 1;
    g.beginPath();
    g.roundRect(at.x - w / 2, at.y - 10, w, 20, 3);
    g.fill();
    g.stroke();
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, at.x, at.y + 0.5);
  }

  // A wall's length beside it, on its left side (pushed past the wall's thickness, and `away` more cm).
  function lengthLabel(w, text, style, away = 0) {
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1) || 1;
    const n = { x: -(w.z2 - w.z1) / len, z: (w.x2 - w.x1) / len };
    const off = w.thickness / 2 + away + 16 / view.scale;
    label(text, toScreen({ x: (w.x1 + w.x2) / 2 + n.x * off, z: (w.z1 + w.z2) / 2 + n.z * off }), style);
  }

  function grid() {
    const minor = [10, 50, 100, 500].find((s) => s * view.scale >= 10) ?? 1000;
    const major = minor * (minor === 50 ? 2 : 5);
    if (legend) legend.textContent = `Each small square is ${minor >= 100 ? `${minor / 100} m` : `${minor} cm`}`;
    const a = toPlan(0, 0);
    const b = toPlan(size.w, size.h);
    for (const [step, color] of [
      [minor, GRID_MINOR],
      [major, GRID_MAJOR],
    ]) {
      g.strokeStyle = color;
      g.lineWidth = 1;
      g.beginPath();
      for (let x = Math.floor(a.x / step) * step; x <= b.x; x += step) {
        const sx = Math.round(toScreen({ x, z: 0 }).x) + 0.5;
        g.moveTo(sx, 0);
        g.lineTo(sx, size.h);
      }
      for (let z = Math.floor(a.z / step) * step; z <= b.z; z += step) {
        const sy = Math.round(toScreen({ x: 0, z }).y) + 0.5;
        g.moveTo(0, sy);
        g.lineTo(size.w, sy);
      }
      g.stroke();
    }
  }

  // A dashed line along a wall: a room divider, or an opening.
  function dashed(w, color, width = 3) {
    const a = toScreen({ x: w.x1, z: w.z1 });
    const b = toScreen({ x: w.x2, z: w.z2 });
    g.save();
    g.setLineDash([9, 6]);
    g.lineWidth = width;
    g.lineCap = 'round';
    g.strokeStyle = color;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.restore();
  }

  // The paper, the grid, and the walls already built in grey (cut where doors are, a thin line across
  // windows). `joins`: the corners of all walls on the plan, so new walls meet built ones cleanly.
  // `faded`: built walls barely showing (they're about to be replaced).
  function background(joins, { faded = false } = {}) {
    g.fillStyle = PAPER;
    g.fillRect(0, 0, size.w, size.h);
    grid();
    const { walls, openings } = store.getState();
    g.save();
    if (faded) g.globalAlpha = 0.25;
    for (const w of walls) {
      if (w.divider) dashed(w, DIVIDER);
      else polygon(footprintOf(w, joins.has(w.id) ? joins : null), w.gap ? '#d7d9d6' : OLD_WALL);
    }
    for (const o of openings) {
      const w = walls.find((x) => x.id === o.wall);
      if (!takesOpenings(w)) continue;
      const span = openingSpan(o, w);
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      const u = { x: (w.x2 - w.x1) / len, z: (w.z2 - w.z1) / len };
      const n = { x: -u.z, z: u.x };
      const t = w.thickness / 2 + 0.5;
      const at = (s, k) => ({ x: w.x1 + u.x * s + n.x * k, z: w.z1 + u.z * s + n.z * k });
      polygon([at(span.a, t), at(span.b, t), at(span.b, -t), at(span.a, -t)], PAPER, o.kind === 'window' ? OLD_WALL : null);
    }
    g.restore();
  }

  // Saved points on the built walls, as yellow dots at the foot of the wall's face.
  function marks() {
    const { walls, marks: list } = store.getState();
    for (const m of list) {
      const pos = markOf(m, walls);
      if (!pos) continue;
      const s = toScreen(pos.at);
      g.fillStyle = TAPE;
      g.strokeStyle = NEW_WALL;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(s.x, s.y, 6, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }

  // Keep all these points in view, `margin` pixels inside the edges and below `top`: nothing changes
  // while they are; otherwise the plan centres on them, zooming out if they don't fit.
  function keepInView(points, { margin = 70, top = 0 } = {}) {
    if (!points.length) return;
    const inView = points.every((p) => {
      const s = toScreen(p);
      return s.x >= margin && s.x <= size.w - margin && s.y >= top + margin && s.y <= size.h - margin;
    });
    if (inView) return;
    const xs = points.map((p) => p.x);
    const zs = points.map((p) => p.z);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const fits = Math.min((size.w - 2 * margin) / Math.max(1, x1 - x0), (size.h - top - 2 * margin) / Math.max(1, z1 - z0));
    view.scale = clamp(Math.min(view.scale, fits), 0.05, 6);
    view.x = (x0 + x1) / 2;
    view.z = (z0 + z1) / 2 - top / 2 / view.scale;
  }

  function resize() {
    const r = root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    size = { w: r.width, h: r.height };
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    render();
  }
  new ResizeObserver(resize).observe(root);

  // ---- Pointer: a click, drag to move around, pinch or scroll to zoom ----

  const pointers = new Map();
  let press = null; // { moved } for a single press: a click unless it moves

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    press = pointers.size === 1 ? { x: e.clientX, y: e.clientY, moved: e.button !== 0 } : null;
    if (pointers.size === 1) hover(pointOf(e), e);
    render();
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) {
      hover(pointOf(e), e);
      render();
      return;
    }
    if (pointers.size === 2) {
      // Pinch: zoom by the change in distance between the two fingers, about their midpoint.
      const [a, b] = [...pointers.values()];
      const before = Math.hypot(a.x - b.x, a.y - b.y);
      p.x = e.clientX;
      p.y = e.clientY;
      const after = Math.hypot(a.x - b.x, a.y - b.y);
      const r = canvas.getBoundingClientRect();
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, after / (before || 1));
      return;
    }
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (press && !press.moved && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) press.moved = true;
    if (press?.moved) {
      view.x -= dx / view.scale;
      view.z -= dy / view.scale;
    } else {
      hover(pointOf(e), e);
    }
    render();
  });

  const release = (e) => {
    if (pointers.size === 1 && press && !press.moved && e.type === 'pointerup') {
      hover(pointOf(e), e);
      click(pointOf(e), e);
    }
    pointers.delete(e.pointerId);
    if (!pointers.size) press = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', () => {
    if (pointers.size) return;
    leave?.();
    render();
  });

  function zoomAt(sx, sy, factor) {
    const before = toPlan(sx, sy);
    view.scale = clamp(view.scale * factor, 0.05, 6);
    const after = toPlan(sx, sy);
    view.x += before.x - after.x;
    view.z += before.z - after.z;
    render();
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  return {
    g,
    get scale() {
      return view.scale;
    },
    get size() {
      return size;
    },
    toScreen,
    toPlan,
    fit,
    keepInView,
    resize,
    polygon,
    label,
    lengthLabel,
    dashed,
    background,
    marks,
    clearPointers: () => pointers.clear(),
  };
}
