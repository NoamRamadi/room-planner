// Side panel, inspector (selected furniture, wall, group or several walls), camera bar and keyboard shortcuts.
import { CATALOG, FLOOR_FINISHES, FLOOR_PATTERNS, WALL_PAINTS, colorsOf, dimsOf, isFlat, isOnWall, limitsOf, presetsOf, styleOf, tvScreen } from './catalog.js';
import { OPENINGS, openingLimitsOf, openingStyleOf } from './openings.js';
import { h, measureField } from './dom.js';
import { createDrawMode } from './draw.js';
import * as store from './state.js';
import { LIMITS, angleOf, facesOf, insideLengthOf, maxCurve, openingSpan, takesOpenings } from './walls.js';

const ICONS = {
  sofa: '<path d="M9 15V9a2 2 0 0 1 2-2h26a2 2 0 0 1 2 2v6"/><path d="M5 16a2.5 2.5 0 0 1 5 0v4h28v-4a2.5 2.5 0 0 1 5 0v8H5z"/><path d="M8 24v3M40 24v3"/>',
  table: '<rect x="4" y="9" width="40" height="3" rx="1"/><path d="M8 12v15M40 12v15"/>',
  tvstand: '<rect x="4" y="11" width="40" height="14" rx="1"/><path d="M24 11v14M12 16h5M31 16h5M8 25v3M40 25v3"/>',
  tv: '<rect x="7" y="3" width="34" height="20" rx="1"/><path d="M24 23v4M17 28h14"/>',
  toilet: '<rect x="9" y="3" width="9" height="13" rx="1"/><path d="M9 16h27a8 8 0 0 1-8 8h-4v5H15v-5c-4-1-6-4-6-8z"/>',
  sink: '<path d="M7 12h34l-3 7H10z"/><path d="M21 19v10h6V19"/><path d="M24 12V7h5"/>',
  shower: '<rect x="8" y="4" width="32" height="25" rx="1"/><path d="M26 4v25"/><path d="M12 9h7M15.5 9v3M14 15v1M15.5 15v2M17 15v1"/>',
  bathtub: '<path d="M5 14h38v4a7 7 0 0 1-7 7H12a7 7 0 0 1-7-7z"/><path d="M9 14V8a3 3 0 0 1 6 0"/><path d="M12 25l-2 3M36 25l2 3"/>',
  washer: '<rect x="11" y="2" width="26" height="28" rx="2"/><path d="M11 8h26M15 5h4"/><circle cx="24" cy="19" r="6"/>',
  bathcabinet: '<rect x="15" y="2" width="18" height="28" rx="1"/><path d="M15 15h18M29 8v3M29 19v3"/>',
  kitchen: '<path d="M7 9h34v3H7z"/><path d="M9 12v15h30V12M9 16h30M24 16v11M21 14h6M21 20v3M27 20v3"/><path d="M11 27v2h26v-2"/>',
  sinkunit: '<path d="M5 13h12l2 3h10l2-3h12v3H5z"/><path d="M7 16v13h34V16M24 16v13M21 21v3M27 21v3"/><path d="M24 13V6a3 3 0 0 1 6 0v1"/>',
  cooking: '<rect x="12" y="7" width="24" height="23" rx="1"/><path d="M12 12h24M16 9.5h.01M21 9.5h.01M27 9.5h.01M32 9.5h.01"/><rect x="16" y="15" width="16" height="10"/><path d="M15 4h7M26 4h7"/>',
  fridge: '<rect x="14" y="2" width="20" height="28" rx="2"/><path d="M14 12h20M18 5v4M18 15v6"/>',
  dishwasher: '<rect x="11" y="4" width="26" height="26" rx="1"/><path d="M11 10h26M14 7h6M19 14h10M15 20h18M15 25h18"/>',
  island: '<path d="M3 11h42v3H3z"/><rect x="6" y="14" width="36" height="13"/><path d="M18 14v13M30 14v13M10 18.5h4M22 18.5h4M34 18.5h4"/>',
  stool: '<ellipse cx="24" cy="7" rx="9" ry="2.5"/><path d="M18 9l-3 21M30 9l3 21M16.5 20h15"/>',
  bed: '<rect x="4" y="5" width="7" height="23" rx="2"/><path d="M11 19h32v6H11M11 14h32v5"/><rect x="13" y="10" width="9" height="4" rx="2"/><path d="M13 25v3M41 25v3"/>',
  nightstand: '<rect x="14" y="6" width="20" height="18" rx="1"/><path d="M14 15h20M22 10.5h4M22 19.5h4M16 24v4M32 24v4"/>',
  wardrobe: '<rect x="10" y="2" width="28" height="26" rx="1"/><path d="M24 2v26M21 13v5M27 13v5M12 28v2M36 28v2"/>',
  dresser: '<rect x="14" y="3" width="20" height="24" rx="1"/><path d="M14 9h20M14 15h20M14 21h20M22 6h4M22 12h4M22 18h4M22 24h4M16 27v3M32 27v3"/>',
  desk: '<path d="M4 10h40v3H4z"/><path d="M8 13v16M40 13v16"/><path d="M16 13v4h16v-4M22 15h4"/>',
  chair: '<path d="M15 3h18M15 8h18M15 3v27M33 3v27M14 17h20v2H14z"/><path d="M15 25h18"/>',
  bookcase: '<rect x="13" y="2" width="22" height="27"/><path d="M13 11h22M13 20h22"/><path d="M16 11V5M18 11V6M20 11V4M25 20v-6M27 20v-5M16 29v-6M18 29v-5M21 29v-6"/>',
  lamp: '<path d="M17 4h14l4 10H13z"/><path d="M24 14v4"/><path d="M20 18h8c2 3 2 7-1 10h-6c-3-3-3-7-1-10z"/>',
  crib: '<path d="M6 4v25M42 4v25M6 7h36M6 21h36"/><path d="M11 7v14M16 7v14M21 7v14M26 7v14M31 7v14M36 7v14"/><path d="M6 25h36"/>',
  ac: '<rect x="6" y="7" width="36" height="12" rx="3"/><path d="M10 16h28"/><path d="M14 23l-2 5M24 23v5M34 23l2 5"/>',
  curtain:
    '<path d="M4 4h40"/><circle cx="4" cy="4" r="1.5"/><circle cx="44" cy="4" r="1.5"/><path d="M7 4c-1 8 1 16-1 26M12 4c1 8-1 16 1 26M6 30h7M36 4c-1 8 1 16-1 26M41 4c1 8-1 16 1 26M35 30h7"/><rect x="17" y="8" width="14" height="15" stroke-dasharray="2 2"/>',
  socket: '<rect x="15" y="7" width="18" height="18" rx="2"/><circle cx="24" cy="16" r="6"/><path d="M21.5 14.5h.01M26.5 14.5h.01M24 18.5h.01"/>',
  counter:
    '<path d="M3 10h14l2 3h10l2-3h14v3H3z"/><path d="M5 13v15h38V13M17 13v15M29 13v15M5 18h12M5 23h12M9 15.5h4M9 20.5h4M9 25.5h4M26 18v4M32 18v4"/><path d="M24 10V5a3 3 0 0 1 6 0v1"/>',
  microwave: '<rect x="5" y="6" width="38" height="20" rx="2"/><rect x="9" y="10" width="22" height="12" rx="1"/><path d="M35 10h4M35 14h4"/><circle cx="37" cy="19" r="1.6"/><path d="M8 26v2M40 26v2"/>',
  dispenser: '<rect x="16" y="3" width="16" height="26" rx="3"/><path d="M19 7h10"/><rect x="19" y="11" width="10" height="11" rx="1"/><path d="M24 11v3M19 25h10"/>',
  coffee: '<path d="M12 4h24v4H12zM14 8h20v18H14z"/><path d="M18 26h12v3H18z"/><path d="M21 12h6v3h-6zM24 15v3"/><path d="M21 20h5v4h-5z"/>',
  dishrack: '<path d="M5 26h38v3H5z"/><path d="M8 26V16h32v10"/><path d="M12 26V11a5 5 0 0 1 2-4M16 26V10a5 5 0 0 1 2-4M20 26V10a5 5 0 0 1 2-4"/><path d="M30 18h4v8h-4zM36 18h3v8h-3z"/>',
  rug: '<rect x="10" y="4" width="28" height="24" rx="1"/><rect x="14" y="8" width="20" height="16"/><path d="M13 4V1M18 4V1M23 4V1M28 4V1M33 4V1M13 28v3M18 28v3M23 28v3M28 28v3M33 28v3"/>',
  turnLeft: '<path d="M9 7H4V2"/><path d="M4.6 7A8 8 0 1 1 4 12"/>',
  turnRight: '<path d="M15 7h5V2"/><path d="M19.4 7A8 8 0 1 0 20 12"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-4"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h4"/>',
  chevronLeft: '<path d="M15 5l-7 7 7 7"/>',
  chevronRight: '<path d="M9 5l7 7-7 7"/>',
  chevronDown: '<path d="M5 9l7 7 7-7"/>',
  paneRooms: '<path d="M4 10.5L12 4l8 6.5V20H4z"/><path d="M9.5 20v-5h5v5"/>',
  paneAdd: '<path d="M6 11V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/><path d="M4 12a2 2 0 0 1 4 0v2h8v-2a2 2 0 0 1 4 0v5H4z"/><path d="M6 17v2M18 17v2"/>',
  panePlaced: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="3"/>',
  paneStyle: '<path d="M5 4h12v5H5z"/><path d="M17 6.5h2v5h-7v3"/><path d="M11 14.5h2V20h-2z"/>',
  pencil: '<path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10z"/><path d="M14 7l3 3"/>',
  dots: '<path d="M5 12h.01M12 12h.01M19 12h.01" stroke-width="3.4"/>',
  save: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/>',
  open: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M5 19h14"/>',
  restart: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4v4h4"/>',
  door: '<path d="M15 30V3h18v27"/><path d="M10 30h28"/><path d="M29 16v2"/>',
  window: '<rect x="8" y="4" width="32" height="22"/><path d="M24 4v22"/><path d="M5 28h38"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  measure: '<path d="M3 15.5L15.5 3l5.5 5.5L8.5 21z"/><path d="M7 11.5l2 2M10 8.5l2 2M13 5.5l2 2"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
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

Object.assign(DESIGN_ICONS, {
  'toilet:floor': ICONS.toilet,
  'toilet:wall': '<path d="M7 3v26"/><path d="M7 13h29a8 8 0 0 1-8 8H7"/><rect x="11" y="4" width="6" height="5"/>',
  'toilet:bidet': '<path d="M9 14h27a8 8 0 0 1-8 8h-4v6H15v-6c-4-1-6-4-6-8z"/><path d="M13 14v-4h4"/>',
  'sink:pedestal': ICONS.sink,
  'sink:vanity': '<path d="M6 9h36v4H6z"/><rect x="7" y="13" width="34" height="15"/><path d="M24 13v15M21 19v3M27 19v3M24 9V5h4"/>',
  'sink:wall': '<path d="M6 3v26"/><path d="M6 12h30l-3 7H6"/><path d="M15 19v6H6M24 12V8h4"/>',
  'sink:double': '<path d="M3 9h42v4H3z"/><rect x="4" y="13" width="40" height="15"/><path d="M24 13v15M14 9V5h3M34 9V5h3"/>',
  'sink:vessel': '<path d="M5 19h38v3H5z"/><path d="M15 11h18c0 5-4 8-9 8s-9-3-9-8z"/><path d="M31 11V4h5"/>',
  'shower:enclosure': ICONS.shower,
  'shower:quadrant': '<path d="M8 29V4"/><path d="M8 4c18 0 32 11 32 25"/><path d="M4 29h40"/><path d="M12 8h6M15 8v3"/>',
  'shower:walkin': '<path d="M4 29h40"/><path d="M28 29V5M28 5H18"/><path d="M8 5h10M13 5v3M11 11v1M13 11v2M15 11v1"/>',
  'shower:cabin': '<rect x="10" y="2" width="28" height="27" rx="2"/><path d="M10 6h28M26 6v23"/><path d="M14 10h6"/>',
  'shower:head': '<path d="M16 29V6h11"/><path d="M27 6v3M23 10h8M25 13v2M27 13v3M29 13v2"/><path d="M12 21h8"/>',
  'bathtub:builtin': '<rect x="4" y="13" width="40" height="13" rx="1"/><path d="M9 13V7a3 3 0 0 1 6 0"/>',
  'bathtub:freestanding': ICONS.bathtub,
  'bathtub:screen': '<rect x="4" y="16" width="40" height="11" rx="1"/><path d="M8 16V3h12v13"/>',
  'washer:front': ICONS.washer,
  'washer:top': '<rect x="13" y="6" width="22" height="24" rx="2"/><path d="M13 12h22M17 9h14"/><path d="M16 4h16"/>',
  'washer:stack': '<rect x="14" y="1" width="20" height="14" rx="1"/><rect x="14" y="17" width="20" height="14" rx="1"/><circle cx="24" cy="9" r="3.5"/><circle cx="24" cy="25" r="3.5"/>',
  'bathcabinet:tall': ICONS.bathcabinet,
  'bathcabinet:mirror': '<rect x="10" y="5" width="28" height="21" rx="1"/><path d="M24 5v21"/><path d="M14 10l4-3M28 10l4-3"/>',
  'bathcabinet:shelves': '<rect x="14" y="2" width="20" height="28"/><path d="M14 9h20M14 16h20M14 23h20"/>',
  'kitchen:base': ICONS.kitchen,
  'kitchen:drawers': '<path d="M7 9h34v3H7z"/><path d="M9 12v15h30V12M9 17h30M9 22h30M21 14.5h6M21 19.5h6M21 24.5h6"/><path d="M11 27v2h26v-2"/>',
  'kitchen:wall': '<path d="M3 3h42" stroke-dasharray="2 3"/><rect x="10" y="6" width="28" height="17"/><path d="M24 6v17M18 20h3M27 20h3"/>',
  'kitchen:tall': '<rect x="15" y="1" width="18" height="27"/><path d="M15 11h18M29 6v3M29 13v4"/><path d="M16 28v2h16v-2"/>',
  'kitchen:shelf': '<path d="M3 3h42" stroke-dasharray="2 3"/><path d="M6 14h36M6 27h36"/><path d="M10 14V9h4v5M17 14V7h4v7M30 27c0-3 2-4 5-4s5 1 5 4"/>',
  'sinkunit:single': ICONS.sinkunit,
  'sinkunit:double': '<path d="M3 13h6l2 3h9l2-3h4l2 3h9l2-3h6v3H3z"/><path d="M5 16v13h38V16M24 16v13M21 21v3M27 21v3"/><path d="M24 13V6a3 3 0 0 1 6 0v1"/>',
  'sinkunit:farmhouse': '<path d="M5 13h8M35 13h8M5 16h8M35 16h8M5 13v3M43 13v3"/><rect x="13" y="11" width="22" height="9" rx="1"/><path d="M7 16v13h34V16M13 20H7M41 20h-6M24 20v9M21 23v3M27 23v3"/><path d="M24 11V5a3 3 0 0 1 6 0v1"/>',
  'cooking:range': ICONS.cooking,
  'cooking:hob': '<path d="M5 9h38v3H5z"/><path d="M14 9V7h20v2"/><path d="M7 12v17h34V12"/><rect x="11" y="14" width="26" height="10" rx="1"/><path d="M15 16.5h18M7 26.5h34"/>',
  'cooking:hood': '<path d="M3 3h42" stroke-dasharray="2 3"/><path d="M19 3v12M29 3v12"/><path d="M19 15l-11 8h32l-11-8z"/><path d="M8 23v3h32v-3"/>',
  'cooking:oven': '<rect x="15" y="1" width="18" height="29"/><rect x="17" y="7" width="14" height="10" rx="1"/><rect x="17" y="18.5" width="14" height="6" rx="1"/><path d="M15 26.5h18M20 4h8"/>',
  'fridge:single': '<rect x="14" y="2" width="20" height="28" rx="2"/><path d="M18 7v8"/>',
  'fridge:combi': ICONS.fridge,
  'fridge:american': '<rect x="8" y="2" width="32" height="28" rx="2"/><path d="M22 2v28M19 8v12M25 8v12"/><rect x="11" y="12" width="6" height="7" rx="1"/>',
  'fridge:under': '<path d="M7 10h34v3H7z"/><rect x="11" y="13" width="26" height="16" rx="1"/><path d="M17 16.5h14"/>',
  'fridge:retro': '<rect x="13" y="2" width="22" height="25" rx="6"/><path d="M13 10h22M17 5v3M17 13v5"/><path d="M16 27v3M32 27v3"/>',
  'dishwasher:integrated': '<path d="M7 7h34v3H7z"/><rect x="9" y="10" width="30" height="17"/><path d="M18 13.5h12"/><path d="M11 27v2h26v-2"/>',
  'dishwasher:freestanding': ICONS.dishwasher,
  'island:island': ICONS.island,
  'island:bar': '<path d="M3 11h42v3H3z"/><rect x="6" y="14" width="24" height="13"/><path d="M18 14v13M10 18.5h4M22 18.5h4"/><path d="M36 18h6M39 18v12M36 30h6"/>',
  'island:table': '<path d="M3 11h42v3H3z"/><rect x="5" y="14" width="20" height="13"/><path d="M15 14v13M8.5 18.5h3M18.5 18.5h3"/><path d="M42 14v16h3V14"/>',
  'stool:wood': ICONS.stool,
  'stool:metal': '<ellipse cx="24" cy="7" rx="9" ry="2.5"/><path d="M24 9.5v19M17 30h14M19 21h10"/>',
  'stool:back': '<path d="M17 3v11M31 3v11M17 6h14"/><path d="M15 14h18v3H15z"/><path d="M17 17l-1 13M31 17l1 13M16.5 24h15"/>',
  'bed:upholstered': ICONS.bed,
  'bed:wooden': '<path d="M5 4v24M43 12v16M5 21h38M5 15h38"/><rect x="8" y="11" width="8" height="4" rx="2"/>',
  'bed:platform': '<path d="M3 17h42v6H3z"/><path d="M6 23v2h36v-2"/><path d="M3 9h5v8H3z"/><path d="M8 13h34v4"/><rect x="10" y="10" width="8" height="3" rx="1.5"/>',
  'bed:storage': '<rect x="4" y="5" width="7" height="23" rx="2"/><path d="M11 17h32v10H11M11 13h32v4"/><path d="M15 20h10v4H15zM29 20h10v4H29z"/>',
  'bed:canopy': '<path d="M5 3v25M43 3v25M5 3h38"/><path d="M5 20h38M5 15h38"/><rect x="8" y="11" width="8" height="4" rx="2"/>',
  'bed:bunk': '<path d="M5 2v28M39 2v28"/><path d="M5 11h34M5 8h34M5 25h34M5 22h34"/><path d="M42 8v20M46 8v20M42 13h4M42 18h4M42 23h4"/>',
  'nightstand:drawers': ICONS.nightstand,
  'nightstand:open': '<rect x="14" y="6" width="20" height="18"/><path d="M14 12h20M22 9h4"/><path d="M16 24v4M32 24v4"/><path d="M17 21h9v3h-9z"/>',
  'nightstand:floating': '<rect x="12" y="10" width="24" height="8" rx="1"/><path d="M21 14h6"/><path d="M2 28h44" stroke-dasharray="2 3"/>',
  'nightstand:round': '<ellipse cx="24" cy="8" rx="12" ry="3"/><path d="M17 10l-4 18M31 10l4 18M24 11v17"/><ellipse cx="24" cy="20" rx="8" ry="2"/>',
  'wardrobe:hinged': ICONS.wardrobe,
  'wardrobe:sliding': '<rect x="8" y="2" width="32" height="27" rx="1"/><path d="M8 5h32M8 26h32"/><path d="M23 5v21M25 5v21"/><path d="M11 14v4M37 14v4"/>',
  'wardrobe:mirror': '<rect x="8" y="2" width="32" height="27" rx="1"/><path d="M24 2v27"/><path d="M12 9l5-4M12 15l9-7M28 9l5-4M28 15l9-7"/>',
  'wardrobe:open': '<path d="M8 30V3M40 30V3M8 3h32M8 25h32M8 7h32"/><path d="M12 7v12M16 7v15M20 7v10M24 7v14M28 7v12M32 7v9"/>',
  'dresser:chest': ICONS.dresser,
  'dresser:wide': '<rect x="6" y="9" width="36" height="17" rx="1"/><path d="M24 9v17M6 14.7h36M6 20.3h36M13 12h4M31 12h4M13 17.5h4M31 17.5h4M13 23h4M31 23h4M8 26v3M40 26v3"/>',
  'dresser:dressing': '<path d="M8 17h32v3H8z"/><path d="M10 20l-1 10M38 20l1 10M20 22h8"/><path d="M14 20v4h20v-4"/><ellipse cx="24" cy="9" rx="6" ry="7.5"/>',
  'desk:writing': ICONS.desk,
  'desk:pedestal': '<path d="M4 10h40v3H4z"/><path d="M6 13v16"/><rect x="29" y="13" width="13" height="16"/><path d="M29 18.3h13M29 23.6h13M34 15.6h3M34 21h3M34 26.3h3"/>',
  'desk:lshape': '<path d="M5 4h38v10H16v15H5z"/><circle cx="29" cy="22" r="4"/>',
  'chair:office': '<rect x="16" y="2" width="16" height="12" rx="3"/><path d="M14 17h20v3H14z"/><path d="M24 20v5M15 28l9-3 9 3M15 28v1M33 28v1"/>',
  'chair:wooden': ICONS.chair,
  'chair:armchair': '<path d="M12 4h24a2 2 0 0 1 2 2v9H10V6a2 2 0 0 1 2-2z"/><path d="M6 13a3 3 0 0 1 6 0v6h24v-6a3 3 0 0 1 6 0v11H6z"/><path d="M9 24l-1 4M39 24l1 4"/>',
  'bookcase:open': ICONS.bookcase,
  'bookcase:cube': '<rect x="9" y="3" width="30" height="26"/><path d="M19 3v26M29 3v26M9 11.7h30M9 20.3h30"/><path d="M11 13.5h6v5h-6zM31 5h6v5h-6zM21 22h6v5h-6z"/>',
  'bookcase:ladder': '<path d="M36 2v28" stroke-dasharray="2 3"/><path d="M16 30L34 2"/><path d="M18.5 26H36M23 19h13M27.5 12H36M32 5h4"/>',
  'lamp:table': ICONS.lamp,
  'lamp:floor': '<path d="M18 2h12l3 8H15z"/><path d="M24 10v19M18 29h12"/>',
  'lamp:arc': '<path d="M8 29h8M12 29V14a12 12 0 0 1 24 0v2"/><path d="M30 22a6 6 0 0 1 12 0z"/>',
  'crib:cot': ICONS.crib,
  'crib:bassinet': '<path d="M8 8h32l-3 9H11z"/><path d="M14 17l20 12M34 17L14 29"/>',
  'ac:split': ICONS.ac,
  'ac:floor': '<rect x="16" y="2" width="16" height="28" rx="2"/><path d="M19 6h10M19 9h10M19 12h10M22 18h4"/>',
  'ac:portable': '<rect x="12" y="6" width="20" height="21" rx="3"/><path d="M16 10h12M16 13h12M15 27v2M29 27v2"/><path d="M32 12c6 0 9 3 9 8v9"/>',
  'ac:cassette': '<path d="M3 4h42" stroke-dasharray="2 3"/><path d="M8 7h32v6H8z"/><path d="M11 10h6M31 10h6M21 10h6"/><path d="M14 17l-3 6M24 17v6M34 17l3 6"/>',
  'ac:vent': '<path d="M3 4h42" stroke-dasharray="2 3"/><rect x="6" y="9" width="36" height="9" rx="1"/><path d="M9 12h30M9 15h30"/>',
  'ac:outdoor': '<rect x="6" y="6" width="36" height="20" rx="2"/><circle cx="19" cy="16" r="7"/><circle cx="19" cy="16" r="2"/><path d="M32 10v12M36 10v12M9 26v3M39 26v3"/>',
  'curtain:panels': ICONS.curtain,
  'curtain:closed': '<path d="M4 4h40"/><circle cx="4" cy="4" r="1.5"/><circle cx="44" cy="4" r="1.5"/><path d="M8 4v26M13 4v26M18 4v26M23 4v26M25 4v26M30 4v26M35 4v26M40 4v26M6 30h17M25 30h17"/>',
  'curtain:sheer': '<path d="M4 4h40"/><circle cx="4" cy="4" r="1.5"/><circle cx="44" cy="4" r="1.5"/><path d="M7 4v26M41 4v26M7 30h34" stroke-dasharray="2 2"/><path d="M14 4v26M21 4v26M28 4v26M35 4v26" stroke-dasharray="1 3"/>',
  'curtain:roller': '<rect x="8" y="3" width="32" height="4" rx="2"/><path d="M10 7v13h28V7M9 20h30"/><path d="M12 22v7h24v-7" stroke-dasharray="2 2"/>',
  'curtain:roman': '<path d="M8 4h32v3H8z"/><path d="M10 7v11h28V7"/><path d="M10 18q14 3 28 0M10 14q14 3 28 0"/><path d="M12 23v6h24v-6" stroke-dasharray="2 2"/>',
  'socket:single': ICONS.socket,
  'socket:double': '<rect x="8" y="8" width="32" height="16" rx="2"/><circle cx="16" cy="16" r="5"/><circle cx="32" cy="16" r="5"/><path d="M14 14.8h.01M18 14.8h.01M16 18h.01M30 14.8h.01M34 14.8h.01M32 18h.01"/>',
  'socket:triple': '<rect x="3" y="9" width="42" height="14" rx="2"/><circle cx="10" cy="16" r="4.5"/><circle cx="24" cy="16" r="4.5"/><circle cx="38" cy="16" r="4.5"/><path d="M8.3 15h.01M11.7 15h.01M10 17.8h.01M22.3 15h.01M25.7 15h.01M24 17.8h.01M36.3 15h.01M39.7 15h.01M38 17.8h.01"/>',
  'socket:usb': '<rect x="8" y="8" width="32" height="16" rx="2"/><circle cx="17" cy="16" r="5"/><path d="M15 14.8h.01M19 14.8h.01M17 18h.01"/><path d="M29 11.5h6v3h-6zM29 17.5h6v3h-6z"/>',
  'socket:waterproof': '<rect x="14" y="4" width="20" height="24" rx="2"/><path d="M14 9h20"/><rect x="16.5" y="11" width="15" height="14" rx="1" stroke-dasharray="2 2"/><circle cx="24" cy="18" r="4"/>',
  'socket:data': '<rect x="15" y="7" width="18" height="18" rx="2"/><path d="M18 12h5v5h-5zM25 12h5v5h-5zM20 21h8"/>',
  'counter:single': ICONS.counter,
  'counter:double':
    '<path d="M3 10h8l2 3h8l2-3h2l2 3h8l2-3h8v3H3z"/><path d="M5 13v15h38V13M17 13v15M29 13v15M5 18h12M5 23h12M9 15.5h4M9 20.5h4M9 25.5h4M26 18v4M32 18v4"/><path d="M24 10V5a3 3 0 0 1 6 0v1"/>',
  'counter:none': '<path d="M3 10h42v3H3z"/><path d="M5 13v15h38V13M17 13v15M29 13v15M5 18h12M5 23h12M9 15.5h4M9 20.5h4M9 25.5h4M26 18v4M32 18v4"/>',
  'microwave:countertop': ICONS.microwave,
  'microwave:retro': '<rect x="5" y="6" width="38" height="21" rx="6"/><rect x="10" y="10" width="20" height="12" rx="3"/><circle cx="36" cy="12.5" r="2"/><circle cx="36" cy="19.5" r="2"/><path d="M9 27v2M39 27v2"/>',
  'microwave:otr': '<path d="M3 3h42" stroke-dasharray="2 3"/><rect x="6" y="6" width="36" height="14" rx="1"/><rect x="9" y="9" width="22" height="8"/><path d="M34 9h5M34 12h5"/><path d="M8 27h32M12 29.5h8M28 29.5h8"/>',
  'dispenser:bar': ICONS.dispenser,
  'dispenser:bottle': '<path d="M18 3h12v9a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z"/><path d="M22 15h4v2h-4z"/><rect x="14" y="17" width="20" height="12" rx="2"/><path d="M19 21h3M26 21h3M18 26h12"/>',
  'dispenser:urn': '<path d="M15 7h18v20H15z"/><path d="M18 4h12v3H18zM24 2v2"/><path d="M15 11h-3v6h3M33 11h3v6h-3"/><path d="M14 29h20M24 22v3h3"/>',
  'coffee:espresso': '<path d="M8 6h32v20H8z"/><path d="M6 26h36v3H6z"/><path d="M14 14h8v3h-8zM18 17v2M17 9h-6"/><circle cx="32" cy="12" r="3"/><path d="M36 16l2 7M15 21h6v5h-6z"/>',
  'coffee:capsule': ICONS.coffee,
  'coffee:drip': '<path d="M14 3h20v6H14zM14 9h6v17h-6z"/><path d="M12 26h24v3H12z"/><path d="M22 14h10l-1 12h-8z"/><path d="M32 17h2v6h-2"/>',
  'coffee:bean': '<rect x="13" y="4" width="22" height="25" rx="2"/><path d="M16 8h16v5H16zM17 16h14v10H17z"/><path d="M22 16v3M26 16v3M21 22h6v4h-6z"/><path d="M16 4V2h8v2"/>',
  'dishrack:rack': ICONS.dishrack,
  'dishrack:twotier': '<path d="M5 27h38v2H5z"/><path d="M8 27V3M40 27V3M8 17h32M8 23h32"/><path d="M13 17V8a4 4 0 0 1 2-3M17 17V8a4 4 0 0 1 2-3M21 17V8a4 4 0 0 1 2-3M25 17V8a4 4 0 0 1 2-3"/><path d="M13 23v4M18 23v4M30 23v4M35 23v4"/>',
  'dishrack:oversink': '<path d="M3 27h12l2 2h14l2-2h12"/><path d="M7 27V4M41 27V4M7 8h34M7 17h34"/><path d="M12 8V3M15 8V3M18 8V3M21 8V3"/><path d="M28 17v-4h4v4M34 17v-4h4v4"/>',
  'door:single': ICONS.door,
  'door:double': '<path d="M9 30V3h30v27M24 3v27"/><path d="M5 30h38"/><path d="M21 16v2M27 16v2"/>',
  'door:sliding': '<path d="M7 30V3h34v27"/><path d="M10 6h15v24M23 6h15v24"/><path d="M3 30h42"/>',
  'door:doorway': '<path d="M14 30V3h20v27"/><path d="M17 30V6h14v24"/><path d="M10 30h28"/>',
  'window:standard': ICONS.window,
  'window:picture': '<rect x="6" y="5" width="36" height="21"/><path d="M4 28h40"/>',
  'window:grid': '<rect x="9" y="4" width="30" height="22"/><path d="M19 4v22M29 4v22M9 11.3h30M9 18.6h30"/><path d="M7 28h34"/>',
  'window:tall': '<rect x="14" y="2" width="20" height="28"/><path d="M24 2v28M14 23h20"/>',
});

const icon = (name, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
const designIcon = (type, style) => `<svg viewBox="0 0 48 32" aria-hidden="true" focusable="false">${DESIGN_ICONS[`${type}:${style}`]}</svg>`;

// "a sofa", "a table", "a TV stand": lower case except for TV.
const noun = (label) => (/^TV/.test(label) ? label : label.toLowerCase());

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

// A row of rounded choices (one of them on), wrapping onto more lines as needed.
function pills({ label, options, get, set }) {
  const buttons = options.map((o) => h('button', { type: 'button', class: 'pill', onclick: () => set(o.id) }, o.label));
  return {
    el: h('div', { class: 'pills', role: 'group', 'aria-label': label }, buttons),
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
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', title: 'Close (Esc)', 'data-always': '', html: icon('close'), onclick: onClose }),
  );
}

const sizeText = (item) => {
  if (item.type === 'tv') return `${item.inches}″`;
  if (isFlat(item)) return styleOf(item).round ? `Ø ${item.w}` : `${item.w} × ${item.d}`;
  const { w, d, h } = dimsOf(item);
  return `${w} × ${d} × ${h}`;
};

// Walls are measured on the inside, wall face to wall face, the way you'd measure a room with a tape.
const wallText = (w, walls = store.getState().walls) => `${Math.round(insideLengthOf(w, walls))} cm`;

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

// A button for each kind of thing (from a catalog), each opening a menu of that kind's designs.
// Picking a design calls onPick(kind, design).
function adder({ id, kinds, onPick }) {
  const buttons = new Map();
  const menu = h('div', { class: 'design-menu', id, role: 'group', hidden: true });
  let open = null;
  function show(kind) {
    open = kind;
    for (const [k, b] of buttons) b.setAttribute('aria-expanded', String(k === kind));
    menu.hidden = !kind;
    if (!kind) return;
    const def = kinds[kind];
    menu.setAttribute('aria-label', `${def.label} designs`);
    menu.replaceChildren(
      h(
        'div',
        { class: 'design-menu__head' },
        h('span', {}, `Choose ${/^[aeiou]/i.test(def.label) ? 'an' : 'a'} ${noun(def.label)}`),
        h('button', { type: 'button', class: 'icon-btn icon-btn--small', 'aria-label': 'Close', html: icon('close'), onclick: () => show(null) }),
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
                onPick(kind, s.id);
                show(null);
              },
            },
            h('span', { html: designIcon(kind, s.id) }),
            s.label,
          ),
        ),
      ),
    );
    menu.querySelector('.design-btn').focus();
  }
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    const button = buttons.get(open);
    show(null);
    button?.focus();
  });
  for (const [kind, def] of Object.entries(kinds)) {
    buttons.set(
      kind,
      h(
        'button',
        { type: 'button', class: 'add-btn', 'aria-expanded': 'false', 'aria-controls': id, onclick: () => show(open === kind ? null : kind) },
        h('span', { html: icon(kind, '0 0 48 32') }),
        def.label,
      ),
    );
  }
  return { buttons: [...buttons.values()], menu, close: () => show(null) };
}

// While locked, every control that would change the design is disabled; controls marked
// data-always (selecting things, saving, closing) keep working.
function applyLock(root, locked) {
  for (const el of root.querySelectorAll('button, input, select, textarea')) {
    if (!el.closest('[data-always]')) el.disabled = locked;
  }
}

// Shift, Cmd or Ctrl, or the "Select several" toggle, make a click add to the selection.
const adding = (e) => e.shiftKey || e.metaKey || e.ctrlKey || store.getUI().several;

export function initUI(view) {
  const panel = document.getElementById('panel');
  const inspector = document.getElementById('inspector');
  const syncers = [];
  const room = () => store.getState().room;

  // ---- Walls: add walls one by one, or a whole room; list of groups and walls ----

  // Drawing walls on a floor plan; Done brings you back to the 3D view with the new walls.
  const draw = createDrawMode(document.getElementById('stage'), {
    onClose: (added) => {
      if (added) view.setView('overview');
    },
  });

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
      ? `The new wall continues from ${free ? 'the free end' : 'the end'} of ${from.name}, turned 90°. Lengths are inside lengths, wall face to wall face.`
      : 'Lengths are inside lengths, wall face to wall face. Select a wall first to continue from its free end; four walls in a row make a room.';
  });

  const several = h(
    'button',
    { type: 'button', class: 'btn btn--plain btn--small', 'data-always': '', onclick: () => store.setSeveral(!store.getUI().several) },
    'Select several',
  );
  syncers.push(() => several.setAttribute('aria-pressed', String(store.getUI().several)));

  const wallList = h('ul', { class: 'wall-list', 'data-always': '' });
  const wallCount = h('span', { class: 'section__meta' });
  // Groups folded down to their own row, remembered in this browser.
  const FOLDED_KEY = 'room-planner:folded';
  const folded = new Set();
  try {
    for (const id of JSON.parse(localStorage.getItem(FOLDED_KEY)) ?? []) folded.add(id);
  } catch {
    // nothing remembered yet
  }
  const rememberFolded = () => {
    try {
      localStorage.setItem(FOLDED_KEY, JSON.stringify([...folded]));
    } catch {
      // private browsing: just don't remember it
    }
  };
  const setFolded = (id, on) => {
    if (on) folded.add(id);
    else folded.delete(id);
    rememberFolded();
    renderWallList(store.getState(), store.getUI());
  };
  let wallListKey = '';
  function renderWallList(state, ui) {
    // A wall picked on its own (in the view, say) unfolds its group so it shows in the list.
    const picked = ui.sel?.type === 'wall' ? state.walls.find((w) => w.id === ui.sel.id) : null;
    if (picked?.group && folded.delete(picked.group)) rememberFolded();
    const key = JSON.stringify([ui.sel, state.groups, [...folded], state.walls.map((w) => [w.id, w.name, w.group, wallText(w, state.walls)])]);
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
      const open = !folded.has(g.id);
      rows.push(
        h(
          'li',
          { class: 'wall-list__group' },
          h('button', {
            type: 'button',
            class: 'wall-list__fold',
            'aria-expanded': String(open),
            'aria-label': `${open ? 'Collapse' : 'Expand'} ${g.name}`,
            title: open ? 'Collapse' : 'Expand',
            html: icon(open ? 'chevronDown' : 'chevronRight'),
            onclick: () => setFolded(g.id, open),
          }),
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
        open ? members.map((w) => wallRow(w, true)) : [],
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

  // ---- Add: search every design, or browse by category ----

  // Each type opens a menu of its designs; picking one adds that piece. Furniture comes in sets by
  // room (living room, kitchen, bedroom, bathroom), doors and windows are a set of their own, and
  // pieces for any room (air conditioners, curtains, sockets) another; one set is shown at a time.
  const rooms = [
    { id: 'living', label: 'Living' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'bedroom', label: 'Bedroom' },
    { id: 'bath', label: 'Bath' },
    { id: 'openings', label: 'Doors & windows' },
    { id: 'any', label: 'Any room' },
  ];
  const addOpening = (kind, style) => {
    if (store.addOpening(kind, style) === false) say(`No wall has room for a ${noun(OPENINGS[kind].label)}. Make a wall longer, or move a door or window.`);
  };
  const furnitureFor = (room) =>
    adder({
      id: `design-menu-${room}`,
      kinds: Object.fromEntries(Object.entries(CATALOG).filter(([, def]) => (def.room ?? 'living') === room)),
      onPick: (type, style) => store.addItem(type, style),
    });
  const openings = adder({ id: 'opening-menu', kinds: OPENINGS, onPick: addOpening });
  const sets = Object.fromEntries(rooms.map((r) => [r.id, r.id === 'openings' ? openings : furnitureFor(r.id)]));
  const furniture = { close: () => Object.values(sets).forEach((set) => set.close()) };
  let shownSet = 'living';
  const setBlocks = Object.fromEntries(
    rooms.map((r) => [
      r.id,
      h(
        'div',
        { class: 'furniture-set' },
        h('div', { class: 'add-grid' }, sets[r.id].buttons),
        sets[r.id].menu,
        r.id === 'openings' && h('p', { class: 'help' }, 'They go in the selected wall, or in a wall with room. Drag one along its wall, or onto another wall.'),
      ),
    ]),
  );
  const roomTabs = pills({
    label: 'Category',
    options: rooms,
    get: () => shownSet,
    set: (id) => {
      shownSet = id;
      furniture.close();
      syncRoomTabs();
    },
  });
  const syncRoomTabs = () => {
    roomTabs.sync();
    for (const r of rooms) setBlocks[r.id].hidden = r.id !== shownSet;
  };
  syncRoomTabs();

  // Search: every design of every kind whose names hold all the words typed; picking one adds it.
  const designIndex = [
    ...Object.entries(CATALOG).flatMap(([type, def]) =>
      def.styles.map((s) => ({ add: () => store.addItem(type, s.id), type, style: s.id, label: s.label, kind: def.label, words: `${def.label} ${s.label} ${s.name}`.toLowerCase() })),
    ),
    ...Object.entries(OPENINGS).flatMap(([kind, def]) =>
      def.styles.map((s) => ({ add: () => addOpening(kind, s.id), type: kind, style: s.id, label: s.label, kind: def.label, words: `${def.label} ${s.label} ${s.name ?? ''}`.toLowerCase() })),
    ),
  ];
  const search = h('input', { type: 'search', class: 'search', placeholder: 'Search: sofa, sink, lamp…', 'aria-label': 'Search furniture', autocomplete: 'off' });
  const results = h('div', { class: 'designs designs--results', role: 'group', 'aria-label': 'Search results', hidden: true });
  const browse = h('div', { class: 'browse' }, roomTabs.el, Object.values(setBlocks));
  function runSearch() {
    const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    results.hidden = !words.length;
    browse.hidden = Boolean(words.length);
    if (!words.length) return;
    furniture.close();
    const hits = designIndex.filter((d) => words.every((w) => d.words.includes(w)));
    results.replaceChildren(
      ...(hits.length
        ? hits.slice(0, 40).map((d) =>
            h(
              'button',
              { type: 'button', class: 'design-btn', title: `Add ${noun(d.kind)}: ${d.label}`, onclick: d.add },
              h('span', { html: designIcon(d.type, d.style) }),
              h('span', {}, d.label),
              h('span', { class: 'design-btn__kind' }, d.kind),
            ),
          )
        : [h('p', { class: 'empty' }, `Nothing matches “${search.value.trim()}”. Try another word, or browse by category.`)]),
    );
  }
  search.addEventListener('input', runSearch);
  search.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !search.value) return;
    e.stopPropagation();
    search.value = '';
    runSearch();
  });

  // ---- In your plan: everything placed, grouped by the room it's for, each group folding away ----

  const CATEGORIES = [
    ['living', 'Living room'],
    ['kitchen', 'Kitchen'],
    ['bedroom', 'Bedroom'],
    ['bath', 'Bathroom'],
    ['any', 'Any room'],
  ];
  const categoryOf = (item) => CATALOG[item.type].room ?? 'living';
  let placedFilter = 'all';
  const placedFolded = new Set();
  const placedFilters = h('div', { class: 'pills', role: 'group', 'aria-label': 'Show' });
  const inventory = h('ol', { class: 'inventory' });
  const count = h('span', { class: 'section__meta' });
  let inventoryKey = '';
  const rerenderInventory = () => {
    inventoryKey = '';
    renderInventory(store.getState(), store.getUI());
  };
  function renderInventory(state, ui) {
    const selectedId = ui.sel?.type === 'item' ? ui.sel.id : null;
    // The selected piece's group unfolds, so it shows in the list.
    const picked = selectedId && state.items.find((i) => i.id === selectedId);
    if (picked) placedFolded.delete(categoryOf(picked));
    const key = JSON.stringify([selectedId, placedFilter, [...placedFolded], state.items.map((i) => [i.id, i.name, i.color, i.type, sizeText(i)])]);
    if (key === inventoryKey) return;
    inventoryKey = key;
    count.textContent = state.items.length ? `${state.items.length} ${state.items.length === 1 ? 'piece' : 'pieces'}` : '';
    const groups = CATEGORIES.map(([id, label]) => ({ id, label, items: state.items.filter((i) => categoryOf(i) === id) })).filter((g) => g.items.length);
    if (placedFilter !== 'all' && !groups.some((g) => g.id === placedFilter)) placedFilter = 'all';
    placedFilters.hidden = groups.length < 2;
    placedFilters.replaceChildren(
      ...[{ id: 'all', label: 'All', n: state.items.length }, ...groups.map((g) => ({ id: g.id, label: g.label, n: g.items.length }))].map((f) =>
        h(
          'button',
          {
            type: 'button',
            class: 'pill',
            'aria-pressed': String(placedFilter === f.id),
            onclick: () => {
              placedFilter = f.id;
              rerenderInventory();
            },
          },
          f.label,
          h('span', { class: 'pill__count' }, String(f.n)),
        ),
      ),
    );
    if (!state.items.length) {
      inventory.replaceChildren(
        h('li', { class: 'empty' }, 'Nothing placed yet. ', h('button', { type: 'button', class: 'btn btn--plain btn--small', onclick: () => showPane('add') }, 'Add furniture')),
      );
      return;
    }
    const row = (item) =>
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
      );
    inventory.replaceChildren(
      ...groups
        .filter((g) => placedFilter === 'all' || g.id === placedFilter)
        .flatMap((g) => {
          const open = !placedFolded.has(g.id);
          return [
            h(
              'li',
              { class: 'inventory__group' },
              h(
                'button',
                {
                  type: 'button',
                  'aria-expanded': String(open),
                  onclick: () => {
                    if (open) placedFolded.add(g.id);
                    else placedFolded.delete(g.id);
                    rerenderInventory();
                  },
                },
                h('span', { class: 'inventory__fold', html: icon(open ? 'chevronDown' : 'chevronRight') }),
                h('span', { class: 'inventory__name' }, g.label),
                h('span', { class: 'inventory__size' }, String(g.items.length)),
              ),
            ),
            ...(open ? g.items.map(row) : []),
          ];
        }),
    );
  }

  // ---- Design file: a menu at the top of the panel ----

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
  const menuItem = (label, iconName, onclick, extra = {}) =>
    h('button', { type: 'button', role: 'menuitem', ...extra, onclick: () => (closeFileMenu(), onclick()) }, h('span', { html: icon(iconName) }), label);
  const fileMenu = h(
    'div',
    { class: 'file-menu', role: 'menu', 'aria-label': 'Design file', hidden: true },
    menuItem('Save design file', 'save', saveDesign, { 'data-always': '' }),
    menuItem('Open design file', 'open', () => fileInput.click()),
    menuItem('Start over', 'restart', startOver, { class: 'is-danger' }),
    h('p', { class: 'note' }, 'Your design is also saved automatically in this browser.'),
  );
  const fileButton = h('button', {
    type: 'button',
    class: 'icon-btn',
    'aria-label': 'Design file',
    title: 'Save, open or start over',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'data-always': '',
    html: icon('dots'),
    onclick: () => (fileMenu.hidden ? openFileMenu() : closeFileMenu()),
  });
  function openFileMenu() {
    fileMenu.hidden = false;
    fileButton.setAttribute('aria-expanded', 'true');
    fileMenu.querySelector('button:not(:disabled)')?.focus();
  }
  function closeFileMenu() {
    fileMenu.hidden = true;
    fileButton.setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('pointerdown', (e) => {
    if (!fileMenu.hidden && !fileMenu.contains(e.target) && !fileButton.contains(e.target)) closeFileMenu();
  });
  fileMenu.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    closeFileMenu();
    fileButton.focus();
  });

  // ---- The panel: a rail of sections down its edge, one section shown at a time ----

  const PANES = [
    { id: 'rooms', label: 'Rooms', icon: 'paneRooms' },
    { id: 'add', label: 'Add', icon: 'paneAdd' },
    { id: 'placed', label: 'Placed', icon: 'panePlaced' },
    { id: 'style', label: 'Style', icon: 'paneStyle' },
  ];
  const PANE_KEY = 'room-planner:pane';
  let pane = 'rooms';
  try {
    const saved = localStorage.getItem(PANE_KEY);
    if (PANES.some((p) => p.id === saved)) pane = saved;
  } catch {
    // nothing remembered
  }
  const panes = {
    rooms: h(
      'section',
      { class: 'pane' },
      h('div', { class: 'pane__head' }, h('h2', {}, 'Rooms'), wallCount),
      h('button', { type: 'button', class: 'btn btn--tape btn--wide', onclick: () => draw.open() }, h('span', { html: icon('pencil') }), 'Draw walls'),
      h('p', { class: 'help' }, 'Draw the inside of a room, corner by corner, on a floor plan.'),
      h('h3', { class: 'pane__label' }, 'Or add a room by its inside size'),
      h(
        'div',
        { class: 'adder adder--room' },
        roomWidth.el,
        roomDepth.el,
        h('button', { type: 'button', class: 'btn', onclick: () => store.addRoom(next.width, next.depth) }, 'Add room'),
      ),
      h(
        'details',
        { class: 'more' },
        h('summary', {}, 'Add a single wall'),
        h('div', { class: 'adder' }, nextLength.el, h('button', { type: 'button', class: 'btn', onclick: () => store.addWall(next.length, view.focus()) }, 'Add wall')),
        addWallHelp,
      ),
      h('div', { class: 'pane__label-row' }, h('h3', { class: 'pane__label' }, 'Your rooms and walls'), several),
      wallList,
    ),
    add: h('section', { class: 'pane' }, h('div', { class: 'pane__head' }, h('h2', {}, 'Add')), search, results, browse),
    placed: h('section', { class: 'pane' }, h('div', { class: 'pane__head' }, h('h2', {}, 'In your plan'), count), placedFilters, h('div', { 'data-always': '' }, inventory)),
    style: h(
      'section',
      { class: 'pane' },
      h('div', { class: 'pane__head' }, h('h2', {}, 'Floor and walls')),
      h('div', { class: 'field-row field-row--first' }, wallHeight.el, h('p', { class: 'help help--side' }, 'Sets every wall. Change one wall by selecting it.')),
      h('div', { class: 'field-row' }, h('span', { class: 'field-row__label' }, 'Floor pattern'), pattern.el),
      floor.el,
      walls.el,
    ),
  };
  const tabs = PANES.map((p) => {
    const tab = h(
      'button',
      { type: 'button', role: 'tab', id: `tab-${p.id}`, class: 'rail__tab', 'aria-controls': `pane-${p.id}`, onclick: () => showPane(p.id) },
      h('span', { html: icon(p.icon) }),
      h('span', { class: 'rail__label' }, p.label),
    );
    panes[p.id].id = `pane-${p.id}`;
    panes[p.id].setAttribute('role', 'tabpanel');
    panes[p.id].setAttribute('aria-labelledby', `tab-${p.id}`);
    return tab;
  });
  const rail = h('nav', { class: 'rail', role: 'tablist', 'aria-label': 'Panel sections', 'aria-orientation': 'vertical', 'data-always': '' }, tabs);
  // Arrow keys move between the sections, as in any list of tabs.
  rail.addEventListener('keydown', (e) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const k = (PANES.findIndex((p) => p.id === pane) + step + PANES.length) % PANES.length;
    showPane(PANES[k].id);
    tabs[k].focus();
  });
  function showPane(id) {
    pane = id;
    try {
      localStorage.setItem(PANE_KEY, id);
    } catch {
      // private browsing: just don't remember it
    }
    furniture.close();
    PANES.forEach((p, k) => {
      tabs[k].setAttribute('aria-selected', String(p.id === id));
      tabs[k].tabIndex = p.id === id ? 0 : -1;
      panes[p.id].hidden = p.id !== id;
    });
    if (id === 'add' && matchMedia('(min-width: 821px)').matches) search.focus({ preventScroll: true });
  }

  panel.append(
    rail,
    h(
      'div',
      { class: 'panel__body' },
      h('header', { class: 'brand panel__head' }, h('h1', {}, 'Room planner'), fileButton, fileMenu),
      Object.values(panes),
      fileInput,
    ),
  );
  showPane(pane);

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

  // Locked: look around and select things, but nothing can be moved, added or changed.
  const lock = h('button', {
    type: 'button',
    class: 'lock',
    title: 'Lock the design so nothing moves or changes by accident',
    onclick: () => {
      furniture.close();
      store.setLocked(!store.getUI().locked);
    },
  });
  syncers.push(() => {
    const { locked } = store.getUI();
    lock.setAttribute('aria-pressed', String(locked));
    lock.innerHTML = `${icon(locked ? 'lock' : 'unlock')}<span>${locked ? 'Locked' : 'Lock'}</span>`;
  });

  // Measure: click two points in the view to see the distance between them. It changes nothing, so it
  // works while locked too.
  const measure = h('button', {
    type: 'button',
    class: 'tool',
    'data-always': '',
    title: 'Measure the distance between two points (M)',
    html: `${icon('measure')}<span>Measure</span>`,
    onclick: () => {
      furniture.close();
      store.setMeasuring(!store.getUI().measuring);
    },
  });
  const clearMeasures = h('button', { type: 'button', class: 'tool', 'data-always': '', onclick: () => view.clearMeasures() }, 'Clear');
  syncers.push(() => {
    const { measuring } = store.getUI();
    measure.setAttribute('aria-pressed', String(measuring));
    clearMeasures.hidden = !measuring;
  });

  // Undo and redo: every change to the design, one drag or one run of typing at a time.
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const undoBtn = h('button', { type: 'button', 'aria-label': 'Undo', title: `Undo (${mac ? '⌘Z' : 'Ctrl+Z'})`, html: icon('undo'), onclick: () => store.undo() });
  const redoBtn = h('button', { type: 'button', 'aria-label': 'Redo', title: `Redo (${mac ? '⇧⌘Z' : 'Ctrl+Y'})`, html: icon('redo'), onclick: () => store.redo() });
  syncers.push(() => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
  });

  document.getElementById('viewbar').append(
    h('div', { class: 'segmented segmented--stage history', role: 'group', 'aria-label': 'History' }, undoBtn, redoBtn),
    h(
      'div',
      { class: 'segmented segmented--stage', role: 'group', 'aria-label': 'Camera' },
      h('button', { type: 'button', onclick: () => view.setView('overview') }, '3D view'),
      h('button', { type: 'button', onclick: () => view.setView('top') }, 'Top view'),
      h('button', { type: 'button', onclick: () => view.setView('eye') }, 'Eye level'),
    ),
    seeThrough,
    lock,
    measure,
    clearMeasures,
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
  const hint = document.querySelector('.hint');
  syncers.push(() => {
    const { locked, measuring } = store.getUI();
    hint.textContent = measuring
      ? 'Measuring: click two points to see the distance between them. Points snap to the corners and faces of walls, doors, windows and furniture; hold Shift for a straight line. Backspace removes the last one, Esc stops.'
      : locked
        ? 'Locked: look around and click things to see their measurements. Nothing can be moved or changed.'
        : `Drag walls, doors, windows and furniture to move them; hold Ctrl (or ${mac ? '⌥' : 'Alt'}) while dragging furniture to take it through walls. Drag empty space to look around. Scroll or pinch to zoom.`;
  });
  const lockNote = h('p', { class: 'lock-note' }, 'Locked. Unlock to make changes.');

  // A tab on each edge of the view hides or shows that side panel, and the view grows into the space.
  const app = document.querySelector('.app');
  const edgeTab = (side) =>
    h('button', {
      type: 'button',
      class: `edge-toggle edge-toggle--${side}`,
      'aria-controls': side === 'left' ? 'panel' : 'inspector',
      onclick: () => store.setPanel(side, !store.getUI()[`${side}Open`]),
    });
  const leftTab = edgeTab('left');
  const rightTab = edgeTab('right');
  app.append(leftTab, rightTab);
  // On narrow screens the panels stack under the view and always show.
  const stacked = matchMedia('(max-width: 820px)');
  const syncPanels = () => {
    const { leftOpen, rightOpen, sel } = store.getUI();
    app.classList.toggle('is-left-closed', !leftOpen);
    app.classList.toggle('is-right-closed', !rightOpen);
    panel.inert = !leftOpen && !stacked.matches;
    inspector.inert = !rightOpen && !stacked.matches;
    const label = (open, what, key) => `${open ? 'Hide' : 'Show'} ${what} (${key})`;
    leftTab.setAttribute('aria-expanded', String(leftOpen));
    leftTab.title = label(leftOpen, 'the side panel', '[');
    leftTab.setAttribute('aria-label', leftTab.title);
    leftTab.innerHTML = icon(leftOpen ? 'chevronLeft' : 'chevronRight');
    rightTab.setAttribute('aria-expanded', String(rightOpen));
    rightTab.title = label(rightOpen, 'the details panel', ']');
    rightTab.setAttribute('aria-label', rightTab.title);
    rightTab.innerHTML = icon(rightOpen ? 'chevronRight' : 'chevronLeft');
    // With the details panel hidden, a dot on its tab says there's something selected to see.
    rightTab.classList.toggle('has-details', !rightOpen && Boolean(sel));
  };
  syncers.push(syncPanels);
  stacked.addEventListener('change', syncPanels);

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
    inspector.classList.toggle('is-empty', !ui.sel && !ui.drawing);
    if (ui.locked && ui.sel) inspector.prepend(lockNote);
    else lockNote.remove();
    applyLock(panel, ui.locked || ui.drawing);
    applyLock(inspector, ui.locked || ui.drawing);
    document.querySelector('.app').classList.toggle('is-drawing', ui.drawing);
  });

  bindShortcuts(view);
}

// The inspector is rebuilt only when what it shows changes; values in between update in place.
function inspectorKeyFor(state, ui) {
  if (ui.drawing) return 'drawing';
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
  if (sel.type === 'opening') {
    const o = store.openingById(sel.id);
    return o ? `opening:${o.id}:${o.style}:${o.wall}` : 'none';
  }
  return `walls:${sel.ids.join()}`;
}

function buildInspector(root, state, ui) {
  root.replaceChildren();
  if (ui.drawing) return buildDrawHelp(root);
  const sel = ui.sel;
  if (sel?.type === 'item') {
    const item = state.items.find((i) => i.id === sel.id);
    if (item) return buildItemInspector(root, item);
  }
  if (sel?.type === 'wall' && store.wallById(sel.id)) return buildWallInspector(root, sel.id);
  if (sel?.type === 'group' && state.groups.some((g) => g.id === sel.id)) return buildGroupInspector(root, sel.id);
  if (sel?.type === 'walls') return buildWallsInspector(root, sel.ids);
  if (sel?.type === 'opening' && store.openingById(sel.id)) return buildOpeningInspector(root, sel.id);
  return buildHelp(root);
}

function buildDrawHelp(root) {
  root.append(
    h(
      'div',
      { class: 'inspector__empty' },
      h('h2', { class: 'inspector__title' }, 'Drawing walls'),
      h(
        'ul',
        { class: 'tips' },
        h('li', {}, 'Click on the plan to start a wall, then click at each corner. Each click ends one wall and starts the next.'),
        h('li', {}, 'To end a line, click its last corner again, press Enter, or use Finish line. Clicking where the line started closes the room.'),
        h('li', {}, 'Corners snap to the ends of other walls, to points along them, and to the 10 cm grid. Walls snap to straight and 45° directions. Hold Alt to place freely.'),
        h('li', {}, 'While drawing a wall, type its length and press Enter.'),
        h('li', {}, 'Draw along the inside of the room. The walls go outside your lines, so the room keeps the size you draw.'),
        h('li', {}, 'Set the thickness and height above the plan before drawing; they apply to the walls you draw next.'),
        h('li', {}, 'Done adds the new walls and selects them, ready to group. Cancel throws them away.'),
      ),
      h(
        'dl',
        { class: 'keys' },
        [
          ['Click', 'Place a corner'],
          ['Drag', 'Move around the plan'],
          ['Scroll or pinch', 'Zoom'],
          ['Numbers, Enter', 'Exact length'],
          ['Enter or Esc', 'End the line'],
          ['Backspace', 'Undo the last wall'],
        ].map(([key, what]) => [h('dt', {}, key), h('dd', {}, what)]),
      ),
    ),
  );
  return [];
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
        h('li', {}, 'Lengths and room sizes are measured on the inside, wall face to wall face, the way you’d measure with a tape. Walls get thicker away from the room.'),
        h('li', {}, 'Drag a wall to move it. Its ends connect to nearby walls.'),
        h('li', {}, 'Select a wall and drag the round handles at its ends to stretch or turn it. Walls joined there move with it.'),
        h('li', {}, 'Shift-click several walls and group them to move them as one. Click a grouped wall again to edit just that wall.'),
        h('li', {}, 'The quickest way to lay out a room or a whole apartment is Draw walls: click its corners on a floor plan.'),
        h('li', {}, 'The floor fills in wherever walls enclose a space.'),
        h('li', {}, 'Add doors and windows from Add → Doors & windows in the side panel, then drag them along a wall or onto another one.'),
        h('li', {}, 'Lock, above the view, keeps everything in place while you look around and check measurements.'),
        h('li', {}, 'Furniture stops at walls when you drag it. To take a piece through a wall, into the next room say, hold Ctrl while you drag it; let go where it fits.'),
        h('li', {}, 'Select a wall to see the gap from each of its free ends to the next wall. Measure, above the view, measures between any two points.'),
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
          ['Ctrl/Cmd + Z', 'Undo'],
          ['Shift + Ctrl/Cmd + Z', 'Redo'],
          ['[ and ]', 'Hide or show the side panels'],
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
    measureField({ label: 'Length', min: LIMITS.length[0], max: LIMITS.length[1], live: false, get: () => insideLengthOf(wall(), store.getState().walls), set: (v) => store.setWallLength(id, v) }),
    measureField({ label: 'Thickness', min: LIMITS.thickness[0], max: LIMITS.thickness[1], get: () => wall().thickness, set: (v) => update({ thickness: v }) }),
    measureField({ label: 'Angle', unit: '°', min: 0, max: 359, live: false, get: () => angleOf(wall()), set: (v) => store.setWallAngle(id, v) }),
    measureField({ label: 'Height', min: () => wall().gap + 20, max: LIMITS.height[1], get: () => wall().height, set: (v) => update({ height: v }) }),
    measureField({ label: 'Gap below', min: 0, max: () => wall().height - 20, get: () => wall().gap, set: (v) => update({ gap: v }) }),
    measureField({ label: 'Bulge', min: () => -maxCurve(wall()), max: () => maxCurve(wall()), get: () => wall().curve, set: (v) => update({ curve: v }) }),
  ];
  const color = swatches({ label: 'Color', palette: WALL_PAINTS, get: () => wall().color, set: (v) => update({ color: v }) });
  syncers.push(...fields.map((f) => f.sync), color.sync);

  // Which face the length is measured on, and the other face's length.
  const measuredOn = h('p', { class: 'readout readout--wall' });
  // A wall with no room on one side (between two rooms, or on its own): which face stays put when
  // its thickness changes, named as the faces look in the top view.
  const keepLabels = () => {
    const { nl } = facesOf(wall(), store.getState().walls);
    const across = Math.abs(nl.x) > Math.abs(nl.z);
    const [leftName, rightName] = across ? (nl.x < 0 ? ['Left', 'Right'] : ['Right', 'Left']) : nl.z < 0 ? ['Top', 'Bottom'] : ['Bottom', 'Top'];
    return { left: leftName, right: rightName };
  };
  const keepOptions = () => {
    const names = keepLabels();
    const options = [
      { id: 'left', label: names.left },
      { id: 'middle', label: 'Middle' },
      { id: 'right', label: names.right },
    ];
    return names.left === 'Right' || names.left === 'Bottom' ? options.reverse() : options;
  };
  const keep = segmented({
    label: 'Keep in place when the thickness changes',
    options: keepOptions(),
    get: () => wall().keep ?? 'middle',
    set: (v) => update({ keep: v === 'middle' ? undefined : v }),
  });
  const keepRow = h('div', { class: 'field-row field-row--stack' }, h('span', { class: 'field-row__label' }, 'When the thickness changes, keep this face in place'), keep.el);
  syncers.push(keep.sync, () => {
    const walls = store.getState().walls;
    const w = wall();
    const f = facesOf(w, walls);
    const other = Math.round(f.side ? (f.side === 1 ? f.right : f.left).reduce((a, b) => b - a) : Math.max(f.left[1] - f.left[0], f.right[1] - f.right[0]));
    if (w.curve) measuredOn.textContent = 'Measured along the curve.';
    else if (f.side) measuredOn.textContent = `Measured inside the room, wall face to wall face. Outside face: ${other} cm.`;
    else measuredOn.textContent = `Measured along its shorter face; the other face is ${other} cm.`;
    keepRow.hidden = Boolean(f.side || w.curve);
  });

  root.append(panelHead(h('h2', { class: 'inspector__title' }, w0.name), group ? `Part of ${group.name}` : 'Not in a group', () => store.clearSelection()));
  if (group) {
    root.append(
      h(
        'div',
        { class: 'inspector__group' },
        h(
          'div',
          { class: 'presets' },
          h('button', { type: 'button', class: 'preset', 'data-always': '', onclick: () => store.selectGroup(group.id) }, `Select all of ${group.name}`),
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
      measuredOn,
      keepRow,
      h('div', { class: 'measures measures--gap' }, fields.slice(3).map((f) => f.el)),
      h(
        'p',
        { class: 'help' },
        'Length moves the wall’s end; a wall joined there moves along with it, so a room stays square. Thickness grows away from the room. Angle turns the wall about its start. A gap below turns the wall into a beam over an opening. Bulge curves the wall; a negative number curves it the other way.',
      ),
    ),
    h('div', { class: 'inspector__group' }, color.el),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Doors and windows'), wallOpenings(w0)),
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

// The doors and windows in a wall, as buttons that select them.
function wallOpenings(w) {
  if (!takesOpenings(w)) return h('p', { class: 'help help--first' }, 'Curved walls and beams can’t have doors or windows.');
  const list = store.getState().openings.filter((o) => o.wall === w.id);
  return [
    list.length
      ? h(
          'div',
          { class: 'presets' },
          list.map((o) => h('button', { type: 'button', class: 'preset', 'data-always': '', onclick: () => store.selectOpening(o.id) }, `${o.name}, ${o.width} cm`)),
        )
      : null,
    h('p', { class: 'help help--first' }, list.length ? 'Pick one to change it.' : 'None yet. While this wall is selected, Door or Window under Add → Doors & windows adds one here.'),
  ];
}

function buildOpeningInspector(root, id) {
  const syncers = [];
  const current = () => store.openingById(id);
  const o0 = current();
  const def = OPENINGS[o0.kind];
  const style = openingStyleOf(o0);
  const wall = () => store.wallById(current().wall);
  const update = (patch) => store.updateOpening(id, patch);
  const limit = (key, i) => () => openingLimitsOf(current())[key][i];

  const designs = h(
    'div',
    { class: 'designs', role: 'group', 'aria-label': 'Design' },
    def.styles.map((s) =>
      h(
        'button',
        { type: 'button', class: 'design-btn', 'aria-pressed': String(s.id === style.id), onclick: () => update({ style: s.id }) },
        h('span', { html: designIcon(o0.kind, s.id) }),
        s.label,
      ),
    ),
  );

  const size = [
    measureField({ label: 'Width', min: limit('width', 0), max: limit('width', 1), get: () => current().width, set: (v) => update({ width: v }) }),
    measureField({ label: 'Height', min: limit('height', 0), max: limit('height', 1), get: () => current().height, set: (v) => update({ height: v }) }),
  ];
  if (o0.kind === 'window') {
    size.push(measureField({ label: 'Above floor', min: limit('sill', 0), max: limit('sill', 1), get: () => current().sill, set: (v) => update({ sill: v }) }));
  }
  // Position: from the inside corner at the wall's start to the near edge of the opening.
  const face = () => facesOf(wall(), store.getState().walls).inside;
  const fromCorner = measureField({
    label: 'From corner',
    min: 0,
    max: () => Math.max(0, Math.round(face().length - openingSpan(current(), wall()).width)),
    live: false,
    get: () => openingSpan(current(), wall()).a - face().from,
    set: (v) => store.slideOpening(id, v + face().from + openingSpan(current(), wall()).width / 2),
  });
  syncers.push(...size.map((f) => f.sync), fromCorner.sync);

  // Doors with leaves: which side the hinges are on, and which way the door opens.
  const toggles = [];
  if (o0.kind === 'door' && (style.id === 'single' || style.id === 'double')) {
    const options = style.id === 'single' ? [['flip', 'Hinges on the right'], ['swap', 'Opens to the other side']] : [['swap', 'Opens to the other side']];
    for (const [key, label] of options) {
      const box = h('input', { type: 'checkbox' });
      box.addEventListener('change', () => update({ [key]: box.checked }));
      syncers.push(() => {
        box.checked = current()[key];
      });
      toggles.push(h('label', { class: 'check' }, box, label));
    }
  }

  const colors = def.colors.map((slot) => {
    const picker = swatches({ label: slot.label, palette: slot.palette, get: () => current()[slot.key], set: (v) => update({ [slot.key]: v }) });
    syncers.push(picker.sync);
    return picker.el;
  });

  const host = wall();
  root.append(
    panelHead(h('h2', { class: 'inspector__title' }, o0.name), null, () => store.clearSelection()),
    h(
      'div',
      { class: 'inspector__group' },
      h('div', { class: 'presets' }, h('button', { type: 'button', class: 'preset', 'data-always': '', onclick: () => store.selectWall(host.id) }, `In ${host.name}`)),
      takesOpenings(host) ? null : h('p', { class: 'help help--first' }, `Hidden while ${host.name} is curved or has a gap below. Straighten it to show this ${noun(def.label)}.`),
    ),
    h('div', { class: 'inspector__group' }, h('h3', {}, 'Design'), designs),
    h(
      'div',
      { class: 'inspector__group' },
      h('h3', {}, 'Size and position'),
      h('div', { class: 'measures' }, size.map((f) => f.el), o0.kind === 'door' ? fromCorner.el : null),
      o0.kind === 'window' ? h('div', { class: 'measures measures--gap' }, fromCorner.el) : null,
      toggles,
      h('p', { class: 'help' }, 'Drag it along the wall, or onto another wall. The view shows how far it is from each end of the wall.'),
    ),
    h('div', { class: 'inspector__group' }, colors),
    h(
      'div',
      { class: 'inspector__actions' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          onclick: () => {
            if (store.duplicateOpening(id) === false) say('No wall has room for a copy.');
          },
        },
        'Duplicate',
      ),
      h('button', { type: 'button', class: 'btn btn--danger', onclick: () => store.removeOpening(id) }, 'Remove'),
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
        members.map((w) => h('button', { type: 'button', class: 'preset', 'data-always': '', onclick: () => store.selectWall(w.id) }, `${w.name}, ${wallText(w)}`)),
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
    sizeFields = [h('div', { class: keys.length === 3 ? 'measures' : 'measures measures--two' }, fields.map((f) => f.el))];
    // Wall-mounted pieces (a mirror cabinet, a shower head) also have their height above the floor.
    if (isOnWall(item)) {
      const mount = measureField({
        label: 'Above floor',
        min: limit('mount', 0),
        max: limit('mount', 1),
        get: () => current().mount,
        set: (v) => update({ mount: v }),
      });
      syncers.push(mount.sync);
      sizeFields.push(h('div', { class: 'measures measures--gap' }, mount.el));
    }
  }

  // Some designs come either way round: a corner sofa's chaise, a corner desk's return.
  let flip = null;
  if (style.flip) {
    const box = h('input', { type: 'checkbox' });
    box.addEventListener('change', () => update({ flip: box.checked }));
    syncers.push(() => {
      box.checked = current().flip;
    });
    flip = h('label', { class: 'check' }, box, style.flip);
  }

  // Layout: how many drawers and cupboards (each a row of choices), and where the sink sits.
  const layoutRows = (def.options ?? []).map((opt) => {
    const choice = segmented({
      label: opt.label,
      options: opt.values.map((v) => ({ id: v, label: v === 0 ? 'None' : String(v) })),
      get: () => current()[opt.key],
      set: (v) => update({ [opt.key]: v }),
    });
    const row = h('div', { class: 'field-row field-row--choice' }, h('span', { class: 'field-row__label' }, opt.label), choice.el);
    syncers.push(choice.sync, () => {
      row.hidden = opt.when ? !opt.when(current()) : false;
    });
    return row;
  });
  let sinkField = null;
  if (style.sink) {
    const half = style.sink / 2;
    const field = measureField({
      label: 'Sink position',
      min: half + 3,
      max: () => current().w - half - 3,
      get: () => current().sink,
      set: (v) => update({ sink: v }),
    });
    syncers.push(field.sync);
    sinkField = [h('div', { class: 'measures measures--gap' }, field.el), h('p', { class: 'help' }, 'From the left end of the counter, as you face it, to the middle of the sink. You can also drag the sink along the counter.')];
  }
  const layout = layoutRows.length ? h('div', { class: 'inspector__group' }, h('h3', {}, 'Layout'), layoutRows, flip, sinkField) : null;
  if (layout) flip = null; // shown with the layout instead of under the size

  // Colors
  const colorPickers = colorsOf(item).map((slot) => {
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
    layout,
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

function bindShortcuts(view) {
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const { sel, several, drawing, measuring, leftOpen, rightOpen } = store.getUI();
    if ((e.key === '[' || e.key === ']') && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (e.key === '[') store.setPanel('left', !leftOpen);
      else store.setPanel('right', !rightOpen);
      return;
    }
    if (drawing) return; // the drawing tool has its own keys
    const plainKey = !e.metaKey && !e.ctrlKey && !e.altKey;
    if ((e.key === 'm' || e.key === 'M') && plainKey) {
      store.setMeasuring(!measuring);
      return;
    }
    if (measuring) {
      if (e.key === 'Escape') {
        if (!view.cancelMeasure()) store.setMeasuring(false);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        view.undoMeasure();
      } else return;
      e.preventDefault();
      return;
    }
    const undoKey = (e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z');
    if ((undoKey && e.shiftKey) || (e.ctrlKey && (e.key === 'y' || e.key === 'Y'))) {
      e.preventDefault();
      store.redo();
      return;
    }
    if (undoKey) {
      e.preventDefault();
      store.undo();
      return;
    }
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

    if (sel?.type === 'opening') {
      const o = store.openingById(sel.id);
      const along = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
      if (e.key === 'Delete' || e.key === 'Backspace') store.removeOpening(o.id);
      else if (along[e.key]) store.slideOpening(o.id, o.offset + along[e.key]);
      else if ((e.key === 'd' || e.key === 'D') && mod) store.duplicateOpening(o.id);
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
