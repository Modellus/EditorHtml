class BaseShape {
    
    static setup() {
    }
    
    constructor(board, parent, id) {
        this.id = id ?? crypto.randomUUID();
        this.board = board;
        this.parent = parent;
        this.children = [];
        if (parent != null)
            parent.children.push(this);
        this.properties = {};
        this.termsMapping = [];
        this.termDisplayEntries = [];
        this.termFormControls = {};
        this.isReferential = false;
        this.setDefaults();
        this.initializeElement();
    }

    setProperties(properties) {
        Object.assign(this.properties, properties);
    }

    setDefaults() {
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
        this.properties.showName = false;
        this.properties.nameColor = null;
        var name = this.constructor.name.split(/(?=[A-Z])/)[0];
        this.properties.name = name;
    }

    initializeElement() {
        this.element = this.createElement();
        this.element.setAttribute("id", this.id);
        this.element.setAttribute("clip-path", `url(#${this.getClipId()})`);
        if (this.properties.nameColor == null)
            this.properties.nameColor = this.properties.foregroundColor;
        this.initializeTermDisplayLayer();
        this.initializeShapeNameLayer();
        this.draw();
        this.initializeContextToolbar();
    }

    getForm() {
        var form = this.createForm();
        if (form == null)
            return null;
        var instance = form.dxForm("instance");
        instance.formData = null;
        instance.updateData(this.properties);
        this.refreshTermFormLayouts(instance);
        const observer = new ResizeObserver(e => instance.option("colCount", e[0].contentRect.width > 300 ? 2 : 1));
        observer.observe(form[0]);
        return form;
    };

    serialize() {
        return { type: this.constructor.name, id: this.id, parent: this.parent?.id, properties: this.properties };
    }

    static deserialize(board, data) {
        var parent = board.getShape(data.parent);
        var shape = board.createShape(data.type, parent, data.id);
        shape.setProperties(data.properties);
        return shape;
    }

    dispatchEvent(name, detail) {
        if (this.element === undefined)
            return;
        detail.shape = this;
        const event = new CustomEvent(name, { detail: detail });
        this.element.dispatchEvent(event);
    }

    createTransformer() {
    }

    createElement() {
        throw new Error("createElement should be implemented in subclasses.");
    }

    createToolbar() {
        return [];
    }

    enterEditMode() {
        return false;
    }

    initializeContextToolbar() {
        const toolbarItems = this.createToolbar();
        if (!toolbarItems || !toolbarItems.length || !window.DevExpress?.ui?.dxToolbar)
            return;
        const toolbarHost = document.createElement("div");
        toolbarHost.className = "shape-context-toolbar";
        document.body.appendChild(toolbarHost);
        $(toolbarHost).dxToolbar({ items: toolbarItems, width: "auto" });
        this.contextToolbar = toolbarHost;
        this.contextToolbarInstance = $(toolbarHost).dxToolbar("instance");
    }

    showContextToolbar() {
        if (!this.contextToolbar)
            return;
        this.contextToolbar.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.positionContextToolbar()));
    }

    hideContextToolbar() {
        if (!this.contextToolbar)
            return;
        this.contextToolbar.classList.remove("visible");
    }

    positionContextToolbar() {
        if (!this.contextToolbar || !this.element)
            return;
        const anchor = this.getScreenAnchorPoint();
        if (!anchor)
            return;
        const toolbarRect = this.contextToolbar.getBoundingClientRect();
        const toolbarWidth = toolbarRect.width || this.contextToolbar.offsetWidth || 0;
        const toolbarHeight = toolbarRect.height || this.contextToolbar.offsetHeight || 0;
        const padding = 8;
        let left = anchor.centerX - toolbarWidth / 2;
        let top = anchor.bottomY + padding;
        const maxLeft = window.innerWidth - toolbarWidth - padding;
        const maxTop = window.innerHeight - toolbarHeight - padding;
        left = Math.max(padding, Math.min(left, maxLeft));
        top = Math.max(padding, Math.min(top, maxTop));
        this.contextToolbar.style.left = `${left}px`;
        this.contextToolbar.style.top = `${top}px`;
    }

    getScreenAnchorPoint() {
        if (this.container?.getBoundingClientRect) {
            const rect = this.container.getBoundingClientRect();
            return {
                centerX: rect.left + rect.width / 2,
                bottomY: rect.bottom
            };
        }
        if (!this.board?.svg)
            return null;
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const props = this.properties ?? {};
        const width = Number.isFinite(props.width) ? props.width : 0;
        const height = Number.isFinite(props.height) ? props.height : 0;
        const radius = Number.isFinite(props.radius) ? props.radius : null;
        const svgRect = this.board.svg.getBoundingClientRect();
        const ctm = this.board.svg.getScreenCTM();
        if (!ctm)
            return null;
        const centerX = radius != null ? position.x : position.x + width / 2;
        const centerY = radius != null ? position.y : position.y + height / 2;
        const bottomY = radius != null ? position.y + radius : position.y + height;
        const centerPoint = new DOMPoint(centerX, centerY).matrixTransform(ctm);
        const bottomPoint = new DOMPoint(centerX, bottomY).matrixTransform(ctm);
        return {
            centerX: centerPoint.x,
            bottomY: bottomPoint.y
        };
    }

    getColorPickerPalette() {
        return [
            "transparent", "#F28B82", "#FBCB7E", "#A8D5A2", "#AECBFA", "#D7AEFB",
            "#FFFFFF", "#E53935", "#FB8C00", "#43A047", "#1E88E5", "#8E24AA",
            "#BDBDBD", "#B71C1C", "#EF6C00", "#2E7D32", "#1565C0", "#6A1B9A",
            "#424242", "#7F0000", "#E65100", "#1B5E20", "#0D47A1", "#4A148C"
        ];
    }

    getColorPickerItems() {
        return this.getColorPickerPalette().map(color => ({ color: this.normalizeColorPickerValue(color) }));
    }

    normalizeColorPickerValue(color) {
        if (color == "transparent")
            return "#00000000";
        return color;
    }

    getColorPickerRowsCount() {
        return 4;
    }

    getColorPickerTileMetrics(itemsCount) {
        const rows = this.getColorPickerRowsCount();
        const columns = Math.max(1, Math.ceil(itemsCount / rows));
        const baseItemSize = 26;
        const itemMargin = 2;
        const popupPadding = 6;
        const step = baseItemSize + itemMargin * 2;
        const tileViewWidth = columns * step;
        const tileViewHeight = rows * step;
        return {
            rows: rows,
            columns: columns,
            baseItemSize: baseItemSize,
            itemMargin: itemMargin,
            tileViewWidth: tileViewWidth,
            tileViewHeight: tileViewHeight,
            popupPadding: popupPadding,
            popupWidth: tileViewWidth + popupPadding * 2,
            popupHeight: tileViewHeight + popupPadding * 2
        };
    }

    getColorPickerIconColor(color) {
        if (color == "#00000000")
            return "#cccccc";
        return color;
    }

    getColorPickerIconClass(color) {
        if (color == "#00000000")
            return "fa-solid fa-square-dashed";
        return "fa-solid fa-square";
    }

    createColorPickerIcon(color, className) {
        const icon = $("<i>").addClass(`${this.getColorPickerIconClass(color)} ${className}`);
        icon.css("color", this.getColorPickerIconColor(color));
        return icon;
    }

    renderColorPickerButtonTemplate(selectedColor, element) {
        const content = $("<div>").addClass("mdl-color-picker-button-template");
        const icon = this.createColorPickerIcon(selectedColor, "mdl-color-picker-button-icon");
        content.append(icon);
        $(element).empty().append(content);
    }

    renderColorPickerItemTemplate(itemData, element) {
        const content = $("<div>").addClass("mdl-color-picker-item");
        const icon = this.createColorPickerIcon(itemData.color, "mdl-color-picker-item-icon");
        content.append(icon);
        $(element).append(content);
    }

    createColorPickerTileView(contentElement, picker, dataField, items, selectedColorState, metrics) {
        $(contentElement).empty();
        const tileViewContainer = $("<div>").addClass("mdl-color-picker-tileview");
        $(contentElement).append(tileViewContainer);
        tileViewContainer.dxTileView({
            items: items,
            baseItemHeight: metrics.baseItemSize,
            baseItemWidth: metrics.baseItemSize,
            itemMargin: metrics.itemMargin,
            direction: "vertical",
            height: metrics.tileViewHeight,
            width: metrics.tileViewWidth,
            itemTemplate: (itemData, index, element) => this.renderColorPickerItemTemplate(itemData, element),
            onItemClick: event => this.onColorPickerTileClick(event, picker, dataField, selectedColorState)
        });
    }

    onColorPickerTileClick(event, picker, dataField, selectedColorState) {
        selectedColorState.value = event.itemData.color;
        const formInstance = $("#shape-form").dxForm("instance");
        if (formInstance)
            formInstance.updateData(dataField, selectedColorState.value);
        else
            this.setProperty(dataField, selectedColorState.value);
        const dropDownButtonInstance = picker.dxDropDownButton("instance");
        if (dropDownButtonInstance)
            dropDownButtonInstance.close();
        this.refreshColorPickerButtonTemplate(picker, selectedColorState.value);
    }

    refreshColorPickerButtonTemplate(picker, selectedColor) {
        const buttonContentElement = picker.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderColorPickerButtonTemplate(selectedColor, buttonContentElement);
    }

    createColorPickerEditor(dataField) {
        const picker = $("<div>").addClass("mdl-color-picker");
        const items = this.getColorPickerItems();
        const metrics = this.getColorPickerTileMetrics(items.length);
        const selectedColorState = { value: this.properties[dataField] ?? items[0].color };
        picker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            template: (data, element) => this.renderColorPickerButtonTemplate(selectedColorState.value, element),
            dropDownOptions: {
                width: metrics.popupWidth,
                height: metrics.popupHeight,
                wrapperAttr: { class: "mdl-color-picker-menu" },
                contentTemplate: contentElement => {
                    this.createColorPickerTileView(contentElement, picker, dataField, items, selectedColorState, metrics);
                }
            }
        });
        return picker;
    }

    createColorPickerFormItem(dataField, label, colSpan = 2) {
        return {
            colSpan: colSpan,
            dataField: dataField,
            label: { text: label },
            template: _ => this.createColorPickerEditor(dataField)
        };
    }

    getShapeFormInstance() {
        const formElement = $("#shape-form");
        if (formElement.length == 0)
            return null;
        return formElement.dxForm("instance");
    }

    createNameFormControl() {
        const control = $("<div>").addClass("name-packed-control");
        const visibilityHost = $("<div>").addClass("name-packed-control__button");
        const colorHost = $("<div>").addClass("name-packed-control__color");
        const inputHost = $("<div>").addClass("name-packed-control__input");
        const isVisible = this.properties.showName === true;
        control.append(visibilityHost, colorHost, inputHost);
        this.createPackedVisibilityCheckbox(visibilityHost, isVisible, value => {
            const formInstance = this.getShapeFormInstance();
            if (formInstance)
                formInstance.updateData("showName", value);
            else
                this.setProperty("showName", value);
        });
        const colorPicker = this.createColorPickerEditor("nameColor");
        colorPicker.addClass("name-packed-control__picker");
        colorHost.append(colorPicker);
        inputHost.dxTextBox({
            value: this.properties.name,
            stylingMode: "filled",
            onValueChanged: event => {
                const formInstance = this.getShapeFormInstance();
                if (formInstance)
                    formInstance.updateData("name", event.value);
                else
                    this.setProperty("name", event.value);
            }
        });
        return control;
    }

    createForm() {
        this.form = $("<div id='shape-form'></div>").dxForm({
            onFieldDataChanged: e => this.setProperty(e.dataField, e.value),
            colCount: "1",
            minColWidth: 300,
            items: [
                {
                    itemType: "group",
                    colCount: 2,
                    items: [
                        {
                            colSpan: 2,
                            dataField: "name",
                            label: { text: this.board.translations.get("Name") },
                            template: _ => this.createNameFormControl()
                        },
                        {
                            colSpan: 1,
                            label: { text: "Layers" },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                selectionMode: "none",
                                items: [
                                    { icon: "fa-light fa-send-back", action: () => this.board.sendToBack(this) },
                                    { icon: "fa-light fa-send-backward", action: () => this.board.sendBackward(this) },
                                    { icon: "fa-light fa-bring-forward", action: () => this.board.bringForward(this) },
                                    { icon: "fa-light fa-bring-front", action: () => this.board.bringToFront(this) }                            
                                ],
                                stylingMode: "text",
                                onItemClick: e => e.itemData.action()
                            }
                        },
                        {
                            colSpan: 1,
                            label: { text: "Actions" },
                            editorType: "dxButton",
                            editorOptions: {
                                template: "<div class='dx-icon'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></div>",
                                onClick: _ => this.remove(),
                                stylingMode: "text"
                            }
                        }
                    ]
                },
                {
                    itemType: "group",
                    colCount: 2,
                    items: [
                        {
                            colSpan: 1,
                            dataField: "backgroundColor",
                            label: { text: "Background color" },
                            template: _ => this.createColorPickerEditor("backgroundColor")
                        },
                        {
                            colSpan: 1,
                            dataField: "foregroundColor",
                            label: { text: "Color" },
                            template: _ => this.createColorPickerEditor("foregroundColor")
                        }
                    ]
                }
            ]
        });
        return this.form;
    }

    delta(property, delta) {
        var termMapping = this.termsMapping.find(t => t.property === property);
        let updatedValue = this.properties[property];
        let value;
        if (termMapping != null) {
            const scale = this.getScale();
            let axisScale = scale[termMapping.scaleProperty] ?? 1;
            var term = this.properties[termMapping.termProperty];
            const rawCaseNumber = this.properties[termMapping.caseProperty] ?? 1;
            const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : (parseInt(rawCaseNumber, 10) || 1);
            const calculator = this.board.calculator;
            var isTerm = calculator.isTerm(term);
            delta = delta * axisScale * (termMapping.isInverted ? -1 : 1);
            if (isTerm) {
                value = calculator.getByName(term, caseNumber);
                if (!Number.isFinite(value)) {
                    const fallback = Number.isFinite(this.properties[property]) ? this.properties[property] : 0;
                    value = (termMapping.isInverted ? -fallback : fallback) * axisScale;
                }
                calculator.setTermValue(term, value + delta, calculator.system.iteration, caseNumber);
                calculator.calculate();
            } else
                this.properties[termMapping.termProperty] = Utils.roundToPrecision(
                    parseFloat(this.properties[termMapping.termProperty]) + delta, calculator.getPrecision());
        } else
            this.properties[property] = parseFloat(this.properties[property]) + delta;
        this.tick();
        this.board.markDirty(this);
        updatedValue = this.properties[property];
        this.dispatchEvent("shapeChanged", { property: property, value: updatedValue });
        return updatedValue;
    }

    setProperty(name, value) {
        this.properties[name] = value;
        this.tick();
        this.board.markDirty(this);
        this.dispatchEvent("shapeChanged", { property: name, value: value });
    }

    update() {
        this.children.forEach(child => child.update());
    }

    draw() {
        this.children.forEach(child => child.draw());
        this.drawTermDisplayLabels();
        this.drawShapeNameLabel();
    }

    tick() {
        this.children.forEach(child => child.tick());
    }

    getBounds() {
        var parentBounds = this.parent?.getBounds() ?? {};
        return {
            x: this.properties.x + (parentBounds.originX ?? 0),
            y: this.properties.y + (parentBounds.originY ?? 0),
            width: this.properties.width,
            height: this.properties.height,
            originX: this.properties.x + (parentBounds.originX ?? 0) + this.properties.width / 2,
            originY: this.properties.y + (parentBounds.originY ?? 0) + this.properties.height / 2,
            rotation: this.properties.rotation + (parentBounds.rotation ?? 0)
        };
    }

    getBoardPosition() {
        const parentPosition = this.parent?.getBoardPosition() ?? { x: 0, y: 0 };
        return {
            x: this.properties.x + parentPosition.x + (this.parent?.properties.originX ?? 0),
            y: this.properties.y + parentPosition.y + (this.parent?.properties.originY ?? 0)
        };
    }

    getClipId() {
        return this.parent?.getClipId();
    }

    getScale() {
        const referential = this.getReferentialParent();
        return {
            x: referential?.properties.scaleX ?? 1,
            y: referential?.properties.scaleY ?? 1,
        };
    }

    getReferentialParent() {
        var referential = this.parent;
        while (referential != null && !referential.isReferential)
            referential = referential.parent;
        return referential;
    }

    remove() {
        this.board.removeShape(this);
    }

    dragStart() {
        this.dispatchEvent("shapeDragStart", {});
        const calculator = this.board?.calculator;
        if (!calculator)
            return;
        const casesCount = Math.max(1, parseInt(calculator.properties.casesCount ?? 1, 10) || 1);
        const terms = typeof calculator.getTermsNames === "function" ? calculator.getTermsNames() : [];
        const iteration = typeof calculator.getIteration === "function" ? calculator.getIteration() : undefined;
        terms.forEach(term => {
            const values = [];
            for (let caseNumber = 1; caseNumber <= casesCount; caseNumber++)
                values.push({ case: caseNumber, value: calculator.getByName(term, caseNumber) });
        });
    }

    dragEnd() {
        this.dispatchEvent("shapeDragEnd", {});
    }

    getModelPrecision() {
        const precision = Number(this.board?.calculator?.getPrecision?.());
        if (!Number.isFinite(precision) || precision < 0)
            return 0;
        return Math.floor(precision);
    }

    getPrecisionNumberEditorOptions(editorOptions = {}) {
        const precision = this.getModelPrecision();
        const step = precision > 0 ? 1 / (10 ** precision) : 1;
        return Object.assign({
            showSpinButtons: true,
            stylingMode: "filled",
            format: { type: "fixedPoint", precision: precision },
            step: step
        }, editorOptions);
    }

    initializeTermDisplayLayer() {
        this.termDisplayLayer = null;
        this.termDisplayGuidesLayer = null;
        this.termDisplayLabelsLayer = null;
        if (!this.element)
            return;
        if (this.element.tagName?.toLowerCase() != "g")
            return;
        this.termDisplayLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.setAttribute("pointer-events", "none");
        this.termDisplayGuidesLayer = this.board.createSvgElement("g");
        this.termDisplayLabelsLayer = this.board.createSvgElement("g");
        this.termDisplayLayer.appendChild(this.termDisplayGuidesLayer);
        this.termDisplayLayer.appendChild(this.termDisplayLabelsLayer);
        if (this.element.firstChild)
            this.element.insertBefore(this.termDisplayLayer, this.element.firstChild);
        else
            this.element.appendChild(this.termDisplayLayer);
    }

    initializeShapeNameLayer() {
        this.shapeNameLayer = null;
        this.shapeNameText = null;
        if (!this.element)
            return;
        if (this.element.tagName?.toLowerCase() != "g")
            return;
        this.shapeNameLayer = this.board.createSvgElement("g");
        this.shapeNameLayer.setAttribute("pointer-events", "none");
        this.element.appendChild(this.shapeNameLayer);
    }

    getTermDisplayModeProperty(term) {
        return `${term}DisplayMode`;
    }

    getShapeNameColor() {
        return this.properties.nameColor ?? this.properties.foregroundColor ?? "#000000";
    }

    isShapeNameVisible() {
        if (this.properties.showName !== true)
            return false;
        return typeof this.properties.name === "string" && this.properties.name.trim() !== "";
    }

    getShapeNameLabelAnchor() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y - radius - 4 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y - height / 2 - 4 };
        if (Number.isFinite(width) && Number.isFinite(height)) {
            const left = Math.min(position.x, position.x + width);
            const right = Math.max(position.x, position.x + width);
            const top = Math.min(position.y, position.y + height);
            return { x: (left + right) / 2, y: top - 4 };
        }
        return { x: position.x, y: position.y - 4 };
    }

    drawShapeNameLabel() {
        if (!this.shapeNameLayer)
            return;
        if (!this.isShapeNameVisible()) {
            if (this.shapeNameText)
                this.shapeNameText.textContent = "";
            return;
        }
        const anchor = this.getShapeNameLabelAnchor();
        if (!anchor)
            return;
        if (!this.shapeNameText) {
            this.shapeNameText = this.board.createSvgElement("text");
            this.shapeNameText.setAttribute("class", "shape-name-label");
            this.shapeNameLayer.appendChild(this.shapeNameText);
        }
        this.shapeNameText.setAttribute("x", anchor.x);
        this.shapeNameText.setAttribute("y", anchor.y);
        this.shapeNameText.setAttribute("text-anchor", "middle");
        this.shapeNameText.setAttribute("fill", this.getShapeNameColor());
        this.shapeNameText.textContent = this.properties.name;
    }

    getTermCaseColorProperty(term) {
        return `${term}ShowCaseColor`;
    }

    normalizeTermValue(value) {
        if (value && typeof value === "object")
            return value.term ?? value.text ?? value.value;
        return value;
    }

    getTermCaseNumber(caseProperty) {
        const rawCaseNumber = this.properties[caseProperty] ?? 1;
        const caseNumber = Number.isFinite(rawCaseNumber) ? rawCaseNumber : parseInt(rawCaseNumber, 10);
        if (!Number.isFinite(caseNumber) || caseNumber < 1)
            return 1;
        return caseNumber;
    }

    formatModelValue(value) {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue))
            return "-";
        const precision = this.getModelPrecision();
        const rounded = Utils.roundToPrecision(numericValue, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        if (precision > 0)
            return normalized.toFixed(precision);
        return normalized.toString();
    }

    buildTermDisplayText(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return "";
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return "";
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        const value = calculator.isTerm(termName) ? calculator.getByName(termName, caseNumber) : Number(termName);
        const valueText = Number.isFinite(value) ? this.formatModelValue(value) : termName;
        return `${termName} = ${valueText}`;
    }

    getTermLabelAnchor() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x + radius, y: position.y + radius * 2 + 4 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height + 4 };
        return { x: position.x, y: position.y + 4 };
    }

    clearLayerChildren(layer) {
        if (!layer)
            return;
        while (layer.firstChild)
            layer.removeChild(layer.firstChild);
    }

    getShapeCenterPosition() {
        const position = this.getBoardPosition?.();
        if (!position)
            return null;
        const radius = Number(this.properties.radius);
        if (Number.isFinite(radius))
            return { x: position.x, y: position.y };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y };
        if (Number.isFinite(width) && Number.isFinite(height))
            return { x: position.x + width / 2, y: position.y + height / 2 };
        return { x: position.x, y: position.y };
    }

    getReferentialAxesPosition() {
        const referential = this.getReferentialParent();
        if (!referential)
            return null;
        const referentialPosition = referential.getBoardPosition?.();
        if (!referentialPosition)
            return null;
        const axisX = referentialPosition.x + Number(referential.properties.originX ?? 0);
        const axisY = referentialPosition.y + Number(referential.properties.originY ?? 0);
        return { x: axisX, y: axisY };
    }

    getTermAxis(termProperty) {
        const mapping = this.termsMapping.find(termMapping => termMapping.termProperty == termProperty);
        if (!mapping)
            return null;
        if (mapping.scaleProperty == "x" || mapping.scaleProperty == "y")
            return mapping.scaleProperty;
        if (mapping.property == "x" || mapping.property == "y")
            return mapping.property;
        return null;
    }

    getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex) {
        if (axis == "x") {
            if (shapeCenterPosition.y <= axesPosition.y)
                return { x: shapeCenterPosition.x, y: axesPosition.y + 12 + axisLabelIndex * 12, anchor: "middle" };
            return { x: shapeCenterPosition.x, y: axesPosition.y - 12 - axisLabelIndex * 12, anchor: "middle" };
        }
        if (shapeCenterPosition.x <= axesPosition.x)
            return { x: axesPosition.x + 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "start" };
        return { x: axesPosition.x - 6, y: shapeCenterPosition.y + axisLabelIndex * 12, anchor: "end" };
    }

    createTermGuideLine(axis, shapeCenterPosition, axesPosition, color) {
        if (!this.termDisplayGuidesLayer)
            return;
        const line = this.board.createSvgElement("line");
        line.setAttribute("class", "shape-term-guide-line");
        line.setAttribute("stroke", color);
        line.setAttribute("stroke-width", 1);
        line.setAttribute("stroke-dasharray", "3 2");
        if (axis == "x") {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", shapeCenterPosition.x);
            line.setAttribute("y2", axesPosition.y);
        } else {
            line.setAttribute("x1", shapeCenterPosition.x);
            line.setAttribute("y1", shapeCenterPosition.y);
            line.setAttribute("x2", axesPosition.x);
            line.setAttribute("y2", shapeCenterPosition.y);
        }
        this.termDisplayGuidesLayer.appendChild(line);
    }

    drawTermDisplayLabels() {
        if (!this.termDisplayLayer || !this.termDisplayLabelsLayer || !this.termDisplayGuidesLayer)
            return;
        const color = this.getShapeNameColor();
        const labels = [];
        const fallbackAnchor = this.getTermLabelAnchor();
        const axesPosition = this.getReferentialAxesPosition();
        const shapeCenterPosition = this.getShapeCenterPosition();
        let fallbackLabelIndex = 0;
        let xAxisLabelIndex = 0;
        let yAxisLabelIndex = 0;
        let hasXGuide = false;
        let hasYGuide = false;
        this.clearLayerChildren(this.termDisplayGuidesLayer);
        for (let i = 0; i < this.termDisplayEntries.length; i++) {
            const entry = this.termDisplayEntries[i];
            const text = this.buildTermDisplayText(entry);
            if (!text)
                continue;
            if (axesPosition && shapeCenterPosition) {
                const axis = this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const axisLabelIndex = axis == "x" ? xAxisLabelIndex : yAxisLabelIndex;
                    const labelPosition = this.getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex);
                    labels.push({ text: text, x: labelPosition.x, y: labelPosition.y, anchor: labelPosition.anchor });
                    if (axis == "x") {
                        xAxisLabelIndex++;
                        if (!hasXGuide) {
                            this.createTermGuideLine("x", shapeCenterPosition, axesPosition, color);
                            hasXGuide = true;
                        }
                    } else {
                        yAxisLabelIndex++;
                        if (!hasYGuide) {
                            this.createTermGuideLine("y", shapeCenterPosition, axesPosition, color);
                            hasYGuide = true;
                        }
                    }
                    continue;
                }
            }
            if (!fallbackAnchor)
                continue;
            labels.push({ text: text, x: fallbackAnchor.x, y: fallbackAnchor.y + fallbackLabelIndex * 12, anchor: "middle" });
            fallbackLabelIndex++;
        }
        while (this.termDisplayLabelsLayer.children.length > labels.length)
            this.termDisplayLabelsLayer.removeChild(this.termDisplayLabelsLayer.lastChild);
        if (labels.length == 0)
            return;
        for (let i = 0; i < labels.length; i++) {
            let text = this.termDisplayLabelsLayer.children[i];
            if (!text) {
                text = this.board.createSvgElement("text");
                text.setAttribute("class", "shape-term-label");
                this.termDisplayLabelsLayer.appendChild(text);
            }
            text.setAttribute("x", labels[i].x);
            text.setAttribute("y", labels[i].y);
            text.setAttribute("text-anchor", labels[i].anchor);
            text.setAttribute("fill", color);
            text.textContent = labels[i].text;
        }
    }

    addTerm(termProperty, property, title, isInverted = false, isEditable = true, colSpan = 1, scaleProperty = null) {
        const caseProperty = `${termProperty}Case`;
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        this.termsMapping.push({
            termProperty: termProperty,
            termValue: 0,
            property: property,
            isInverted: isInverted,
            scaleProperty: scaleProperty,
            caseProperty: caseProperty
        });
        this.addTermToForm(termProperty, title, isEditable, colSpan);
    }

    getCasesCount() {
        return Math.max(1, parseInt(this.board.calculator.properties.casesCount ?? 1, 10) || 1);
    }

    getCaseIconClass(color) {
        if (color == "#00000000")
            return "fa-solid fa-square-dashed";
        return "fa-duotone fa-thin fa-square";
    }

    getCaseIconColor(color) {
        if (color == "#00000000")
            return "#cccccc";
        return color;
    }

    buildCaseItems(caseColors) {
        const count = this.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++) {
            const color = caseColors[(i - 1) % caseColors.length];
            items.push({ value: i, color: color });
        }
        return items;
    }

    normalizeCustomTermValue(value) {
        const normalizedValue = this.normalizeTermValue(value);
        if (normalizedValue == null)
            return normalizedValue;
        const text = String(normalizedValue).trim();
        if (text === "")
            return normalizedValue;
        const numeric = Number(text);
        if (!Number.isFinite(numeric))
            return normalizedValue;
        return this.formatModelValue(numeric);
    }

    getTermSelectItems(term, caseProperty) {
        const calculator = this.board.calculator;
        const items = Utils.getTerms(calculator.getTermsNames());
        const selectedValue = this.normalizeTermValue(this.properties[term]);
        if (selectedValue == null || selectedValue === "")
            return items;
        if (calculator.isTerm(selectedValue))
            return items;
        const formattedValue = this.normalizeCustomTermValue(selectedValue);
        items.unshift({
            text: formattedValue,
            term: selectedValue
        });
        return items;
    }

    createCaseFieldAddonRenderer(term, caseColors) {
        if (this.properties[this.getTermCaseColorProperty(term)] === false)
            return null;
        return data => {
            const color = data?.color ?? caseColors[0];
            const icon = $(`<i class="${this.getCaseIconClass(color)} case-select__icon"></i>`);
            icon.css("color", this.getCaseIconColor(color));
            if (color == "#ffffff")
                icon[0].style.setProperty("--fa-primary-color", "#000000");
            return icon;
        };
    }

    createCaseItemTemplate(term) {
        const showCaseColor = this.properties[this.getTermCaseColorProperty(term)] !== false;
        return (itemData, _, element) => {
            const content = $("<div>").addClass("case-select");
            if (showCaseColor) {
                const icon = $(`<i class="${this.getCaseIconClass(itemData.color)} case-select__icon"></i>`);
                icon.css("color", this.getCaseIconColor(itemData.color));
                if (itemData.color == "#ffffff")
                    icon[0].style.setProperty("--fa-primary-color", "#000000");
                content.append(icon);
            }
            const label = $("<span>").addClass("case-select__label").text(itemData.value);
            content.append(label);
            element.append(content);
        };
    }

    isTermDisplayVisible(mode) {
        if (mode === false || mode === "none")
            return false;
        return true;
    }

    getVisibilityIconClass(value) {
        if (value)
            return "fa-light fa-eye";
        return "fa-light fa-eye-closed";
    }

    updatePackedVisibilityCheckboxIcon(checkboxInstance) {
        if (!checkboxInstance)
            return;
        const iconContainer = checkboxInstance.element().find(".dx-checkbox-icon");
        if (iconContainer.length == 0)
            return;
        iconContainer.empty();
        const iconClass = this.getVisibilityIconClass(checkboxInstance.option("value") === true);
        $("<i>").addClass(`${iconClass} term-packed-checkbox-icon`).appendTo(iconContainer);
    }

    createPackedVisibilityCheckbox(buttonHost, initialValue, onValueChanged) {
        return buttonHost.dxCheckBox({
            value: initialValue === true,
            elementAttr: { class: "term-packed-checkbox" },
            onContentReady: e => this.updatePackedVisibilityCheckboxIcon(e.component),
            onValueChanged: e => {
                this.updatePackedVisibilityCheckboxIcon(e.component);
                onValueChanged(e.value === true);
            }
        }).dxCheckBox("instance");
    }

    createPackedTermControl(instance, term, caseProperty, isEditable, caseColors, displayModeProperty) {
        const control = $("<div>").addClass("term-packed-control");
        const buttonHost = $("<div>").addClass("term-packed-control__button");
        const selectHost = $("<div>").addClass("term-packed-control__select");
        const displayModeValue = this.properties[displayModeProperty] ?? "none";
        const isVisible = this.isTermDisplayVisible(displayModeValue);
        control.append(buttonHost, selectHost);
        const termButton = this.createPackedVisibilityCheckbox(buttonHost, isVisible, value => {
            this.setProperty(displayModeProperty, value ? "nameValue" : "none");
            this.board.markDirty(this);
        });
        const termSelect = selectHost.dxSelectBox({
            value: this.properties[term],
            items: this.getTermSelectItems(term, caseProperty),
            stylingMode: "filled",
            displayExpr: "text",
            valueExpr: "term",
            placeholder: "",
            acceptCustomValue: isEditable,
            inputAttr: { class: "mdl-variable-selector" },
            elementAttr: { class: "mdl-variable-selector" },
            itemTemplate: (data, index, element) => {
                const item = $("<div>").text(data.text);
                item.addClass("mdl-variable-selector");
                element.append(item);
            },
            onOpened: _ => this.refreshTermSelectEditor(term, caseProperty),
            onValueChanged: e => {
                instance.updateData(term, e.value);
                this.updateTermGroupLayout(instance, term, caseProperty);
                this.board.markDirty(this);
            },
            onCustomItemCreating: e => {
                const customValue = this.normalizeCustomTermValue(e.text);
                instance.updateData(term, customValue);
                e.component.option("value", customValue);
                e.customItem = { text: customValue, term: customValue };
                this.updateTermGroupLayout(instance, term, caseProperty);
                this.board.markDirty(this);
            }
        }).dxSelectBox("instance");
        this.termFormControls[term] = this.termFormControls[term] ?? {};
        this.termFormControls[term].termButton = termButton;
        this.termFormControls[term].termSelect = termSelect;
        return control;
    }

    createPackedCaseControl(instance, term, caseProperty, caseColors, caseColorProperty) {
        const control = $("<div>").addClass("term-packed-control");
        const buttonHost = $("<div>").addClass("term-packed-control__button");
        const selectHost = $("<div>").addClass("term-packed-control__select");
        const caseColorVisible = this.properties[caseColorProperty] !== false;
        control.append(buttonHost, selectHost);
        const caseButton = this.createPackedVisibilityCheckbox(buttonHost, caseColorVisible, value => {
            this.setProperty(caseColorProperty, value);
            this.refreshCaseSelectEditor(term, caseProperty, caseColors);
        });
        const caseSelect = selectHost.dxSelectBox({
            value: this.properties[caseProperty],
            items: this.buildCaseItems(caseColors),
            valueExpr: "value",
            displayExpr: "value",
            fieldAddons: this.createCaseFieldAddonRenderer(term, caseColors) ? { before: this.createCaseFieldAddonRenderer(term, caseColors) } : {},
            itemTemplate: this.createCaseItemTemplate(term),
            stylingMode: "filled",
            onValueChanged: e => {
                instance.updateData(caseProperty, e.value);
                this.refreshTermSelectEditor(term, caseProperty);
                this.board.markDirty(this);
            }
        }).dxSelectBox("instance");
        this.termFormControls[term] = this.termFormControls[term] ?? {};
        this.termFormControls[term].caseButton = caseButton;
        this.termFormControls[term].caseSelect = caseSelect;
        return control;
    }

    refreshTermSelectEditor(term, caseProperty) {
        const controls = this.termFormControls[term];
        const termSelect = controls?.termSelect;
        if (!termSelect)
            return;
        termSelect.option("items", this.getTermSelectItems(term, caseProperty));
    }

    refreshCaseSelectEditor(term, caseProperty, caseColors) {
        const controls = this.termFormControls[term];
        const caseSelect = controls?.caseSelect;
        if (!caseSelect)
            return;
        const beforeRenderer = this.createCaseFieldAddonRenderer(term, caseColors);
        caseSelect.option("fieldAddons", beforeRenderer ? { before: beforeRenderer } : {});
        caseSelect.option("itemTemplate", this.createCaseItemTemplate(term));
    }

    getFormItemByName(items, itemName) {
        const queue = Array.isArray(items) ? [...items] : [];
        while (queue.length > 0) {
            const item = queue.shift();
            if (item?.name === itemName)
                return item;
            if (Array.isArray(item?.items))
                queue.push(...item.items);
        }
        return null;
    }

    updateTermGroupLayout(instance, term, caseProperty) {
        const formData = instance.option("formData") ?? this.properties;
        const showCase = this.getCasesCount() > 1;
        const groupName = `${term}Group`;
        const termItemName = `${term}Item`;
        const caseItemName = `${caseProperty}Item`;
        const currentItems = instance.option("items");
        const groupItem = this.getFormItemByName(currentItems, groupName);
        if (!groupItem?.items)
            return;
        const termItem = groupItem.items.find(item => item?.name === termItemName);
        const caseItem = groupItem.items.find(item => item?.name === caseItemName);
        if (!termItem || !caseItem)
            return;
        termItem.colSpan = showCase ? 1 : 2;
        caseItem.visible = showCase;
        const caseValue = formData[caseProperty] ?? this.properties[caseProperty];
        if (showCase && (caseValue == null || caseValue === ""))
            instance.updateData(caseProperty, 1);
        instance.option("items", currentItems);
    }

    refreshTermFormLayouts(instance) {
        if (!instance)
            return;
        for (let index = 0; index < this.termDisplayEntries.length; index++) {
            const entry = this.termDisplayEntries[index];
            this.updateTermGroupLayout(instance, entry.term, entry.caseProperty);
        }
    }

    addTermToForm(term, title, isEditable = true, colSpan = 1) {
        if (this.form == null)
            return;
        var instance = this.form.dxForm("instance");
        var items = instance.option("items");
        const caseProperty = `${term}Case`;
        const displayModeProperty = this.getTermDisplayModeProperty(term);
        const caseColorProperty = this.getTermCaseColorProperty(term);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (this.properties[caseColorProperty] == null)
            this.properties[caseColorProperty] = true;
        if (!this.termDisplayEntries.some(entry => entry.term === term))
            this.termDisplayEntries.push({ term: term, caseProperty: caseProperty, title: title });
        const caseColors = this.board.theme.getBackgroundColors().map(c => c.color);
        const initialShowCase = this.getCasesCount() > 1;
        this.termFormControls[term] = {};
        items.push(
            {
                colSpan: 2,
                itemType: "group",
                name: `${term}Group`,
                cssClass: "term-packed-group",
                colCount: 2,
                items: [
                    {
                        colSpan: initialShowCase ? 1 : 2,
                        name: `${term}Item`,
                        label: { text: title },
                        template: _ => this.createPackedTermControl(instance, term, caseProperty, isEditable, caseColors, displayModeProperty)
                    },
                    {
                        colSpan: 1,
                        name: `${caseProperty}Item`,
                        visible: initialShowCase,
                        label: { text: this.board.translations.get("Case") },
                        template: _ => this.createPackedCaseControl(instance, term, caseProperty, caseColors, caseColorProperty)
                    }
                ]
            }
        );
        instance.option("items", items);
        this.updateTermGroupLayout(instance, term, caseProperty);
    }

    resolveTermNumeric(term, caseNumber = 1) {
        const calculator = this.board.calculator;
        if (calculator.isTerm(term))
            return calculator.getByName(term, caseNumber);
        return parseFloat(term);
    }
}
