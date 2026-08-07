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
| `fontSize` | number | 11 | min 1, max 400 |
| `fontFamily` | string | "Inter, Segoe UI, sans-serif" |  |
| `fontWeight` | number | 400 | min 100, max 900 |
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
| `centerX` | number | 0 |  |
| `centerY` | number | 0 |  |
| `degreesPerUnit` | number | 6 |  |
| `offsetDegrees` | number | 0 |  |
| `minimum` | number | null |  |
| `maximum` | number | null |  |
| `wrapAt` | number | null |  |

### `drag-rotate` — Drag rotate

Lets the user turn the node around an anchor point by dragging it. The variable moves by the angle the pointer travels, so the grabbed point follows the pointer instead of jumping to it, which is what a rose, a bezel or a dial ring needs.

Capabilities: `interaction`, `angular`, `writes-model`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `variable` | variable | "" |  |
| `property` | string | "" |  |
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

### `hoverable` — Hoverable

The node reacts to pointer hover with the standard highlight cursor.

Capabilities: `interaction`

| Property | Type | Default | Range |
| --- | --- | --- | --- |
| `cursor` | string | "pointer" |  |

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

## Components

### `analogue-clock` — Analogue clock

Clock face with hour, minute and optional second hands whose angles come from model variables or expressions.

Capabilities: `radial`, `angular`, `reads-model`, `interaction`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `hourVariable` | variable | "0" |  |
| `minuteVariable` | variable | "0" |  |
| `secondVariable` | variable | "0" |  |
| `showSecondHand` | boolean | true |  |
| `showNumbers` | boolean | true |  |
| `showMinuteTicks` | boolean | true |  |
| `faceColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
| `handColor` | colour | "token:stroke.strong" |  |
| `secondHandColor` | colour | "token:stroke.warning" |  |
| `numberColor` | colour | "token:text.primary" |  |
| `interactive` | boolean | false |  |

### `calculator` — Calculator

Four-function calculator whose working is held by the object itself. Term keys load the value a model variable has at the iteration on screen, and the result can be written back into a model variable.

Capabilities: `interaction`, `textual`, `reads-model`, `writes-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `n` | number | 0 |  |
| `a` | number | 0 |  |
| `p` | number | 0 |  |
| `s` | number | 0 |  |
| `dp` | number | 0 |  |
| `ad` | number | 0 |  |
| `fresh` | number | 0 |  |
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

### `compass` — Compass

Compass rose with cardinal labels, a needle whose heading comes from a model variable and a rose that a second variable can turn. The needle and the rim of the rose can be dragged to write those variables back.

Capabilities: `radial`, `angular`, `reads-model`, `interaction`, `writes-model`

| Parameter | Type | Default | Range |
| --- | --- | --- | --- |
| `headingVariable` | variable | "0" |  |
| `rotationVariable` | variable | "0" |  |
| `showDegrees` | boolean | false |  |
| `faceColor` | colour | "token:surface.default" |  |
| `borderColor` | colour | "token:stroke.default" |  |
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
| `fontWeight` | number | 400 | min 100, max 900 |
| `color` | colour | "token:text.primary" |  |

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

## Example: analogue clock bound to model variables

```js
const draft = modellus.blocks.execute('create_object_draft', { name: 'Clock', componentType: 'analogue-clock' });
modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'hourVariable', variable: 'hour' });
modellus.blocks.execute('bind_variable', { draftId: draft.draftId, nodeId: 'root', property: 'minuteVariable', variable: 'minute' });
modellus.blocks.execute('validate_object', { draftId: draft.draftId });
modellus.blocks.execute('render_object_preview', { draftId: draft.draftId });
modellus.blocks.execute('insert_object', { draftId: draft.draftId });
```
