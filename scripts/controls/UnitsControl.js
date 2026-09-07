// One units picker serves every place a unit can be chosen — a term row, the player, the scenarios
// table, the units grid, an object's settings. It is a select box: the unit is typed straight into
// the field, and the list under it offers the ISO units typeset as mathematics, narrowed to what
// has been typed so far. A unit the list does not carry is kept as written. Seventy odd read-only
// math fields cost long enough to build to feel on every open, so each is built once, off screen,
// and the same element is carried into whichever list is open.
class UnitsControl {
    static itemStyle = "height:auto;width:auto;display:inline-block;pointer-events:none";
    static itemElements = new Map();
    static warmHostElement = null;

    static getWarmHost() {
        if (UnitsControl.warmHostElement)
            return UnitsControl.warmHostElement;
        document.body.insertAdjacentHTML("beforeend", '<div class="mdl-units-warm-host"></div>');
        UnitsControl.warmHostElement = document.body.lastElementChild;
        return UnitsControl.warmHostElement;
    }

    static getItemElement(unitText) {
        let itemElement = UnitsControl.itemElements.get(unitText);
        if (itemElement)
            return itemElement;
        UnitsControl.getWarmHost().insertAdjacentHTML("beforeend", `<div class="mdl-units-item" data-unit="${Utils.escapeAvatarText(unitText)}">${Utils.buildUnitsMathFieldMarkup(unitText, UnitsControl.itemStyle)}</div>`);
        itemElement = UnitsControl.getWarmHost().lastElementChild;
        UnitsControl.itemElements.set(unitText, itemElement);
        return itemElement;
    }

    // The first picker to open would otherwise pay for the whole list, so the editor builds it
    // while the reader is still looking at the board.
    static warm() {
        for (const unitText of Utils.isoUnits)
            UnitsControl.getItemElement(unitText);
    }

    static renderItem(unitText, itemElement) {
        $(itemElement).append(UnitsControl.getItemElement(unitText));
    }

    // What is typed is matched against the unit as it is written and as it is typed on a plain
    // keyboard, so m/s2 finds m/s² and um finds µm.
    static getSearchText(unitText) {
        return `${unitText} ${UnitsControl.foldUnitText(unitText)}`;
    }

    static foldUnitText(unitText) {
        return Array.from(String(unitText)).map(character => Utils.unitsSuperscripts[character] ?? character).join("")
            .replace(/µ/g, "u")
            .replace(/·/g, ".");
    }

    static findListedUnit(unitText) {
        const folded = UnitsControl.foldUnitText(unitText);
        return Utils.isoUnits.find(listedUnit => UnitsControl.foldUnitText(listedUnit) === folded) ?? null;
    }

    static getWrapperClass(isNested) {
        if (isNested)
            return "mdl-units-dropdown mdl-shape-overlay-popup mdl-shape-overlay-popup-nested mdl-nested-dropdown-popup";
        return "mdl-units-dropdown";
    }

    static getEditorOptions(config) {
        const unitText = Utils.getUnitsPlainText(config.value ?? "");
        return {
            value: unitText === "" ? null : unitText,
            items: Utils.isoUnits,
            acceptCustomValue: true,
            searchEnabled: true,
            searchMode: "contains",
            searchExpr: item => UnitsControl.getSearchText(item),
            minSearchLength: 0,
            searchTimeout: 0,
            showDataBeforeSearch: true,
            showClearButton: false,
            width: config.width,
            stylingMode: "filled",
            disabled: config.disabled === true,
            placeholder: config.placeholder ?? "",
            elementAttr: { class: "mdl-units-editor" },
            inputAttr: { class: "mdl-units-editor-input" },
            itemTemplate: (item, index, itemElement) => UnitsControl.renderItem(item, itemElement),
            // A unit written rather than picked is read the way a typed unit is read everywhere:
            // m/s^2 is m/s², and m/s2 on a plain keyboard is the m/s² the list carries. Nothing
            // written clears the unit.
            onCustomItemCreating: event => {
                const typedUnit = Utils.getUnitsPlainText(event.text);
                event.customItem = typedUnit === "" ? null : (UnitsControl.findListedUnit(typedUnit) ?? typedUnit);
            },
            onValueChanged: event => config.onValueChanged(Utils.getUnitsPlainText(event.value ?? "")),
            // The typeset items are shared by every list, so a list that was left holding them may
            // have lent them out since: it lays them out again each time it opens.
            onOpened: event => event.component.getDataSource()?.reload(),
            dropDownOptions: {
                container: document.body,
                width: Utils.unitsDropDownWidth,
                height: Utils.unitsDropDownHeight,
                wrapperAttr: { class: UnitsControl.getWrapperClass(config.nested === true) }
            }
        };
    }

    static createEditor(hostElement, config) {
        return $("<div>").appendTo(hostElement).dxSelectBox(UnitsControl.getEditorOptions(config)).dxSelectBox("instance");
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = UnitsControl;
