# Building blocks — developer guide

How Modellus objects are composed from reusable blocks, how to add new ones, and the rules
the AI agent plays by. See [`building-blocks-assessment.md`](building-blocks-assessment.md)
for why the architecture looks like this, [`building-blocks-catalogue.md`](building-blocks-catalogue.md)
for the block list, and [`migration-plan.md`](migration-plan.md) for the remaining shapes.

## 1. Architecture

Five layers, one registry, no runtime code evaluation.

```
Primitives   circle, rect, ellipse, line, polyline, polygon, arc, ring, path, text, image, group
Modifiers    translate, rotate, scale, mirror, opacity, visibility, stroke, fill, z-order, repeat
Behaviours   selectable, draggable, resizable, rotatable, hoverable, tooltip, drag-angle,
             drag-rotate, clickable, …
Bindings     constant | parameter | variable | expression | formula | token | format
Components   dial-face, tick-ring, label-ring, pointer-hand, analogue-clock, compass, speedometer,
             circular-gauge, rotating-vector, orbit-system, + custom components
```

Files (all plain globals, loaded by `<script>` in `pages/board/index.html` and
`pages/board/board-offline.html`, in this order):

| File | Global | Role |
| --- | --- | --- |
| `scripts/blocks/designTokens.js` | `BlockTokens` | semantic tokens and the five visual presets |
| `scripts/blocks/blockGeometry.js` | `BlockGeometry` | polar points, arcs, rings, tick rings, needles |
| `scripts/blocks/blockBindings.js` | `BlockBindings` | declarative value resolution |
| `scripts/blocks/blockRegistry.js` | `BlockRegistry` | the one catalogue |
| `scripts/blocks/blockPrimitives.js` | — | primitive registrations |
| `scripts/blocks/blockModifiers.js` | `BlockModifiers` | modifier registrations |
| `scripts/blocks/blockBehaviours.js` | `BlockBehaviours` | behaviour registrations |
| `scripts/blocks/blockMigrations.js` | `BlockMigrations` | schema versions and migrations |
| `scripts/blocks/blockCompiler.js` | `BlockCompiler` | definition → render nodes |
| `scripts/blocks/blockRenderer.js` | `BlockRenderer` | render nodes → SVG |
| `scripts/blocks/blockValidator.js` | `BlockValidator` | schema/semantic/runtime/visual validation |
| `scripts/blocks/blockComponents.js` | `BlockComponentHelpers` | component registrations |
| `scripts/blocks/blockChartGeometry.js` | `BlockChartGeometry` | scales, series points, area/line paths, bar layout |
| `scripts/blocks/blockChartComponents.js` | — | the chart components |
| `scripts/blocks/blockObjectLibrary.js` | `BlockObjectLibrary` | the objects a model carries with it |
| `scripts/blocks/blockObjectCatalogue.js` | `BlockObjectCatalogue` | the objects the catalogue offers |
| `scripts/catalog/objectDrawing.js` | `ObjectDrawing` | compiles an object and photographs it |
| `scripts/catalog/objectSeeder.js` | `ObjectSeeder` | publishes the bundled objects to the catalogue |
| `scripts/blocks/blockObjects.js` | `BlockObjects` | object definitions and component instances |
| `scripts/blocks/blockAgentTools.js` | `BlockAgentTools` | the agent-safe tool surface |
| `scripts/editors/board/widgets/ComponentWidget.js` | `ComponentShape` | the host shape |
| `scripts/shapes/componentShape/ComponentShapeToolbar.js` | — | its property editor |
| `scripts/toolbars/objectPicker.js` | `ObjectPicker` | the object palette: previews, descriptions, search |
| `scripts/controls/BlockChartControl.js` | `BlockChartControl` | the chart control that paints through blocks |
| `scripts/shapes/blockChartShape/BlockChartShape.js` | `BlockChartShape` | the chart shape built on blocks |

## 2. The object definition

```js
{
    schemaVersion: "1.0.0",
    id: "…",
    type: "analogue-clock",
    name: "Clock",
    preset: "standard",
    root: <node>,
    parameters: [ <ParameterDefinition> ],
    metadata: { source, createdAt, request, blocksUsed, edited }
}
```

A node is one of:

```js
{ id, type: "<primitive>", properties: {…}, bindings: {…}, modifiers: [...], behaviours: [...], children: [...] }
{ id, type: "<component>", parameters: {…}, modifiers: [...], behaviours: [...] }
```

`properties` are constants, `bindings` are declarative values for the same property names;
a binding always wins over a constant. Only `group` accepts `children`.

**Parameter values of an object live in `shape.properties`**, not inside the definition.
`BlockObjects.createComponentInstance()` writes `parameters: { radius: { parameter: "radius" }, … }`
into the root node, and the shape passes its own `properties` as the compilation parameters.
That is what makes components work with the existing property editor, undo/redo, copy/paste,
collaboration and serialization without any special cases.

## 3. Defining a primitive

```js
BlockRegistry.register({
    type: "circle",
    category: "primitive",
    displayName: "Circle",
    description: "Circle defined by a centre point and a radius.",
    tags: ["shape", "round"],
    capabilities: ["fillable", "strokable", "radial"],
    inputSchema: BlockPrimitiveSchemas.withStyle({
        centerX: { valueType: "number", defaultValue: 0, label: "Centre X" },
        centerY: { valueType: "number", defaultValue: 0, label: "Centre Y" },
        radius: { valueType: "number", defaultValue: 40, minimum: 0, label: "Radius" }
    }),
    render: properties => ({ tag: "circle", attributes: { cx: properties.centerX, cy: properties.centerY, r: properties.radius } })
});
```

`render` receives fully resolved, coerced and clamped values and returns `{ tag, attributes, text? }`.
It must be pure: no DOM, no globals, no time, no randomness. Add `validate(input, context)`
when a value needs a rule the schema cannot express (see `path` and `image`).

## 4. Defining a modifier

```js
BlockRegistry.register({
    type: "rotate",
    category: "modifier",
    inputSchema: { properties: { angle: {...}, centerX: {...}, centerY: {...} } },
    apply: (input, accumulator) => {
        accumulator.transforms.push(`rotate(${input.angle} ${input.centerX} ${input.centerY})`);
        return accumulator;
    }
});
```

The accumulator is `{ transforms: [], style: {}, visible: true, order: 0 }`. `repeat` is the
one structural modifier: the compiler expands it before anything else and exposes `$index`
and `$count` as parameters to bindings inside the repeated subtree.

## 5. Defining a behaviour

```js
BlockRegistry.register({
    type: "tooltip",
    category: "behaviour",
    inputSchema: { properties: { text: { valueType: "string", defaultValue: "" } } },
    attach: (host, element, input) => { … }
});
```

A behaviour with an `attach` function is applied by `BlockRenderer` right after the SVG is
written. A behaviour without one is handled by the host shape
(`ComponentShape.attachBlockBehaviour`) — that is where `drag-angle`, `drag-rotate` and
`clickable` live, because they need the board, the calculator and the shape's coordinate system.
`selectable`, `draggable`, `resizable` and `rotatable` are registered for discovery only:
every component gets them from `BaseShape`.

## 6. Defining a component

```js
BlockRegistry.register({
    type: "analogue-clock",
    category: "component",
    icon: "fa-light fa-clock",
    tags: ["object", "clock"],
    parameters: [ BlockComponentHelpers.parameter("hourVariable", "Hour variable", "variable", "0", { category: "model" }), … ],
    create: (parameters, context) => ({ id: "analogue-clock", type: "group", children: [ … ] })
});
```

`create` returns **a node tree, not markup**. It runs on every compile, so it may read live
values through the context helpers:

* `context.resolveTermValue(nameOrNumber, fallback)` — a model variable or a numeric literal.
* `context.resolveNumber(binding, fallback)` / `resolve` / `resolveText` — any binding.
* `context.tokens` — the active `BlockTokens`.
* `parameters.$width`, `parameters.$height` — the object's box, so components scale on resize.

Give a component the tag `object` if it should appear in the board's Components palette;
low-level components (`dial-face`, `tick-ring`, `label-ring`, `pointer-hand`) deliberately
do not have it.

### Components defined as JSON

A component that only composes other blocks does not need a `create` function at all. It is a
JSON document in `scripts/blocks/definitions/`, registered by `BlockDefinitionLoader`. Every
component in the Components palette — analogue clock, compass, speedometer, circular gauge,
rotating vector, orbit system — is defined this way. Only `dial-face`, `tick-ring`, `label-ring`
and `pointer-hand` stay in code, because they generate geometry per index rather than compose.

```json
{
    "schemaVersion": "1.0.0", "type": "compass", "category": "component",
    "parameters": [ { "id": "headingVariable", "valueType": "variable", "defaultValue": "0", "category": "model" } ],
    "locals": [
        { "id": "w", "value": { "parameter": "$width" } },
        { "id": "r", "formula": "\\max\\left(4,\\frac{\\min\\left(w,h\\right)}{2}-6\\right)" },
        { "id": "needleLength", "formula": "r\\cdot0.66" }
    ],
    "root": { "id": "compass", "type": "group", "children": [
        { "id": "needle", "type": "pointer-hand", "when": { "parameter": "showNeedle" },
          "parameters": { "length": { "parameter": "needleLength" } } }
    ] }
}
```

* **`locals`** are derived values, evaluated in order onto the component's parameter frame before
  the tree is compiled. Each may read the parameters and any earlier local, so a value the whole
  tree needs is worked out once. A formula reads bare names and the loader wires the inputs at
  registration time, not per draw.
* **Nothing is implicit.** A formula may only read what the document declares — reach the drawing
  size by declaring a local bound to `$width` or `$height`. A name that is neither declared nor
  listed in an explicit `inputs` block is rejected at registration, because it would otherwise
  fall through to a model term of that name.
* **`when`** on a child drops it before compilation when the binding is false, so a hidden part
  costs nothing and does not shift the ids of its siblings.
* **`choose`** is a binding kind for values that are not numbers: `{ "choose": …, "then": …,
  "otherwise": … }`, used for the clock's drag variables. A zero and a blank string are false,
  which is how the gauges guard a zero range and a missing unit without a comparison operator.
* **`concat`** joins resolved parts into one string, so the gauge readouts build
  `"64 km/h"` from a `format` binding and their own `unit` parameter. `format` resolves its
  `digits`, `prefix` and `suffix` as bindings too.
* **`preview`** holds the parameter values the object picker draws its thumbnail with:
  `{ "preview": { "parameters": { "valueVariable": "64", "unit": "km/h" } } }`. It is not part of
  the object — nothing else reads it — and the defaults are used when a document omits it. An
  object whose defaults draw nothing recognisable (a phasor of length one, a gauge reading zero)
  needs it; a clock does not.

The JSON files are the source of truth. The browser cannot `fetch` them in the offline build,
which runs from `file://`, so they are delivered by `definitions.generated.js`; regenerate it
with `UPDATE_DEFINITIONS=1 npx playwright test tests/component-definitions.spec.js`, which
otherwise fails when the bundle and the JSON have drifted.

### The chart components

`chart` composes `chart-frame`, `chart-grid`, `chart-axes`, `chart-series` and `chart-bars` into a
whole chart. It is the one component family that is not free to work out its own numbers: the plot
box, the domain, the ticks and the data rows arrive as parameters, because the host control needs
the very same numbers for hit testing, the focus markers and the crosshair. Turning them into
pixels is the components' own work, through `BlockChartGeometry`, which the drawn `ChartControl`
also calls — one implementation of the mapping, two ways of painting it.

Three things follow from a chart being a drawing of a whole run rather than a dial:

* **`clip`** is a modifier that clips a node to a clip path the host drawing already declares
  (`{ type: "clip", clipId: "…" }`). The grid and the series are clipped to the plot, the axes to
  the shape, the tick marks to their axis strip. The id is checked against the shape of an id and
  can only ever point inside the document that holds the drawing; it is not agent-accessible.
* **The node limit is per compiler.** `new BlockCompiler(registry, bindings, { maxNodes: 20000 })`
  raises it for one host only — a scatter of a long run legitimately draws a marker per point.
  `BlockCompiler.limits` stays the default for everything else.
* **The chart components are not agent-accessible** and carry no `object` tag, so they stay out of
  the Components palette and out of the agent catalogue: without a host to hand them a plan there
  is nothing for them to draw.

`BlockChartShape` is the host, and it is placed from the board's Components palette beside the
component objects: the palette lists the component types tagged `object` and, after them, the
objects that are built from blocks but are shapes of their own. It inherits every behaviour from `ChartShape` — the same properties,
the same toolbar, the same term collection, the same domain handling, the same drags — and only
swaps the control for `BlockChartControl`, which compiles the `chart` component and writes it with
`BlockRenderer` instead of writing SVG itself. The axis title, the series legend and the area
readout stay with the base control: they are term labels with case icons and an icon glyph over a
measured background, which the primitives do not describe. `tests/block-chart-shape.spec.js` holds
both drawings to the same geometry, tag for tag and coordinate for coordinate.

## 7. Parameters and bindings

A `ParameterDefinition` carries `id`, `label`, `description`, `valueType`
(`number | string | boolean | colour | variable | expression`), `defaultValue`, `required`,
`minimum`, `maximum`, `enumValues`, `unit`, `category`, `bindable`, `agentAccessible`,
`userEditable`. `category` drives where the editor puts it: `style` goes in the shape/colour
menu, `model` and `orbits` in the variables menu, everything else in the settings menu.

Bindings:

| Form | Meaning |
| --- | --- |
| `{ constant: 12 }` | a fixed value |
| `{ parameter: "hourVariable" }` | another parameter's value; add `as: "number"` to read it as a model variable |
| `{ variable: "minute", case: 1 }` | a model variable (a numeric literal is accepted too) |
| `{ expression: "minute\\cdot6" }` | a Modellus LaTeX expression over model variables |
| `{ formula: "…", inputs: { m: { variable: "minute" } } }` | an expression whose free names are supplied by other bindings |
| `{ token: "stroke.default" }` | a design token |
| `{ format: <binding>, digits: 1, prefix, suffix }` | a number rendered as text |

Expressions are parsed by `Modellus.Parser` (the same engine that runs the model) into a
`Branch` and evaluated with `branch.calculate(values)`. There is no `eval`, no `new Function`,
and no other executable path anywhere in this layer.

The clock's hands are the reference example:

```
hourHand.rotation   = \left(\mod\left(h,12\right)+\frac{m}{60}\right)\cdot30   h←hour, m←minute
minuteHand.rotation = \mod\left(m,60\right)\cdot6                              m←minute
secondHand.rotation = \mod\left(s,60\right)\cdot6                              s←second
```

## 8. Validation

`BlockValidator.validate(definition, context)` returns `{ valid, errors, warnings }` where each
entry is `{ code, path, message, expected?, suggestion? }`. Four levels run in order:

1. **Schema** — required fields, known types, value types, enums, ranges, unique ids, children support.
2. **Semantic** — variables exist (with a nearest-name suggestion), expressions parse, bindings
   are allowed on the property, behaviours are supported, parameters exist.
3. **Runtime safety** — node count (2 000), nesting depth (16), component depth (8), repeat count
   (720), expression length (512), image sources restricted to `https:`, `data:image/` and
   relative paths, SVG path data restricted to the path grammar.
4. **Visual** — nothing drawn, everything invisible, zero-size interactive targets, nodes far
   outside the object box.

## 9. Serialization and migration

A `ComponentShape` serializes like every other shape: `{ type: "ComponentShape", id, parent, properties }`,
with the definition under `properties.definition` and the parameter values as flat properties.
`definition.schemaVersion` starts at `1.0.0`.

To change the format, register a migration and bump `BlockMigrations.currentVersion`:

```js
BlockMigrations.registerMigration("1.0.0", "1.1.0", definition => { … return definition; });
```

`ComponentShape.setProperties()` runs `BlockMigrations.migrate()` on load, so old documents
open, upgrade in memory and are written back at the current version on the next save.
Unrecognised properties are never dropped.

### Objects the model carries

An instance stores a reference — `properties.definition.root` is `{ type: "analogue-clock", parameters: {…} }`
— and the drawing itself lives in the registry. That is enough for the objects the editor ships,
because `definitions.generated.js` registers them at load time on every page. It is not enough for
an object that came from somewhere else: the catalogue, the agent, another author's board. So the
model file carries those objects with it, in a top-level `objects` array of definition documents:

```js
{ properties: {…}, board: [ …shapes… ], objects: [ <definition document>, … ] }
```

`BlockObjectLibrary` is what puts them there and takes them out again:

| Call | Role |
| --- | --- |
| `sealBuiltIns()` | runs once at load, recording every component the editor registers for itself |
| `collectFromShapes(shapes)` | the documents those shapes need, built-ins excluded, followed through the objects an object is itself built from |
| `registerAll(documents)` | registers them again on the far side, reporting `{ registered, problems }` |

`BoardEditor.serialize()` writes the section only when there is something to write, and
`deserialise()` registers it before the shapes are read, so a component is always registered by the
time a shape asks for it. The same pair of calls carries objects on the `addShape` collaboration op
and on clipboard data, so pasting into another document brings the object along.

A document naming a type the editor already ships is ignored: the bundled object is the one that
page was tested with, and honouring the model's copy would freeze it at the version it was saved at.

### Objects the catalogue offers

`BlockObjectCatalogue` reads the catalogue through `ModelsApiClient.fetchObjectsPage()` the first
time the palette opens, and `ObjectPicker` merges the result with what the registry already holds —
one card per type, the catalogue entry preferred, because it is the one with a screenshot and the
description its author wrote. The definition is fetched only when an object is placed
(`ensureRegistered()` → `fetchObjectDefinition()` → `BlockObjectLibrary.registerDocument()`), which
is also the moment the model starts carrying it.

The catalogue is an addition, never a condition: a failed read leaves the palette showing everything
the editor ships with and retries the next time it opens, which is also how the offline board — no
API client at all — behaves. [`objects-api.md`](objects-api.md) is the endpoint contract.

Objects are authored in the catalogue itself, under **Assets → Objects** in
[`pages/catalog`](../../pages/catalog), which loads the block layer for the purpose. The editor takes
the definition JSON and draws it beside the text as it is written: `inspectObjectDefinition()` runs
`BlockDefinitionLoader.inspect()`, refuses a type the editor ships with, registers the document and
compiles it, and either paints the drawing or lists every problem. An object cannot be published
until that list is empty.

The screenshot is not uploaded by hand — `ObjectDrawing.toScreenshotFile()` rasterises the very
drawing the preview shows, so a catalogue card can never advertise something the object does not
draw. The same `preview.parameters` the palette uses picks the values it is drawn with, and the
drawing is always compiled at `ObjectDrawing.previewSize` and rasterised larger: a parameter written
in pixels would otherwise shrink against a bigger canvas.

`ObjectDrawing` compiles through a `Calculator`, because an object works out its geometry with
formulas and a formula is evaluated by the calculator. Bind it to nothing and every formula falls
back to zero — the object still validates and still "draws", with every radius at 0.

### Objects the agent invents

`save_custom_component` registers its draft as a definition document through
`BlockObjectLibrary.registerDocument()`. Three things follow from that, none of which needed
special-casing: the model carries the object the way it carries a catalogue one, the palette lists
it (the document is tagged `object`) with a preview compiled from it, and its definition can be read
back out. Registering a `create()` function instead — as it once did — left the drawing in the
session that made it, so the model reopened with an object it could not draw.

The **Copy definition** item in a component's settings menu writes that document to the clipboard in
the shape the catalogue's object editor expects. That is the path from an object invented on the
board to one published for everyone: invent, copy, paste, publish. It appears only for objects that
have a document behind them.

### Seeding the bundled objects

The six objects the editor ships with belong in the catalogue's listing too, so that browsing it
shows everything rather than everything-except-the-built-ins. `ObjectSeeder` publishes them, keyed
by the definition's own type, so running it twice changes nothing:

```
npx http-server . -p 8432 -c-1 --silent          # in another terminal
node tests/seed-objects.js                       # dry run: says what it would do
node tests/seed-objects.js --out=/tmp/drawings   # …and writes the drawings out to look at
node tests/seed-objects.js --write --token=…     # creates whatever is missing
node tests/seed-objects.js --write --update      # also rewrites what is already there
```

The definitions stay bundled regardless: a seeded object carries a built-in type, so
`BlockObjectLibrary.registerDocument()` refuses to register it and the board keeps drawing the copy
it ships with. What seeding adds is the catalogue card — the screenshot and the description.

Writing needs to know what the catalogue already holds, so a listing that cannot be read stops a
write; a dry run carries on against an empty catalogue, which is what makes the plan readable before
the endpoints exist at all.

## 10. Security constraints

* Only registered block types can appear in a definition; the compiler and the validator both refuse unknown types.
* The agent never sends code — every tool takes a structured, schema-checked input.
* Expressions go through the Modellus parser; a parse failure is an error, not a fallback to JavaScript.
* Image sources and path data are allow-listed.
* Complexity limits bound the work one object can cause per frame.
* `insert_object` and `save_custom_component` re-run the full validation and refuse invalid drafts.
* `save_custom_component` saves a **definition document**, not a `create()` function, so the object
  it invents is one `BlockObjectLibrary` can collect into the model — and one a person can read.

## 11. Testing a new block

* `tests/component-blocks.spec.js` — registry, geometry, bindings, compiler, validator, presets.
* `tests/model-objects.spec.js` — the objects a model carries: what is collected, what is left to the
  editor, and that an object the session has never seen still draws when the model is reopened.
* `tests/object-picker.spec.js` — the palette: what it lists, the drawn previews, search, and what
  choosing an object arms for drawing.
* `tests/object-catalogue.spec.js` — the catalogue against a stubbed API: the screenshot cards, the
  definition read on placement only, degrading to the built-in objects, and the model that results.
* `tests/catalog-objects.spec.js` — the catalogue's own Objects section: the branch and its cards,
  the live preview, every way a definition is refused, and what publishing sends.
* `tests/object-seed.spec.js` — seeding against a stubbed catalogue: the plan, the write, seeding
  twice, updating, one object refused, and that every bundled object really draws something.
* `tests/component-clock.spec.js` — rendering, model binding, editing, undo/redo, serialization,
  duplication, selection/resize, hand dragging, and the other components on the board.
* `tests/component-agent-tools.spec.js` — tool schemas, discovery, the full build→validate→preview→insert
  loop, structured errors and correction, refusal of unknown types and injection attempts,
  custom components, and the tool-bridge naming convention.

Add unit-level assertions to the first file, board behaviour to the second, and anything the
agent can reach to the third. Compilation is deterministic, so
`BlockRenderer.toMarkup(compilation.nodes)` is a stable snapshot value.

## 12. Analogue clock walkthrough

```js
const shape = shell.commands.addComponent("analogue-clock", "Clock");
shape.setProperties({ hourVariable: "hour", minuteVariable: "minute", secondVariable: "second" });
```

What happens:

1. `ComponentShape.setDefaults()` builds the instance definition and copies the parameter defaults into `properties`.
2. `draw()` calls `compileComponent()`; the compiler resolves the root component's parameters from `properties`.
3. The clock's JSON definition works out its locals — the three hand angles go through the
   expression engine — and yields a group of `dial-face`, two `tick-ring`s, a `label-ring`,
   three `pointer-hand`s and a centre cap, minus any part whose `when` is false.
4. Each sub-component is compiled recursively down to primitives; the hand's `rotate` modifier
   carries the angle.
5. `BlockRenderer` writes the SVG once per changed frame and attaches behaviours.
6. The toolbar edits `properties`; every edit is a `SetShapePropertiesCommand`, so undo/redo works.
7. `shape.getInspectionReport()` returns the component tree, the primitive tree, the source
   component of each node, active bindings and their values, validation state and compile stats.
