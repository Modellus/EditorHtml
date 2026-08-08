// How far an axis runs, edited in one place. A minimum and a maximum sit side by side on one row,
// with whatever else that axis needs after them — the chart puts the 0/π switch there. The chart
// keeps its range in a domain override, an object built from blocks keeps it in two of its own
// parameters; both hand this control a way to read a bound and a way to write one, and neither
// draws a pair of number boxes of its own.
class AxisRangeControl {
    constructor(options) {
        this.options = options;
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

    createBox(wrapper, axis, bound) {
        const editorOptions = this.options.editorOptions ? this.options.editorOptions() : { showSpinButtons: false, stylingMode: "filled" };
        $('<div style="flex: 1;">').appendTo(wrapper).dxNumberBox(Object.assign(editorOptions, {
            value: this.options.read(axis, bound),
            placeholder: bound,
            disabled: this.isDisabled(axis),
            onInitialized: event => { this.boxes[`${axis}${bound}`] = event.component; },
            onValueChanged: event => {
                if (this.isDisabled(axis))
                    return;
                this.options.write(axis, bound, event.value);
            }
        }));
    }

    isDisabled(axis) {
        return this.options.isDisabled ? this.options.isDisabled(axis) === true : false;
    }

    refresh() {
        for (const axis of ["x", "y"]) {
            for (const bound of ["Min", "Max"])
                this.boxes[`${axis}${bound}`]?.option({ value: this.options.read(axis, bound), disabled: this.isDisabled(axis) });
        }
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = AxisRangeControl;
