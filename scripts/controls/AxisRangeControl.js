// How far an axis runs, edited in one place. A minimum and a maximum sit side by side on one row,
// with whatever else that axis needs after them — the chart puts the 0/π switch there. The chart
// keeps its range in a domain override, an object built from blocks keeps it in two of its own
// parameters; both hand this control a way to read a bound and a way to write one, and neither
// draws a pair of number boxes of its own. The axes it edits are named by the caller: a chart names
// the two directions it plots in, a frequency chart the two value scales it reads its series
// against.
class AxisRangeControl {
    constructor(options) {
        this.options = options;
        this.axes = options.axes ?? ["x", "y"];
        this.boxes = {};
    }

    createRow(axis) {
        const wrapper = $('<div style="display: flex; gap: 6px;">');
        this.createBox(wrapper, axis, "Min");
        this.createBox(wrapper, axis, "Max");
        const trailing = this.options.trailing ? this.options.trailing(axis) : null;
        if (trailing)
            trailing.appendTo(wrapper);
        return wrapper;
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
            }
        };
        const editorOptions = this.options.editorOptions
            ? this.options.editorOptions(boxOptions)
            : Utils.getNumericEditorOptions(Object.assign({ showSpinButtons: false, stylingMode: "filled" }, boxOptions));
        $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(editorOptions);
    }

    isDisabled(axis) {
        return this.options.isDisabled ? this.options.isDisabled(axis) === true : false;
    }

    refresh() {
        for (const axis of this.axes) {
            for (const bound of ["Min", "Max"])
                this.boxes[`${axis}${bound}`]?.option({ value: this.options.read(axis, bound), disabled: this.isDisabled(axis) });
        }
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = AxisRangeControl;
