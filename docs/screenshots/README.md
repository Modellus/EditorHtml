# Screenshots Guide

Place annotated screenshots in this folder. They are referenced by the documentation pages.

## Naming Convention

Use descriptive kebab-case names:
- `editor-overview.png` — Full editor with shapes visible
- `expression-toolbar.png` — Expression shape toolbar close-up
- `expression-shortcuts-picker.png` — Shortcuts dropdown open
- `expression-properties.png` — Properties panel for expression
- `table-overview.png` — Table shape with data
- `table-cell-selection.png` — Cells highlighted for regression
- `table-regression-dropdown.png` — Regression method picker
- `chart-overview.png` — Chart with multiple series
- `chart-regression-overlay.png` — Scatter + regression line
- `chart-outliers.png` — Outlier points marked
- `body-overview.png` — Body shape with character
- `body-toolbar.png` — Body toolbar
- `point-overview.png` — Point in referential
- `line-overview.png` — Line shape
- `arc-overview.png` — Arc / angle display
- `vector-overview.png` — Vector arrows
- `slider-overview.png` — Slider control
- `gauge-overview.png` — Gauge dial
- `value-overview.png` — Value readout
- `media-overview.png` — Image on board
- `text-overview.png` — Text annotation
- `ruler-overview.png` — Ruler tool
- `protractor-overview.png` — Protractor tool
- `referential-overview.png` — Coordinate system
- `question-overview.png` — Question shape

## Capture Guidelines

- Capture at 2× resolution (Retina) for crisp display
- Export as PNG (lossless) or WebP (smaller files)
- Target width: 800px (displayed) / 1600px (actual)
- Use a clean model state — remove clutter before capturing
- Annotate with numbered callouts where needed (red circles with white numbers)
- Keep consistent padding around the captured element

## Automation

You can automate captures using Playwright (already configured in this project):
```js
await page.screenshot({ path: 'docs/screenshots/editor-overview.png', fullPage: false });
```
