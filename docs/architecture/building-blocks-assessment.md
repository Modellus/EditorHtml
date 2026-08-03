# Modellus Shapes — Architecture Assessment and Building-Block Plan

Status: written before the refactor started, updated as the first vertical slice landed.
Scope: `scripts/shapes/`, `scripts/editors/board/`, `scripts/controls/`, `scripts/commands/`, `libraries/types/CalculationEngine.js`.

---

## 1. Current architecture

### 1.1 Layout and loading

The application is plain ES5-era browser JavaScript. There is no bundler and no module
system: every file declares globals (`class BaseShape { ... }`) and each page lists the
files in order in a `<script>` tag block (`pages/board/index.html`,
`pages/board/board-offline.html`, `pages/notebook/index.html`). A trailing
`if (typeof module !== "undefined" && module.exports)` guard exists in a few files so
they can also be required from Node.

Directories that matter here:

| Path | Role |
| --- | --- |
| `scripts/shapes/Shape.js` | `BaseShape` — 2 150 lines, the root of every visual object |
| `scripts/editors/board/widgets/*Widget.js` | the concrete shapes (`class XShape extends ...` plus a `var XWidget = XShape` alias) |
| `scripts/shapes/<name>Shape/*Toolbar.js` | per-shape property editors, applied as prototype mixins |
| `scripts/editors/board/Canvas.js` | the SVG surface (`var Board = Canvas`), dirty tracking, z-order, (de)serialization |
| `scripts/editors/board/widgets/WidgetsRegistry.js` | shape registry + shape list (`var Shapes = WidgetsRegistry`) |
| `scripts/commands/*.js` | command objects for undo/redo |
| `scripts/controls/*.js` | reusable DevExtreme-based controls (terms, colours, charts, tables, expressions) |
| `scripts/calculator.js` | wrapper over the `Modellus` calculation engine |
| `libraries/types/CalculationEngine.js` | ANTLR-based LaTeX parser, `System`, `Term`, `Expression`, `Branch`, `Parser` |

The `*Shape` / `*Widget` double naming is a rename in flight: files were moved to
`widgets/` and the old class names are kept as aliases both in code (`var PointWidget = PointShape`)
and in the registry (`registerShapeAlias("PointShape", PointWidget)`), because serialized
documents store `type: "PointShape"`.

### 1.2 Rendering

SVG, written imperatively. `BaseShape.initializeElement()` calls the subclass
`createElement()`, which builds an SVG `<g>` and keeps direct references to the child
elements (`this.circle`, `this.pointerLine`, `this.tickLayer`, …). `draw()` then pushes
attribute values onto those retained nodes every frame. Layout maths lives inline in each
subclass (`getGaugeGeometry()`, `getProtractorGeometry()`, …).

`Canvas.refresh()` coalesces work into one `requestAnimationFrame`, driven by
`markDirty(shape)`; a dirty set means only touched shapes are updated, otherwise the whole
board is redrawn. The update cycle is three phases, all recursive over `children`:
`tick()` (pull values from the calculator into properties) → `update()` → `draw()`.

### 1.3 State and serialization

Every shape is one untyped property bag: `this.properties = {}`, filled by `setDefaults()`
and overwritten by `setProperties()`. `serialize()` emits `{ type, id, parent, properties }`
and `BaseShape.deserialize()` reconstructs by looking the type up in the registry. The
document is `{ properties, board: [...shapes], preloadedData?, outlierIterations?, regressionTerms? }`
(`resources/models/model-schema.json`). **There is no schema version field anywhere**;
compatibility is maintained by never removing a property name and by registry aliases.

### 1.4 Variable binding

Two mechanisms, both keyed on property names:

* `termsMapping` — a list of `{ termProperty, property, isInverted, scaleProperty, caseProperty }`.
  `ChildShape.tickShape()` walks it every tick, reads `properties[termProperty]` (a model
  term name *or* a numeric literal), resolves it through
  `calculator.getByName(name, caseNumber)`, divides by the referential scale and writes the
  result into `properties[property]`. `BaseShape.delta()` is the inverse path used when the
  user drags a shape: it writes back into the model term.
* `addTerm()` / `addTermToForm()` / `termDisplayEntries` — the same term names again, this
  time for the editing UI and the on-canvas value labels.

Binding is therefore *one term name per property*, with no expression support: a property
can be `x = variable("x")` but never `x = variable("x") * 2`. Where a shape needs a derived
value, the model author has to add an equation to an Expression shape.

The expression engine itself is much stronger than the binding layer that uses it:
`Modellus.Parser.parse(latex)` returns a `Branch` tree with `calculate(values)` and no side
effects on the system, and each node carries `op` (`var`, `const`, `add`, `mul`, …), which
makes both evaluation and dependency extraction possible without `eval`.

### 1.5 Interaction

`BaseShape` owns it all: `getHandles()` returns handle descriptors (`getAttributes`,
`getTransform`), `createHandles()` materialises them as sibling SVG elements on the board
(not children of the shape), and a single pointer pipeline (`onHandlePointerDown` →
`onHandleDrag` → `onHandleDragEnd`) does drag thresholds, pointer capture, rAF batching,
grid snapping, rotation snapping, rotated-resize anchoring, cursor rotation and
passthrough to elements underneath the move handle. Selection, hover outlines and
edit-mode highlighting live in `CanvasSelection.js` with policy functions extracted to
`scripts/shapes/shared/shapeInteractionPolicies.js`.

Undo/redo is command-based (`CommandsInvoker` + `SetShapePropertiesCommand`,
`AddShapeCommand`, `RemoveShapeCommand`). Anything that goes through `setPropertyCommand()`
or `dragEnd()` is undoable; direct `setProperty()` calls are not.

Copy/paste and duplication use `getClipboardData()` (serialize, drop ids, recurse into
children) and write both JSON and a PNG to the clipboard.

### 1.6 Property editors

One mixin per shape (`Object.assign(GaugeShape.prototype, GaugeShapeToolbarMixin)`),
building a DevExtreme `dxToolbar` that floats under the selected shape. Items are composed
from `BaseShapeToolbar` helpers (`createShapeColorDropDownButton`, `createTermsDropDownButton`,
`createTermControl`, `createColorPickerEditor`, `createRemoveToolbarItem`) plus
shape-specific dropdowns. `resolveShapeToolbarBaseItems()` walks the prototype chain to
splice in the parent's items.

### 1.7 The AI surface today

`modellus.js` exposes a hand-written global façade (`modellus.shape.addBody`,
`modellus.shape.setProperties`, `modellus.model.openModel`, …).
`libraries/scripts/agentToolBridge.js` maps flat tool names (`modellus_shape_addBody`) onto
those functions with a hand-maintained `if` chain for argument order.
`resources/models/model-schema.json` carries a large `agentGuidance` section that documents,
in prose, what each shape type means. So the agent's catalogue of what exists is a **second,
manually synchronised copy** of the shape list, and the agent's only creative act is
emitting a whole model JSON — it cannot compose a new kind of visual object at all.

---

## 2. Main limitations

1. **Monolithic shapes.** Every visual object is a class that owns geometry, styling,
   binding, hit-testing, editing UI and serialization. `BodyWidget` is 1 164 lines,
   `ReferentialWidget` 891, `VectorWidget` 786. A new object means a new class, a new
   toolbar mixin, a new registry entry and a new `<script>` line in three HTML pages.
2. **Duplication.** `getArcPoint(centerX, centerY, radius, angleDegrees)` is byte-identical
   in `GaugeWidget` and `ProtractorWidget`; annular-sector and ring path building are
   re-derived in `GaugeWidget`, `ProtractorWidget` and `ArcWidget`; polar placement of
   ticks and labels is written three times; tip/arrow markers exist in `VectorWidget`,
   `LineWidget` and `mindMapEndMarkers.js`.
3. **Untyped property bags.** No schema, no defaults declaration, no validation. A typo in
   a property name fails silently.
4. **Binding is one term per property.** No expressions, no computed visibility, no
   formatted text bindings.
5. **No versioning or migration hooks.** Documents are compatible only because nothing is
   ever renamed.
6. **Styling is hard-coded.** `#f7f7f7`, `stroke-width 1`, `rx 4`, handle radius `4`,
   `rgba(0,0,0,0.08)` grid lines — spread across widgets. `BaseTheme` only supplies two
   colour palettes.
7. **The agent catalogue is a copy.** Nothing derives the agent's view from the code that
   actually renders, so the two drift.
8. **No structural tests.** All tests are end-to-end Playwright specs against a live board;
   there is no level at which a definition can be validated without a browser.

---

## 3. Reusable concepts already present

The codebase is closer to the target than the file sizes suggest:

* **Parent/child composition with clipping and coordinate inheritance** —
  `getBoardPositionFromLocalPosition()`, `getClipId()`, `getAbsoluteRotation()`. A group
  primitive is already implicit in `ReferentialShape` + `ChildShape`.
* **A declarative handle description** — `getHandles()` returns data, not behaviour.
* **A dirty-tracking render loop** — `markDirty` / `refresh` is exactly the update cycle a
  compiled node tree needs.
* **A safe expression engine** — `Parser.parse` → `Branch.calculate(values)`, plus `op`
  tagging for dependency analysis.
* **Command-based undo/redo keyed on properties** — anything expressed as shape properties
  is automatically undoable, copyable and collaborative.
* **Interaction policies already extracted** to shared functions.
* **A registry with alias support**, which is the migration seam for renamed types.

## 4. Proposed building-block boundaries

Five layers, one canonical registry, no code generation and no runtime code evaluation.

```
scripts/blocks/
  designTokens.js     BlockTokens      semantic tokens + visual presets
  blockGeometry.js    BlockGeometry    polar points, arcs, rings, tick rings, repeats
  blockBindings.js    BlockBindings    constant | parameter | variable | expression | formula
  blockPrimitives.js  registrations    circle ellipse rect line polyline polygon arc path text image group
  blockModifiers.js   registrations    translate rotate scale opacity visibility stroke fill mirror repeat z-order
  blockBehaviours.js  registrations    selectable hoverable tooltip drag-angle clickable …
  blockComponents.js  registrations    dial-face tick-ring hand needle arrow label + clock compass speedometer vector orbit
  blockRegistry.js    BuildingBlockRegistry   the single catalogue (UI, compiler, validator and agent all read it)
  blockValidator.js   BlockValidator   schema / semantic / runtime-safety / visual checks
  blockCompiler.js    BlockCompiler    definition + parameters + context → flat render nodes (deterministic)
  blockRenderer.js    BlockRenderer    render nodes → SVG markup
  blockAgentTools.js  BlockAgentTools  agent-safe tool surface derived from the registry
scripts/editors/board/widgets/ComponentWidget.js   ComponentShape extends BaseShape
scripts/shapes/componentShape/ComponentShapeToolbar.js
```

Boundary rules:

* **Primitives** know only geometry and appearance. No domain words.
* **Modifiers** are serializable transforms over a node or a group.
* **Behaviours** are metadata plus an optional runtime hook the host widget applies; they
  never draw.
* **Bindings** are declarative and resolve through the existing calculator; the only
  executable path is `Modellus.Parser`.
* **Components** are declarative trees of the above, with a typed parameter list. They do
  not get their own renderer class.

### 4.1 Key decision: parameters are shape properties

Component parameter values are stored as ordinary flat entries in `shape.properties`
(`properties.hourTerm`, `properties.faceColor`, …) and only the *structure* lives in
`properties.definition`. This is what makes the slice integrate with everything already
built: property editing, `SetShapePropertiesCommand` undo/redo, copy/paste, collaboration
snapshots, serialization and the existing `TermControl` all work unchanged, because they
all operate on `shape.properties`.

## 5. Migration risks

| Risk | Mitigation |
| --- | --- |
| Rewriting a live shape regresses rendering or interaction | Do not rewrite first. Add the new path beside the old one; convert shapes only behind tests. |
| Serialized documents break | New shape type (`ComponentShape`) is additive; `schemaVersion` is written into `properties.definition` from day one, with `BlockMigrations` applying version upgrades on load. Legacy shapes keep their exact format. |
| Compiler drift between preview and board | One compiler, one renderer, used by the widget, the preview and the agent tool. No separate AI path. |
| Agent injects unsafe content | Registry-gated node types, no `eval`/`Function`, expressions parsed by the engine only, URL scheme allow-list, node/depth/repeat limits, validation required before insert. |
| Performance regressions from recompiling every frame | Compile output is deterministic; the renderer diffs the produced markup signature and only writes DOM when it changes. |
| Half-finished migration leaves two idioms | Documented migration order (§6) and a catalogue that records which blocks each converted shape uses. |

## 6. Recommended implementation sequence

1. Tokens and shared geometry. *(done — `designTokens.js`, `blockGeometry.js`)*
2. Primitives + modifiers + renderer. *(done)*
3. Bindings and expressions. *(done)*
4. Behaviours. *(done for the subset with runtime hooks; the rest are registered metadata)*
5. Canonical registry. *(done)*
6. Compiler + validator. *(done)*
7. First simple existing shape decomposed onto the blocks — arc/dial geometry of
   `GaugeShape` and `ProtractorShape` now comes from `BlockGeometry`. *(done)*
8. Analogue clock reference component. *(done)*
9. Three further components proving reuse: compass, speedometer, rotating vector, orbit
   system. *(done)*
10. Agent tool adapter. *(done)*
11. Custom component persistence and discovery. *(done — `save_custom_component` writes into
    the registry for the session and into the document via the component definition)*
12. Convert the remaining shapes. *(planned — see `migration-plan.md`)*

## 7. What the first vertical slice delivers

`registered primitives → component definition → binding → validation → compilation →
rendering → editing → serialization → agent tools → tests`, demonstrated by the analogue
clock:

* `ComponentShape` renders any registered component; there is no `ClockShape` class.
* Clock hand angles are expression bindings over model variables, evaluated by the
  Modellus engine.
* The clock is edited with the ordinary shape toolbar (colours, name, parameters, terms).
* The same primitives build a compass, a speedometer, a rotating vector and a solar system.
* The agent discovers blocks, drafts an object, gets structured errors, corrects, validates,
  previews and inserts — through `BlockAgentTools`, with no arbitrary code path.
