// The 3D view: walls and floor, furniture, camera views, dragging (furniture, walls, wall corners)
// and the measurement overlays.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildItem, dimsOf, isFlat } from './catalog.js';
import { elevationOf, halfExtents } from './layout.js';
import * as store from './state.js';
import { PATTERN_SIZE, floorTexture } from './textures.js';
import { boundsOf, contains, floorsOf, footprintOf, jointsOf, lengthOf, midpointOf, rayDistance, signedArea } from './walls.js';

const CM = 0.01; // the scene works in metres; the design in centimetres
const STUB_H = 0.05; // height of a wall that is cut away because it blocks the view
const STAGE_COLOR = '#d9dcd5';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (cm) => `${Math.round(cm)} cm`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Selection and clearance lines draw on top of everything so they stay readable behind furniture.
const LINE_STYLES = {
  sel: { core: '#f4c21b', edge: '#26292d', width: 0.012, tick: 0.07, onTop: true },
  gap: { core: '#26292d', width: 0.005, tick: 0.04, onTop: true },
  room: { core: '#6b7076', width: 0.008, tick: 0.14, onTop: false },
};

const lineMaterials = new Map();
function lineMaterial(color, onTop) {
  const key = `${color}|${onTop}`;
  if (!lineMaterials.has(key)) {
    lineMaterials.set(
      key,
      new THREE.MeshBasicMaterial({ color, depthTest: !onTop, depthWrite: !onTop, transparent: onTop, toneMapped: false }),
    );
  }
  return lineMaterials.get(key);
}

// A straight line of fixed thickness between two points.
class Bar extends THREE.Group {
  constructor(style) {
    super();
    const s = LINE_STYLES[style];
    const core = new THREE.Mesh(UNIT_BOX, lineMaterial(s.core, s.onTop));
    core.scale.set(1, s.width, s.width);
    core.renderOrder = 3;
    this.add(core);
    if (s.edge) {
      const edge = new THREE.Mesh(UNIT_BOX, lineMaterial(s.edge, s.onTop));
      edge.scale.set(1, s.width * 2.2, s.width * 2.2);
      edge.renderOrder = 2;
      this.add(edge);
    }
  }

  span(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    this.visible = len > 1e-4;
    if (!this.visible) return;
    this.position.lerpVectors(a, b, 0.5);
    this.quaternion.setFromUnitVectors(X_AXIS, dir.divideScalar(len));
    this.scale.set(len, 1, 1);
  }
}

// A dimension line: the measured span, a tick at each end and a label in the middle.
class Dim extends THREE.Group {
  constructor(style) {
    super();
    this.tick = LINE_STYLES[style].tick;
    this.bars = [new Bar(style), new Bar(style), new Bar(style)];
    this.el = document.createElement('span');
    this.el.className = `dim dim--${style}`;
    this.label = new CSS2DObject(this.el);
    this.add(...this.bars, this.label);
  }

  // `across` is the direction the end ticks point.
  measure(a, b, text, across) {
    this.visible = a.distanceTo(b) >= 0.01;
    if (!this.visible) return;
    const t = across.clone().multiplyScalar(this.tick / 2);
    this.bars[0].span(a, b);
    this.bars[1].span(a.clone().sub(t), a.clone().add(t));
    this.bars[2].span(b.clone().sub(t), b.clone().add(t));
    this.label.position.lerpVectors(a, b, 0.5);
    if (this.el.textContent !== text) this.el.textContent = text;
  }
}

function disposeTree(group) {
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const m of [].concat(o.material)) {
      m.map?.dispose(); // a carpet's pattern is its own texture
      m.dispose();
    }
  });
  group.clear();
}

// A floor-plan outline (cm) as a flat shape in metres, ready to lay on the floor or extrude upward.
function planShape(points) {
  return new THREE.Shape(points.map((p) => new THREE.Vector2(p.x * CM, -p.z * CM)));
}

const isShown = (o) => {
  for (; o; o = o.parent) if (!o.visible) return false;
  return true;
};

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps chosen colors close to their swatches
  container.append(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'labels';
  labelRenderer.sortObjects = false; // stacking comes from CSS: handles above selection above clearances above room
  container.append(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(STAGE_COLOR);
  scene.fog = new THREE.Fog(STAGE_COLOR, 30, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minDistance = 0.3;
  controls.maxDistance = 60;

  scene.add(new THREE.HemisphereLight('#ffffff', '#b9b3a7', 0.8));
  const sun = new THREE.DirectionalLight('#fff8ee', 1.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const grid = new THREE.GridHelper(80, 80, '#bcc0b7', '#c9ccc4');
  grid.position.y = -0.004;
  scene.add(grid);

  // ---- Walls and floor ----

  const floorGroup = new THREE.Group();
  const wallGroup = new THREE.Group();
  scene.add(floorGroup, wallGroup);
  const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
  let floorKey = '';
  let lightKey = '';
  const wallMeshes = new Map(); // wall id -> { key, wall, full, stub }
  let footprints = new Map(); // wall id -> outline on the floor (cm)
  const wallMaterials = new Map();
  const wallMaterial = (color) => {
    if (!wallMaterials.has(color)) wallMaterials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
    return wallMaterials.get(color);
  };

  function extrude(shape, depth) {
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2); // extrude upward from the floor
    return geometry;
  }

  function dropWallMesh(m) {
    for (const mesh of [m.full, m.stub]) {
      if (!mesh) continue;
      wallGroup.remove(mesh);
      mesh.geometry.dispose();
    }
  }

  // Which side of the wall the floor is on: 1 for its left (looking from start to end), -1 for its
  // right, 0 if both sides or neither (an inside or free-standing wall).
  function floorSide(w, floors) {
    const mid = midpointOf(w);
    const len = lengthOf(w) || 1;
    const n = { x: -(w.z2 - w.z1) / len, z: (w.x2 - w.x1) / len };
    const off = w.thickness / 2 + 10;
    const on = (s) => floors.some((f) => contains(f, mid.x + n.x * off * s, mid.z + n.z * off * s));
    const l = on(1);
    const r = on(-1);
    return l === r ? 0 : l ? 1 : -1;
  }

  function buildShell(state) {
    const { walls, room } = state;
    const joins = jointsOf(walls);
    footprints = new Map(walls.map((w) => [w.id, footprintOf(w, joins)]));

    const alive = new Set();
    for (const w of walls) {
      alive.add(w.id);
      const outline = footprints.get(w.id);
      const key = JSON.stringify([outline, w.height, w.gap, w.color]);
      let m = wallMeshes.get(w.id);
      if (m?.key !== key) {
        if (m) dropWallMesh(m);
        const shape = planShape(outline);
        const full = new THREE.Mesh(extrude(shape, (w.height - w.gap) * CM), wallMaterial(w.color));
        full.position.y = w.gap * CM;
        full.receiveShadow = true;
        full.userData.wallId = w.id;
        // A beam (a wall with a gap below) has no stub: seen from above, the opening shows through.
        const stub = w.gap > 0 ? null : new THREE.Mesh(extrude(shape, STUB_H), wallMaterial(w.color));
        if (stub) {
          stub.userData.wallId = w.id;
          stub.receiveShadow = true;
          wallGroup.add(stub);
        }
        wallGroup.add(full);
        m = { key, full, stub };
        wallMeshes.set(w.id, m);
      }
      m.wall = w;
      m.floorSide = floorSide(w, floorsOf(walls));
    }
    for (const [id, m] of wallMeshes) {
      if (!alive.has(id)) {
        dropWallMesh(m);
        wallMeshes.delete(id);
      }
    }

    // Floor: every area the walls enclose, textured in real-world units.
    const floors = floorsOf(walls);
    const key = JSON.stringify([floors, room.floorPattern]);
    if (key !== floorKey) {
      floorKey = key;
      floorGroup.traverse((o) => o.isMesh && o.geometry.dispose());
      floorGroup.clear();
      const map = floorTexture(room.floorPattern);
      if (map) map.repeat.set(1 / PATTERN_SIZE, 1 / PATTERN_SIZE);
      floorMat.map = map;
      floorMat.roughness = room.floorPattern === 'tiles' ? 0.45 : 0.75;
      floorMat.needsUpdate = true;
      for (const outline of floors) {
        const geometry = new THREE.ShapeGeometry(planShape(outline));
        geometry.rotateX(-Math.PI / 2);
        const floor = new THREE.Mesh(geometry, floorMat);
        floor.receiveShadow = true;
        floorGroup.add(floor);
      }
    }
    floorMat.color.set(room.floorColor);

    // Keep the sun's shadow covering everything that's been built.
    const b = boundsOf(walls);
    const bKey = [b.minX, b.maxX, b.minZ, b.maxZ].map(Math.round).join();
    if (bKey !== lightKey) {
      lightKey = bKey;
      const reach = Math.hypot(b.width, b.length) * CM * 0.5 + 1.5;
      Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 0.5, far: 60 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.target.position.set(b.cx * CM, 0, b.cz * CM);
      sun.position.set(b.cx * CM + b.width * CM * 0.3 + 2, 8, b.cz * CM + b.length * CM * 0.4 + 3);
      roomDimsSide = null;
    }
  }

  // With see-through walls on, cut a wall down to a low stub when it's in the way: an outside wall
  // when the camera is outside it, any other wall when it stands between the camera and what it's
  // looking at. Looking almost straight down, every wall is cut so the layout reads like a floor plan.
  // With see-through walls off, every wall stands at full height from every angle.
  const lookOffset = new THREE.Vector3();
  function updateCutaway() {
    const p = camera.position;
    lookOffset.subVectors(p, controls.target);
    const plan = lookOffset.y / lookOffset.length() > 0.94;
    if (!store.getUI().cutaway) {
      for (const m of wallMeshes.values()) {
        m.full.visible = true;
        if (m.stub) m.stub.visible = false;
      }
      return plan;
    }
    const cam = { x: p.x / CM, z: p.z / CM };
    const tgt = { x: controls.target.x / CM, z: controls.target.z / CM };
    for (const m of wallMeshes.values()) {
      const w = m.wall;
      let cut = plan;
      const ex = w.x2 - w.x1;
      const ez = w.z2 - w.z1;
      const len = Math.hypot(ex, ez) || 1;
      const side = (q) => (ex * (q.z - w.z1) - ez * (q.x - w.x1)) / len; // positive on the wall's left
      if (!cut && m.floorSide) {
        cut = side(cam) * m.floorSide < -w.thickness;
      } else if (!cut) {
        const sc = side(cam);
        const st = side(tgt);
        if (sc * st < 0 && Math.abs(st) > 30) {
          // Where the line of sight crosses this wall's line, measured along the wall.
          const k = sc / (sc - st);
          const cross = { x: cam.x + (tgt.x - cam.x) * k, z: cam.z + (tgt.z - cam.z) * k };
          const along = ((cross.x - w.x1) * ex + (cross.z - w.z1) * ez) / len;
          cut = along > -150 && along < len + 150;
        }
      }
      m.full.visible = !cut;
      if (m.stub) m.stub.visible = cut;
    }
    return plan;
  }

  // Overall size of what's been built, on the sides nearest the camera; hidden once the camera is inside.
  const roomDims = new THREE.Group();
  const [widthDim, lengthDim, heightDim] = [new Dim('room'), new Dim('room'), new Dim('room')];
  roomDims.add(widthDim, lengthDim, heightDim);
  scene.add(roomDims);
  let roomDimsSide = null;

  function placeRoomDims(plan) {
    const state = store.getState();
    if (!state.walls.length) {
      roomDims.visible = false;
      return;
    }
    const b = boundsOf(state.walls);
    const p = camera.position;
    const top = Math.max(...state.walls.map((w) => w.height)) * CM;
    const inside = p.y < top && floorsOf(state.walls).some((f) => contains(f, p.x / CM, p.z / CM));
    roomDims.visible = !inside;
    const sx = p.x >= b.cx * CM ? 1 : -1;
    const sz = p.z >= b.cz * CM ? 1 : -1;
    const side = `${sx},${sz},${top}`;
    if (side !== roomDimsSide) {
      roomDimsSide = side;
      const [x0, x1, z0, z1] = [b.minX * CM, b.maxX * CM, b.minZ * CM, b.maxZ * CM];
      const ox = sx > 0 ? x1 + 0.4 : x0 - 0.4;
      const oz = sz > 0 ? z1 + 0.4 : z0 - 0.4;
      widthDim.measure(v3(x0, 0.01, oz), v3(x1, 0.01, oz), fmt(b.width), v3(0, 0, 1));
      lengthDim.measure(v3(ox, 0.01, z0), v3(ox, 0.01, z1), fmt(b.length), v3(1, 0, 0));
      const hx = sx > 0 ? x0 - 0.1 : x1 + 0.1;
      const hz = sz > 0 ? z1 + 0.3 : z0 - 0.3;
      heightDim.measure(v3(hx, 0, hz), v3(hx, top, hz), fmt(top / CM), v3(1, 0, 0));
    }
    heightDim.visible = !plan; // seen from above it's only a dot
  }

  // ---- Furniture ----

  const itemsGroup = new THREE.Group();
  scene.add(itemsGroup);
  const models = new Map();

  function removeModel(model) {
    itemsGroup.remove(model.group);
    disposeTree(model.group);
  }

  function syncItems(items) {
    const alive = new Set();
    for (const item of items) {
      alive.add(item.id);
      const key = [item.type, item.style, item.flip, item.w, item.d, item.h, item.inches, item.color, item.color2].join('|');
      let model = models.get(item.id);
      if (model?.key !== key) {
        if (model) removeModel(model);
        const group = buildItem(item);
        group.userData.itemId = item.id;
        itemsGroup.add(group);
        model = { key, group };
        models.set(item.id, model);
      }
      model.group.position.set(item.x * CM, elevationOf(item, items) * CM, item.z * CM);
      model.group.rotation.y = THREE.MathUtils.degToRad(item.rotation);
    }
    for (const [id, model] of models) {
      if (!alive.has(id)) {
        removeModel(model);
        models.delete(id);
      }
    }
  }

  // ---- Selected furniture: outline, size and clearance to the walls ----

  const selection = new THREE.Group();
  const outlineBars = [0, 1, 2, 3].map(() => new Bar('sel'));
  const sizeDims = [new Dim('sel'), new Dim('sel'), new Dim('sel')];
  selection.add(...outlineBars, ...sizeDims);
  const gaps = new THREE.Group();
  const gapDims = [0, 1, 2, 3].map(() => new Dim('gap'));
  gaps.add(...gapDims);
  scene.add(selection, gaps);

  function updateItemSelection(state, ui) {
    const item = ui.sel?.type === 'item' ? state.items.find((i) => i.id === ui.sel.id) : null;
    selection.visible = gaps.visible = Boolean(item);
    if (!item) return;

    const { w, d, h } = dimsOf(item);
    const hw = (w * CM) / 2;
    const hd = (d * CM) / 2;
    const base = elevationOf(item, state.items) * CM;
    selection.position.set(item.x * CM, base, item.z * CM);
    selection.rotation.y = THREE.MathUtils.degToRad(item.rotation);

    const y = 0.004;
    const off = 0.14;
    const c = [v3(-hw, y, -hd), v3(hw, y, -hd), v3(hw, y, hd), v3(-hw, y, hd)];
    outlineBars.forEach((bar, i) => bar.span(c[i], c[(i + 1) % 4]));
    sizeDims[0].measure(v3(-hw, y, hd + off), v3(hw, y, hd + off), fmt(w), v3(0, 0, 1));
    sizeDims[1].measure(v3(hw + off, y, -hd), v3(hw + off, y, hd), fmt(d), v3(1, 0, 0));
    sizeDims[1].visible = item.type !== 'tv'; // a TV's depth is just its foot
    sizeDims[2].measure(v3(hw + off, 0, hd + off), v3(hw + off, h * CM, hd + off), fmt(h), v3(1, 0, 0));
    if (isFlat(item)) sizeDims[2].visible = false; // a carpet's thickness isn't worth a label

    // Clearance from each side of the footprint straight out to the nearest wall standing on the floor.
    const solid = state.walls.filter((wall) => !wall.gap).map((wall) => footprints.get(wall.id));
    const { hx, hz } = halfExtents(item);
    const rays = [
      [item.x - hx, item.z, -1, 0],
      [item.x + hx, item.z, 1, 0],
      [item.x, item.z - hz, 0, -1],
      [item.x, item.z + hz, 0, 1],
    ];
    rays.forEach(([ox, oz, dx, dz], k) => {
      const t = rayDistance(solid, ox, oz, dx, dz);
      if (!Number.isFinite(t) || t > 2000) {
        gapDims[k].visible = false;
        return;
      }
      const yy = base + 0.006;
      gapDims[k].measure(v3(ox * CM, yy, oz * CM), v3((ox + dx * t) * CM, yy, (oz + dz * t) * CM), fmt(t), v3(dz, 0, dx));
    });
  }

  // ---- Selected walls: outlines, length, handles at the ends ----

  const wallSel = new THREE.Group();
  scene.add(wallSel);
  const wallBars = [];
  const wallLength = new Dim('sel');
  wallSel.add(wallLength);

  function handle(className) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    const obj = new CSS2DObject(el);
    return obj;
  }
  const endHandles = [handle('handle handle--end'), handle('handle handle--end')];
  wallSel.add(...endHandles);
  const snapMark = handle('snap-mark');
  snapMark.element.tabIndex = -1;
  snapMark.element.setAttribute('aria-hidden', 'true');
  snapMark.visible = false;
  scene.add(snapMark);

  function showSnap(point) {
    snapMark.visible = Boolean(point);
    if (point) snapMark.position.set(point.x * CM, 0.05, point.z * CM);
  }

  function updateWallSelection(state, ui) {
    const ids = store.selectedWallIds(ui.sel);
    const chosen = state.walls.filter((w) => ids.includes(w.id));
    wallSel.visible = chosen.length > 0;

    // Outline each selected wall along the floor and along its top.
    const edges = [];
    for (const w of chosen) {
      const outline = footprints.get(w.id) ?? [];
      for (const y of [w.gap * CM + 0.01, w.height * CM]) {
        outline.forEach((p, k) => {
          const q = outline[(k + 1) % outline.length];
          edges.push([v3(p.x * CM, y, p.z * CM), v3(q.x * CM, y, q.z * CM)]);
        });
      }
    }
    while (wallBars.length < edges.length) {
      const bar = new Bar('sel');
      wallBars.push(bar);
      wallSel.add(bar);
    }
    wallBars.forEach((bar, k) => {
      if (k < edges.length) bar.span(...edges[k]);
      else bar.visible = false;
    });

    // One wall: its length alongside it, and a handle on each end for stretching and turning it.
    const one = chosen.length === 1 ? chosen[0] : null;
    wallLength.visible = Boolean(one);
    endHandles.forEach((h) => (h.visible = Boolean(one)));
    if (!one) return;
    const len = lengthOf(one);
    const n = { x: -(one.z2 - one.z1) / len, z: (one.x2 - one.x1) / len };
    const off = one.thickness / 2 + 30;
    const y = one.height * CM + 0.02;
    wallLength.measure(
      v3((one.x1 + n.x * off) * CM, y, (one.z1 + n.z * off) * CM),
      v3((one.x2 + n.x * off) * CM, y, (one.z2 + n.z * off) * CM),
      fmt(len),
      v3(n.x, 0, n.z),
    );
    [
      [one.x1, one.z1],
      [one.x2, one.z2],
    ].forEach(([x, z], end) => {
      const el = endHandles[end].element;
      endHandles[end].position.set(x * CM, 0.06, z * CM);
      el.dataset.wall = one.id;
      el.dataset.end = end;
      el.setAttribute('aria-label', `Drag the ${end ? 'end' : 'start'} of ${one.name}`);
    });
  }

  // ---- Pointer: dragging furniture, walls and wall corners ----

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const floorPlane = new THREE.Plane(UP, 0);
  const planeHit = new THREE.Vector3();
  let itemDrag = null;
  let wallDrag = null;
  let cornerDrag = null;
  let press = null; // a press on empty space: a click if it doesn't move

  function aim(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  // The nearest visible piece of furniture or wall under the pointer.
  function pick(e) {
    aim(e);
    for (const hit of raycaster.intersectObjects([itemsGroup, wallGroup], true)) {
      if (!isShown(hit.object)) continue;
      let o = hit.object;
      while (o && !o.userData.itemId && !o.userData.wallId) o = o.parent;
      if (o?.userData.itemId) return { kind: 'item', id: o.userData.itemId, point: hit.point };
      if (o?.userData.wallId) return { kind: 'wall', id: o.userData.wallId, point: hit.point };
    }
    return null;
  }

  function planePoint(e, plane) {
    aim(e);
    return raycaster.ray.intersectPlane(plane, planeHit) ? { x: planeHit.x / CM, z: planeHit.z / CM } : null;
  }

  // Capture phase, so presses on furniture, walls and handles never reach the camera controls.
  container.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button !== 0 || !e.isPrimary) return;
      tween = null;
      const end = e.target.closest?.('[data-end]');
      if (end) {
        e.stopPropagation();
        e.preventDefault();
        const anchor = { id: end.dataset.wall, end: Number(end.dataset.end) };
        cornerDrag = { corner: store.cornerAt(anchor.id, anchor.end), anchor, pointerId: e.pointerId, moved: false };
        container.setPointerCapture(e.pointerId);
        return;
      }
      const hit = pick(e);
      const additive = e.shiftKey || e.metaKey || e.ctrlKey || store.getUI().several;
      if (!hit) {
        press = { x: e.clientX, y: e.clientY, additive };
        return;
      }
      e.stopPropagation();
      if (hit.kind === 'wall' && additive) {
        store.toggleWall(hit.id);
        return;
      }
      dragPlane.set(UP, -hit.point.y);
      const start = { x: hit.point.x / CM, z: hit.point.z / CM, sx: e.clientX, sy: e.clientY };
      if (hit.kind === 'item') {
        store.select(hit.id);
        const item = store.getSelected();
        itemDrag = { id: hit.id, pointerId: e.pointerId, dx: item.x - start.x, dz: item.z - start.z };
      } else {
        const { ids, drillIn } = store.pressWall(hit.id);
        const originals = ids.map((id) => store.wallById(id));
        wallDrag = { originals, pointerId: e.pointerId, start, moved: false, drillIn: drillIn ? hit.id : null };
      }
      renderer.domElement.setPointerCapture(e.pointerId);
      container.classList.add('is-dragging');
    },
    { capture: true },
  );

  container.addEventListener('pointermove', (e) => {
    if (cornerDrag && e.pointerId === cornerDrag.pointerId) {
      const p = planePoint(e, floorPlane);
      if (p) showSnap(store.dragCorner(cornerDrag.corner, cornerDrag.anchor, p.x, p.z));
      cornerDrag.moved = true;
      return;
    }
    if (wallDrag && e.pointerId === wallDrag.pointerId) {
      const { start } = wallDrag;
      if (!wallDrag.moved && Math.hypot(e.clientX - start.sx, e.clientY - start.sy) < 4) return;
      wallDrag.moved = true;
      const p = planePoint(e, dragPlane);
      if (p) showSnap(store.dragWalls(wallDrag.originals, p.x - start.x, p.z - start.z));
      return;
    }
    if (itemDrag && e.pointerId === itemDrag.pointerId) {
      const p = planePoint(e, dragPlane);
      if (p) store.moveItem(itemDrag.id, p.x + itemDrag.dx, p.z + itemDrag.dz);
      return;
    }
    if (e.pointerType === 'mouse' && e.buttons === 0) container.classList.toggle('is-hovering', Boolean(pick(e)));
  });

  function endDrags() {
    itemDrag = wallDrag = cornerDrag = null;
    showSnap(null);
    container.classList.remove('is-dragging');
  }

  container.addEventListener('pointerup', (e) => {
    if (cornerDrag && e.pointerId === cornerDrag.pointerId) {
      if (cornerDrag.moved) store.finishWallEdit();
      endDrags();
      return;
    }
    if (wallDrag && e.pointerId === wallDrag.pointerId) {
      if (wallDrag.moved) store.finishWallEdit();
      else if (wallDrag.drillIn) store.selectWall(wallDrag.drillIn);
      endDrags();
      return;
    }
    if (itemDrag && e.pointerId === itemDrag.pointerId) {
      endDrags();
      return;
    }
    // A click (not an orbit) on empty space clears the selection.
    if (press && !press.additive && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5 && !pick(e)) store.clearSelection();
    press = null;
  });

  container.addEventListener('pointercancel', () => {
    if (cornerDrag?.moved || wallDrag?.moved) store.finishWallEdit();
    endDrags();
    press = null;
  });

  // ---- Camera views ----

  let tween = null;
  controls.addEventListener('start', () => {
    tween = null;
  });

  function pose(name) {
    const { walls } = store.getState();
    const b = boundsOf(walls);
    const W = b.width * CM;
    const L = b.length * CM;
    const H = walls.length ? Math.max(...walls.map((w) => w.height)) * CM : 2.7;
    const cx = b.cx * CM;
    const cz = b.cz * CM;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    if (name === 'top') {
      const margin = 1.6;
      const height = Math.max((L + margin) / (2 * Math.tan(fov / 2)), (W + margin) / (2 * Math.tan(hfov / 2)));
      return { position: v3(cx, height + H, cz + 0.001), target: v3(cx, 0, cz) };
    }
    if (name === 'eye') {
      // Stand inside the biggest floor, near its corner closest to the default view, looking across it.
      const floors = floorsOf(walls);
      const floor = floors.length ? floors.reduce((a, f) => (Math.abs(signedArea(f)) > Math.abs(signedArea(a)) ? f : a)) : null;
      const middle = floor ? floor.reduce((s, p) => ({ x: s.x + p.x / floor.length, z: s.z + p.z / floor.length }), { x: 0, z: 0 }) : { x: b.cx, z: b.cz };
      const corner = floor ? floor.reduce((best, p) => (p.x + p.z > best.x + best.z ? p : best)) : { x: b.maxX, z: b.maxZ };
      const to = { x: middle.x - corner.x, z: middle.z - corner.z };
      const d = Math.hypot(to.x, to.z) || 1;
      let eye = { x: corner.x + (to.x / d) * Math.min(60, d * 0.3), z: corner.z + (to.z / d) * Math.min(60, d * 0.3) };
      if (floor && !contains(floor, eye.x, eye.z)) eye = middle;
      return {
        position: v3(eye.x * CM, Math.min(1.6, H - 0.2), eye.z * CM),
        target: v3((middle.x + (to.x / d) * 100) * CM, Math.min(1.1, H / 2), (middle.z + (to.z / d) * 100) * CM),
      };
    }
    const radius = Math.hypot(W, L, H) / 2 + 0.6;
    const distance = radius / Math.sin(Math.min(fov, hfov) / 2);
    const target = v3(cx, H * 0.25, cz);
    return { position: v3(0.6, 0.8, 1).normalize().multiplyScalar(distance).add(target), target };
  }

  function setView(name, { instant = false } = {}) {
    const { position, target } = pose(name);
    if (instant || reducedMotion.matches) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      tween = null;
      return;
    }
    tween = { from: camera.position.clone(), fromTarget: controls.target.clone(), position, target, start: performance.now() };
  }

  function stepTween() {
    const k = Math.min(1, (performance.now() - tween.start) / 700);
    const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
    camera.position.lerpVectors(tween.from, tween.position, e);
    controls.target.lerpVectors(tween.fromTarget, tween.target, e);
    if (k === 1) tween = null;
  }

  // The floor point the camera is looking at (cm): where new walls appear.
  function focus() {
    return { x: Math.round(controls.target.x / CM), z: Math.round(controls.target.z / CM) };
  }

  // PNG of the current view without measurements or handles.
  function savePhoto() {
    const overlays = [selection, gaps, roomDims, wallSel, snapMark];
    const shown = overlays.map((o) => o.visible);
    overlays.forEach((o) => (o.visible = false));
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    overlays.forEach((o, i) => (o.visible = shown[i]));
    return url;
  }

  // ---- Lifecycle ----

  // The first view is framed once the stage has a real size (it can start hidden, at 0 × 0).
  let framed = false;
  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!framed) {
      framed = true;
      setView('overview', { instant: true });
    }
  }

  store.subscribe((state, ui) => {
    buildShell(state);
    syncItems(state.items);
    updateItemSelection(state, ui);
    updateWallSelection(state, ui);
  });
  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    if (tween) stepTween();
    controls.update();
    placeRoomDims(updateCutaway());
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return { setView, savePhoto, focus };
}
