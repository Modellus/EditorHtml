# Migration plan for the remaining shapes

Status after the first vertical slice. Nothing here has been removed or rewritten: the block
layer was added beside the existing shapes, and `ComponentShape` is a new, additive shape type.

## What has moved so far

| Shape | Change | Blocks extracted |
| --- | --- | --- |
| `GaugeShape` | `getArcPoint()` and `buildAnnularSectorPath()` now delegate to `BlockGeometry` | `polarPoint`, `annularSectorPath` |
| `ProtractorShape` | `getArcPoint()` and the full-circle ring path now delegate to `BlockGeometry` | `polarPoint`, `ringPath` |
| `ChartControl` | scales, series points, line/area paths, bar layout and the equal-scales domain now delegate to `BlockChartGeometry`; `render()` splits into `buildRenderPlan()` / `applyClipRects()` / `paintChart()` | `chart`, `chart-frame`, `chart-grid`, `chart-axes`, `chart-series`, `chart-bars`, `clip` |
| — (new) | `BlockChartShape`: the chart, drawn from those blocks, behaving like `ChartShape` in every other way | — |
| — (new) | analogue clock, compass, speedometer, circular gauge, rotating vector, orbit system | the whole primitive/modifier/behaviour/component set |

Covered by `tests/gauge.spec.js`, `tests/shape-flip.spec.js`, `tests/rotated-handles.spec.js`,
`tests/chart-shape.spec.js` (existing), `tests/block-chart-shape.spec.js` and the three component
specs.

## Strategy per existing shape

Three strategies were considered (§"Serialization and versioning" of the brief). The chosen
default is **(1) keep the legacy representation and adapt at runtime**, because the current
persistence model has no schema version and documents in the wild store the class name as the
shape `type`. Converting a shape means the same `type` string keeps working while the class
delegates more of its drawing to blocks; the serialized properties never change. Where a shape
is genuinely re-expressible as a component, strategy (2) applies at *insert* time only — new
objects are created as `ComponentShape`, existing documents keep the legacy shape.

| Wave | Shapes | Strategy | Blocks to extract first | Risk |
| --- | --- | --- | --- | --- |
| 1 | `ArcShape`, `LineShape` | runtime adaptation | arc path building, tip/arrow markers | low — geometry only |
| 2 | `VectorShape`, `SlopeShape` | runtime adaptation | `arrow` component, projection lines, angle labels | medium — dense interaction code |
| 3 | `RulerShape`, `ProtractorShape` | runtime adaptation | `tick-ring`, linear tick strip, `label-ring` | medium — log ticks (`logTicks.js`) need a `scale` block |
| 4 | `GaugeShape` | new inserts become `speedometer`/`circular-gauge`; existing stay | value↔angle mapping, colour ranges as `arc` bands, crosshair | medium — pointer drag already mirrored by `drag-angle` |
| 5 | `PointShape`, `BodyShape` | runtime adaptation | trajectory polyline, stroboscopy ghosts, character sprite | high — the motion layer is shared and performance-sensitive |
| 6 | `MindMap*Shape` | runtime adaptation | rounded-box/bubble/ellipse nodes, connector routing | medium — connector attachment logic is independent of drawing |
| 7 | `ReferentialShape` | not converted for now | axis/grid components can be extracted for reuse | high — it is the coordinate system every child depends on |
| done | `ChartShape` | new inserts may be `BlockChartShape`; existing charts stay | chart geometry, `chart` and its parts, `clip` | done — the two drawings are held to the same geometry by `tests/block-chart-shape.spec.js` |
| — | `Table*Shape`, `ExpressionShape`, `TextShape`, `MediaShape`, `QuestionShape`, `SliderShape` | not candidates | — | these are DevExtreme/HTML overlays, not SVG geometry; the block layer would add nothing |

## Rules for each conversion

1. Write the block extraction first, with unit assertions in `tests/component-blocks.spec.js`.
2. Point the existing shape at the block. Do not change its property names, its serialized
   output, its handles or its toolbar in the same commit.
3. Re-run that shape's existing spec; add a regression spec if none exists.
4. Record the extracted blocks in this table.
5. Only then consider expressing the shape as a component definition, and only for newly
   inserted objects.

## Open items

* **Notebook editor.** `pages/notebook/index.html` does not load the block layer and has its own
  placeholder blocks (`scripts/editors/notebook/blocks/`). A `ComponentBlock` wrapper is the
  natural next step; it needs the same script includes and a notebook-side toolbar adapter.
* **Custom component persistence.** `save_custom_component` registers a component for the session
  and the inserted object carries its own definition, so documents stay self-contained. Sharing a
  custom component across documents needs a store (model file section or API), not yet designed.
* **Visual regression snapshots.** Compilation is deterministic, so
  `BlockRenderer.toMarkup(compilation.nodes)` is already a stable snapshot key; wiring it to
  Playwright's screenshot comparison for the presets and for pre/post-migration shapes is the
  remaining piece.
* **Design tokens for existing shapes.** `BlockTokens` currently serves components only. Migrating
  the hard-coded colours and widths in the legacy widgets to tokens is independent of the shape
  conversions and can be done at any time.
