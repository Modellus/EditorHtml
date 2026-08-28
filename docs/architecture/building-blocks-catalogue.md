# Agent-safe building-block catalogue

Generated from the live registry by `tests/component-catalogue.spec.js`.
Run `npx playwright test tests/component-catalogue.spec.js` after registering a block;
the test fails when this file no longer matches the registry.

## Primitives

### `arc` — Arc

Circular arc or annular sector measured clockwise from the start angle.

Capabilities: `fillable`, `strokable`, `radial`, `angular`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 40 | min 0 |
| `innerRadius` | number | 0 | min 0 |
| `startAngle` | number | 225 |  |
| `endAngle` | number | -45 |  |

### `circle` — Circle

Circle defined by a centre point and a radius.

Capabilities: `fillable`, `strokable`, `radial`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 40 | min 0 |

### `ellipse` — Ellipse

Ellipse defined by a centre point and two radii.

Capabilities: `fillable`, `strokable`, `radial`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radiusX` | number | 50 | min 0 |
| `radiusY` | number | 30 | min 0 |

### `group` — Group

Container that positions, rotates and scales its children as one unit.

Capabilities: `container`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |

Accepts children.

### `image` — Image

Bitmap or SVG image placed in a box. Only https:, data: and same-origin relative sources are allowed.

Capabilities: `sizable`, `media`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 60 | min 0 |
| `height` | number | 60 | min 0 |
| `href` | string | "" |  |
| `preserveAspectRatio` | string | "xMidYMid meet" |  |

### `line` — Line

Straight line segment between two points.

Capabilities: `strokable`, `linear`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `x1` | number | 0 |  |
| `y1` | number | 0 |  |
| `x2` | number | 100 |  |
| `y2` | number | 0 |  |

### `path` — Path

Raw SVG path data. Commands are restricted to the standard path grammar.

Capabilities: `fillable`, `strokable`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `d` | string | "" |  |

### `polygon` — Polygon

Closed sequence of connected points.

Capabilities: `fillable`, `strokable`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `points` | points | [] |  |

### `polyline` — Polyline

Open sequence of connected points.

Capabilities: `strokable`, `linear`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `points` | points | [] |  |

### `rect` — Rectangle

Axis-aligned rectangle with optional corner radius.

Capabilities: `fillable`, `strokable`, `sizable`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 100 | min 0 |
| `height` | number | 60 | min 0 |
| `cornerRadius` | number | 0 | min 0 |

### `ring` — Ring

Full annulus between an inner and an outer radius.

Capabilities: `fillable`, `strokable`, `radial`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `innerRadius` | number | 30 | min 0 |
| `outerRadius` | number | 40 | min 0 |

### `text` — Text

Single line of text anchored at a point.

Capabilities: `fillable`, `textual`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `fill` | colour | "none" |  |
| `stroke` | colour | "none" |  |
| `strokeWidth` | number | 1 | min 0, max 100 |
| `strokeDash` | string | "" |  |
| `strokeLinecap` | string | "round" | butt \| round \| square |
| `opacity` | number | 1 | min 0, max 1 |
| `visible` | boolean | true |  |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `text` | string | "" |  |
| `unit` | string | "" |  |
| `fontSize` | number | "token:font.size.default" | min 1, max 400 |
| `fontFamily` | string | "token:font.family" |  |
| `fontWeight` | number | "token:font.weight.default" | min 100, max 900 |
| `textAnchor` | string | "middle" | start \| middle \| end |
| `baseline` | string | "central" | auto \| central \| hanging |

## Modifiers

### `fill` — Fill

Overrides the fill colour of a node.

Capabilities: `style`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `color` | colour | null |  |

### `mirror` — Mirror

Mirrors a node about a horizontal or vertical axis through an anchor point.

Capabilities: `transform`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `axis` | string | "horizontal" | horizontal \| vertical |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |

### `opacity` — Opacity

Sets the opacity of a node or group.

Capabilities: `style`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `value` | number | 1 | min 0, max 1 |

### `repeat` — Repeat

Repeats the node it is applied to, offsetting each copy by an angle step, a translation or a scale. The copy index is available to bindings as the parameter $index.

Capabilities: `layout`, `structural`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `count` | number | 1 | min 0 |
| `angleStep` | number | 0 |  |
| `angleStart` | number | 0 |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `dx` | number | 0 |  |
| `dy` | number | 0 |  |

### `rotate` — Rotate

Rotates a node clockwise around an anchor point, in degrees.

Capabilities: `transform`, `angular`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `angle` | number | 0 |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |

### `scale` — Scale

Scales a node around an anchor point.

Capabilities: `transform`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `scaleX` | number | 1 |  |
| `scaleY` | number | 1 |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |

### `stroke` — Stroke

Overrides the stroke colour, width and dash pattern of a node.

Capabilities: `style`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `color` | colour | null |  |
| `width` | number | null | min 0 |
| `dash` | string | null |  |

### `translate` — Translate

Moves a node or group by an offset.

Capabilities: `transform`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `dx` | number | 0 |  |
| `dy` | number | 0 |  |

### `visibility` — Visibility

Shows or hides a node, typically bound to a model condition.

Capabilities: `style`, `conditional`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `visible` | boolean | true |  |

### `z-order` — Z order

Sorts siblings; higher values are drawn on top.

Capabilities: `layout`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `order` | number | 0 |  |

## Behaviours

### `clickable` — Clickable

Writes a value into a model variable or into a component parameter when the node is clicked. The value is a binding like any other, so a key can write what the model or the object itself currently holds rather than only a constant.

Capabilities: `interaction`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `variable` | variable | "" |  |
| `property` | string | "" |  |
| `value` | number | 0 |  |

### `drag-angle` — Drag angle

Lets the user drag the node around an anchor point and writes the resulting angle back into a model variable, using the same angle-to-value mapping the node was bound with.

Capabilities: `interaction`, `angular`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `variable` | variable | "" |  |
| `property` | string | "" |  |
| `verticalVariable` | variable | "" |  |
| `verticalProperty` | string | "" |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `degreesPerUnit` | number | 6 |  |
| `offsetDegrees` | number | 0 |  |
| `signed` | boolean | false |  |
| `minimum` | number | null |  |
| `maximum` | number | null |  |
| `wrapAt` | number | null |  |
| `hoverFill` | colour | "none" |  |
| `hoverOpacity` | number | 0.15 | min 0, max 1 |

### `drag-axis-tick` — Drag axis tick

Rescales an axis by dragging one of its ticks: the tick follows the pointer and the far end of the axis moves with it, writing the object's own maximum. The same interaction, and the same arithmetic, the chart's axes have.

Capabilities: `interaction`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `axis` | string | "x" | x \| y |
| `value` | number | 0 |  |
| `minimumProperty` | string | "" |  |
| `maximumProperty` | string | "" |  |
| `originPixel` | number | 0 |  |
| `lengthPixels` | number | 0 | min 0 |

### `drag-rotate` — Drag rotate

Lets the user turn the node around an anchor point by dragging it. The variable moves by the angle the pointer travels, so the grabbed point follows the pointer instead of jumping to it, which is what a rose, a bezel or a dial ring needs.

Capabilities: `interaction`, `angular`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `variable` | variable | "" |  |
| `property` | string | "" |  |
| `verticalVariable` | variable | "" |  |
| `verticalProperty` | string | "" |  |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `degreesPerUnit` | number | 1 |  |
| `minimum` | number | null |  |
| `maximum` | number | null |  |
| `wrapAt` | number | null |  |
| `hoverFill` | colour | "none" |  |
| `hoverOpacity` | number | 0.15 | min 0, max 1 |

### `draggable` — Draggable

The object can be moved with the move handle. Provided by the host shape for every component.

Capabilities: `interaction`

### `follow-pointer` — Follow pointer

Reports where the pointer is over the node, in the units the node is scaled in, so a drawing can show the value under the cursor. What is reported is not kept: it lasts as long as the pointer is over the node, and the model is not touched.

Capabilities: `interaction`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `xParameter` | string | "" |  |
| `yParameter` | string | "" |  |
| `activeParameter` | string | "" |  |
| `originX` | number | 0 |  |
| `originY` | number | 0 |  |
| `scaleX` | number | 1 |  |
| `scaleY` | number | -1 |  |
| `minimumX` | number | null |  |
| `maximumX` | number | null |  |
| `minimumY` | number | null |  |
| `maximumY` | number | null |  |

### `forget` — Forget

Empties one of the object's memories when the node is clicked.

Capabilities: `interaction`, `memory`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `memory` | string | "" |  |

### `hoverable` — Hoverable

The node reacts to pointer hover with the standard highlight cursor.

Capabilities: `interaction`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `cursor` | string | "pointer" |  |

### `keep-time` — Keep time

A transport key for a reading of the clock: play sets it counting real time from wherever it stands, pause holds it there, and stop ends the run and clears it. A key set to toggle is both — it starts a clock standing still and holds a clock that is counting, so one key does the work of two. What is counted is written into the four parts of the reading — the hours, the minutes, the seconds and the thousandths — each into the term that part names, or into the object's own property when it names a plain number instead. The whole run is one edit.

Capabilities: `interaction`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `action` | string | "play" | play \| pause \| stop \| toggle |
| `hourVariable` | variable | "" |  |
| `hourProperty` | string | "" |  |
| `minuteVariable` | variable | "" |  |
| `minuteProperty` | string | "" |  |
| `secondVariable` | variable | "" |  |
| `secondProperty` | string | "" |  |
| `millisecondVariable` | variable | "" |  |
| `millisecondProperty` | string | "" |  |
| `runningParameter` | string | "" |  |
| `intervalMs` | number | 33 | min 10, max 1000 |

### `press-and-slide` — Press and slide

A control the reader holds down: pressing keeps the value where it is, sliding the pointer up raises it and down lowers it, by however far it travelled, and letting go lets the value fall back to its resting value a step at a time. It is what a pedal or a throttle needs — nothing is written by pressing alone, and the whole gesture, the fall back included, is one edit.

Capabilities: `interaction`, `linear`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `variable` | variable | "" |  |
| `property` | string | "" |  |
| `verticalVariable` | variable | "" |  |
| `verticalProperty` | string | "" |  |
| `bearing` | number | null |  |
| `unitsPerPixel` | number | 1 |  |
| `restValue` | number | 0 |  |
| `returnStep` | number | 0 | min 0 |
| `intervalMs` | number | 100 | min 20, max 5000 |
| `minimum` | number | null |  |
| `maximum` | number | null |  |
| `hoverFill` | colour | "none" |  |
| `hoverOpacity` | number | 0.15 | min 0, max 1 |

### `remember` — Remember

Appends a row to one of the object's memories when the node is clicked. A row carries a label and two numbers, all of them bindings, so a key records what the object held at the moment it was pressed.

Capabilities: `interaction`, `memory`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `memory` | string | "" |  |
| `text` | string | "" |  |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `limit` | number | 50 | min 1, max 2000 |

### `resizable` — Resizable

The object can be resized with the corner handles. Provided by the host shape for every component.

Capabilities: `interaction`

### `respond-to-simulation` — Respond to simulation updates

Marks the object as redrawing on every simulation tick. Components with model bindings get this automatically.

Capabilities: `simulation`

### `rotatable` — Rotatable

The object can be rotated with the rotation handle. Provided by the host shape for every component.

Capabilities: `interaction`

### `selectable` — Selectable

The object can be selected on the board. Provided by the host shape for every component.

Capabilities: `interaction`

### `tooltip` — Tooltip

Shows a native tooltip with a fixed or bound text when the pointer rests on the node.

Capabilities: `interaction`, `textual`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `text` | string | "" |  |

### `track-pointer` — Track pointer

Records where the pointer is while it is dragged over the node, one sample every sampling interval, into one of the object's memories. The sample is written in the units the node is scaled in, so what is recorded is a pair of values rather than a pair of pixels — and when the memory names model terms, the run becomes the values those terms take, iteration by iteration. Nothing is recorded until the pointer travels: a click that never moves leaves the memory alone, and a drag opens its run at the point the pointer went down.

Capabilities: `interaction`, `memory`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `memory` | string | "" |  |
| `mode` | string | "replace" | replace \| append |
| `xVariable` | string | "" |  |
| `xProperty` | string | "" |  |
| `yVariable` | string | "" |  |
| `yProperty` | string | "" |  |
| `limit` | number | 600 | min 1, max 2000 |
| `sampleMs` | number | 33 | min 10, max 1000 |
| `minimumMovePixels` | number | 0 | min 0, max 50 |
| `breakOnDrag` | boolean | false |  |
| `originX` | number | 0 |  |
| `originY` | number | 0 |  |
| `scaleX` | number | 1 |  |
| `scaleY` | number | -1 |  |
| `minimumX` | number | null |  |
| `maximumX` | number | null |  |
| `minimumY` | number | null |  |
| `maximumY` | number | null |  |

## Components

### `calculator` — Calculator

Calculator whose working is held by the object itself: four functions on a narrow one, and a scientific pad of powers, roots, trigonometry and logarithms beside the digits once it is wide enough to hold one. Term keys load the value a model variable has at the iteration on screen, the result can be written back into a model variable, and every completed operation is kept in a history the object remembers and can be read back from.

Capabilities: `interaction`, `textual`, `reads-model`, `writes-model`, `memory`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `n` | number | 0 |  |
| `a` | number | 0 |  |
| `p` | number | 0 |  |
| `s` | number | 0 |  |
| `dp` | number | 0 |  |
| `ad` | number | 0 |  |
| `fresh` | number | 0 |  |
| `inv` | number | 0 |  |
| `history` | memory | [] |  |
| `termA` | variable | "" |  |
| `termB` | variable | "" |  |
| `termC` | variable | "" |  |
| `termD` | variable | "" |  |
| `keyAColor` | colour | "token:surface.muted" |  |
| `keyBColor` | colour | "token:surface.muted" |  |
| `keyCColor` | colour | "token:surface.muted" |  |
| `keyDColor` | colour | "token:surface.muted" |  |
| `resultVariable` | variable | "" |  |
| `digits` | number | 2 | min 0, max 6 |
| `scientific` | boolean | true |  |
| `angleUnit` | string | "radians" | radians \| degrees |
| `showHistory` | boolean | true |  |
| `historyLimit` | number | 24 | min 1, max 200 |
| `bodyColor` | colour | "token:surface.emphasis" |  |
| `displayColor` | colour | "token:surface.default" |  |
| `keyColor` | colour | "token:surface.default" |  |
| `functionKeyColor` | colour | "token:surface.muted" |  |
| `accentColor` | colour | "token:stroke.accent" |  |
| `borderColor` | colour | "token:stroke.subtle" |  |
| `textColor` | colour | "token:text.primary" |  |
| `accentTextColor` | colour | "token:text.inverse" |  |
| `mutedTextColor` | colour | "token:text.secondary" |  |

### `circular-gauge` — Circular gauge

Ring gauge that fills clockwise in proportion to a model variable.

Capabilities: `radial`, `angular`, `reads-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `valueVariable` | variable | "0" |  |
| `minimum` | number | 0 |  |
| `maximum` | number | 100 |  |
| `startAngle` | number | 90 |  |
| `spanAngle` | number | 360 | min 1, max 360 |
| `thickness` | number | 0.22 | min 0.02, max 1 |
| `trackColor` | colour | "token:surface.muted" |  |
| `fillColor` | colour | "token:stroke.accent" |  |
| `labelColor` | colour | "token:text.primary" |  |
| `digits` | number | 0 | min 0, max 6 |
| `unit` | string | "" |  |
| `showReadout` | boolean | true |  |

### `clock` — Clock

Clock reading the hour, minute, second and millisecond a model gives it, or reading the model's own time as a count of seconds, shown either as a face with a hand for each or as a digital readout of the same time. The seconds and the milliseconds can each be left out, and what is left out goes from the face and from the readout alike. Run by its own keys it is a stopwatch: one key starts and holds it, one takes a lap, and one ends the run — and the laps it has taken are kept in a list of their own under the face.

Capabilities: `radial`, `angular`, `reads-model`, `textual`, `interaction`, `memory`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `syncedWithPlayer` | boolean | false |  |
| `hourVariable` | variable | "0" |  |
| `minuteVariable` | variable | "0" |  |
| `secondVariable` | variable | "0" |  |
| `millisecondVariable` | variable | "0" |  |
| `shownAs` | string | "analogue" | analogue \| digital |
| `showControls` | boolean | false |  |
| `showLaps` | boolean | false |  |
| `faceColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `hourColor` | colour | "token:stroke.strong" |  |
| `minuteColor` | colour | "token:stroke.strong" |  |
| `secondColor` | colour | "token:stroke.warning" |  |
| `millisecondColor` | colour | "#00000000" |  |
| `numberColor` | colour | "token:text.primary" |  |
| `buttonColor` | colour | "token:surface.muted" |  |
| `running` | number | 0 |  |
| `laps` | memory | [] |  |

### `compass` — Compass

Compass rose with cardinal labels, a needle whose heading comes from a model variable and a rose that a second variable can turn. The needle and the rim of the rose can be dragged to write those variables back.

Capabilities: `radial`, `angular`, `reads-model`, `interaction`, `writes-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `headingVariable` | variable | "0" |  |
| `rotationVariable` | variable | "0" |  |
| `pointers` | terms | [] |  |
| `showDegrees` | boolean | false |  |
| `faceColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `tickColor` | colour | "token:stroke.subtle" |  |
| `needleColor` | colour | "token:stroke.warning" |  |
| `tailColor` | colour | "token:stroke.subtle" |  |
| `labelColor` | colour | "token:text.primary" |  |

### `dial-face` — Dial face

Circular face with an optional bezel ring, used as the background of clocks, gauges and compasses.

Capabilities: `radial`, `background`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 80 | min 1 |
| `faceColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `borderWidth` | number | 2 | min 0, max 40 |
| `bezelWidth` | number | 0 | min 0, max 60 |
| `bezelColor` | colour | "token:surface.emphasis" |  |

### `key-cap` — Key cap

Rounded key with a centred label. It carries no interaction of its own: put it inside a group and give that group the behaviour the key performs, so the same cap serves a keypad, a legend or a toolbar.

Capabilities: `sizable`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 44 | min 0 |
| `height` | number | 32 | min 0 |
| `label` | string | "" |  |
| `fill` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.subtle" |  |
| `borderWidth` | number | 1 | min 0 |
| `cornerRadius` | number | 6 | min 0 |
| `labelColor` | colour | "token:text.primary" |  |
| `fontSize` | number | 14 | min 1 |
| `fontWeight` | number | 500 | min 100, max 900 |

### `label-ring` — Label ring

Numeric or text labels placed evenly around a centre, always drawn upright.

Capabilities: `radial`, `angular`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 60 | min 1 |
| `count` | number | 12 | min 0, max 360 |
| `startAngle` | number | 90 |  |
| `spanAngle` | number | 360 |  |
| `includeEnd` | boolean | false |  |
| `startValue` | number | 12 |  |
| `valueStep` | number | 1 |  |
| `wrapAt` | number | 12 | min 0 |
| `digits` | number | 0 | min 0, max 6 |
| `texts` | string | "" |  |
| `fontSize` | number | 12 | min 1 |
| `fontFamily` | string | "token:font.family" |  |
| `fontWeight` | number | 400 | min 100, max 900 |
| `color` | colour | "token:text.primary" |  |

### `mechanical-wave` — Mechanical wave

A mechanical wave drawn as a chain of oscillators, each receiving the disturbance with the delay of its distance from the source.

Capabilities: `reads-model`, `oscillation`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `displacement` | variable | "" |  |
| `amplitude` | variable | "2" |  |
| `frequency` | variable | "0.5" |  |
| `speed` | variable | "5" |  |
| `phase` | variable | "0" |  |
| `length` | number | 20 | min 0.001 |
| `elements` | number | 30 | min 2, max 200 |
| `orientation` | string | "transverse" | transverse \| longitudinal |
| `wavefront` | boolean | true |  |
| `elementSize` | number | 4 | min 1, max 30 |
| `referenceIndex` | number | 1 | min 0, max 200 |
| `showArrows` | boolean | false |  |
| `showLine` | boolean | false |  |
| `waveColor` | colour | "token:stroke.accent" |  |
| `referenceColor` | colour | "token:stroke.strong" |  |

### `memory-list` — Memory list

The rows of a memory drawn as a list, newest first, with the label on the left and the number on the right. Rows can carry actions, so choosing one puts what it holds back into the object.

Capabilities: `memory`, `textual`, `interaction`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `rows` | object | [] |  |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 120 | min 0 |
| `height` | number | 160 | min 0 |
| `rowHeight` | number | 20 | min 6 |
| `order` | string | "newest" | newest \| oldest |
| `layout` | string | "row" | row \| stacked |
| `digits` | number | 2 | min 0, max 6 |
| `fontSize` | number | "token:font.size.default" | min 1 |
| `textColor` | colour | "token:text.secondary" |  |
| `valueColor` | colour | "token:text.primary" |  |
| `rowColor` | colour | "none" |  |
| `cornerRadius` | number | 4 | min 0 |
| `emptyText` | string | "" |  |
| `rowActions` | object | [] |  |

### `memory-trace` — Memory trace

The path the rows of a memory draw, mapped from the values they hold to the pixels of a plot with the same origin and scale the recording used.

Capabilities: `memory`, `linear`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `rows` | object | [] |  |
| `originX` | number | 0 |  |
| `originY` | number | 0 |  |
| `scaleX` | number | 1 |  |
| `scaleY` | number | -1 |  |
| `color` | colour | "token:stroke.accent" |  |
| `lineWidth` | number | 2 | min 0 |
| `opacity` | number | 1 | min 0, max 1 |
| `shownRows` | number | 0 | min 0 |
| `showPoints` | boolean | false |  |
| `pointRadius` | number | 1.5 | min 0 |
| `clipX` | number | 0 |  |
| `clipY` | number | 0 |  |
| `clipWidth` | number | 0 | min 0 |
| `clipHeight` | number | 0 | min 0 |

### `mouse-tracker` — Mouse tracker

Records where the pointer goes across the plot, against a horizontal and a vertical axis. Every drag adds to what is already there, drawn as a line of its own, so several of them build one recording made of separate runs. A click records nothing: the plot is only written to by a gesture that travels. The run is measurements: name a variable for each axis and it takes the value of sample n at iteration n, so the model's own player replays the gesture and everything reading those variables moves with it. A variable the model works out for itself is read rather than written: the gesture says where the model's input now stands, the definitions say what comes out of it, and that is the value the line is drawn through and the value the run remembers, so a recording made against a definition is in the model's own coordinates. The marker showing the sample on screen can be any character from the catalogue, placed by its pivot point.

Capabilities: `interaction`, `memory`, `linear`, `writes-model`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `samples` | memory | [] |  |
| `xVariable` | variable | "0" |  |
| `yVariable` | variable | "0" |  |
| `xVariableUnit` | string | "" |  |
| `yVariableUnit` | string | "" |  |
| `xValueColor` | colour | "token:axis.color" |  |
| `yValueColor` | colour | "token:axis.color" |  |
| `characterKey` | character | "" |  |
| `characterImage` | string | "" |  |
| `characterPivotX` | number | 0.5 |  |
| `characterPivotY` | number | 0.5 |  |
| `characterAspect` | number | 1 |  |
| `hoverX` | number | 0 |  |
| `hoverY` | number | 0 |  |
| `hovering` | number | 0 |  |
| `autoScale` | boolean | false |  |
| `equalScales` | boolean | false |  |
| `minimumX` | number | 0 |  |
| `maximumX` | number | 10 |  |
| `minimumY` | number | 0 |  |
| `maximumY` | number | 10 |  |
| `perStep` | boolean | false |  |
| `showGrid` | boolean | false |  |
| `showTicks` | boolean | false |  |
| `ticks` | number | 5 | min 2, max 11 |
| `backgroundColor` | colour | "token:surface.default" |  |
| `dataAreaColor` | colour | "token:surface.default" |  |
| `axisColor` | colour | "token:axis.color" |  |
| `valueColor` | colour | "token:stroke.warning" |  |
| `foregroundColor` | colour | "token:axis.labelColor" |  |
| `borderColor` | colour | "token:stroke.subtle" |  |

### `orbit-system` — Orbit system

Central body with up to four orbiting bodies whose angular positions come from model variables or from simulation time and an orbital period.

Capabilities: `radial`, `angular`, `reads-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `timeVariable` | variable | "t" |  |
| `bodyCount` | number | 3 | min 0, max 4 |
| `period1` | number | 4 | min 0.0001 |
| `period2` | number | 8 | min 0.0001 |
| `period3` | number | 16 | min 0.0001 |
| `period4` | number | 32 | min 0.0001 |
| `showOrbits` | boolean | true |  |
| `starColor` | colour | "#f08c02" |  |
| `bodyColor` | colour | "token:stroke.accent" |  |
| `orbitColor` | colour | "token:stroke.subtle" |  |

### `plot-axes` — Plot axes

Horizontal and vertical axis of a plot box, with tick marks and numbered labels. Any object that shows a value against a scale reads the same way a chart does.

Capabilities: `layout`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 100 | min 1 |
| `height` | number | 100 | min 1 |
| `minimumX` | number | 0 |  |
| `maximumX` | number | 10 |  |
| `minimumY` | number | 0 |  |
| `maximumY` | number | 10 |  |
| `ticksX` | number | 5 | min 2, max 41 |
| `ticksY` | number | 5 | min 2, max 41 |
| `showTicks` | boolean | true |  |
| `showLabels` | boolean | true |  |
| `showBorder` | boolean | false |  |
| `showZeroLines` | boolean | true |  |
| `minimumXProperty` | string | "" |  |
| `maximumXProperty` | string | "" |  |
| `minimumYProperty` | string | "" |  |
| `maximumYProperty` | string | "" |  |
| `color` | colour | "token:axis.color" |  |
| `labelColor` | colour | "token:axis.labelColor" |  |
| `fontFamily` | string | "token:font.family" |  |
| `fontSize` | number | "token:font.size.tick" | min 1 |
| `lineWidth` | number | "token:axis.strokeWidth" | min 0 |
| `tickLength` | number | "token:axis.tickLength" | min 0 |

### `plot-crosshair` — Plot crosshair

Dashed lines from a point out to both axes, with the value it stands at read on a badge against each one — the way a chart answers where a point is.

Capabilities: `layout`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 100 | min 1 |
| `height` | number | 100 | min 1 |
| `minimumX` | number | 0 |  |
| `maximumX` | number | 10 |  |
| `minimumY` | number | 0 |  |
| `maximumY` | number | 10 |  |
| `valueX` | number | 0 |  |
| `valueY` | number | 0 |  |
| `rows` | object | [] |  |
| `digits` | number | 2 | min 0, max 6 |
| `xUnit` | string | "" |  |
| `yUnit` | string | "" |  |
| `showBadges` | boolean | true |  |
| `color` | colour | "token:stroke.default" |  |
| `xColor` | colour | "" |  |
| `yColor` | colour | "" |  |
| `pointColor` | colour | "token:stroke.accent" |  |
| `axisBadgeColor` | colour | "token:axis.labelColor" |  |
| `badgeColor` | colour | "token:text.secondary" |  |
| `badgeTextColor` | colour | "token:text.inverse" |  |
| `fontFamily` | string | "token:font.family" |  |
| `fontSize` | number | "token:font.size.tick" | min 1 |

### `plot-grid` — Plot grid

Grid inside a plot box: one line at every tick of both axes, drawn the way the chart draws its own.

Capabilities: `layout`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 100 | min 1 |
| `height` | number | 100 | min 1 |
| `minimumX` | number | 0 |  |
| `maximumX` | number | 10 |  |
| `minimumY` | number | 0 |  |
| `maximumY` | number | 10 |  |
| `ticksX` | number | 5 | min 2, max 41 |
| `ticksY` | number | 5 | min 2, max 41 |
| `color` | colour | "token:grid.color" |  |
| `lineWidth` | number | "token:strokeWidth.default" | min 0 |

### `pointer-hand` — Pointer hand

A clock hand, gauge needle or compass pointer that rotates clockwise around an anchor. Angle 0 points up.

Capabilities: `angular`, `rotation`, `interaction`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `angle` | number | 0 |  |
| `length` | number | 60 | min 0 |
| `tailLength` | number | 0 | min 0 |
| `width` | number | 4 | min 0 |
| `color` | colour | "token:stroke.strong" |  |
| `style` | string | "needle" | needle \| line \| arrow |
| `dragVariable` | variable | "" |  |
| `dragProperty` | string | "" |  |
| `degreesPerUnit` | number | 6 |  |
| `offsetDegrees` | number | 0 |  |
| `wrapAt` | number | 0 | min 0 |

### `pointer-ring` — Pointer ring

Directions marked around a dial, one marker per row: a row names an angle, or a pair of values read as a vector — how far across and how far up. Each marker stands where the tick for its direction stands, so it is read against the same scale.

Capabilities: `radial`, `angular`, `reads-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 80 | min 1 |
| `length` | number | 14 | min 0 |
| `width` | number | 10 | min 0 |
| `startAngle` | number | 90 |  |
| `pointers` | object | [] |  |

### `rotating-vector` — Rotating vector

Phasor arrow whose angle and length come from model variables, with an optional reference circle and projections.

Capabilities: `angular`, `reads-model`, `vector`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `angleVariable` | variable | "0" |  |
| `lengthVariable` | variable | "1" |  |
| `lengthScale` | number | 1 | min 0 |
| `showCircle` | boolean | true |  |
| `showProjections` | boolean | false |  |
| `vectorColor` | colour | "token:stroke.accent" |  |
| `circleColor` | colour | "token:stroke.subtle" |  |
| `projectionColor` | colour | "token:stroke.subtle" |  |

### `seven-segment-display` — Seven-segment display

A reading spelled out in seven-segment lamps, the way a digital clock, a meter or a stopwatch shows one. Digits, the colon, the point and the minus sign are drawn as bars; the bars a character does not light are left showing faintly, the way the unlit ones on a real panel are. The text is fitted to the box it is given, so it is placed by handing it a box rather than a font size.

Capabilities: `sizable`, `textual`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `x` | number | 0 |  |
| `y` | number | 0 |  |
| `width` | number | 120 | min 0 |
| `height` | number | 40 | min 0 |
| `text` | string | "" |  |
| `color` | colour | "token:text.primary" |  |
| `colors` | string | "" |  |
| `ghostOpacity` | number | 0.12 | min 0, max 1 |
| `thickness` | number | 0.16 | min 0.02, max 0.4 |
| `digitWidth` | number | 0.56 | min 0.2, max 1.5 |
| `spacing` | number | 0.14 | min 0, max 1 |
| `slant` | number | 0 | min -30, max 30 |

### `speedometer` — Speedometer

Sweeping dial with a scale, a needle bound to a model variable and a numeric readout.

Capabilities: `radial`, `angular`, `reads-model`, `scale`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `valueVariable` | variable | "0" |  |
| `minimum` | number | 0 |  |
| `maximum` | number | 100 |  |
| `startAngle` | number | 225 |  |
| `endAngle` | number | -45 |  |
| `majorTicks` | number | 9 | min 2, max 60 |
| `minorPerMajor` | number | 4 | min 0, max 20 |
| `digits` | number | 0 | min 0, max 6 |
| `unit` | string | "" |  |
| `showReadout` | boolean | true |  |
| `faceColor` | colour | "token:surface.emphasis" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `needleColor` | colour | "token:stroke.warning" |  |
| `labelColor` | colour | "token:text.primary" |  |

### `steering-wheel` — Steering wheel

The controls a vehicle is driven with: a wheel turned by a model variable, drawn as a car wheel, a motorbike handlebar or a ship's helm, and the accelerator and brake of that same vehicle under it. The wheel, the pedals, and the brake among the pedals, can each be left out. Dragging the wheel turns it and writes back what it reads; the accelerator and the brake each press a value of its own up from zero, both above zero and both pressed the same way, each read the way the wheel is — a term, or a pair laid down along the bearing the wheel is turned to, forwards for the accelerator and back the other way for the brake.

Capabilities: `radial`, `angular`, `linear`, `reads-model`, `scale`, `interaction`, `writes-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `turnedBy` | string | "angle" | angle \| orientation |
| `angleVariable` | variable | "0" |  |
| `angleUpVariable` | variable | "0" |  |
| `accelerationVariable` | variable | "0" |  |
| `accelerationUpVariable` | variable | "0" |  |
| `brakingVariable` | variable | "0" |  |
| `brakingUpVariable` | variable | "0" |  |
| `wheelType` | string | "car" | car \| motor bike \| boat |
| `showWheel` | boolean | true |  |
| `showPedals` | boolean | false |  |
| `showBrake` | boolean | true |  |
| `brakeMaximum` | number | 100 | min 0 |
| `maximum` | number | 100 |  |
| `pedalReturnStep` | number | 10 | min 0 |
| `rimColor` | colour | "token:stroke.default" |  |
| `gripColor` | colour | "token:stroke.subtle" |  |
| `hubColor` | colour | "token:surface.muted" |  |
| `restingAngle` | number | 0 |  |
| `markColor` | colour | "token:stroke.warning" |  |
| `acceleratorColor` | colour | "token:stroke.accent" |  |
| `brakeColor` | colour | "token:stroke.warning" |  |
| `frameColor` | colour | "token:stroke.default" |  |
| `surfaceColor` | colour | "token:surface.muted" |  |

### `thermometer` — Thermometer

A temperature read as the height of a column: a bulb, a stem the liquid rises up, and a scale beside it marked every so many degrees. A dashed line carries the top of the column across to the scale, so the reading is placed against the marks the way a chart places a point against its axes. The column can be dragged to write the temperature back, and the marks and their numbers are the sizes the board's own axes are drawn to, so the scale stretches as the object is resized rather than the writing on it.

Capabilities: `linear`, `scale`, `reads-model`, `interaction`, `writes-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `valueVariable` | variable | "0" |  |
| `minimum` | number | -20 |  |
| `maximum` | number | 120 |  |
| `tickStep` | number | 20 | min 0 |
| `digits` | number | 1 | min 0, max 6 |
| `unit` | string | "°C" | °C \| °F |
| `showReadout` | boolean | true |  |
| `columnColor` | colour | "token:stroke.warning" |  |
| `glassColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `scaleColor` | colour | "token:axis.color" |  |
| `scaleLabelColor` | colour | "token:axis.labelColor" |  |
| `readoutColor` | colour | "token:text.primary" |  |

### `tick-ring` — Tick ring

Evenly spaced radial tick marks around a centre, with optional longer major ticks.

Capabilities: `radial`, `angular`, `scale`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `radius` | number | 80 | min 1 |
| `count` | number | 12 | min 0, max 720 |
| `startAngle` | number | 90 |  |
| `spanAngle` | number | 360 |  |
| `includeEnd` | boolean | false |  |
| `length` | number | 8 | min 0 |
| `width` | number | 1 | min 0 |
| `color` | colour | "token:stroke.default" |  |
| `majorEvery` | number | 0 | min 0 |
| `majorLength` | number | 12 | min 0 |
| `majorWidth` | number | 2 | min 0 |

## Example: clock bound to model variables

```js
const draft = modellus.blocks.execute('create_object_draft', { name: 'Clock', componentType: 'clock' });
modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'hourVariable', variable: 'hour' });
modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' });
modellus.blocks.execute('validate_object', { draftId: draft.draftId });
modellus.blocks.execute('render_object_preview', { draftId: draft.draftId });
modellus.blocks.execute('insert_object', { draftId: draft.draftId });
```
