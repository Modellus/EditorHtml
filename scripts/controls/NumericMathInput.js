// A number box is written into through a math field rather than through its own input: what is
// typed is typeset as it is typed - 1e-3 as written, 1.5*10^3 as 1.5·10³ - and read back as the
// number it says when the field is left or Enter is pressed. The box underneath keeps everything
// else it does: its value, its spin buttons, its bounds, its disabled state and the handlers its
// owner gave it, which are handed what they were always handed. The box's own input is kept, so
// the box still works as a box, but it is taken out of the way of the pointer and the tab key.
class NumericMathInput {
    static fieldClassName = "mdl-numeric-math-field";
    static boxClassName = "mdl-numeric-box";

    static isAvailable() {
        return typeof customElements !== "undefined" && customElements.get("math-field") !== undefined;
    }

    static attach(component, options) {
        if (!NumericMathInput.isAvailable())
            return null;
        return new NumericMathInput(component, options);
    }

    constructor(component, options) {
        this.component = component;
        component.mdlMathInput = this;
        this.options = options;
        this.field = null;
        this.pendingTypedText = null;
        this.shownText = null;
        this.typing = false;
        this.mount();
    }

    // The box is asked for its input before it has drawn one - it is made before it is rendered -
    // so the field is laid over it the first time the box is seen with an input.
    ensureMounted() {
        if (!this.field)
            this.mount();
        return this.field !== null;
    }

    getInput() {
        return this.component.$element().find("input.dx-texteditor-input").first();
    }

    mount() {
        const input = this.getInput();
        if (!input.length || this.field)
            return;
        this.component.$element().addClass(NumericMathInput.boxClassName);
        input.attr("tabindex", "-1");
        const field = document.createElement("math-field");
        field.className = NumericMathInput.fieldClassName;
        field.setAttribute("math-virtual-keyboard-policy", "manual");
        field.setAttribute("popover-policy", "off");
        field.setAttribute("smart-mode", "false");
        field.setAttribute("tabindex", "0");
        Utils.configureMathFieldOnMount(field, mounted => { mounted.inlineShortcuts = Utils.valueFieldInlineShortcuts; });
        Utils.keepEmptyMathFieldTypable(field);
        input.before(field);
        this.field = field;
        field.addEventListener("keydown", event => this.onKeyDown(event), true);
        field.addEventListener("paste", event => this.onPaste(event), true);
        field.addEventListener("focus", event => this.onFocus(event));
        field.addEventListener("blur", event => this.onBlur(event));
        // What the reader has typed and not yet left is theirs until they leave it.
        field.addEventListener("input", () => { this.typing = true; });
        // Focus given to the box by its owner lands on the field, since the input is out of reach.
        input[0].addEventListener("focus", () => this.field.focus());
        this.sync();
    }

    // Only a key the number's own spelling uses goes through: a comma marks nothing in a value.
    onKeyDown(event) {
        if (event.key === ",") {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.commit(event);
            this.callHandler("onEnterKey", event);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.pendingTypedText = null;
            this.sync(true);
            this.callHandler("onKeyDown", event);
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.commit(event);
            Utils.moveFocusFromElement(this.field, event.shiftKey);
        }
    }

    onPaste(event) {
        const pastedText = event.clipboardData?.getData("text") ?? "";
        if (Utils.isNumericText(pastedText))
            return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }

    onFocus(event) {
        this.component.$element().addClass("dx-state-focused");
        this.callHandler("onFocusIn", event);
    }

    onBlur(event) {
        this.commit(event);
        this.component.$element().removeClass("dx-state-focused");
        this.callHandler("onFocusOut", event);
    }

    // The box's owner gave it handlers for the keys and the focus; they run as though the box's own
    // input had them, with the same arguments a DevExtreme handler is given.
    callHandler(optionName, event) {
        const handler = this.component.option(optionName);
        if (typeof handler === "function")
            handler({ component: this.component, element: this.component.$element(), event: event });
    }

    readText() {
        const field = this.field;
        const latex = field.getValue("latex-unstyled") || field.getValue() || "";
        return String(latex).trim();
    }

    // The field is read when it is left: a text that is a value is written into the box - clamped
    // to the box's bounds, in which case the text no longer says what the value is and is let go -
    // and one that is not is thrown away, and the field shows the value again. An empty field
    // clears the box, the way an emptied input does.
    commit(event) {
        // A field losing the focus because the box it stood in is being taken apart has nothing
        // left to write into.
        if (!this.field || !this.field.isConnected || this.component._disposed === true)
            return;
        // A digit typed a moment ago has the field waiting to respell an e-notation number as a power
        // of ten. What is taken is what was typed, so a respelling still pending is called off rather
        // than left to rewrite a field that has already been read.
        clearTimeout(this.field._mathfield?.scientificNotationTimer);
        const text = this.readText();
        const currentValue = this.component.option("value");
        if (text === "") {
            if (currentValue == null)
                return this.sync(true);
            this.pendingTypedText = null;
            return this.writeValue(null, event);
        }
        const numeric = Utils.parseNumericText(text);
        if (!Number.isFinite(numeric))
            return this.sync(true);
        const minimum = this.component.option("min");
        const maximum = this.component.option("max");
        let value = numeric;
        if (Number.isFinite(minimum) && value < minimum)
            value = minimum;
        if (Number.isFinite(maximum) && value > maximum)
            value = maximum;
        const typedText = value === numeric ? text : null;
        if (value === Number(currentValue) && currentValue != null) {
            if (typedText !== this.shownText)
                this.options.onRespelt?.(typedText, { component: this.component, event: event });
            return this.sync(true);
        }
        this.pendingTypedText = typedText;
        this.writeValue(value, event);
    }

    // The value goes in through the box's own input, so the box takes it the way it takes a typed
    // one and tells its owner a reader made the change.
    writeValue(value, event) {
        const input = this.getInput()[0];
        if (!input)
            return;
        input.value = value == null ? "" : String(value);
        input.dispatchEvent(new Event("change", { bubbles: true }));
        this.pendingTypedText = null;
        this.sync(true);
    }

    takeTypedText() {
        const text = this.pendingTypedText;
        this.pendingTypedText = null;
        return text;
    }

    // The field shows what the box holds, spelt the way it was typed while that is still the
    // value. Nothing is written over what the reader is in the middle of typing unless asked.
    sync(force = false) {
        if (!this.ensureMounted())
            return;
        const field = this.field;
        if (!force && this.isBeingTyped())
            return;
        const disabled = this.component.option("disabled") === true || this.component.option("readOnly") === true;
        field.disabled = disabled;
        field.readOnly = disabled;
        const placeholder = String(this.component.option("placeholder") ?? "");
        if (placeholder === "")
            field.removeAttribute("data-placeholder");
        else
            field.setAttribute("data-placeholder", placeholder);
        const text = this.options.getText(this.component.option("value"));
        this.shownText = text === "" ? null : text;
        if (typeof field.setValue === "function")
            field.setValue(text, { silenceNotifications: true });
        else
            field.value = text;
        field.toggleAttribute("data-empty", text === "");
        // What was just written is the box's, not the reader's.
        this.typing = false;
    }

    // The reader is in the middle of typing when the field is theirs and what it holds is no longer
    // what was last written into it.
    isBeingTyped() {
        const field = this.field;
        if (!this.typing || typeof field.hasFocus !== "function" || !field.hasFocus())
            return false;
        return this.readText() !== (this.shownText ?? "");
    }

    focus() {
        this.field?.focus();
    }

    selectAll() {
        this.field?.executeCommand?.("selectAll");
    }
}
