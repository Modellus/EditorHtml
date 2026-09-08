// How an axis is read, edited in one place. Closed, the axis is a chip: the two ends it runs between,
// typeset as maths to the model's accuracy and in the shape's notation, the × that stands between
// the two terms on the toolbar standing between them, followed by a mark for each of the other
// choices the chip offers — whether its numbers are written as multiples of π, whether it is read
// linearly or logarithmically. Numbers written as decimals leave no mark, since a 0 standing after
// the ends would read as one of them. Opened, each of those stands on a row under a label of its
// own, the way a term's unit and colour do inside the term chip. The chart keeps its range in a
// domain override, an object built from blocks keeps it in two of its own parameters; both hand
// this control the shape the axis belongs to, a way to read a bound and a way to write one, and say
// which of the other choices the axis offers. The axes it edits are named by the caller: a chart
// names the two directions it plots in, a frequency chart the two value scales it reads its series
// against.
class AxisRangeControl {
    static bounds = ["Min", "Max"];
    static numbersItems = [{ key: "decimal", text: "0", mark: "" }, { key: "pi", text: "π", markLatex: "\\pi" }];
    static scaleItems = [{ key: "linear", text: "Scale Linear" }, { key: "logarithmic", text: "Scale Log" }];
    static popupWrapperClassName = "mdl-shape-overlay-popup mdl-shape-overlay-popup-nested mdl-nested-dropdown-popup mdl-term-chip-popup mdl-axis-chip-popup";

    constructor(options) {
        this.options = options;
        this.shape = options.shape;
        this.axes = options.axes ?? ["x", "y"];
        this.boxes = {};
        this.editors = {};
        this.pills = {};
    }

    translate(text) {
        return this.shape?.board?.translations?.get(text) ?? text;
    }

    // A bound is written on the chip the way a readout writes a value: to the model's accuracy, in
    // the shape's notation, and as maths — a power of ten stands as a real exponent, and the e
    // notation reads as the text a readout writes.
    static formatBoundLatex(value, precision, notation) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return "";
        const digits = Utils.normalizePrecision(precision);
        const rounded = Utils.roundValueForEditing(numeric, digits);
        if (!Utils.writesScientific(numeric, notation) && !Utils.isBigNumber(rounded))
            return rounded.toFixed(digits);
        const [mantissa, exponent] = numeric.toExponential(digits).split("e");
        const power = String(Number(exponent));
        if (Utils.normalizeNotation(notation) === "scientific")
            return `${mantissa}\\times10^{${power}}`;
        return `${mantissa}\\mathrm{e}${power.replace("-", "\\text{-}")}`;
    }

    static buildChipMathFieldMarkup(latex, className) {
        return `<math-field read-only class="form-math-field mdl-term-editor-math-field ${className}" style="height:auto;width:auto;display:inline-block">${latex}</math-field>`;
    }

    createChip(axis) {
        const host = $('<div class="mdl-axis-chip-host">');
        host.dxDropDownBox({
            value: null,
            acceptCustomValue: false,
            stylingMode: "filled",
            elementAttr: { class: "mdl-term-chip-editor mdl-axis-chip-editor", "data-axis": axis },
            onInitialized: event => { this.editors[axis] = event.component; },
            onContentReady: event => this.syncChip(axis, event.component),
            contentTemplate: (component, contentElement) => this.renderRows($(contentElement), axis),
            dropDownOptions: {
                container: document.body,
                width: "auto",
                wrapperAttr: { class: AxisRangeControl.popupWrapperClassName }
            },
            onOpened: () => this.refreshAxis(axis)
        });
        return host;
    }

    // The chip is written inside the editor's own input container, in front of an input the shared
    // chip style keeps at no width, so the closed field reads as the chip and nothing else.
    syncChip(axis, component = this.editors[axis]) {
        if (!component)
            return;
        const inputContainer = component.$element().find(".dx-texteditor-input-container").first();
        if (!inputContainer.length)
            return;
        inputContainer.find(".mdl-term-chip").remove();
        inputContainer.prepend(`<span class="mdl-term-chip mdl-axis-chip">${this.buildChipMarkup(axis)}</span>`);
    }

    buildChipMarkup(axis) {
        const bounds = AxisRangeControl.bounds.map(bound => this.buildBoundMarkup(axis, bound));
        const marks = this.getParts(axis).map(part => ({ part: part, markup: this.buildMarkMarkup(this.getSelectedItem(part, axis)) })).filter(mark => mark.markup !== "")
            .map(mark => `<span class="mdl-term-chip__mark mdl-axis-chip__mark mdl-axis-chip__${mark.part.name}-mark">${mark.markup}</span>`);
        return `${bounds.join('<i class="fa-light fa-x mdl-axis-chip__x"></i>')}${marks.join("")}`;
    }

    buildBoundMarkup(axis, bound) {
        const latex = this.formatBound(axis, bound);
        if (latex === "")
            return '<span class="mdl-axis-chip__bound mdl-axis-chip__bound-empty">—</span>';
        return AxisRangeControl.buildChipMathFieldMarkup(latex, "mdl-axis-chip__bound");
    }

    buildMarkMarkup(item) {
        if (item.markLatex)
            return AxisRangeControl.buildChipMathFieldMarkup(item.markLatex, "mdl-axis-chip__mark-field");
        return this.translate(item.mark ?? item.text);
    }

    formatBound(axis, bound) {
        return AxisRangeControl.formatBoundLatex(this.options.read(axis, bound), this.shape?.getModelPrecision?.() ?? 0, this.shape?.properties?.notation);
    }

    // The choices an axis offers besides its ends, in the order the chip marks them: how its numbers
    // are written, then how it is read. A caller offers a choice by handing over how to read it and
    // how to write it, and may keep it from an axis it does not apply to — a chart is read
    // logarithmically only up its vertical axis.
    getParts(axis) {
        const parts = [];
        if (this.options.numbers && this.showsPart(this.options.numbers, axis))
            parts.push({ name: "numbers", label: "Numbers", items: AxisRangeControl.numbersItems, ...this.options.numbers });
        if (this.options.scale && this.showsPart(this.options.scale, axis))
            parts.push({ name: "scale", label: "Scale", items: AxisRangeControl.scaleItems, ...this.options.scale });
        return parts;
    }

    showsPart(part, axis) {
        return part.show ? part.show(axis) === true : true;
    }

    getSelectedItem(part, axis) {
        const value = String(part.getValue(axis) ?? part.items[0].key);
        return part.items.find(item => item.key === value) ?? part.items[0];
    }

    renderRows(contentElement, axis) {
        const grid = $('<div class="mdl-term-editor-rows mdl-axis-chip-rows">').appendTo(contentElement);
        for (const bound of AxisRangeControl.bounds) {
            grid.append(`<span class="mdl-term-editor-row-label">${this.translate(bound === "Min" ? "Minimum" : "Maximum")}</span>`);
            this.createBox($('<div class="mdl-term-editor-row-control mdl-axis-chip-bound-row">').appendTo(grid), axis, bound);
        }
        for (const part of this.getParts(axis)) {
            grid.append(`<span class="mdl-term-editor-row-label">${this.translate(part.label)}</span>`);
            this.createPillGroup($('<div class="mdl-term-editor-row-control mdl-axis-chip-part-row">').appendTo(grid), part, axis);
        }
        requestAnimationFrame(() => grid.find(".mdl-pill-group").each((_, element) => Utils.movePillButtonGroup(element)));
    }

    // The box's own options are handed to the caller's factory rather than laid over what it
    // returns, so the factory's handlers - the ones that keep a value as it was typed - wrap
    // these instead of being replaced by them. The key the typed text is kept under is the
    // caller's to name, since only it knows where the bound is stored.
    createBox(wrapper, axis, bound) {
        const boxOptions = {
            value: this.options.read(axis, bound),
            placeholder: bound,
            disabled: this.isDisabled(axis),
            typedTextKey: this.options.typedTextKey ? this.options.typedTextKey(axis, bound) : undefined,
            onInitialized: event => { this.boxes[`${axis}${bound}`] = event.component; },
            onValueChanged: event => {
                if (this.isDisabled(axis))
                    return;
                this.options.write(axis, bound, event.value, event);
                this.syncChip(axis);
            }
        };
        const editorOptions = this.options.editorOptions
            ? this.options.editorOptions(boxOptions)
            : Utils.getNumericEditorOptions(Object.assign({ showSpinButtons: false, stylingMode: "filled" }, boxOptions));
        $('<div class="mdl-axis-range-box">').appendTo(wrapper).dxNumberBox(editorOptions);
    }

    createPillGroup(wrapper, part, axis) {
        $("<div>").appendTo(wrapper).dxButtonGroup({
            items: part.items.map(item => ({ key: item.key, text: this.translate(item.text) })),
            keyExpr: "key",
            selectedItemKeys: [this.getSelectedItem(part, axis).key],
            stylingMode: "outlined",
            elementAttr: { class: `mdl-pill-group mdl-axis-${part.name}-group`, "data-axis": axis },
            onInitialized: event => { this.pills[`${axis}${part.name}`] = event.component; },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onSelectionChanged: event => {
                if (event.addedItems.length === 0)
                    return;
                Utils.movePillButtonGroup(event.component.element()[0]);
                event.component.repaint();
                if (event.addedItems[0].key === this.getSelectedItem(part, axis).key)
                    return;
                part.onValueChanged(axis, event.addedItems[0].key);
                this.refresh();
            }
        });
    }

    isDisabled(axis) {
        return this.options.isDisabled ? this.options.isDisabled(axis) === true : false;
    }

    refresh() {
        for (const axis of this.axes)
            this.refreshAxis(axis);
    }

    // The rows are built once, the first time the chip is opened, and kept; what they show is written
    // again whenever the axis changes and every time the chip is opened.
    refreshAxis(axis) {
        for (const bound of AxisRangeControl.bounds)
            this.boxes[`${axis}${bound}`]?.option({ value: this.options.read(axis, bound), disabled: this.isDisabled(axis) });
        for (const part of this.getParts(axis)) {
            const pill = this.pills[`${axis}${part.name}`];
            if (!pill)
                continue;
            pill.option("selectedItemKeys", [this.getSelectedItem(part, axis).key]);
            requestAnimationFrame(() => Utils.movePillButtonGroup(pill.element()[0]));
        }
        this.syncChip(axis);
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = AxisRangeControl;
