// One units picker serves every place a unit can be chosen — a shape toolbar, the scenarios table,
// the units grid — and the list it shows is typeset once and kept alive off screen. Seventy odd
// read-only math fields cost about a fifth of a second to build, which is long enough to feel on
// every open, so the built list is moved into whichever drop down is open and moved back on close.
class UnitsControl {
    static itemStyle = "height:auto;width:auto;display:inline-block;pointer-events:none";
    static listElement = null;
    static warmHostElement = null;
    static onUnitPicked = null;
    static scrollView = null;

    static getWarmHost() {
        if (UnitsControl.warmHostElement)
            return UnitsControl.warmHostElement;
        document.body.insertAdjacentHTML("beforeend", '<div class="mdl-units-warm-host"></div>');
        UnitsControl.warmHostElement = document.body.lastElementChild;
        return UnitsControl.warmHostElement;
    }

    static getListElement() {
        if (UnitsControl.listElement)
            return UnitsControl.listElement;
        const itemsMarkup = Utils.isoUnits.map(unitText => `<div class="mdl-units-item" data-unit="${Utils.escapeAvatarText(unitText)}">${Utils.buildUnitsMathFieldMarkup(unitText, UnitsControl.itemStyle)}</div>`).join("");
        UnitsControl.getWarmHost().insertAdjacentHTML("beforeend", `<div class="mdl-units-list">${itemsMarkup}</div>`);
        UnitsControl.listElement = UnitsControl.getWarmHost().lastElementChild;
        UnitsControl.listElement.addEventListener("pointerdown", event => UnitsControl.pickItem(event));
        return UnitsControl.listElement;
    }

    // The first picker to open would otherwise pay for the whole list, so the editor builds it
    // while the reader is still looking at the board.
    static warm() {
        UnitsControl.getListElement();
    }

    static pickItem(event) {
        const itemElement = event.target.closest(".mdl-units-item");
        if (!itemElement)
            return;
        event.preventDefault();
        UnitsControl.onUnitPicked?.(itemElement.dataset.unit);
    }

    static attachList(hostElement, onUnitPicked) {
        UnitsControl.onUnitPicked = onUnitPicked;
        UnitsControl.filterItems("");
        hostElement.appendChild(UnitsControl.getListElement());
    }

    static detachList() {
        UnitsControl.onUnitPicked = null;
        UnitsControl.scrollView = null;
        if (UnitsControl.listElement)
            UnitsControl.getWarmHost().appendChild(UnitsControl.listElement);
    }

    static filterItems(searchText) {
        const search = Utils.getUnitsPlainText(searchText).toLowerCase();
        for (const itemElement of UnitsControl.getListElement().children)
            itemElement.classList.toggle("mdl-units-item--hidden", search !== "" && !itemElement.dataset.unit.toLowerCase().includes(search));
        UnitsControl.scrollView?.update();
    }

    static getWrapperClass(isNested) {
        if (isNested)
            return "mdl-units-dropdown mdl-shape-overlay-popup mdl-shape-overlay-popup-nested mdl-nested-dropdown-popup";
        return "mdl-units-dropdown";
    }

    // The field reads as mathematics rather than as text: the unit is typeset into a read-only math
    // field laid over the editor's own input, which is left in place so the placeholder still shows
    // through when no unit is named.
    static syncEditorMathField(component) {
        const inputContainer = component.element().find(".dx-texteditor-input-container").first();
        if (!inputContainer.length)
            return;
        let mathFieldElement = inputContainer.find(".mdl-units-editor-math-field").first()[0];
        if (!mathFieldElement) {
            inputContainer.prepend('<math-field read-only class="form-math-field mdl-units-editor-math-field" style="height:auto;width:auto;display:inline-block"></math-field>');
            mathFieldElement = inputContainer.find(".mdl-units-editor-math-field").first()[0];
        }
        Utils.setMathFieldValue(mathFieldElement, Utils.getUnitsLatex(component.option("value") ?? ""));
    }

    static getEditorOptions(config) {
        const unitText = Utils.getUnitsPlainText(config.value ?? "");
        let editorInstance = null;
        return {
            value: unitText === "" ? null : unitText,
            dataSource: Utils.isoUnits,
            stylingMode: "filled",
            disabled: config.disabled === true,
            placeholder: config.placeholder ?? "",
            elementAttr: { class: "mdl-units-editor" },
            inputAttr: { class: "mdl-units-editor-input" },
            onInitialized: e => editorInstance = e.component,
            onContentReady: e => UnitsControl.syncEditorMathField(e.component),
            onValueChanged: e => {
                UnitsControl.syncEditorMathField(e.component);
                config.onValueChanged(Utils.getUnitsPlainText(e.value ?? ""));
            },
            contentTemplate: (templateData, contentElement) => UnitsControl.renderDropDownContent(contentElement, editorInstance),
            onOpened: e => UnitsControl.openDropDown(e.component),
            // A row redraws as soon as the unit it names changes, so an editor can be taken apart
            // with the shared list still inside it: the list goes home before the drop down goes.
            onDisposing: () => UnitsControl.detachList(),
            dropDownOptions: {
                container: document.body,
                onHidden: () => UnitsControl.detachList(),
                width: Utils.unitsDropDownWidth,
                height: Utils.unitsDropDownHeight,
                wrapperAttr: { class: UnitsControl.getWrapperClass(config.nested === true) }
            }
        };
    }

    // A unit the list does not carry is written rather than picked, and it is written as
    // mathematics too: what the reader types is typeset as they type and read back as a unit.
    static renderDropDownContent(contentElement, component) {
        const hostElement = $(contentElement)[0];
        hostElement.insertAdjacentHTML("beforeend", '<div class="mdl-units-dropdown-content"><math-field class="mdl-units-input" math-virtual-keyboard-policy="manual" popover-policy="off" smart-mode="false"></math-field><div class="mdl-units-list-host"></div></div>');
        // The wheel over a drop down belongs to whatever the drop down scrolls, and inside an overlay
        // only a scroll view is given it, so the list is carried by one like every other menu here.
        $(hostElement).find(".mdl-units-list-host").dxScrollView({ width: "100%", height: "100%", direction: "vertical", showScrollbar: "always" });
        const inputField = hostElement.querySelector(".mdl-units-input");
        inputField.addEventListener("input", () => UnitsControl.filterItems(inputField.value));
        inputField.addEventListener("keydown", event => UnitsControl.handleInputKeydown(event, component, inputField), true);
    }

    static handleInputKeydown(event, component, inputField) {
        if (event.key === "Escape")
            return component.close();
        // A unit is written on one line: the slash of m/s divides the unit, it does not stack it.
        if (event.key === "/") {
            event.preventDefault();
            event.stopImmediatePropagation();
            return inputField.insert("/");
        }
        if (event.key !== "Enter")
            return;
        event.preventDefault();
        const typedUnit = Utils.getUnitsPlainText(inputField.value);
        component.option("value", typedUnit === "" ? null : typedUnit);
        component.close();
    }

    static openDropDown(component) {
        const contentElement = $(component.content());
        const inputField = contentElement.find(".mdl-units-input")[0];
        inputField.menuItems = [];
        Utils.setMathFieldValue(inputField, Utils.getUnitsLatex(component.option("value") ?? ""));
        UnitsControl.scrollView = contentElement.find(".mdl-units-list-host").dxScrollView("instance");
        UnitsControl.attachList($(UnitsControl.scrollView.content())[0], unitText => {
            component.option("value", unitText);
            component.close();
        });
        UnitsControl.scrollView.scrollTo(0);
        UnitsControl.scrollView.update();
        requestAnimationFrame(() => inputField.focus());
    }

    static createEditor(hostElement, config) {
        return $("<div>").appendTo(hostElement).dxDropDownBox(UnitsControl.getEditorOptions(config)).dxDropDownBox("instance");
    }
}
