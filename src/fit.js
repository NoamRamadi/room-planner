// Fitting a walk of measured sides into shape. Every side keeps its length; only the corners between
// sides bend, as little as possible, until the walk comes back to its start and any diagonals
// (corner-to-corner measurements) are the right length. The first side keeps its direction, so the
// plan stays lined up the way it was typed.

const MU = 1e6; // how much more a centimetre of mismatch weighs than a radian of bending
const CLOSE_MU = 1e8; // the walk meeting its start comes first, before any diagonal
const STRAIGHT = 1e4; // how stiff a joint that should stay straight is, compared with a corner

// `start` {x, z}; `lengths` of the sides (cm); `headings` their typed directions (radians);
// `diagonals`: [{ a, b, length }] between corners a and b (0 is the start, k the end of side k-1).
// Returns the fitted headings, how much each corner bent (radians, corner k between side k-1 and k,
// corner 0 where the last side meets the first), and how far the walk still misses its start and
// each diagonal its length (cm).
export function fitHeadings({ start, lengths, headings, diagonals = [] }) {
  const n = lengths.length;
  const th = headings.slice();
  if (n < 3) return { headings: th, bends: new Array(n).fill(0), miss: 0, diagonals: diagonals.map(() => 0) };
  const turn0 = (k) => wrap(headings[k] - headings[(k - 1 + n) % n]);
  // A joint whose sides were typed in a straight line (where the walk closes in the middle of a side)
  // stays straight.
  const weight = (k) => (Math.abs(turn0(k)) < 1e-9 ? STRAIGHT : 1);
  const m = n - 1; // unknowns: the change in every heading but the first

  const pointsOf = (h) => {
    const pts = [start];
    for (let i = 0; i < n; i++) pts.push({ x: pts[i].x + Math.cos(h[i]) * lengths[i], z: pts[i].z + Math.sin(h[i]) * lengths[i] });
    return pts;
  };

  for (let iter = 0; iter < 60; iter++) {
    const pts = pointsOf(th);
    const delta = th.map((t, i) => t - headings[i]);
    // Bending: each corner's change in turn, delta[k] - delta[k - 1], with delta[0] fixed at 0.
    const A = Array.from({ length: m }, () => new Array(m).fill(0));
    const g = new Array(m).fill(0);
    for (let k = 0; k < n; k++) {
      const i = k; // the side after the corner
      const j = (k - 1 + n) % n; // the side before it
      const e = delta[i] - delta[j];
      const w = weight(k);
      // d e / d delta: +1 for side i, -1 for side j (side 0 is fixed).
      const rows = [];
      if (i > 0) rows.push([i - 1, 1]);
      if (j > 0) rows.push([j - 1, -1]);
      for (const [r, cr] of rows) {
        g[r] += w * cr * e;
        for (const [c, cc] of rows) A[r][c] += w * cr * cc;
      }
    }
    // Mismatches: the walk's end against its start, and each diagonal against its length.
    const residuals = []; // [mismatch, its row of derivatives, weight]
    const end = pts[n];
    const dEnd = (axis) => {
      const row = new Array(m).fill(0);
      for (let s = 1; s < n; s++) row[s - 1] = axis === 'x' ? -Math.sin(th[s]) * lengths[s] : Math.cos(th[s]) * lengths[s];
      return row;
    };
    residuals.push([end.x - start.x, dEnd('x'), CLOSE_MU], [end.z - start.z, dEnd('z'), CLOSE_MU]);
    for (const d of diagonals) {
      const [a, b] = d.a < d.b ? [d.a, d.b] : [d.b, d.a];
      const vx = pts[b].x - pts[a].x;
      const vz = pts[b].z - pts[a].z;
      const len = Math.hypot(vx, vz) || 1e-9;
      const row = new Array(m).fill(0);
      for (let s = Math.max(1, a); s < b; s++) row[s - 1] = (vx * -Math.sin(th[s]) * lengths[s] + vz * Math.cos(th[s]) * lengths[s]) / len;
      residuals.push([len - d.length, row, MU]);
    }
    for (const [r, row, mu] of residuals) {
      for (let p = 0; p < m; p++) {
        if (!row[p]) continue;
        g[p] += mu * row[p] * r;
        for (let q = 0; q < m; q++) A[p][q] += mu * row[p] * row[q];
      }
    }
    const step = solve(A, g.map((v) => -v));
    if (!step) break;
    // Keep each step modest so a far-off start can't send the walk spinning.
    const big = Math.max(...step.map(Math.abs));
    const scale = big > 0.2 ? 0.2 / big : 1;
    for (let p = 0; p < m; p++) th[p + 1] += step[p] * scale;
    if (big * scale < 1e-11) break;
  }

  const pts = pointsOf(th);
  const delta = th.map((t, i) => t - headings[i]);
  return {
    headings: th,
    bends: Array.from({ length: n }, (_, k) => delta[k] - delta[(k - 1 + n) % n]),
    miss: Math.hypot(pts[n].x - start.x, pts[n].z - start.z),
    diagonals: diagonals.map((d) => Math.hypot(pts[d.b].x - pts[d.a].x, pts[d.b].z - pts[d.a].z) - d.length),
  };
}

// An angle brought into (-π, π].
export const wrap = (a) => {
  const t = (((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return t === -Math.PI ? Math.PI : t;
};

// Solve A x = b (A square) by Gaussian elimination with partial pivoting; null if A is singular.
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-14) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}
