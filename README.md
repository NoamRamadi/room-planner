# Room planner

Plan a room of your apartment in 3D, right in the browser.

- **Draw walls** on a flat floor plan with a grid: click the corners of a room or a whole apartment
- Or build the layout wall by wall: set each wall's length, then connect walls by dragging their ends together
- Group walls to move, turn and copy them as one unit (a room, a kitchen divider)
- Give any wall its own thickness, height, curve, color, or a gap below it (a beam over an opening)
- Put doors (single, double, sliding glass, open doorway) and windows (two panes, picture, grid, floor to ceiling) in the walls
- The floor fills in wherever walls enclose a space; choose its pattern (planks, tiles, plain) and color
- Add furniture in several designs, set each piece's size and colors, then drag it into place:
  - Sofa: classic, corner (with a chaise on either side), armless, Chesterfield
  - Table: rectangular, round, oval, slab legs
  - TV stand: cabinet, open shelves, floating, sideboard
  - TV: centre stand, feet, wall-mounted (at a height you set), curved
  - Carpet: bordered, round, striped, classic (Persian-style, with fringes), geometric, shaggy; in two colors of your choice
- Design a kitchen: kitchen cabinets (base cabinet, drawers, wall cabinet, tall pantry, open shelf), sink units (single, double, farmhouse), cooking (freestanding range, hob with oven, extractor hood, tall oven), fridges (single door, fridge-freezer, side by side, under-counter, retro), dishwashers (integrated, freestanding), kitchen islands (plain, with breakfast bar, island table) and bar stools (wooden, metal, with backrest)
- Design a bedroom: beds (upholstered, wooden, low platform, storage divan, four-poster, bunk bed), bedside tables (two drawers, drawer and shelf, floating, round), wardrobes (hinged doors, sliding doors, mirror doors, open clothes rail), chests of drawers (tall chest, wide dresser, dressing table with mirror), desks (writing desk, with drawers, corner desk), chairs (office chair, wooden chair, armchair), bookcases (open shelves, cube storage, ladder shelf), lamps (table, floor, arc) and baby cots (cot, bassinet)
- Add air conditioners (wall split unit, floor standing, portable, ceiling cassette, ducted vent, outdoor unit) curtains (open panels, closed, sheer, roller blind, Roman blind) and wall sockets (single, double, triple, with USB, waterproof, network / TV) to any room
- Design a bathroom: toilets (with cistern, wall-hung, bidet), sinks (pedestal, vanity, wall-hung, double, countertop bowl), showers (enclosure, curved corner, walk-in, shower cabin, shower head), bathtubs (built-in, freestanding, with shower screen), washing machines (front-loading, top-loading, washer and dryer) and bathroom cabinets (tall, mirror cabinet, open shelves)
- See each piece's size and its distance to every wall while it's selected
- Switch between 3D view, top view (floor plan) and eye level, and save a photo of the view
- Turn **See-through walls** on to cut away walls that stand between you and the room, or off to keep every wall standing
- **Lock** the design when you're done, so you can look around and check measurements without moving anything by accident
- **Undo and redo** any change: the arrows at the start of the bar above the view, or Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z

Your design is saved automatically in the browser. Use **Save design file** / **Open design file** to move it to another computer or share it.

## Run it

Needs [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

To try it on your phone or tablet on the same Wi-Fi, start it with `npm run dev -- --host` and open the network address it prints.

## Live site

**https://noamramadi.github.io/room-planner/**

The site is published with GitHub Pages. Every push to the `main` branch rebuilds it and publishes the new version within a couple of minutes (see the **Actions** tab on GitHub; the workflow is in `.github/workflows/deploy.yml`).

To publish a change:

```bash
git add -A
git commit -m "Describe the change"
git push
```

`npm run build` also creates a `dist/` folder of plain static files that works on any other static host.

## Measuring from the inside

Every length you type or see is measured the way you'd measure a room with a tape: on the inside, from wall face to wall face. A room added as 350 × 400 has exactly 350 × 400 of clear floor, whatever the walls' thickness; the walls are built around it. A wall's **Length** is its inside face, corner to corner, and its panel also shows the outside face. A wall between two rooms (or standing on its own) is measured along its shorter face.

Changing a wall's thickness keeps the face on the room side where it is, so the room never shrinks; the walls joined to it are trimmed or extended to meet it. For a wall between two rooms you choose which face stays put (**Top**, **Middle** or **Bottom**, or **Left** / **Right**, as seen from above). The overall size shown around the plan is the outside size. Designs made before this keep their walls where they were and show their true inside sizes; to fix a room, type the inside length into each wall.

## Drawing walls

Click **Draw walls** at the top of the Walls panel to swap the 3D view for a floor plan seen from above, on a grid of squares (the corner of the plan says how big a square is; it gets finer as you zoom in). Your existing walls show in grey, with gaps for doors and windows.

- **Draw:** click to start a wall, then click at each corner; every click ends one wall and starts the next. Draw along the inside of the room: the walls go outside your lines, so the room keeps the size you draw.
- **End a line:** click its last corner again (a double-click), press Enter or Esc, or use **Finish line**. Clicking where the line started closes the room.
- **Snapping:** corners snap to the ends of other walls, onto other walls (at whole centimetres), and to a 10 cm grid; walls snap to straight and 45° directions, with a guide line. Hold Alt to place a corner freely.
- **Exact lengths:** while drawing a wall, type its length (for example `350`) and press Enter.
- **Thickness and height:** set them in the toolbar; they apply to the walls you draw next.
- **Move around:** drag to pan, scroll or pinch to zoom. **Undo** or Backspace removes the last wall.
- **Done** adds the new walls and takes you back to the 3D view with them selected, ready to group. **Cancel** throws them away.

## Building walls

- **Add wall:** set the inside length and click **Add wall**. With a wall selected, the new wall continues from that wall's end, turned 90°, so four walls in a row make a closed room with exactly the inside sizes you typed. With nothing selected, it appears in the middle of the view.
- **Add room:** set the inside width and length and click **Add room** for four walls at once, already grouped.
- **Connect walls:** drag a wall. When one of its ends comes within 20 cm of another wall's end (or the middle of a straight wall), it snaps on and a yellow ring shows the connection.
- **Stretch or turn a wall:** select it and drag the round handle at either end. Every wall joined at that corner moves with it. You can also type the length and angle in the panel; a new length moves the next wall along with the end, so a rectangular room stays rectangular.
- **One wall's details:** thickness, height, **gap below** (for a beam over an opening), **bulge** (a curved wall), and color.
- **Group walls:** Shift-click walls (or turn on **Select several**), then **Group these walls** or press Ctrl/Cmd+G. Clicking a grouped wall selects the whole group; click it again to edit just that wall. Groups can be renamed, turned, duplicated, ungrouped or removed.
- **Floor:** filled automatically wherever walls enclose a space. A room with one open side gets its floor from the outline of its walls.

Furniture can't pass through walls (it slides along them) but fits under beams.

## Doors and windows

Under **Add furniture → Doors & windows**, click **Door** or **Window** and pick a design. It goes in the selected wall, or in a wall with room for it. Drag it along its wall or onto another wall; while it's selected, the view shows its size and its distance from each inside corner of the wall. In its panel you can set the width, height, how high a window starts above the floor, its distance from the inside corner, which side a door's hinges are on and which way it opens, and the colors. Doors show their swing on the floor. Doors and windows go in straight walls that stand on the floor (not curved walls or beams), and they move, turn, copy and disappear with their wall.

## Lock

**Lock**, above the view, freezes the design: you can still turn the view, switch views, select things to see their measurements, and save a photo or the design file, but nothing can be moved, added, removed or changed until you click **Locked** again. The lock is remembered the next time you open the app.

## Furniture designs

Under **Add furniture**, pick **Living**, **Kitchen**, **Bedroom**, **Bathroom** or **Any room**, click a type and pick a design from the menu. To change a piece's design later, select it and pick another under **Design**; its size is kept wherever the new design allows. Each design has its own size presets. A round table has a single size, its diameter. A wall-mounted TV has a height above the floor. A corner sofa can have its chaise on the left, and a corner desk its return on the right.

Bathroom pieces find their own place: toilets, sinks, washing machines and cabinets line up along a wall, showers and bathtubs go into corners, a mirror cabinet hangs over the sink, and none of them block a door (tall ones stay clear of windows too). A mirror cabinet and a shower head hang on the wall at a height you set (**Above floor**).

Kitchen pieces line up the same way, side by side along a wall, so adding a few base cabinets, a sink unit, a hob and a dishwasher makes a kitchen run. Wall cabinets hang over the base units, an extractor hood over the cooker, each taking the width of the unit below it; tall pieces (fridges, pantries, oven towers) keep clear of hanging cabinets and windows. A kitchen island goes in the middle of the floor and bar stools line up along its front, facing it. Cabinets have separate **Fronts** and **Countertop** colors; appliances come in stainless steel, white, black, graphite or cream.

In the bedroom, a bed goes against a wall with room left either side, bedside tables go on each side of it, and a table lamp goes on a bedside table without one (then on a desk or chest of drawers), lifted to its top. A desk chair goes in front of the desk facing it; armchairs, floor lamps and corner desks go into corners. A bed's colors are its frame or headboard and its **Bedding**.

A new curtain or blind goes over the first window that doesn't have one, sized to it: curtains from just above the window down to the floor and 20 cm wider on each side, blinds just around the window. Furniture can stand in front of curtains, and a curtain is cut away together with its wall. A wall split air conditioner hangs high on a wall clear of windows and doors, a ceiling cassette in the middle of the ceiling, and a floor-standing one in a corner. Wall sockets go along a wall at the height you pick (**Low · 30 cm**, **Desk · 80 cm**, **Counter · 110 cm**, or any height under **Above floor**); like curtains, furniture can stand in front of them.

Carpets lie flat on the floor: furniture can stand on them, and carpets and furniture never push each other out of the way (walls still stop a carpet). A carpet's pattern is drawn at its real size in its **Main** and **Pattern** colors, and its presets include a runner. Designs saved by earlier versions open as a group of walls.

## Controls

| Action | How |
| --- | --- |
| Move a wall, group or piece of furniture | Drag it, or select it and use the arrow keys (Shift: 10 cm steps) |
| Look around | Drag empty space; scroll or pinch to zoom; right-drag to pan |
| Turn | R turns right 90°, Shift+R turns left, or use the turn buttons |
| Remove | Delete, or the Remove button |
| Duplicate | Ctrl/Cmd+D, or the Duplicate button |
| Deselect | Esc, or click empty space |
| Select several walls | Shift-click (or Select several), then group with Ctrl/Cmd+G; ungroup with Ctrl/Cmd+Shift+G |
| Undo / redo | The arrows above the view, Ctrl/Cmd+Z, and Shift+Ctrl/Cmd+Z (or Ctrl+Y). A whole drag, or a run of typing in one field, is one step; the last 100 steps are kept while the page is open |
| Hide or show the side panels | The tabs on the left and right edges of the view, or `[` and `]` (on phones the panels stay below the view) |

## Code

| File | What it does |
| --- | --- |
| `src/catalog.js` | Furniture types: default sizes, color palettes, size presets and the 3D models |
| `src/draw.js` | The wall drawing tool: the floor plan, grid, snapping and its toolbar |
| `src/dom.js` | Small helpers for building the panels (elements, measuring-tape number fields) |
| `src/walls.js` | Wall geometry: curved walls, mitred corners, snapping, the floor from enclosed areas, walls around doors and windows |
| `src/openings.js` | Doors and windows: designs, sizes and 3D models |
| `src/layout.js` | Furniture placement: keeping pieces out of walls, placing new pieces (along walls, in corners, hanging over other pieces, beside the bed, stools and chairs at the island or desk, lamps and TVs on furniture) |
| `src/state.js` | The design (walls, groups, furniture) and selection, saving to the browser, import/export |
| `src/scene.js` | The 3D view (three.js): walls, floor, furniture, camera views, dragging, measurements |
| `src/ui.js` | The side panels, buttons and keyboard shortcuts |
| `src/textures.js` | Floor plank and tile patterns |

To add a new kind of furniture, add an entry to `CATALOG` in `src/catalog.js` with its defaults, limits, presets, color slots and a `build` function.
