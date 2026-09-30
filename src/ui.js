// Side panel, inspector (selected furniture, wall, group or several walls), camera bar and keyboard shortcuts.
import { CATALOG, FLOOR_FINISHES, FLOOR_PATTERNS, WALL_PAINTS, dimsOf, isFlat, isOnWall, limitsOf, presetsOf, styleOf, tvScreen } from './catalog.js';
import * as store from './state.js';
import { LIMITS, angleOf, lengthOf, maxCurve } from './walls.js';

const ICONS = {
  sofa: '<path d="M9 15V9a2 2 0 0 1 2-2h26a2 2 0 0 1 2 2v6"/><path d="M5 16a2.5 2.5 0 0 1 5 0v4h28v-4a2.5 2.5 0 0 1 5 0v8H5z"/><path d="M8 24v3M40 24v3"/>',
  table: '<rect x="4" y="9" width="40" height="3" rx="1"/><path d="M8 12v15M40 12v15"/>',
  tvstand: '<rect x="4" y="11" width="40" height="14" rx="1"/><path d="M24 11v14M12 16h5M31 16h5M8 25v3M40 25v3"/>',
  tv: '<rect x="7" y="3" width="34" height="20" rx="1"/><path d="M24 23v4M17 28h14"/>',
  rug: '<rect x="10" y="4" width="28" height="24" rx="1"/><rect x="14" y="8" width="20" height="16"/><path d="M13 4V1M18 4V1M23 4V1M28 4V1M33 4V1M13 28v3M18 28v3M23 28v3M28 28v3M33 28v3"/>',
  turnLeft: '<path d="M9 7H4V2"/><path d="M4.6 7A8 8 0 1 1 4 12"/>',
  turnRight: '<path d="M15 7h5V2"/><path d="M19.4 7A8 8 0 1 0 20 12"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
};

// Line drawings of each furniture design, keyed "type:design".
const DESIGN_ICONS = {
  'sofa:classic': ICONS.sofa,
  'sofa:corner': '<path d="M4 6h40v22H30V16H4z"/><path d="M4 10h40M17 10v6M30 10v18"/>',
  'sofa:armless': '<path d="M8 9h32v9H8z"/><path d="M6 18h36v6H6z"/><path d="M9 24v3M39 24v3"/>',
  'sofa:chesterfield':
    '<path d="M8 17V9h32v8"/><circle cx="7" cy="12" r="3.2"/><circle cx="41" cy="12" r="3.2"/><path d="M3.8 12v12h40.4V12M8 18.5h32"/><path d="M8 24v3M40 24v3"/><path d="M16 13h.01M24 13h.01M32 13h.01M20 15.5h.01M28 15.5h.01"/>',
  'table:rect': ICONS.table,
  'table:round': '<ellipse cx="24" cy="10" rx="15" ry="4"/><path d="M24 14v12M16 27h16"/>',
  'table:oval': '<ellipse cx="24" cy="10" rx="20" ry="3.5"/><path d="M11 13l-1.5 14M37 13l1.5 14"/>',
  'table:slab': '<rect x="4" y="8" width="40" height="3"/><path d="M5 11h3v16H5zM40 11h3v16h-3z"/>',
  'tvstand:cabinet': ICONS.tvstand,
  'tvstand:open': '<rect x="4" y="10" width="40" height="15" rx="1"/><path d="M4 17.5h40M17.3 10v15M30.6 10v15"/><path d="M7 25v2h34v-2"/>',
  'tvstand:floating': '<rect x="4" y="7" width="40" height="12" rx="1"/><path d="M24 7v12"/><path d="M2 28h44" stroke-dasharray="2 3"/>',
  'tvstand:sideboard': '<rect x="4" y="7" width="40" height="13" rx="1"/><path d="M4 13.5h40M17.3 7v13M30.6 7v13"/><path d="M8 20l-2 8M40 20l2 8"/>',
  'tv:pedestal': ICONS.tv,
  'tv:feet': '<rect x="5" y="4" width="38" height="20" rx="1"/><path d="M11 24l-3 4M37 24l3 4"/>',
  'tv:wall': '<rect x="7" y="4" width="34" height="19" rx="1"/><path d="M2 29h44" stroke-dasharray="2 3"/>',
  'tv:curved': '<path d="M6 5q18 4 36 0v19q-18 4-36 0z"/><path d="M24 26v2M17 28h14"/>',
  'rug:bordered': '<rect x="8" y="4" width="32" height="24" rx="1"/><rect x="12" y="8" width="24" height="16"/>',
  'rug:round': '<circle cx="24" cy="16" r="13"/><circle cx="24" cy="16" r="9"/><circle cx="24" cy="16" r="3"/>',
  'rug:striped': '<rect x="8" y="4" width="32" height="24" rx="1"/><path d="M8 9h32M8 11.5h32M8 19h32M8 21.5h32"/>',
  'rug:classic':
    '<rect x="10" y="4" width="28" height="24"/><rect x="14" y="8" width="20" height="16"/><path d="M24 11l5 5-5 5-5-5z"/><path d="M13 4V1M18 4V1M23 4V1M28 4V1M33 4V1M13 28v3M18 28v3M23 28v3M28 28v3M33 28v3"/>',
  'rug:geometric': '<rect x="8" y="4" width="32" height="24" rx="1"/><path d="M16 6l7 10-7 10-7-10zM32 6l7 10-7 10-7-10z"/>',
  'rug:shaggy':
    '<rect x="8" y="4" width="32" height="24" rx="5"/><path d="M13 10l1 2M19 9l-1 2M25 10l1 2M31 9l-1 2M16 16l1 2M22 15l-1 2M28 16l1 2M34 15l-1 2M13 21l1 2M19 22l-1 2M25 21l1 2M31 22l-1 2"/>',
};

const icon = (name, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
const designIcon = (type, style) => `<svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">${DESIGN_ICONS[`${type}:${style}`]}</svg>`;

// "a sofa", "a table", "a TV stand": lower case except for TV.
const noun = (label) => (/^TV/.test(label) ? label : label.toLowerCase());

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'html') el.innerHTML = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat(Infinity).filter((c) => c != null && c !== false));
  return el;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// A number field drawn like a strip of measuring tape. `live` applies valid values while typing;
// otherwise the value is applied on Enter or when the field loses focus. min/max may be functions.
function measureField({ label, unit = 'cm', min, max, live = true, get, set }) {
  const lo = () => (typeof min === 'function' ? min() : min);
  const hi = () => (typeof max === 'function' ? max() : max);
  // Phone number pads have no minus key, so fields that take negatives get the full keyboard.
  const input = h('input', { type: 'number', inputmode: lo() < 0 ? null : 'numeric', step: 1 });
  const commit = () => {
    let v = Number(input.value);
    if (input.value === '' || !Number.isFinite(v)) v = get();
    v = clamp(Math.round(v), lo(), hi());
    input.value = v;
    if (v !== Math.round(get())) set(v);
  };
  input.addEventListener('input', () => {
    const v = Number(input.value);
    if (live && input.value !== '' && v >= lo() && v <= hi()) set(Math.round(v));
  });
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
  });
  const el = h(
    'label',
    { class: 'measure' },
    h('span', { class: 'measure__label' }, label),
    h('span', { class: 'measure__value' }, input, h('span', { class: 'measure__unit' }, unit)),
  );
  return {
    el,
    sync() {
      input.min = lo();
      input.max = hi();
      if (document.activeElement !== input) input.value = Math.round(get());
    },
  };
}

// A row of named color chips plus a chip that opens the system color picker.
function swatches({ label, palette, get, set }) {
  const current = h('span', { class: 'swatches__name' });
  const chips = palette.map((p) =>
    h('button', {
      type: 'button',
      class: 'chip',
      style: `--chip:${p.hex}`,
      title: p.name,
      'aria-label': p.name,
      onclick: () => set(p.hex),
    }),
  );
  const picker = h('input', { type: 'color', 'aria-label': `Any ${label.toLowerCase()}` });
  picker.addEventListener('input', () => set(picker.value));
  const custom = h('label', { class: 'chip chip--custom', title: 'Pick any color' }, picker, h('span', { 'aria-hidden': 'true' }, '+'));

  const el = h(
    'div',
    { class: 'swatches', role: 'group', 'aria-label': label },
    h('div', { class: 'swatches__head' }, h('span', { class: 'swatches__label' }, label), current),
    h('div', { class: 'swatches__row' }, chips, custom),
  );
  return {
    el,
    sync() {
      const value = get();
      const match = palette.find((p) => p.hex === value);
      chips.forEach((chip, i) => chip.setAttribute('aria-pressed', String(palette[i] === match)));
      custom.classList.toggle('is-on', !match);
      custom.style.setProperty('--chip', value);
      if (document.activeElement !== picker) picker.value = value;
      current.textContent = match ? match.name : value;
    },
  };
}

function segmented({ label, options, get, set }) {
  const buttons = options.map((o) => h('button', { type: 'button', onclick: () => set(o.id) }, o.label));
  return {
    el: h('div', { class: 'segmented', role: 'group', 'aria-label': label }, buttons),
    sync() {
      const value = get();
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].id === value)));
    },
  };
}

function turnButtons(onTurn) {
  return h(
    'div',
    { class: 'turn' },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Turn left 90°', title: 'Turn left 90° (Shift+R)', html: icon('turnLeft'), onclick: () => onTurn(-90) }),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Turn right 90°', title: 'Turn right 90° (R)', html: icon('turnRight'), onclick: () => onTurn(90) }),
  );
}

function panelHead(title, subtitle, onClose) {
  return h(
    'div',
    { class: 'inspector__head' },
    h('div', { class: 'inspector__heading' }, title, subtitle && h('p', { class: 'inspector__sub' }, subtitle)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', title: 'Close (Esc)', html: icon('close'), onclick: onClose }),
  );
}

const sizeText = (item) => {
  if (item.type === 'tv') return `${item.inches}″`;
  if (isFlat(item)) return styleOf(item).round ? `Ø ${item.w}` : `${item.w} × ${item.d}`;
  const { w, d, h } = dimsOf(item);
  return `${w} × ${d} × ${h}`;
};

const wallText = (w) => `${Math.round(lengthOf(w))} cm`;

function download(url, filename) {
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
}

let toastTimer = 0;
function say(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
}

// Shift, Cmd or Ctrl, or the "Select several" toggle, make a click add to the selection.
const adding = (e) => e.shiftKey || e.metaKey || e.ctrlKey || store.getUI().several;

export function initUI(view) {
  const panel = document.getElementById('panel');
  const inspector = document.getElementById('inspector');
  const syncers = [];
  const room = () => store.getState().room;

  // ---- Walls: add walls one by one, or a whole room; list of groups and walls ----

  const next = { length: 300, width: 400, depth: 500 }; // sizes for the next wall or room
  const nextLength = measureField({ label: 'Length', min: LIMITS.length[0], max: LIMITS.length[1], get: () => next.length, set: (v) => (next.length = v) });
  const roomWidth = measureField({ label: 'Width', min: 50, max: 3000, get: () => next.width, set: (v) => (next.width = v) });
  const roomDepth = measureField({ label: 'Length', min: 50, max: 3000, get: () => next.depth, set: (v) => (next.depth = v) });
  syncers.push(nextLength.sync, roomWidth.sync, roomDepth.sync);

  const addWallHelp = h('p', { class: 'help' });
  syncers.push(() => {
    const sel = store.getUI().sel;
    const from = sel?.type === 'wall' ? store.wallById(sel.id) : null;
    const free = from && store.hasFreeEnd(from.id);
    addWallHelp.textContent = from
      ? `The new wall starts at ${free ? 'the free end' : 'the end'} of ${from.name}, turned 90°.`
      : 'Select a wall first to continue from its free end. Four walls in a row make a room.';
  });

  const several = h('button', { type: 'button', class: 'btn btn--plain btn--small', onclick: () => store.setSeveral(!store.getUI().several) }, 'Select several');
  syncers.push(() => several.setAttribute('aria-pressed', String(store.getUI().several)));

  const wallList = h('ul', { class: 'wall-list' });
  const wallCount = h('span', { class: 'section__meta' });
  let wallListKey = '';
  function renderWallList(state, ui) {
    const key = JSON.stringify([ui.sel, state.groups, state.walls.map((w) => [w.id, w.name, w.group, Math.round(lengthOf(w))])]);
    if (key === wallListKey) return;
    wallListKey = key;
    const selected = new Set(store.selectedWallIds(ui.sel));
    wallCount.textContent = `${state.walls.length} ${state.walls.length === 1 ? 'wall' : 'walls'}`;
    const wallRow = (w, nested) =>
      h(
        'li',
        {},
        h(
          'button',
          {
            type: 'button',
            class: nested ? 'is-nested' : null,
            'aria-current': ui.sel?.type !== 'group' && selected.has(w.id) ? 'true' : null,
            onclick: (e) => (adding(e) ? store.toggleWall(w.id, { single: true }) : store.selectWall(w.id)),
          },
          h('span', { class: 'wall-list__name' }, w.name),
          h('span', { class: 'wall-list__size' }, wallText(w)),
        ),
      );
    const rows = [];
    for (const g of state.groups) {
      const members = state.walls.filter((w) => w.group === g.id);
      rows.push(
        h(
          'li',
          {},
          h(
            'button',
            {
              type: 'button',
              class: 'is-group',
              'aria-current': ui.sel?.type === 'group' && ui.sel.id === g.id ? 'true' : null,
              onclick: (e) => (adding(e) ? store.toggleWall(members[0].id) : store.selectGroup(g.id)),
            },
            h('span', { class: 'wall-list__name' }, g.name),
            h('span', { class: 'wall-list__size' }, `${members.length} walls`),
          ),
        ),
        members.map((w) => wallRow(w, true)),
      );
    }
    rows.push(state.walls.filter((w) => !w.group).map((w) => wallRow(w, false)));
    wallList.replaceChildren(...(state.walls.length ? rows.flat() : [h('li', { class: 'empty' }, 'No walls yet. Add a wall or a whole room.')]));
  }

  // ---- Floor and walls: colors, pattern, height ----

  const wallHeight = measureField({
    label: 'Wall height',
    min: LIMITS.height[0],
    max: LIMITS.height[1],
    live: false,
    get: () => room().height,
    set: (v) => store.updateRoom({ height: v }),
  });
  const pattern = segmented({
    label: 'Floor pattern',
    options: FLOOR_PATTERNS,
    get: () => room().floorPattern,
    set: (v) => store.updateRoom({ floorPattern: v }),
  });
  const floor = swatches({
    label: 'Floor',
    palette: FLOOR_FINISHES,
    get: () => room().floorColor,
    set: (v) => store.updateRoom({ floorColor: v }),
  });
  const walls = swatches({
    label: 'Walls',
    palette: WALL_PAINTS,
    get: () => room().wallColor,
    set: (v) => store.updateRoom({ wallColor: v }),
  });
  syncers.push(wallHeight.sync, pattern.sync, floor.sync, walls.sync);

  // ---- Furniture ----

  // Each type opens a menu of its designs; picking one adds that piece.
  const typeButtons = new Map();
  const designMenu = h('div', { class: 'design-menu', id: 'design-menu', role: 'group', hidden: true });
  let openType = null;
  function showDesigns(type) {
    openType = type;
    for (const [t, b] of typeButtons) b.setAttribute('aria-expanded', String(t === type));
    designMenu.hidden = !type;
    if (!type) return;
    const def = CATALOG[type];
    designMenu.setAttribute('aria-label', `${def.label} designs`);
    designMenu.replaceChildren(
      h(
        'div',
        { class: 'design-menu__head' },
        h('span', {}, `Choose a ${noun(def.label)}`),
        h('button', { type: 'button', class: 'icon-btn icon-btn--small', 'aria-label': 'Close', html: icon('close'), onclick: () => showDesigns(null) }),
      ),
      h(
        'div',
        { class: 'designs' },
        def.styles.map((s) =>
          h(
            'button',
            {
              type: 'button',
              class: 'design-btn',
              onclick: () => {
                store.addItem(type, s.id);
                showDesigns(null);
              },
            },
            h('span', { html: designIcon(type, s.id) }),
            s.label,
          ),
        ),
      ),
    );
    designMenu.querySelector('.design-btn').focus();
  }
  designMenu.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    const button = typeButtons.get(openType);
    showDesigns(null);
    button?.focus();
  });
  const addButtons = Object.entries(CATALOG).map(([type, def]) => {
    const button = h(
      'button',
      {
        type: 'button',
        class: 'add-btn',
        'aria-expanded': 'false',
        'aria-controls': 'design-menu',
        onclick: () => showDesigns(openType === type ? null : type),
      },
      h('span', { html: icon(type, '0 0 48 32') }),
      def.label,
    );
    typeButtons.set(type, button);
    return button;
  });

  const inventory = h('ol', { class: 'inventory' });
  const count = h('span', { class: 'section__meta' });
  let inventoryKey = '';
  function renderInventory(state, ui) {
    const selectedId = ui.sel?.type === 'item' ? ui.sel.id : null;
    const key = JSON.stringify([selectedId, state.items.map((i) => [i.id, i.name, i.color, sizeText(i)])]);
    if (key === inventoryKey) return;
    inventoryKey = key;
    count.textContent = state.items.length ? `${state.items.length} ${state.items.length === 1 ? 'piece' : 'pieces'}` : '';
    if (!state.items.length) {
      inventory.replaceChildren(h('li', { class: 'empty' }, 'No furniture yet. Add a sofa, a table, a TV or a carpet to start arranging.'));
      return;
    }
    inventory.replaceChildren(
      ...state.items.map((item) =>
        h(
          'li',
          {},
          h(
            'button',
            { type: 'button', 'aria-current': item.id === selectedId ? 'true' : null, onclick: () => store.select(item.id) },
            h('span', { class: 'inventory__dot', style: `--chip:${item.color}` }),
            h('span', { class: 'inventory__name' }, item.name),
            h('span', { class: 'inventory__size' }, sizeText(item)),
          ),
        ),
      ),
    );
  }

  // ---- Design file ----

  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    try {
      store.importDesign(await file.text());
      view.setView('overview');
      say(`Opened ${file.name}`);
    } catch {
      say(`${file.name} isn't a room design. Choose a .json file saved from Room planner.`);
    }
  });
  const saveDesign = () => {
    const url = URL.createObjectURL(new Blob([store.exportDesign()], { type: 'application/json' }));
    download(url, 'room-design.json');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say('Design file saved');
  };
  const startOver = () => {
    if (!confirm('Start over with an empty room? All walls you built and all furniture will be removed.')) return;
    store.resetDesign();
    view.setView('overview');
  };

  panel.append(
    h('header', { class: 'brand' }, h('h1', {}, 'Room planner')),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'walls-heading' },
      h('div', { class: 'section__head' }, h('h2', { id: 'walls-heading' }, 'Walls'), wallCount),
      h('div', { class: 'adder' }, nextLength.el, h('button', { type: 'button', class: 'btn btn--tape', onclick: () => store.addWall(next.length, view.focus()) }, 'Add wall')),
      addWallHelp,
      h(
        'div',
        { class: 'adder adder--room' },
        roomWidth.el,
        roomDepth.el,
        h('button', { type: 'button', class: 'btn', onclick: () => store.addRoom(next.width, next.depth) }, 'Add room'),
      ),
      h('div', { class: 'section__head section__head--list' }, h('h3', { class: 'list-title' }, 'Walls and groups'), several),
      wallList,
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'look-heading' },
      h('h2', { id: 'look-heading' }, 'Floor and walls'),
      h('div', { class: 'field-row field-row--first' }, wallHeight.el, h('p', { class: 'help help--side' }, 'Sets every wall. Change one wall by selecting it.')),
      h('div', { class: 'field-row' }, h('span', { class: 'field-row__label' }, 'Floor pattern'), pattern.el),
      floor.el,
      walls.el,
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'add-heading' },
      h('h2', { id: 'add-heading' }, 'Add furniture'),
      h('div', { class: 'add-grid' }, addButtons),
      designMenu,
    ),
    h(
      'section',
      { class: 'section', 'aria-labelledby': 'list-heading' },
      h('div', { class: 'section__head' }, h('h2', { id: 'list-heading' }, 'Furniture'), count),
      inventory,
    ),
    h(
      'footer',
      { class: 'section panel__footer' },
      h(
        'div',
        { class: 'file-actions' },
        h('button', { type: 'button', class: 'btn', onclick: saveDesign }, 'Save design file'),
        h('button', { type: 'button', class: 'btn', onclick: () => fileInput.click() }, 'Open design file'),
        h('button', { type: 'button', class: 'btn btn--plain', onclick: startOver }, 'Start over'),
      ),
      h('p', { class: 'note' }, 'Your design is saved automatically in this browser.'),
      fileInput,
    ),
  );

  // On: walls between the camera and the room are cut down so you can see in. Off: walls always stand.
  const seeThrough = h(
    'button',
    {
      type: 'button',
      class: 'switch',
      title: 'Cut away walls that stand between you and the room',
      onclick: () => store.setCutaway(!store.getUI().cutaway),
    },
    h('span', { class: 'switch__track', 'aria-hidden': 'true' }),
    'See-through walls',
  );
  syncers.push(() => seeThrough.setAttribute('aria-pressed', String(store.getUI().cutaway)));

  document.getElementById('viewbar').append(
    h(
      'div',
      { class: 'segmented segmented--stage', role: 'group', 'aria-label': 'Camera' },
      h('button', { type: 'button', onclick: () => view.setView('overview') }, '3D view'),
      h('button', { type: 'button', onclick: () => view.setView('top') }, 'Top view'),
      h('button', { type: 'button', onclick: () => view.setView('eye') }, 'Eye level'),
    ),
    seeThrough,
    h(
      'button',
      {
        type: 'button',
        class: 'btn btn--tape',
        onclick: () => {
          download(view.savePhoto(), 'room-design.png');
          say('Photo saved');
        },
      },
      'Save photo',
    ),
  );
  document.querySelector('.hint').textContent = 'Drag walls and furniture to move them. Drag empty space to look around. Scroll or pinch to zoom.';

  let inspectorKey; // undefined, so the first update always renders
  let inspectorSyncers = [];
  store.subscribe((state, ui) => {
    for (const sync of syncers) sync();
    renderWallList(state, ui);
    renderInventory(state, ui);
    const key = inspectorKeyFor(state, ui);
    if (key !== inspectorKey) {
      inspectorKey = key;
      inspectorSyncers = buildInspector(inspector, state, ui);
    }
    for (const sync of inspectorSyncers) sync();
    inspector.classList.toggle('is-empty', !ui.sel);
  });

  bindShortcuts();
}

// The inspector is rebuilt only when what it shows changes; values in between update in place.
function inspectorKeyFor(state, ui) {
  const sel = ui.sel;
  if (!sel) return 'none';
  if (sel.type === 'item') {
    const item = state.items.find((i) => i.id === sel.id);
    return item ? `item:${item.id}:${item.style}` : 'none';
  }
  if (sel.type === 'wall') {
    const w = store.wallById(sel.id);
    return w ? `wall:${w.id}:${w.group}` : 'none';
  }
  if (sel.type === 'group') return `group:${sel.id}:${store.selectedWallIds(sel).join()}`;
  return `walls:${sel.ids.join()}`;
}

function buildInspector(root, state, ui) {
  root.replaceChildren();
  const sel = ui.sel;
  if (sel?.type === 'item') {
    const item = state.items.find((i) => i.id === sel.id);
    if (item) return buildItemInspector(root, item);
  }
  if (sel?.type === 'wall' && store.wallById(sel.id)) return buildWallInspector(root, sel.id);
  if (sel?.type === 'group' && state.groups.some((g) => g.id === sel.id)) return buildGroupInspector(root, sel.id);
  if (sel?.type === 'walls') return buildWallsInspector(root, sel.ids);
  return buildHelp(root);
}

function buildHelp(root) {
  root.append(
    h(
      'div',
      { class: 'inspector__empty' },
      h('h2', { class: 'inspector__title' }, 'Build your layout wall by wall'),
      h(
        'ul',
        { class: 'tips' },
        h('li', {}, 'Add wall makes a wall of the length you set. With a wall selected, the next one starts at its free end, so four walls in a row make a room.'),
        h('li', {}, 'Drag a wall to move it. Its ends connect to nearby walls.'),
        h('li', {}, 'Select a wall and drag the round handles at its ends to stretch or turn it. Walls joined there move with it.'),
        h('li', {}, 'Shift-click several walls and group them to move them as one. Click a grouped wall again to edit just that wall.'),
        h('li', {}, 'The floor fills in wherever walls enclose a space.'),
      ),
      h(
        'dl',
        { class: 'keys' },
        [
          ['Drag', 'Move'],
          ['R', 'Turn right 90°'],
          ['Shift + R', 'Turn left 90°'],
          ['Arrow keys', 'Nudge 1 cm (Shift: 10 cm)'],
          ['Shift + click', 'Select several walls'],
          ['Ctrl/Cmd + G', 'Group selected walls'],
          ['Delete', 'Remove'],
          ['Esc', 'Deselect'],
        ].map(([key, what]) => [h('dt', {}, key), h('dd', {}, what)]),
      ),
    ),
  );
  return [];
}

function buildWallInspector(root, id) {
  const syncers = [];
  const wall = () => store.wallById(id);
  const w0 = wall();
  const group = store.getState().groups.find((g) => g.id === w0.group);
  const update = (patch) => store.updateWall(id, patch);

  const fields = [
    measureField({ label: 'Length', min: LIMITS.length[0], max: LIMITS.length[1], live: false, get: () => lengthOf(wall()), set: (v) => store.setWallLength(id, v) }),
    measureField({ label: 'Thickness', min: LIMITS.thickness[0], max: LIMITS.thickness[1], get: () => wall().thickness, set: (v) => update({ thickness: v }) }),
    measureField({ label: 'Angle', unit: '°', min: 0, max: 359, live: false, get: () => angleOf(wall()), set: (v) => store.setWallAngle(id, v) }),
    measureField({ label: 'Height', min: () => wall().gap + 20, max: LIMITS.height[1], get: () => wall().height, set: (v) => update({ height: v }) }),
    measureField({ label: 'Gap below', min: 0, max: () => wall().height - 20, get: () => wall().gap, set: (v) => update({ gap: v }) }),
    measureField({ label: 'Bulge', min: () => -maxCurve(wall()), max: () => maxCurve(wall()), get: () => wall().curve, set: (v) => update({ curve: v }) }),
  ];
  const color = swatches({ label: 'Color', palette: WALL_PAINTS, get: () => wall().color, set: (v) => update({ color: v }) });
  syncers.push(...fields.map((f) => f.sync), color.sync);

  root.append(panelHead(h('h2', { class: 'inspector__title' }, w0.name), group ? `Part of ${group.name}` : 'Not in a group', () => store.clearSelection()));
  if (group) {
    root.append(
      h(
        'div',
        { class: 'inspector__group' },
        h(
          'div',
          { class: 'presets' },
          h('button', { type: 'button', class: 'preset', onclick: () => store.selectGroup(group.id) }, `Select all of ${group.name}`),
          h('button', { type: 'button', class: 'preset', onclick: () => store.leaveGroup(id) }, 'Take out of the group'),
        ),
      ),
    );
  }
  root.append(
    h(
      'div',
      { class: 'inspector__group' },
      h('div', { class: 'measures' }, fields.slice(0, 3).map((f) => f.el)),
      h('div', { class: 'measures measures--gap' }, fields.slice(3).map((f) => f.el)),
      h(
        'p',
        { class: 'help' },
        'Length and angle move the wall’s end, along with any walls joined there. A gap below turns the wall into a beam over an opening. Bulge curves the wall; a negative number curves it the other way.',
      ),
    ),
    h('div', { class: 'inspector__group' }, color.el),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Turn'), turnButtons((deg) => store.rotateWalls([id], deg))),
    h(
      'div',
      { class: 'inspector__actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => store.duplicateWalls([id]) }, 'Duplicate'),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => store.removeWalls([id]) }, 'Remove'),
    ),
  );
  return syncers;
}

function buildGroupInspector(root, groupId) {
  const group = () => store.getState().groups.find((g) => g.id === groupId);
  const ids = () => store.selectedWallIds({ type: 'group', id: groupId });
  const members = store.getState().walls.filter((w) => w.group === groupId);

  const name = h('input', { class: 'inspector__name', 'aria-label': 'Group name', maxlength: 40, autocomplete: 'off' });
  name.addEventListener('input', () => store.renameGroup(groupId, name.value));
  name.addEventListener('change', () => {
    if (!name.value.trim()) store.renameGroup(groupId, 'Group');
  });

  root.append(
    panelHead(name, `${members.length} walls that move as one`, () => store.clearSelection()),
    h(
      'div',
      { class: 'inspector__group' },
      h('h3', {}, 'Walls'),
      h(
        'div',
        { class: 'presets' },
        members.map((w) => h('button', { type: 'button', class: 'preset', onclick: () => store.selectWall(w.id) }, `${w.name}, ${wallText(w)}`)),
      ),
      h('p', { class: 'help' }, 'Pick a wall to change just that one, or click it again in the view.'),
    ),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Turn'), turnButtons((deg) => store.rotateWalls(ids(), deg))),
    h(
      'div',
      { class: 'inspector__actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => store.duplicateWalls(ids()) }, 'Duplicate'),
      h('button', { type: 'button', class: 'btn', onclick: () => store.ungroup(groupId) }, 'Ungroup'),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => store.removeWalls(ids()) }, 'Remove'),
    ),
  );
  return [
    () => {
      if (document.activeElement !== name) name.value = group()?.name ?? '';
    },
  ];
}

function buildWallsInspector(root, ids) {
  root.append(
    panelHead(h('h2', { class: 'inspector__title' }, `${ids.length} walls selected`), 'Shift-click walls to add or remove them', () => store.clearSelection()),
    h(
      'div',
      { class: 'inspector__group' },
      h('button', { type: 'button', class: 'btn btn--tape', onclick: () => store.groupWalls(ids) }, 'Group these walls'),
      h('p', { class: 'help' }, 'A group moves, turns and copies as one piece. Walls already in a group join the new one.'),
    ),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Turn together'), turnButtons((deg) => store.rotateWalls(ids, deg))),
    h(
      'div',
      { class: 'inspector__actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => store.duplicateWalls(ids) }, 'Duplicate'),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => store.removeWalls(ids) }, 'Remove'),
    ),
  );
  return [];
}

function buildItemInspector(root, item) {
  const def = CATALOG[item.type];
  const style = styleOf(item);
  const id = item.id;
  const current = () => store.getState().items.find((i) => i.id === id);
  const update = (patch) => store.updateItem(id, patch);
  const syncers = [];

  const name = h('input', { class: 'inspector__name', 'aria-label': 'Name', maxlength: 40, autocomplete: 'off' });
  name.addEventListener('input', () => update({ name: name.value }));
  name.addEventListener('change', () => {
    if (!name.value.trim()) update({ name: def.label });
  });
  syncers.push(() => {
    if (document.activeElement !== name) name.value = current().name;
  });

  // Design: switching keeps the size where the new design allows it.
  const designs = h(
    'div',
    { class: 'designs', role: 'group', 'aria-label': 'Design' },
    def.styles.map((s) =>
      h(
        'button',
        { type: 'button', class: 'design-btn', 'aria-pressed': String(s.id === style.id), onclick: () => update({ style: s.id }) },
        h('span', { html: designIcon(item.type, s.id) }),
        s.label,
      ),
    ),
  );

  // Size
  const limit = (key, i) => () => limitsOf(current())[key][i];
  const presetButtons = presetsOf(item).map(({ name: label, ...patch }) => {
    const button = h('button', { type: 'button', class: 'preset', onclick: () => update(patch) }, label);
    syncers.push(() => {
      const it = current();
      button.setAttribute('aria-pressed', String(Object.entries(patch).every(([k, v]) => it[k] === v)));
    });
    return button;
  });

  let sizeFields;
  if (item.type === 'tv') {
    const inches = measureField({
      label: 'Screen size',
      unit: 'in',
      min: def.limits.inches[0],
      max: def.limits.inches[1],
      get: () => current().inches,
      set: (v) => update({ inches: v }),
    });
    const readout = h('p', { class: 'readout' });
    syncers.push(inches.sync, () => {
      const s = tvScreen(current().inches);
      readout.textContent = `Screen ${Math.round(s.w)} × ${Math.round(s.h)} cm`;
    });
    if (isOnWall(item)) {
      const mount = measureField({
        label: 'Above floor',
        min: limit('mount', 0),
        max: limit('mount', 1),
        get: () => current().mount,
        set: (v) => update({ mount: v }),
      });
      syncers.push(mount.sync);
      sizeFields = [h('div', { class: 'measures measures--two' }, inches.el, mount.el), readout];
    } else {
      sizeFields = h('div', { class: 'measures measures--tv' }, inches.el, readout);
    }
  } else {
    // Round pieces have one size across, their diameter; a carpet has no height worth setting.
    const flat = isFlat(item);
    const keys = [
      ...(style.round ? [['w', 'Diameter']] : [['w', 'Width'], ['d', flat ? 'Length' : 'Depth']]),
      ...(flat ? [] : [['h', 'Height']]),
    ];
    const fields = keys.map(([key, label]) =>
      measureField({
        label,
        min: limit(key, 0),
        max: limit(key, 1),
        get: () => current()[key],
        set: (v) => update({ [key]: v }),
      }),
    );
    syncers.push(...fields.map((f) => f.sync));
    sizeFields = h('div', { class: keys.length === 3 ? 'measures' : 'measures measures--two' }, fields.map((f) => f.el));
  }

  // A corner sofa's chaise can be on either side.
  let flip = null;
  if (item.type === 'sofa' && style.id === 'corner') {
    const box = h('input', { type: 'checkbox' });
    box.addEventListener('change', () => update({ flip: box.checked }));
    syncers.push(() => {
      box.checked = current().flip;
    });
    flip = h('label', { class: 'check' }, box, 'Chaise on the left');
  }

  // Colors
  const colorPickers = def.colors.map((slot) => {
    const picker = swatches({
      label: slot.label,
      palette: slot.palette,
      get: () => current()[slot.key],
      set: (v) => update({ [slot.key]: v }),
    });
    syncers.push(picker.sync);
    return picker.el;
  });

  // Rotation
  const angle = h('input', { type: 'range', min: 0, max: 355, step: 5, 'aria-label': 'Rotation' });
  angle.addEventListener('input', () => update({ rotation: Number(angle.value) }));
  const angleOut = h('output', { class: 'turn__value' });
  syncers.push(() => {
    const r = Math.round(current().rotation);
    if (document.activeElement !== angle) angle.value = r;
    angleOut.textContent = `${r}°`;
  });
  const turn = (delta) => update({ rotation: current().rotation + delta });

  root.append(
    panelHead(name, null, () => store.clearSelection()),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Design'), designs),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Size'), h('div', { class: 'presets' }, presetButtons), sizeFields, flip),
    h('div', { class: 'inspector__group' }, colorPickers),
    h(
      'div',
      { class: 'inspector__group' },
      h('h3', {}, 'Rotation'),
      h(
        'div',
        { class: 'turn' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Turn left 90°', title: 'Turn left 90° (Shift+R)', html: icon('turnLeft'), onclick: () => turn(90) }),
        angle,
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Turn right 90°', title: 'Turn right 90° (R)', html: icon('turnRight'), onclick: () => turn(-90) }),
        angleOut,
      ),
    ),
    h(
      'div',
      { class: 'inspector__actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => store.duplicateItem(id) }, 'Duplicate'),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => store.removeItem(id) }, 'Remove'),
    ),
  );
  return syncers;
}

function bindShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const { sel, several } = store.getUI();
    if (e.key === 'Escape') {
      if (several) store.setSeveral(false);
      store.clearSelection();
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    const step = e.shiftKey ? 10 : 1;
    const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };

    const item = store.getSelected();
    if (item) {
      if (e.key === 'Delete' || e.key === 'Backspace') store.removeItem(item.id);
      else if ((e.key === 'r' || e.key === 'R') && !mod) store.updateItem(item.id, { rotation: item.rotation + (e.shiftKey ? 90 : -90) });
      else if (arrows[e.key]) store.moveItem(item.id, item.x + arrows[e.key][0], item.z + arrows[e.key][1]);
      else if ((e.key === 'd' || e.key === 'D') && mod) store.duplicateItem(item.id);
      else return;
      e.preventDefault();
      return;
    }

    const ids = store.selectedWallIds();
    if (!ids.length) return;
    if (e.key === 'Delete' || e.key === 'Backspace') store.removeWalls(ids);
    else if ((e.key === 'r' || e.key === 'R') && !mod) store.rotateWalls(ids, e.shiftKey ? -90 : 90);
    else if (arrows[e.key]) store.nudgeWalls(ids, ...arrows[e.key]);
    else if ((e.key === 'd' || e.key === 'D') && mod) store.duplicateWalls(ids);
    else if ((e.key === 'g' || e.key === 'G') && mod && e.shiftKey && sel.type === 'group') store.ungroup(sel.id);
    else if ((e.key === 'g' || e.key === 'G') && mod && !e.shiftKey && ids.length > 1 && sel.type !== 'group') store.groupWalls(ids);
    else return;
    e.preventDefault();
  });
}
