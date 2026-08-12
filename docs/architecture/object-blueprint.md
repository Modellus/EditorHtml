# Object blueprint — building a new object from the existing blocks

The template for a new object, and the vocabulary it is allowed to use. A new object is **one JSON
document**: no JavaScript, no markup, no new file to wire up. It is compiled by `BlockCompiler`,
drawn by `BlockRenderer` and hosted by `ComponentShape`, exactly as the bundled objects are.

See [`building-blocks.md`](building-blocks.md) for why the layers look like this, and
[`building-blocks-catalogue.md`](building-blocks-catalogue.md) for the full property list of every
block named here — that file is generated from the live registry, so it is the reference; this one
is the recipe.

## 1. Where the document goes

| Destination | What to do | Who gets it |
| --- | --- | --- |
| Bundled with the editor | write `scripts/blocks/definitions/<type>.json`, then `UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js` | everyone, offline included |
| Published to the catalogue | paste the same document into **Assets → Objects** in [`pages/catalog`](../../pages/catalog) | anyone whose palette reads the catalogue |
| Invented on a board | the agent's `save_custom_component`, or **Copy definition** from a component's settings menu | the model that carries it |

The three are the same document. Every `.json` file in `definitions/` is registered at load time, so
nothing is added anywhere else — but for the same reason, do not leave a draft or a template file in
that directory: it would become a component in the palette.

## 2. The blueprint

```json
{
    "schemaVersion": "1.0.0",
    "type": "my-object",
    "category": "component",
    "displayName": "My object",
    "description": "One sentence, written for the person choosing it from the palette.",
    "icon": "fa-light fa-circle-notch",
    "tags": ["object", "…"],
    "capabilities": ["radial", "reads-model"],
    "preview": { "parameters": { "valueVariable": "64", "unit": "km/h" } },

    "parameters": [
        { "id": "valueVariable", "label": "Value variable", "valueType": "variable", "defaultValue": "0", "category": "model" },
        { "id": "maximum", "label": "Maximum", "valueType": "number", "defaultValue": 100, "category": "scale", "minimum": 0 },
        { "id": "unit", "label": "Unit", "valueType": "string", "defaultValue": "", "category": "display" },
        { "id": "showReadout", "label": "Show readout", "valueType": "boolean", "defaultValue": true, "category": "display" },
        { "id": "fillColor", "label": "Fill colour", "valueType": "colour", "defaultValue": "token:stroke.accent", "category": "style" }
    ],

    "locals": [
        { "id": "w", "value": { "parameter": "$width" } },
        { "id": "h", "value": { "parameter": "$height" } },
        { "id": "cx", "formula": "\\frac{w}{2}" },
        { "id": "cy", "formula": "\\frac{h}{2}" },
        { "id": "r", "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-4\\right)" },
        { "id": "value", "value": { "parameter": "valueVariable", "as": "number" } },
        { "id": "ratio", "formula": "\\max\\left(0,\\min\\left(1,\\frac{value}{maximum}\\right)\\right)" },
        { "id": "readoutText", "value": { "concat": [
            { "format": { "parameter": "value" }, "digits": 1 },
            { "choose": { "parameter": "unit" }, "then": { "concat": [" ", { "parameter": "unit" }] }, "otherwise": "" }
        ] } }
    ],

    "root": {
        "id": "my-object",
        "type": "group",
        "children": [
            {
                "id": "body",
                "type": "circle",
                "bindings": {
                    "centerX": { "parameter": "cx" },
                    "centerY": { "parameter": "cy" },
                    "radius": { "parameter": "r" },
                    "fill": { "parameter": "fillColor" }
                },
                "properties": { "stroke": "none" }
            },
            {
                "id": "readout",
                "type": "text",
                "when": { "parameter": "showReadout" },
                "bindings": {
                    "x": { "parameter": "cx" },
                    "y": { "parameter": "cy" },
                    "text": { "parameter": "readoutText" }
                }
            }
        ]
    }
}
```

Fill it in in that order — identity, parameters, locals, tree — because each section may only read
what the ones above it declare.

### Identity

`type` is `^[a-z][a-z0-9-]{2,48}$` and must not be a type the editor already ships: a document naming
a built-in is refused, deliberately, so a model cannot freeze a bundled object at an old version.
`category` is always `"component"`. Give it the tag **`object`** or it will not appear in the board's
Components palette. `preview.parameters` are the values the palette thumbnail and the catalogue
screenshot are drawn with — needed whenever the defaults draw nothing recognisable (a gauge reading
zero, a phasor of length one); a clock does not need it.

### Parameters — what the user edits

Each is `{ id, label, valueType, defaultValue, category }` plus any of `description`, `minimum`,
`maximum`, `enumValues`, `unit`, `required`, `bindable`, `agentAccessible`, `userEditable`,
`structured`, `termParameters`.

`valueType` is one of `number`, `string`, `boolean`, `colour`, `variable`, `expression`, `memory`,
`character`, `object`.

`category` decides where the editor puts the row:

| Category | Where it appears |
| --- | --- |
| `style` | the shape/colour menu |
| `model`, `orbits` | the variables menu |
| `state` | nowhere — what the object keeps for itself |
| anything else (`scale`, `display`, `general`, …) | the settings menu |

Two sets of names are free behaviour: declaring `minimumX`/`maximumX`/`minimumY`/`maximumY` gets the
shared `AxisRangeControl` rows instead of four number boxes, and adding `autoScale`/`equalScales`
gets the chart's own two switches. Naming colours `backgroundColor`, `dataAreaColor` and `axisColor`
gets the chart's colour menu.

**Parameter values live in `shape.properties`**, not in the document. That is what gives a new object
undo/redo, copy/paste, collaboration and serialization with nothing written for the purpose.

### Locals — what the object works out once

Evaluated in order onto the parameter frame before the tree compiles. `{ "id": …, "value": <binding> }`
or `{ "id": …, "formula": "<latex>" }`, with an optional `fallback` (default `0`).

**Nothing is implicit.** A formula may only read parameters and earlier locals; an undeclared name is
rejected at registration rather than falling through to a model term of that name. Reach the drawing
size, the iteration on screen or the player state by declaring a local bound to a reserved parameter:

| Reserved | Meaning |
| --- | --- |
| `$width`, `$height` | the object's box, so it scales on resize |
| `$iteration` | the iteration the board is showing |
| `$playing` | 1 while the player runs — a drawing that follows the pointer stops when it does |
| `$precision` | the decimals the model is read to |
| `$index`, `$count` | inside a `repeat`, which copy this is and how many there are |

Formulas are Modellus LaTeX, parsed by `Modellus.Parser` against this layer's own system, never the
model's — so a local named `pad` or `gap` never becomes a model variable. There is no `eval` anywhere
on this path.

### The tree — what is drawn

Two node shapes, and only `group` accepts `children`:

```json
{ "id": "…", "type": "<primitive>", "properties": {…}, "bindings": {…}, "modifiers": [], "behaviours": [], "children": [] }
{ "id": "…", "type": "<component>", "parameters": {…}, "modifiers": [], "behaviours": [] }
```

`properties` are constants, `bindings` are declarative values for the same names, and a binding always
wins. A child's `when` drops it before compilation, so a hidden part costs nothing and does not shift
its siblings' ids. A behaviour may carry a `when` too.

## 3. Drawing it instead of writing it

Geometry that is illustration rather than arithmetic does not have to be typed. Draw it, then convert
it with `BlockSvgImport.import(markup)` and paste the nodes into `root` — they are ordinary primitive
nodes, so nothing else about the document changes.

```js
const imported = BlockSvgImport.import(markup);
imported.problems     // every element, attribute or paint that was refused or is unsupported
imported.unmapped     // colours that matched no design token, so they will not follow a preset
imported.count        // how many nodes it costs, against the limit of 2 000
BlockSvgImport.merge(previousNodes, imported.nodes)   // re-import, keeping the wiring by id
```

Three rules follow:

* **Id the parts you will wire.** An id in the drawing becomes the node's id, and that is what a
  binding, a `when`, a modifier or a behaviour attaches to. Re-importing a redrawn file keeps the
  wiring on ids that survive, and tells you which ones did not.
* **Interaction lives outside the art.** Behaviours read the pointer in the object's own pixels, so a
  grab area belongs beside the group that scales the drawing, not inside it — see the compass.
* **Import illustration, keep measurement as blocks.** A drawing cannot put ticks on round numbers,
  hold a label legible at 80px, or move one part to make room for another. Those stay components.

Record where a drawing came from in `art`, so it can be imported again later:

```json
"art": { "rose": "art/compass-rose.svg", "needle": "art/compass-needle.svg" }
```

## 4. The vocabulary

### Primitives

`arc` · `circle` · `ellipse` · `group` · `image` · `line` · `path` · `polygon` · `polyline` ·
`rect` · `ring` · `text`

All of them carry `fill`, `stroke`, `strokeWidth`, `strokeDash`, `strokeLinecap`, `opacity`,
`visible`. `image` sources are restricted to `https:`, `data:image/` and relative paths; `path` data
is restricted to the path grammar.

### Modifiers

`translate` · `rotate` · `scale` · `mirror` · `opacity` · `visibility` · `stroke` · `fill` ·
`z-order` · `repeat` · `clip`

`repeat` is the one structural modifier: the compiler expands it first and exposes `$index` and
`$count` to bindings inside the repeated subtree. `clip` points only at a clip path the host drawing
declares; it is `agentAccessible: false`, which is why it is absent from the generated catalogue and
why an ordinary object has no use for it.

### Behaviours

| Behaviour | Reach for it when |
| --- | --- |
| `clickable` | a click writes a model variable or one of the object's own parameters |
| `drag-angle` | dragging a hand around a centre writes an angle back |
| `drag-rotate` | dragging a rim or a bezel turns it by the angle travelled, not to the pointer |
| `drag-axis-tick` | an axis tick rescales the axis |
| `follow-pointer` | the drawing shows what is under the cursor without keeping it |
| `hoverable`, `tooltip` | cursor and native tooltip |
| `remember`, `forget`, `track-pointer` | the object keeps a memory (§4) |
| `respond-to-simulation` | redraw every tick — automatic for model bindings |
| `selectable`, `draggable`, `resizable`, `rotatable` | never: `BaseShape` gives every object all four |

### Components to compose with

Do not redraw what one of these already draws.

| Need | Component |
| --- | --- |
| a dial background | `dial-face` |
| ticks and numbers around a centre | `tick-ring`, `label-ring` |
| a hand, needle or arrow | `pointer-hand` |
| as many directions as the reader names, marked round a dial | `pointer-ring` |
| a key with a label | `key-cap` |
| **anything cartesian** | `plot-grid`, `plot-axes`, `plot-crosshair` |
| a memory shown as a list or a path | `memory-list`, `memory-trace` |
| a whole object reused inside another | `analogue-clock`, `compass`, `speedometer`, `circular-gauge`, `rotating-vector`, `orbit-system`, `calculator`, `mouse-tracker` |

An axis drawn as three lines and some text is the mistake the mouse tracker was built out of: the plot
components carry the board's nice ticks, minor ticks, label gaps measured in tick fonts, and the drag
handles that rescale an axis.

### Bindings

| Form | Meaning |
| --- | --- |
| `{ "constant": 12 }` | a fixed value |
| `{ "parameter": "unit" }` | another parameter or a local; add `"as": "number"` to read it as a model variable |
| `{ "variable": "minute", "case": 1 }` | a model variable, or a numeric literal |
| `{ "expression": "minute\\cdot6" }` | LaTeX over model variables |
| `{ "formula": "a+b", "inputs": {…} }` | LaTeX whose free names the definition supplies; the loader wires them at registration |
| `{ "token": "stroke.accent" }` | a design token |
| `{ "format": <binding>, "digits": 1, "prefix": …, "suffix": … }` | a number as text |
| `{ "choose": <binding>, "then": …, "otherwise": … }` | a conditional; `0` and `""` are false |
| `{ "concat": [ … ] }` | resolved parts joined into one string |
| `{ "contrast": <colour binding> }` | black or white, whichever reads on that colour |
| `{ "memory": "history", "row": …, "field": "x", "from": "end" }` | a memory, a row, or a field |
| `{ "memoryCount": "history" }` | how many rows it holds |

### Colours, fonts and sizes are not the object's to invent

**No definition names a font or an axis colour.** Write `"defaultValue": "token:font.family"`, or bind
`{ "token": "strokeWidth.hairline" }`. Tokens come from `BlockTokens`, which the chart, the ruler and
`Utils` read too, so a preset restyles every object at once and nothing drifts.

The families: `surface.*`, `stroke.*`, `text.*`, `selection.*`, `handle.*`, `strokeWidth.*`,
`radius.*`, `spacing.*`, `font.family` and `font.family.sans`, `font.size.*`, `font.weight.*`, `axis.*`, `grid.*`,
`crosshair.*`, `badge.*`, `shadow.soft`, `opacity.*`, `duration.*`, `size.default.*`.

## 5. If the object has to remember something

A memory is a parameter with `"valueType": "memory"`, so the rows live in `shape.properties` beside
the numbers and the model carries them, undo restores them and the clipboard takes them. A row is
`{ text, x, y }` and writes only the fields it holds.

```json
{ "id": "samples", "valueType": "memory", "defaultValue": [], "termParameters": { "x": "xVariable", "y": "yVariable" } }
```

Declare `termParameters` and the rows stop being private notes: **row n is iteration n** of those
terms, so the board's player replays the recording and everything bound to those variables moves with
it. Omit it and the memory stays with the object, as the calculator's history does.

`remember` appends on click, `forget` empties, `track-pointer` records a drag one sample every
`sampleMs` in the node's own units. Limits: 2 000 rows, a `limit` per behaviour, six decimals. A whole
drag is one undo entry.

## 6. What gets a document refused

Registration (`BlockDefinitionLoader.inspect`) rejects: an unsupported `schemaVersion`, a `type` that
is not the pattern, a `category` other than `component`, a missing `root`, a parameter or local with
no `id`, a local colliding with a parameter or an earlier local, and any formula reading a name the
document does not declare.

Validation (`BlockValidator`) adds: unknown block types, bindings on properties that do not accept
them, variables that do not exist (with a nearest-name suggestion), expressions that do not parse, and
the runtime limits — 2 000 nodes, depth 16, component depth 8, `repeat` count 720, expression length
512. Then the visual pass: nothing drawn, everything invisible, zero-size interactive targets, nodes
far outside the box.

An object cannot be published from the catalogue until that list is empty.

## 7. Checklist

- [ ] `type` is new, `category` is `component`, tagged `object`, with an `icon` and a one-sentence `description`
- [ ] every parameter has a `category`, and colours default to `token:…`
- [ ] `$width`/`$height` reached through locals, so the object scales on resize
- [ ] no font, axis colour or grid colour written as a literal
- [ ] anything cartesian is `plot-grid`/`plot-axes`/`plot-crosshair`, not hand-drawn lines
- [ ] optional parts carry `when`, not `visible: false`
- [ ] `preview.parameters` set if the defaults draw nothing recognisable
- [ ] bundled: regenerate `definitions.generated.js`
- [ ] a spec in `tests/component-blocks.spec.js` (compilation) or a board spec (behaviour)

```
UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js
npx playwright test tests/component-catalogue.spec.js     # regenerates the block catalogue
npx playwright test tests/object-picker.spec.js tests/component-blocks.spec.js
```

## 8. Read the nearest example first

| If the new object is | Start from |
| --- | --- |
| a dial, gauge or meter | [`circular-gauge.json`](../../scripts/blocks/definitions/circular-gauge.json) — 104 lines, the smallest complete object |
| a scale with a needle | [`speedometer.json`](../../scripts/blocks/definitions/speedometer.json) |
| a hand or arrow driven by an angle | [`rotating-vector.json`](../../scripts/blocks/definitions/rotating-vector.json) |
| interactive, writing values back | [`compass.json`](../../scripts/blocks/definitions/compass.json) — `drag-angle` and `drag-rotate` on invisible grab areas |
| drawn rather than written | [`compass.json`](../../scripts/blocks/definitions/compass.json) again — its rose and needle are [imported SVG](../../scripts/blocks/definitions/art/), wired by id, with the labels left to `label-ring` |
| composed of several sub-objects | [`analogue-clock.json`](../../scripts/blocks/definitions/analogue-clock.json), [`orbit-system.json`](../../scripts/blocks/definitions/orbit-system.json) |
| a keypad that keeps its working | [`calculator.json`](../../scripts/blocks/definitions/calculator.json) — `key-cap`, `remember`, `memory-list` |
| a plot that records | [`mouse-tracker.json`](../../scripts/blocks/definitions/mouse-tracker.json) — the plot components over a `memory-trace` |
