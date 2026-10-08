// The 3D view: walls and floor, furniture, camera views, dragging (furniture, walls, wall corners)
// and the measurement overlays.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CATALOG, buildItem, dimsOf, isFlat, styleOf } from './catalog.js';
import { buildOpening, buildSwing } from './openings.js';
import { elevationOf, halfExtents, hitsWall } from './layout.js';
import { floorOfRoom, formatArea, labelSpot, roomOnFloor, roomSize, roomTypeOf } from './rooms.js';
import * as store from './state.js';
import { PATTERN_SIZE, floorTexture } from './textures.js';
import {
  boundsOf,
  contains,
  dist,
  endsOf,
  facesOf,
  floorsOf,
  footprintOf,
  gapsOf,
  intersectLines,
  jointsOf,
  lengthOf,
  midpointOf,
  openingSpan,
  outsideBoundsOf,
  pathOf,
  pointToSegment,
  rayDistance,
  signedArea,
  takesOpenings,
  wallPieces,
} from './walls.js';

const CM = 0.01; // the scene works in metres; the design in centimetres
const STUB_H = 0.05; // height of a wall that is cut away because it blocks the view
const STAGE_COLOR = '#d9dcd5';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fmt = (cm) => `${Math.round(cm)} cm`;
const CORNERS_2D = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];
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
  // A named room's own floor, and the light tint of its type: materials kept by look.
  const roomFloorMats = new Map();
  function roomFloorMaterial({ pattern, color }) {
    const key = `${pattern}|${color}`;
    if (!roomFloorMats.has(key)) {
      const map = floorTexture(pattern);
      if (map) map.repeat.set(1 / PATTERN_SIZE, 1 / PATTERN_SIZE);
      roomFloorMats.set(key, new THREE.MeshStandardMaterial({ map, color, roughness: pattern === 'tiles' ? 0.45 : 0.75 }));
    }
    return roomFloorMats.get(key);
  }
  const tintMats = new Map();
  function tintMaterial(color) {
    if (!tintMats.has(color)) {
      tintMats.set(color, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    }
    return tintMats.get(color);
  }
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

  // Dashes along a path on the floor (cm points), for room dividers.
  const dashMaterial = new THREE.MeshBasicMaterial({ color: '#b07a16', toneMapped: false });
  function dashedLine(path) {
    const group = new THREE.Group();
    const DASH = 0.16;
    const SPACE = 0.1;
    for (let k = 1; k < path.length; k++) {
      const a = v3(path[k - 1].x * CM, 0.008, path[k - 1].z * CM);
      const b = v3(path[k].x * CM, 0.008, path[k].z * CM);
      const len = a.distanceTo(b);
      const dir = b.clone().sub(a).normalize();
      const angle = Math.atan2(-dir.z, dir.x);
      for (let t = 0; t < len; t += DASH + SPACE) {
        const piece = Math.min(DASH, len - t);
        const dash = new THREE.Mesh(new THREE.BoxGeometry(piece, 0.004, 0.045), dashMaterial);
        dash.position.copy(a).addScaledVector(dir, t + piece / 2);
        dash.rotation.y = angle;
        group.add(dash);
      }
    }
    return group;
  }

  function dropWallMesh(m) {
    for (const part of [m.full, m.stub]) {
      wallGroup.remove(part);
      part.traverse((o) => o.isMesh && o.geometry.dispose()); // materials are shared by color
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
    const joins = jointsOf(walls.filter((w) => !w.divider)); // room dividers aren't built, so they don't join
    footprints = new Map(walls.map((w) => [w.id, footprintOf(w, w.divider ? null : joins)]));

    const alive = new Set();
    for (const w of walls) {
      alive.add(w.id);
      const outline = footprints.get(w.id);
      const spans = takesOpenings(w) ? state.openings.filter((o) => o.wall === w.id).map((o) => openingSpan(o, w)) : [];
      const key = JSON.stringify([outline, w.height, w.gap, w.color, spans, w.divider]);
      let m = wallMeshes.get(w.id);
      if (m?.key !== key && w.divider) {
        // A room divider: a dashed line along the floor, never cut away.
        if (m) dropWallMesh(m);
        const full = dashedLine(pathOf(w));
        full.traverse((o) => (o.userData.wallId = w.id));
        const stub = new THREE.Group();
        wallGroup.add(full, stub);
        m = { key, full, stub, divider: true };
        wallMeshes.set(w.id, m);
      }
      if (m?.key !== key) {
        if (m) dropWallMesh(m);
        // The wall in solid pieces around its doors and windows. Cut away, it leaves a low stub
        // wherever a piece stands on the floor: door gaps and beams leave none, so they show in plan.
        const full = new THREE.Group();
        const stub = new THREE.Group();
        for (const piece of wallPieces(w, outline, spans)) {
          const shape = planShape(piece.outline);
          const solid = new THREE.Mesh(extrude(shape, (piece.y1 - piece.y0) * CM), wallMaterial(w.color));
          solid.position.y = piece.y0 * CM;
          solid.receiveShadow = true;
          solid.userData.wallId = w.id;
          full.add(solid);
          if (piece.y0 === 0) {
            const low = new THREE.Mesh(extrude(shape, STUB_H), wallMaterial(w.color));
            low.receiveShadow = true;
            low.userData.wallId = w.id;
            stub.add(low);
          }
        }
        wallGroup.add(full, stub);
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

    // Floor: every area the walls enclose, textured in real-world units. A named room can have a floor
    // of its own, and named rooms can be tinted by their type.
    const floors = floorsOf(walls);
    const named = floors.map((f) => roomOnFloor(f, state.rooms));
    const tinted = store.getUI().roomColors;
    const key = JSON.stringify([floors, room.floorPattern, tinted, named.map((r) => r && [r.type, r.floor])]);
    if (key !== floorKey) {
      floorKey = key;
      floorGroup.traverse((o) => o.isMesh && o.geometry.dispose());
      floorGroup.clear();
      const map = floorTexture(room.floorPattern);
      if (map) map.repeat.set(1 / PATTERN_SIZE, 1 / PATTERN_SIZE);
      floorMat.map = map;
      floorMat.roughness = room.floorPattern === 'tiles' ? 0.45 : 0.75;
      floorMat.needsUpdate = true;
      floors.forEach((outline, k) => {
        const geometry = new THREE.ShapeGeometry(planShape(outline));
        geometry.rotateX(-Math.PI / 2);
        const own = named[k]?.floor;
        const floor = new THREE.Mesh(geometry, own ? roomFloorMaterial(own) : floorMat);
        floor.receiveShadow = true;
        floorGroup.add(floor);
        if (named[k] && tinted) {
          const tint = new THREE.Mesh(geometry.clone(), tintMaterial(roomTypeOf(named[k]).tint));
          tint.position.y = 0.002;
          tint.renderOrder = 1;
          floorGroup.add(tint);
        }
      });
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
        m.stub.visible = false;
      }

      showOpeningsWithWalls();
      return plan;
    }
    const cam = { x: p.x / CM, z: p.z / CM };
    const tgt = { x: controls.target.x / CM, z: controls.target.z / CM };
    for (const m of wallMeshes.values()) {
      const w = m.wall;
      if (m.divider) {
        m.full.visible = true; // a line on the floor is never in the way
        continue;
      }
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
      m.stub.visible = cut;
    }
    showOpeningsWithWalls();
    return plan;
  }

  // Overall outside size of what's been built, on the sides nearest the camera; hidden once the camera
  // is inside.
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
    const b = outsideBoundsOf(state.walls);
    const p = camera.position;
    const top = Math.max(...state.walls.map((w) => w.height)) * CM;
    const inside = p.y < top && floorsOf(state.walls).some((f) => contains(f, p.x / CM, p.z / CM));
    roomDims.visible = !inside;
    const sx = p.x >= b.cx * CM ? 1 : -1;
    const sz = p.z >= b.cz * CM ? 1 : -1;
    const side = `${sx},${sz},${top},${b.width},${b.length}`;
    if (side !== roomDimsSide) {
      roomDimsSide = side;
      const [x0, x1, z0, z1] = [b.minX * CM, b.maxX * CM, b.minZ * CM, b.maxZ * CM];
      const ox = sx > 0 ? x1 + 0.4 : x0 - 0.4;
      const oz = sz > 0 ? z1 + 0.4 : z0 - 0.4;
      widthDim.measure(v3(x0, 0.01, oz), v3(x1, 0.01, oz), `${fmt(b.width)} outside`, v3(0, 0, 1));
      lengthDim.measure(v3(ox, 0.01, z0), v3(ox, 0.01, z1), `${fmt(b.length)} outside`, v3(1, 0, 0));
      const hx = sx > 0 ? x0 - 0.1 : x1 + 0.1;
      const hz = sz > 0 ? z1 + 0.3 : z0 - 0.3;
      heightDim.measure(v3(hx, 0, hz), v3(hx, top, hz), fmt(top / CM), v3(1, 0, 0));
    }
    heightDim.visible = !plan; // seen from above it's only a dot
  }

  // ---- Named rooms: a label on each room's floor, and a "Name this room" tag on unnamed floors ----

  const roomLabels = new THREE.Group();
  scene.add(roomLabels);
  let roomLabelKey = '';

  function syncRoomLabels(state, ui) {
    const floors = floorsOf(state.walls);
    const selected = ui.sel?.type === 'room' ? ui.sel.id : null;
    roomLabels.visible = ui.roomNames;
    const key = JSON.stringify([floors, state.walls.map((w) => w.thickness), state.rooms, selected, ui.locked]);
    if (key === roomLabelKey) return;
    roomLabelKey = key;
    roomLabels.clear(); // a CSS2D label leaves the page when it leaves the scene
    const hasName = new Set();
    for (const r of state.rooms) {
      const floor = floorOfRoom(r, floors);
      if (floor) hasName.add(floor);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `room-label${r.id === selected ? ' is-selected' : ''}`;
      el.dataset.room = r.id;
      el.style.setProperty('--tint', roomTypeOf(r).tint);
      const name = document.createElement('span');
      name.className = 'room-label__name';
      name.textContent = r.name;
      el.append(name);
      if (floor) {
        const area = document.createElement('span');
        area.className = 'room-label__area';
        area.textContent = formatArea(roomSize(floor, state.walls).area);
        el.append(area);
      }
      el.title = ui.locked ? r.name : `${r.name}: click to change, drag to move`;
      const label = new CSS2DObject(el);
      label.position.set(r.x * CM, 0.02, r.z * CM);
      roomLabels.add(label);
    }
    if (ui.locked) return;
    for (const floor of floors) {
      if (hasName.has(floor)) continue;
      const spot = labelSpot(floor);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'room-label room-label--ghost';
      el.dataset.ghost = '';
      el.dataset.x = spot.x;
      el.dataset.z = spot.z;
      el.textContent = '+ Name this room';
      const label = new CSS2DObject(el);
      label.position.set(spot.x * CM, 0.02, spot.z * CM);
      roomLabels.add(label);
    }
  }

  // Bring a named room into view: centred, filling most of the view, from the current direction.
  function frameRoom(id) {
    const { walls, rooms } = store.getState();
    const r = rooms.find((x) => x.id === id);
    if (!r) return;
    const floor = floorOfRoom(r, floorsOf(walls)) ?? [
      { x: r.x - 150, z: r.z - 150 },
      { x: r.x + 150, z: r.z + 150 },
    ];
    const xs = floor.map((p) => p.x);
    const zs = floor.map((p) => p.z);
    const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * CM;
    const target = v3(((Math.min(...xs) + Math.max(...xs)) / 2) * CM, 0, ((Math.min(...zs) + Math.max(...zs)) / 2) * CM);
    const dir = camera.position.clone().sub(controls.target);
    if (dir.y < 0.5 * dir.length()) dir.y = 0.5 * dir.length(); // look down into it
    dir.normalize();
    const distance = Math.max(3, (size / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2))) * 1.5);
    const position = target.clone().addScaledVector(dir, distance);
    if (reducedMotion.matches) {
      camera.position.copy(position);
      controls.target.copy(target);
      return;
    }
    tween = { from: camera.position.clone(), fromTarget: controls.target.clone(), position, target, start: performance.now() };
  }

  // ---- Doors and windows ----

  const openingGroup = new THREE.Group();
  scene.add(openingGroup);
  const openingModels = new Map(); // opening id -> { key, model, swing, wallId }

  function dropOpening(m) {
    for (const part of [m.model, m.swing]) {
      disposeTree(part);
      openingGroup.remove(part);
    }
  }

  // Where an opening's middle is, and which way its wall runs.
  function openingFrame(o, w) {
    const span = openingSpan(o, w);
    const len = lengthOf(w);
    const u = { x: (w.x2 - w.x1) / len, z: (w.z2 - w.z1) / len };
    return { span, u, x: w.x1 + u.x * span.centre, z: w.z1 + u.z * span.centre, turn: Math.atan2(-u.z, u.x) };
  }

  function syncOpenings(state) {
    const alive = new Set();
    for (const o of state.openings) {
      const w = state.walls.find((x) => x.id === o.wall);
      if (!takesOpenings(w)) continue; // curved walls and beams don't show doors and windows
      alive.add(o.id);
      const f = openingFrame(o, w);
      const size = { width: f.span.width * CM, height: (f.span.top - f.span.bottom) * CM };
      const key = JSON.stringify([o.kind, o.style, o.color, o.color2, o.flip, o.swap, size, w.thickness]);
      let m = openingModels.get(o.id);
      if (m?.key !== key) {
        if (m) dropOpening(m);
        const model = buildOpening(o, size, w.thickness * CM);
        model.userData.openingId = o.id;
        const swing = buildSwing(o, size);
        openingGroup.add(model, swing);
        m = { key, model, swing };
        openingModels.set(o.id, m);
      }
      m.wallId = w.id;
      m.model.position.set(f.x * CM, f.span.bottom * CM, f.z * CM);
      m.swing.position.set(f.x * CM, 0, f.z * CM);
      m.model.rotation.y = m.swing.rotation.y = f.turn;
    }
    for (const [id, m] of openingModels) {
      if (!alive.has(id)) {
        dropOpening(m);
        openingModels.delete(id);
      }
    }
  }

  // A door or window shows when its wall does; its swing on the floor always shows. So does a curtain,
  // which hangs on the wall right behind its back.
  function showOpeningsWithWalls() {
    for (const m of openingModels.values()) m.model.visible = wallMeshes.get(m.wallId)?.full.visible ?? true;
    for (const model of models.values()) {
      if (!CATALOG[model.item.type].behind) continue;
      const { item } = model;
      const r = THREE.MathUtils.degToRad(item.rotation);
      const back = dimsOf(item).d / 2 + 2;
      const p = { x: item.x - Math.sin(r) * back, z: item.z - Math.cos(r) * back };
      const wall = [...wallMeshes.values()].find((m) => pointToSegment(p, { x: m.wall.x1, z: m.wall.z1 }, { x: m.wall.x2, z: m.wall.z2 }).d < m.wall.thickness / 2 + 1);
      model.group.visible = wall?.full.visible ?? true;
    }
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
      // Rebuilt whenever anything but its place, turn or name changes.
      const { x, z, rotation, name, id, ...look } = item;
      const key = JSON.stringify(look);
      let model = models.get(item.id);
      if (model?.key !== key) {
        if (model) removeModel(model);
        const group = buildItem(item);
        group.userData.itemId = item.id;
        itemsGroup.add(group);
        model = { key, group };
        models.set(item.id, model);
      }
      model.item = item;
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
  const sinkDims = [new Dim('gap'), new Dim('gap')];
  selection.add(...sinkDims);
  // While a dragged piece overlaps a wall: a red box around it and a note that it doesn't fit there.
  const blockedBox = new THREE.Mesh(UNIT_BOX, new THREE.MeshBasicMaterial({ color: '#d64545', transparent: true, opacity: 0.3, depthWrite: false }));
  blockedBox.renderOrder = 4;
  const blockedEl = document.createElement('span');
  blockedEl.className = 'dim dim--warn';
  blockedEl.textContent = 'Doesn’t fit here. Let go and it moves to where it fits.';
  const blockedNote = new CSS2DObject(blockedEl);
  selection.add(blockedBox, blockedNote);
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

    const blocked = itemDrag?.id === item.id && hitsWall(item, state.walls, state.items);
    blockedBox.visible = blockedNote.visible = blocked;
    gaps.visible = !blocked;
    if (blocked) {
      blockedBox.scale.set(w * CM + 0.02, h * CM + 0.02, d * CM + 0.02);
      blockedBox.position.set(0, (h * CM) / 2, 0);
      blockedNote.position.set(0, h * CM + 0.2, 0);
    }

    // A counter's sink: its distance from each end of the counter, along the front of the top.
    const sinkW = styleOf(item).sink;
    sinkDims.forEach((dim) => (dim.visible = Boolean(sinkW)));
    if (sinkW) {
      const [a, b] = [item.sink - sinkW / 2, item.sink + sinkW / 2];
      const top = h * CM + 0.01;
      const front = hd - 0.04;
      sinkDims[0].measure(v3(-hw, top, front), v3(-hw + a * CM, top, front), fmt(a), v3(0, 0, 1));
      sinkDims[1].measure(v3(-hw + b * CM, top, front), v3(hw, top, front), fmt(w - b), v3(0, 0, 1));
    }

    // Clearance from each side of the footprint straight out to the nearest wall standing on the floor.
    const solid = state.walls.filter((wall) => !wall.gap && !wall.divider).map((wall) => footprints.get(wall.id));
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

  // ---- Selected door or window: outline, size, height above the floor, distance to the wall's ends ----

  const openingSel = new THREE.Group();
  const openingBars = [0, 1, 2, 3].map(() => new Bar('sel'));
  const [openingWidth, openingHeight] = [new Dim('sel'), new Dim('sel')];
  const [openingSill, openingBefore, openingAfter] = [new Dim('gap'), new Dim('gap'), new Dim('gap')];
  openingSel.add(...openingBars, openingWidth, openingHeight, openingSill, openingBefore, openingAfter);
  scene.add(openingSel);

  function updateOpeningSelection(state, ui) {
    const o = ui.sel?.type === 'opening' ? state.openings.find((x) => x.id === ui.sel.id) : null;
    const w = o && state.walls.find((x) => x.id === o.wall);
    openingSel.visible = Boolean(o && takesOpenings(w));
    if (!openingSel.visible) return;
    // Drawn in the wall's own frame: x along it from its start, y up, on the wall's centre line.
    const { span, turn } = openingFrame(o, w);
    openingSel.position.set(w.x1 * CM, 0, w.z1 * CM);
    openingSel.rotation.y = turn;
    const face = facesOf(w, state.walls).inside; // distances are to the inside corners
    const [a, b, y0, y1, from, to] = [span.a * CM, span.b * CM, span.bottom * CM, span.top * CM, face.from * CM, face.to * CM];
    const c = [v3(a, y0, 0), v3(b, y0, 0), v3(b, y1, 0), v3(a, y1, 0)];
    openingBars.forEach((bar, i) => bar.span(c[i], c[(i + 1) % 4]));
    const up = v3(0, 1, 0);
    const along = v3(1, 0, 0);
    openingWidth.measure(v3(a, y1 + 0.12, 0), v3(b, y1 + 0.12, 0), fmt(span.width), up);
    openingHeight.measure(v3(b + 0.12, y0, 0), v3(b + 0.12, y1, 0), fmt(span.top - span.bottom), along);
    openingSill.measure(v3(b + 0.12, 0, 0), v3(b + 0.12, y0, 0), fmt(span.bottom), along);
    openingBefore.measure(v3(from, 0.02, 0), v3(a, 0.02, 0), fmt(span.a - face.from), up);
    openingAfter.measure(v3(b, 0.02, 0), v3(to, 0.02, 0), fmt(face.to - span.b), up);
  }

  // ---- Selected walls: outlines, length, handles at the ends ----

  const wallSel = new THREE.Group();
  scene.add(wallSel);
  const wallBars = [];
  const wallLength = new Dim('sel');
  wallSel.add(wallLength);
  const wallGaps = []; // the open gap at each free end of the selected walls
  const gapButtons = []; // "Close with a divider", under each gap's label

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

    // The gaps between the selected walls' free ends and the walls they point at, along the floor.
    const gapList = gapsOf(chosen, state.walls);
    while (wallGaps.length < gapList.length) {
      const dim = new Dim('sel');
      wallGaps.push(dim);
      wallSel.add(dim);
    }
    while (gapButtons.length < gapList.length) {
      const button = handle('gap-close');
      button.element.textContent = 'Close with a divider';
      button.element.title = 'A room divider: a dashed line that closes the room for its floor and name, with no wall built';
      gapButtons.push(button);
      wallSel.add(button);
    }
    const near = (p, q) => Math.hypot(p.x - q.x, p.z - q.z) < 3;
    const spanned = (g) => state.walls.some((w) => w.divider && ((near({ x: w.x1, z: w.z1 }, g.a) && near({ x: w.x2, z: w.z2 }, g.close)) || (near({ x: w.x2, z: w.z2 }, g.a) && near({ x: w.x1, z: w.z1 }, g.close))));
    wallGaps.forEach((dim, k) => {
      const g = gapList[k];
      const button = gapButtons[k];
      if (!g) {
        dim.visible = false;
        button.visible = false;
        return;
      }
      const across = v3(-(g.b.z - g.a.z) / g.length, 0, (g.b.x - g.a.x) / g.length);
      dim.measure(v3(g.a.x * CM, 0.03, g.a.z * CM), v3(g.b.x * CM, 0.03, g.b.z * CM), `Gap ${fmt(g.length)}`, across);
      button.visible = !ui.locked && !spanned(g);
      button.position.set(((g.a.x + g.b.x) / 2) * CM, 0.03, ((g.a.z + g.b.z) / 2) * CM);
      Object.assign(button.element.dataset, { ax: g.a.x, az: g.a.z, bx: g.close.x, bz: g.close.z });
    });

    // One wall: its length alongside it, and a handle on each end for stretching and turning it.
    const one = chosen.length === 1 ? chosen[0] : null;
    wallLength.visible = Boolean(one);
    endHandles.forEach((h) => (h.visible = Boolean(one) && !ui.locked)); // nothing to drag while locked
    if (!one) return;
    // Its inside length, along the face it's measured on, just into the room.
    const faces = facesOf(one, state.walls);
    const { u, inside } = faces;
    const s = faces.side || (inside.from === faces.left[0] && inside.to === faces.left[1] ? 1 : -1);
    const n = { x: faces.nl.x * s, z: faces.nl.z * s };
    const off = one.thickness / 2 + 30;
    const y = one.height * CM + 0.02;
    const at = (t) => v3((one.x1 + u.x * t + n.x * off) * CM, y, (one.z1 + u.z * t + n.z * off) * CM);
    wallLength.measure(at(inside.from), at(inside.to), fmt(inside.length), v3(n.x, 0, n.z));
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

  // ---- Measuring: click two points to see the distance between them ----

  const measureGroup = new THREE.Group();
  scene.add(measureGroup);
  const measures = []; // finished ones: { a, b } on the floor plan, in cm
  let measureStart = null; // the first point of the one being measured
  let measureHover = null; // the point under the pointer
  const measureDims = [];
  const measureDots = [];

  function drawMeasures() {
    const on = store.getUI().measuring;
    measureGroup.visible = on;
    if (!on) return;
    const lines = [...measures, ...(measureStart && measureHover ? [{ a: measureStart, b: measureHover }] : [])];
    while (measureDims.length < lines.length) {
      const dim = new Dim('sel');
      measureDims.push(dim);
      measureGroup.add(dim);
    }
    measureDims.forEach((dim, k) => {
      const m = lines[k];
      if (!m) {
        dim.visible = false;
        return;
      }
      const len = dist(m.a, m.b);
      const across = len ? v3(-(m.b.z - m.a.z) / len, 0, (m.b.x - m.a.x) / len) : v3(1, 0, 0);
      dim.measure(v3(m.a.x * CM, 0.03, m.a.z * CM), v3(m.b.x * CM, 0.03, m.b.z * CM), fmt(len), across);
    });
    // A dot at each end, and where the next point would go.
    const points = [...lines.flatMap((m) => [m.a, m.b]), ...(measureStart ? [measureStart] : measureHover ? [measureHover] : [])];
    while (measureDots.length < points.length) {
      const dot = handle('measure-dot');
      dot.element.tabIndex = -1;
      dot.element.setAttribute('aria-hidden', 'true');
      measureDots.push(dot);
      measureGroup.add(dot);
    }
    measureDots.forEach((dot, k) => {
      const p = points[k];
      dot.visible = Boolean(p);
      if (p) dot.position.set(p.x * CM, 0.03, p.z * CM);
    });
  }

  // A piece of furniture's footprint corners on the floor plan.
  function itemCorners(item) {
    const { w, d } = dimsOf(item);
    const a = THREE.MathUtils.degToRad(item.rotation);
    return CORNERS_2D.map(([sx, sz]) => {
      const [lx, lz] = [(sx * w) / 2, (sz * d) / 2];
      return { x: item.x + Math.cos(a) * lx + Math.sin(a) * lz, z: item.z - Math.sin(a) * lx + Math.cos(a) * lz };
    });
  }

  // The point to measure from under the pointer, on the floor plan. It snaps to a corner nearby (of a
  // wall, a door or window opening, or furniture), else onto a wall face or furniture edge. Shift keeps
  // the line straight across or down the plan.
  function measurePoint(e) {
    const hit = pick(e);
    const raw = hit ? { x: hit.point.x / CM, z: hit.point.z / CM } : planePoint(e, floorPlane);
    if (!raw) return null;
    const { walls, items, openings } = store.getState();
    const reach = (camera.position.distanceTo(v3(raw.x * CM, 0, raw.z * CM)) / CM) * 0.015; // about a dozen pixels
    const outlines = [...walls.map((w) => footprints.get(w.id)).filter(Boolean), ...items.filter((i) => !isFlat(i)).map(itemCorners)];
    const jambs = openings.flatMap((o) => {
      const w = walls.find((x) => x.id === o.wall);
      if (!w || !takesOpenings(w)) return [];
      const { u, nl } = facesOf(w, walls);
      const span = openingSpan(o, w);
      return [span.a, span.b].flatMap((s) => [1, -1].map((side) => ({ x: w.x1 + u.x * s + nl.x * side * (w.thickness / 2), z: w.z1 + u.z * s + nl.z * side * (w.thickness / 2) })));
    });
    let p = null;
    let best = reach;
    for (const c of [...outlines.flat(), ...jambs]) {
      const d = dist(c, raw);
      if (d < best) [p, best] = [{ x: c.x, z: c.z }, d];
    }
    if (!p) {
      best = reach * 0.7;
      for (const poly of outlines) {
        poly.forEach((a, k) => {
          const on = pointToSegment(raw, a, poly[(k + 1) % poly.length]);
          if (on.d < best) [p, best] = [{ x: on.x, z: on.z }, on.d];
        });
      }
    }
    p ??= raw;
    if (e.shiftKey && measureStart) {
      if (Math.abs(p.x - measureStart.x) > Math.abs(p.z - measureStart.z)) p = { x: p.x, z: measureStart.z };
      else p = { x: measureStart.x, z: p.z };
    }
    return p;
  }

  function measureClick(e) {
    const p = measurePoint(e);
    if (!p) return;
    if (!measureStart) measureStart = p;
    else {
      measures.push({ a: measureStart, b: p });
      measureStart = null;
    }
    measureHover = p;
    drawMeasures();
  }

  // Esc first drops a measurement just started; Backspace removes the last one.
  function cancelMeasure() {
    if (!measureStart) return false;
    measureStart = null;
    drawMeasures();
    return true;
  }
  function undoMeasure() {
    if (measureStart) measureStart = null;
    else measures.pop();
    drawMeasures();
  }
  function clearMeasures() {
    measures.length = 0;
    measureStart = null;
    drawMeasures();
  }

  // ---- Placing room dividers: click where one starts, then where it ends ----

  const dividerGroup = new THREE.Group();
  scene.add(dividerGroup);
  const dividerDim = new Dim('sel');
  const dividerDots = [handle('measure-dot'), handle('measure-dot')];
  for (const dot of dividerDots) {
    dot.element.tabIndex = -1;
    dot.element.setAttribute('aria-hidden', 'true');
  }
  dividerGroup.add(dividerDim, ...dividerDots);
  let dividerStart = null;
  let dividerHover = null;

  function drawDivider() {
    dividerGroup.visible = store.getUI().dividing;
    const [a, b] = [dividerStart ?? dividerHover, dividerStart ? dividerHover : null];
    dividerDots.forEach((dot, k) => {
      const p = [a, b][k];
      dot.visible = Boolean(p);
      if (p) dot.position.set(p.x * CM, 0.03, p.z * CM);
    });
    dividerDim.visible = Boolean(a && b);
    if (a && b) {
      const len = dist(a, b);
      const across = len ? v3(-(b.z - a.z) / len, 0, (b.x - a.x) / len) : v3(1, 0, 0);
      dividerDim.measure(v3(a.x * CM, 0.03, a.z * CM), v3(b.x * CM, 0.03, b.z * CM), fmt(len), across);
    }
  }

  // Where a divider end goes under the pointer: on a wall's end or corner nearby, else onto the middle
  // of a wall it's near (so the divider joins that wall and closes the room), else where it is. With
  // Shift, it runs straight across or down the plan from where it started, to the wall it meets there.
  function dividerPoint(e) {
    const hit = pick(e);
    const raw = hit ? { x: hit.point.x / CM, z: hit.point.z / CM } : planePoint(e, floorPlane);
    if (!raw) return null;
    const walls = store.getState().walls;
    const reach = (camera.position.distanceTo(v3(raw.x * CM, 0, raw.z * CM)) / CM) * 0.02; // about 15 pixels
    const start = dividerStart;
    if (e.shiftKey && start) {
      const across = Math.abs(raw.x - start.x) > Math.abs(raw.z - start.z);
      const dir = across ? { x: Math.sign(raw.x - start.x) || 1, z: 0 } : { x: 0, z: Math.sign(raw.z - start.z) || 1 };
      const straight = across ? { x: raw.x, z: start.z } : { x: start.x, z: raw.z };
      let best = straight;
      let bestD = Infinity;
      for (const w of walls) {
        const a = { x: w.x1, z: w.z1 };
        const b = { x: w.x2, z: w.z2 };
        const len = dist(a, b) || 1;
        const at = intersectLines(start, dir, a, { x: (b.x - a.x) / len, z: (b.z - a.z) / len });
        if (!at || pointToSegment(at, a, b).d > 1 || dist(at, start) < 1) continue;
        const d = dist(at, straight);
        if (d < w.thickness / 2 + reach && d < bestD) [best, bestD] = [at, d];
      }
      return best;
    }
    let best = null;
    let bestD = Infinity;
    for (const w of walls) {
      for (const p of endsOf(w)) {
        const d = dist(p, raw);
        if (d < Math.max(reach, w.thickness / 2 + 4) && d < bestD) [best, bestD] = [{ x: p.x, z: p.z }, d];
      }
    }
    if (best) return best;
    for (const w of walls) {
      if (Math.abs(w.curve || 0) >= 0.5) continue;
      const on = pointToSegment(raw, { x: w.x1, z: w.z1 }, { x: w.x2, z: w.z2 });
      if (on.d < w.thickness / 2 + reach * 0.6 && on.d < bestD) [best, bestD] = [{ x: on.x, z: on.z }, on.d];
    }
    return best ?? raw;
  }

  function dividerClick(e) {
    const p = dividerPoint(e);
    if (!p) return;
    if (!dividerStart) dividerStart = p;
    else if (dist(dividerStart, p) >= 5) {
      store.addDivider(dividerStart, p);
      dividerStart = null;
    }
    dividerHover = p;
    drawDivider();
  }

  // Esc first drops a divider just started.
  function cancelDivider() {
    if (!dividerStart) return false;
    dividerStart = null;
    drawDivider();
    return true;
  }

  // ---- Pointer: dragging furniture, walls and wall corners ----

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const floorPlane = new THREE.Plane(UP, 0);
  const planeHit = new THREE.Vector3();
  let itemDrag = null;
  let openingDrag = null;
  let wallDrag = null;
  let cornerDrag = null;
  let sinkDrag = null;
  let roomDrag = null;
  let press = null; // a press on empty space: a click if it doesn't move

  // How far along a piece of furniture (cm from its left end, as seen from the front) a floor point is.
  function alongItem(item, p) {
    const a = THREE.MathUtils.degToRad(item.rotation);
    return Math.cos(a) * (p.x - item.x) - Math.sin(a) * (p.z - item.z) + dimsOf(item).w / 2;
  }

  function aim(e) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  // The nearest visible piece of furniture or wall under the pointer.
  function pick(e) {
    aim(e);
    for (const hit of raycaster.intersectObjects([itemsGroup, openingGroup, wallGroup], true)) {
      if (!isShown(hit.object)) continue;
      let o = hit.object;
      let part = null;
      while (o && !o.userData.itemId && !o.userData.wallId && !o.userData.openingId) {
        part ??= o.userData.part ?? null;
        o = o.parent;
      }
      if (o?.userData.itemId) return { kind: 'item', id: o.userData.itemId, point: hit.point, part };
      if (o?.userData.openingId) return { kind: 'opening', id: o.userData.openingId, point: hit.point };
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
      if (store.getUI().drawing || e.button !== 0 || !e.isPrimary) return; // the drawing tool handles its own
      tween = null;
      // "Close with a divider" under a gap: a room divider across it.
      const closeEl = e.target.closest?.('.gap-close');
      if (closeEl) {
        e.stopPropagation();
        e.preventDefault();
        const d = closeEl.dataset;
        store.addDivider({ x: Number(d.ax), z: Number(d.az) }, { x: Number(d.bx), z: Number(d.bz) });
        return;
      }
      // A room's label: select it, and drag it to move it. A "Name this room" tag names the room.
      const roomEl = e.target.closest?.('[data-room]');
      const ghostEl = e.target.closest?.('[data-ghost]');
      if (roomEl || ghostEl) {
        e.stopPropagation();
        e.preventDefault();
        const { locked, measuring } = store.getUI();
        if (ghostEl) {
          if (!locked && !measuring) store.addRoomLabel(Number(ghostEl.dataset.x), Number(ghostEl.dataset.z));
          return;
        }
        const id = roomEl.dataset.room;
        store.selectRoomLabel(id);
        if (locked || measuring) return;
        const r = store.roomLabelById(id);
        const p = planePoint(e, floorPlane) ?? r;
        roomDrag = { id, pointerId: e.pointerId, dx: r.x - p.x, dz: r.z - p.z };
        store.beginGesture();
        container.setPointerCapture(e.pointerId);
        return;
      }
      // Measuring: a click places a point; a drag still turns the camera.
      if (store.getUI().measuring || store.getUI().dividing) {
        press = { x: e.clientX, y: e.clientY, additive: false };
        return;
      }
      const end = e.target.closest?.('[data-end]');
      if (end) {
        e.stopPropagation();
        e.preventDefault();
        const anchor = { id: end.dataset.wall, end: Number(end.dataset.end) };
        cornerDrag = { corner: store.cornerAt(anchor.id, anchor.end), anchor, pointerId: e.pointerId, moved: false };
        store.beginGesture(); // the whole drag is one step to undo
        container.setPointerCapture(e.pointerId);
        return;
      }
      const additive = e.shiftKey || e.metaKey || e.ctrlKey || store.getUI().several;
      // Locked: a press only selects, on release, and dragging anywhere turns the camera.
      if (store.getUI().locked) {
        press = { x: e.clientX, y: e.clientY, additive };
        return;
      }
      const hit = pick(e);
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
      store.beginGesture(); // the whole drag is one step to undo
      if (hit.kind === 'item' && hit.part === 'sink') {
        // Dragging a counter's sink slides it along the counter.
        store.select(hit.id);
        const item = store.getSelected();
        sinkDrag = { id: hit.id, pointerId: e.pointerId, grab: alongItem(item, start) - item.sink };
      } else if (hit.kind === 'item') {
        store.select(hit.id);
        const item = store.getSelected();
        itemDrag = { id: hit.id, pointerId: e.pointerId, dx: item.x - start.x, dz: item.z - start.z };
      } else if (hit.kind === 'opening') {
        store.selectOpening(hit.id);
        const o = store.openingById(hit.id);
        const f = openingFrame(o, store.wallById(o.wall));
        openingDrag = { id: hit.id, pointerId: e.pointerId, dx: f.x - start.x, dz: f.z - start.z };
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
    if (store.getUI().drawing) return;
    if (store.getUI().measuring) {
      if (e.buttons === 0) {
        measureHover = measurePoint(e);
        drawMeasures();
      }
      return;
    }
    if (store.getUI().dividing) {
      if (e.buttons === 0) {
        dividerHover = dividerPoint(e);
        drawDivider();
      }
      return;
    }
    if (roomDrag && e.pointerId === roomDrag.pointerId) {
      const p = planePoint(e, floorPlane);
      if (p) store.moveRoomLabel(roomDrag.id, p.x + roomDrag.dx, p.z + roomDrag.dz);
      return;
    }
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
      // It slides along walls; holding Ctrl (or Alt / Option, or ⌘) takes it through them.
      const p = planePoint(e, dragPlane);
      const through = e.ctrlKey || e.altKey || e.metaKey;
      if (p) (through ? store.dragItem : store.moveItem)(itemDrag.id, p.x + itemDrag.dx, p.z + itemDrag.dz);
      return;
    }
    if (sinkDrag && e.pointerId === sinkDrag.pointerId) {
      const p = planePoint(e, dragPlane);
      const item = store.getState().items.find((i) => i.id === sinkDrag.id);
      if (p && item) store.updateItem(item.id, { sink: Math.round(alongItem(item, p) - sinkDrag.grab) });
      return;
    }
    if (openingDrag && e.pointerId === openingDrag.pointerId) {
      const p = planePoint(e, dragPlane);
      if (p) store.moveOpening(openingDrag.id, p.x + openingDrag.dx, p.z + openingDrag.dz);
      return;
    }
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      const hit = pick(e);
      container.classList.toggle('is-hovering', Boolean(hit));
      container.classList.toggle('is-hovering-slide', hit?.part === 'sink' && !store.getUI().locked);
    }
  });

  function endDrags() {
    itemDrag = openingDrag = wallDrag = cornerDrag = sinkDrag = roomDrag = null;
    store.endGesture();
    showSnap(null);
    container.classList.remove('is-dragging');
  }

  container.addEventListener('pointerup', (e) => {
    if (store.getUI().drawing) return;
    if (roomDrag && e.pointerId === roomDrag.pointerId) {
      endDrags();
      return;
    }
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
    if ([itemDrag, openingDrag, sinkDrag].some((drag) => drag && e.pointerId === drag.pointerId)) {
      dropDragged();
      return;
    }
    if (store.getUI().measuring) {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) measureClick(e);
      press = null;
      return;
    }
    if (store.getUI().dividing) {
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) dividerClick(e);
      press = null;
      return;
    }
    // A click (not an orbit): while locked it selects what's under the pointer; on empty space it
    // clears the selection.
    if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 5) {
      const hit = pick(e);
      if (store.getUI().locked && hit) {
        if (hit.kind === 'item') store.select(hit.id);
        else if (hit.kind === 'opening') store.selectOpening(hit.id);
        else if (store.pressWall(hit.id).drillIn) store.selectWall(hit.id);
      } else if (!hit && !press.additive) {
        store.clearSelection();
      }
    }
    press = null;
  });

  container.addEventListener('pointercancel', () => {
    if (cornerDrag?.moved || wallDrag?.moved) store.finishWallEdit();
    dropDragged();
    press = null;
  });

  // A piece of furniture let go over a wall (taken there with Ctrl) moves to the nearest spot where it
  // fits.
  function dropDragged() {
    const id = itemDrag?.id;
    if (id) store.dropItem(id);
    endDrags();
    updateItemSelection(store.getState(), store.getUI());
  }

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
    const overlays = [selection, gaps, roomDims, wallSel, openingSel, snapMark, measureGroup, dividerGroup];
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
    syncOpenings(state);
    syncItems(state.items);
    updateItemSelection(state, ui);
    updateWallSelection(state, ui);
    updateOpeningSelection(state, ui);
    syncRoomLabels(state, ui);
    container.classList.toggle('is-locked', ui.locked);
    container.classList.toggle('is-measuring', ui.measuring || ui.dividing);
    if (!ui.dividing) dividerStart = dividerHover = null;
    drawDivider();
    if (!ui.measuring && (measures.length || measureStart)) clearMeasures(); // leaving the tool clears them
    else drawMeasures();
  });
  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    if (store.getUI().drawing) return; // the floor plan covers the view; nothing to draw
    if (tween) stepTween();
    controls.update();
    placeRoomDims(updateCutaway());
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return { setView, savePhoto, focus, frameRoom, cancelMeasure, undoMeasure, clearMeasures, cancelDivider };
}
