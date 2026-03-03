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
        const hasBorderColor = properties != null && Object.prototype.hasOwnProperty.call(properties, "borderColor");
        const hasForegroundColor = properties != null && Object.prototype.hasOwnProperty.call(properties, "foregroundColor");
        Object.assign(this.properties, properties);
        if (!hasBorderColor && hasForegroundColor)
            this.properties.borderColor = this.properties.foregroundColor;
    }

    setDefaults() {
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
        this.properties.rotation = 0;
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
        if (this.properties.borderColor == null)
            this.properties.borderColor = this.properties.foregroundColor;
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

    getColorControl() {
        if (!this.colorControl)
            this.colorControl = new ColorControl();
        return this.colorControl;
    }

    createColorPickerEditor(dataField, options = {}) {
        const onValueChanged = value => {
            const formInstance = this.getShapeFormInstance();
            if (formInstance)
                formInstance.updateData(dataField, value);
            else
                this.setProperty(dataField, value);
        };
        return this.getColorControl().createEditor(this.properties[dataField], onValueChanged, options);
    }

    createColorPickerFormItem(dataField, label, colSpan = 2, options = {}) {
        return {
            colSpan: colSpan,
            dataField: dataField,
            label: { text: label },
            template: _ => this.createColorPickerEditor(dataField, options)
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
        TermControl.createVisibilityCheckbox(visibilityHost, isVisible, value => {
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
                    colCount: 3,
                    items: [
                        {
                            colSpan: 1,
                            dataField: "foregroundColor",
                            label: { text: "Color" },
                            template: _ => this.createColorPickerEditor("foregroundColor")
                        },
                        {
                            colSpan: 1,
                            dataField: "borderColor",
                            label: { text: "Border" },
                            template: _ => this.createColorPickerEditor("borderColor")
                        },
                        {
                            colSpan: 1,
                            dataField: "backgroundColor",
                            label: { text: "Background" },
                            template: _ => this.createColorPickerEditor("backgroundColor")
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

    getBorderColor() {
        return this.properties.borderColor ?? this.properties.foregroundColor ?? "#000000";
    }

    applyBorderStroke(element, strokeWidth = null) {
        if (!element)
            return;
        element.setAttribute("stroke", this.getBorderColor());
        if (strokeWidth != null)
            element.setAttribute("stroke-width", `${strokeWidth}`);
    }

    applyBorderStyle(element, borderWidth = 1) {
        if (!element)
            return;
        element.style.border = `${borderWidth}px solid ${this.getBorderColor()}`;
        element.style.boxSizing = "border-box";
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
            return { x: position.x, y: position.y - radius - 2 };
        const width = Number(this.properties.width);
        const height = Number(this.properties.height);
        const hasCenteredImageBounds = !!this.image && !this.container && !this.path && Number.isFinite(width) && Number.isFinite(height);
        if (hasCenteredImageBounds)
            return { x: position.x, y: position.y - height / 2 - 2 };
        if (Number.isFinite(width) && Number.isFinite(height)) {
            const left = Math.min(position.x, position.x + width);
            const right = Math.max(position.x, position.x + width);
            const top = Math.min(position.y, position.y + height);
            return { x: (left + right) / 2, y: top - 2 };
        }
        return { x: position.x, y: position.y - 2 };
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
        if (this.shapeNameLayer.parentNode == this.element && this.shapeNameLayer.nextSibling != null)
            this.element.appendChild(this.shapeNameLayer);
        this.shapeNameText.setAttribute("x", anchor.x);
        this.shapeNameText.setAttribute("y", anchor.y);
        this.shapeNameText.setAttribute("text-anchor", "middle");
        this.shapeNameText.setAttribute("fill", this.getShapeNameColor());
        this.shapeNameText.textContent = this.properties.name;
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

    buildTermDisplayLabel(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return null;
        const rawTerm = this.normalizeTermValue(this.properties[entry.term]);
        if (rawTerm == null || rawTerm === "")
            return null;
        const termName = String(rawTerm);
        const calculator = this.board.calculator;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        const value = calculator.isTerm(termName) ? calculator.getByName(termName, caseNumber) : Number(termName);
        const valueText = Number.isFinite(value) ? this.formatModelValue(value) : termName;
        return {
            termText: termName,
            valueText: valueText,
            text: `${termName} = ${valueText}`
        };
    }

    isTermCaseIndicatorVisible(entry) {
        const modeProperty = this.getTermDisplayModeProperty(entry.term);
        if (!this.isTermDisplayVisible(this.properties[modeProperty] ?? "none"))
            return false;
        const termValue = this.normalizeTermValue(this.properties[entry.term]);
        return TermControl.shouldShowCaseSelectionForTerm(termValue, TermControl.getBaseShapeCaseVisibilityConfig(this));
    }

    getTermCaseIndicatorNumber(entry) {
        if (!this.isTermCaseIndicatorVisible(entry))
            return null;
        const caseNumber = this.getTermCaseNumber(entry.caseProperty);
        return this.getClampedCaseNumber(caseNumber);
    }

    createTermLabelDefinition(entry, labelData, x, y, anchor) {
        return {
            text: labelData?.text ?? "",
            termText: labelData?.termText ?? "",
            valueText: labelData?.valueText ?? "",
            x: x,
            y: y,
            anchor: anchor,
            caseNumber: this.getTermCaseIndicatorNumber(entry)
        };
    }

    ensureTermLabelElements(index) {
        let labelGroup = this.termDisplayLabelsLayer.children[index];
        if (!labelGroup || labelGroup.tagName?.toLowerCase() != "g") {
            if (labelGroup)
                this.termDisplayLabelsLayer.removeChild(labelGroup);
            labelGroup = this.board.createSvgElement("g");
            const sibling = this.termDisplayLabelsLayer.children[index] ?? null;
            this.termDisplayLabelsLayer.insertBefore(labelGroup, sibling);
        }
        let caseIconHost = labelGroup.children[0];
        if (!caseIconHost || caseIconHost.tagName?.toLowerCase() != "foreignobject") {
            if (caseIconHost)
                labelGroup.removeChild(caseIconHost);
            caseIconHost = this.board.createSvgElement("foreignObject");
            caseIconHost.setAttribute("class", "shape-term-case-icon-host");
            if (labelGroup.firstChild)
                labelGroup.insertBefore(caseIconHost, labelGroup.firstChild);
            else
                labelGroup.appendChild(caseIconHost);
        }
        if (!caseIconHost.firstChild || caseIconHost.firstChild.tagName?.toLowerCase() != "div") {
            const iconContainer = this.board.createElement("div");
            iconContainer.setAttribute("class", "shape-term-case-icon-container");
            caseIconHost.replaceChildren(iconContainer);
        }
        const iconContainer = caseIconHost.firstChild;
        if (!iconContainer.firstChild || iconContainer.firstChild.tagName?.toLowerCase() != "i") {
            const icon = this.board.createElement("i");
            icon.setAttribute("class", "shape-term-case-icon");
            iconContainer.replaceChildren(icon);
        }
        let labelText = labelGroup.children[1];
        if (!labelText || labelText.tagName?.toLowerCase() != "text") {
            if (labelText)
                labelGroup.removeChild(labelText);
            labelText = this.board.createSvgElement("text");
            labelText.setAttribute("class", "shape-term-label");
            labelGroup.appendChild(labelText);
        }
        return { group: labelGroup, caseIconHost: caseIconHost, caseIconElement: caseIconHost.firstChild.firstChild, labelText: labelText };
    }

    getTermCaseIconLayout(label, labelText) {
        const iconSize = 9;
        const gap = 3;
        const y = label.y + 1;
        if (!label.caseNumber)
            return { visible: false, iconSize: iconSize, iconX: 0, iconY: y, textX: label.x };
        if (label.anchor == "start")
            return { visible: true, iconSize: iconSize, iconX: label.x, iconY: y, textX: label.x + iconSize + gap };
        if (label.anchor == "end")
            return { visible: true, iconSize: iconSize, iconX: label.x - iconSize, iconY: y, textX: label.x - iconSize - gap };
        let labelWidth = 0;
        if (labelText?.getBBox)
            try {
                labelWidth = labelText.getBBox().width;
            } catch (_) {}
        const textX = label.x + (iconSize + gap) / 2;
        const iconX = textX - labelWidth / 2 - gap - iconSize;
        return { visible: true, iconSize: iconSize, iconX: iconX, iconY: y, textX: textX };
    }

    applyTermCaseIcon(caseIconHost, caseIconElement, caseNumber, layout) {
        if (!caseIconHost || !caseIconElement)
            return;
        if (!layout.visible) {
            caseIconHost.setAttribute("display", "none");
            return;
        }
        caseIconHost.removeAttribute("display");
        caseIconHost.setAttribute("x", `${layout.iconX}`);
        caseIconHost.setAttribute("y", `${layout.iconY}`);
        caseIconHost.setAttribute("width", `${layout.iconSize}`);
        caseIconHost.setAttribute("height", `${layout.iconSize + 1}`);
        const iconClass = `${TermControl.getCaseNumberIconClass(caseNumber)} shape-term-case-icon`;
        if (caseIconElement.getAttribute("class") != iconClass)
            caseIconElement.setAttribute("class", iconClass);
        const iconColor = TermControl.getCaseIconColor(caseNumber);
        if (caseIconElement.style.color != iconColor)
            caseIconElement.style.color = iconColor;
    }

    setTermLabelText(labelText, label) {
        while (labelText.firstChild)
            labelText.removeChild(labelText.firstChild);
        if (!label) {
            labelText.textContent = "";
            return;
        }
        const termText = label.termText ?? "";
        const valueText = label.valueText ?? "";
        if (termText === "" && valueText === "") {
            labelText.textContent = label.text ?? "";
            return;
        }
        const termSpan = this.board.createSvgElement("tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.textContent = termText;
        labelText.appendChild(termSpan);
        const separatorSpan = this.board.createSvgElement("tspan");
        separatorSpan.setAttribute("font-family", "Katex_Main");
        separatorSpan.textContent = " = ";
        labelText.appendChild(separatorSpan);
        const valueSpan = this.board.createSvgElement("tspan");
        valueSpan.setAttribute("font-family", "Katex_Main");
        valueSpan.textContent = valueText;
        labelText.appendChild(valueSpan);
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
            const labelData = this.buildTermDisplayLabel(entry);
            if (!labelData)
                continue;
            if (axesPosition && shapeCenterPosition) {
                const axis = this.getTermAxis(entry.term);
                if (axis == "x" || axis == "y") {
                    const axisLabelIndex = axis == "x" ? xAxisLabelIndex : yAxisLabelIndex;
                    const labelPosition = this.getAxisTermLabelPosition(axis, shapeCenterPosition, axesPosition, axisLabelIndex);
                    labels.push(this.createTermLabelDefinition(entry, labelData, labelPosition.x, labelPosition.y, labelPosition.anchor));
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
            labels.push(this.createTermLabelDefinition(entry, labelData, fallbackAnchor.x, fallbackAnchor.y + fallbackLabelIndex * 12, "middle"));
            fallbackLabelIndex++;
        }
        while (this.termDisplayLabelsLayer.children.length > labels.length)
            this.termDisplayLabelsLayer.removeChild(this.termDisplayLabelsLayer.lastChild);
        if (labels.length == 0)
            return;
        for (let i = 0; i < labels.length; i++) {
            const labelElements = this.ensureTermLabelElements(i);
            const label = labels[i];
            const labelText = labelElements.labelText;
            labelText.setAttribute("x", label.x);
            labelText.setAttribute("y", label.y);
            labelText.setAttribute("text-anchor", label.anchor);
            labelText.setAttribute("fill", color);
            this.setTermLabelText(labelText, label);
            const iconLayout = this.getTermCaseIconLayout(label, labelText);
            labelText.setAttribute("x", iconLayout.textX);
            this.applyTermCaseIcon(labelElements.caseIconHost, labelElements.caseIconElement, label.caseNumber, iconLayout);
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
        const rawCount = parseInt(this.board.calculator.properties.casesCount ?? 1, 10) || 1;
        return this.getClampedCaseNumber(rawCount);
    }

    getClampedCaseNumber(caseNumber) {
        const normalizedCaseNumber = parseInt(caseNumber, 10);
        if (!Number.isFinite(normalizedCaseNumber))
            return 1;
        if (normalizedCaseNumber < 1)
            return 1;
        if (normalizedCaseNumber > 9)
            return 9;
        return normalizedCaseNumber;
    }

    buildCaseItems(caseColors) {
        const count = this.getCasesCount();
        const items = [];
        for (let i = 1; i <= count; i++)
            items.push({ value: i });
        return items;
    }

    isTermDisplayVisible(mode) {
        if (mode === false || mode === "none")
            return false;
        return true;
    }

    createTermSelectorControl(instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle = true) {
        const descriptor = TermControl.createBaseShapeTermFormControl(this, instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle);
        this.termFormControls[term] = { termControl: descriptor.termControl };
        return descriptor.control;
    }

    refreshTermFormLayouts(instance) {
        if (!instance)
            return;
        for (let index = 0; index < this.termDisplayEntries.length; index++) {
            const entry = this.termDisplayEntries[index];
            const controls = this.termFormControls[entry.term];
            const termControl = controls?.termControl ?? null;
            TermControl.syncBaseShapeTermControl(this, instance, entry.term, entry.caseProperty, termControl);
        }
    }

    addTermToForm(term, title, isEditable = true, colSpan = 1, options = {}) {
        if (this.form == null)
            return;
        var instance = this.form.dxForm("instance");
        var items = instance.option("items");
        const caseProperty = `${term}Case`;
        const displayModeProperty = this.getTermDisplayModeProperty(term);
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        if (this.properties[displayModeProperty] == null)
            this.properties[displayModeProperty] = "none";
        if (!this.termDisplayEntries.some(entry => entry.term === term))
            this.termDisplayEntries.push({ term: term, caseProperty: caseProperty, title: title });
        const showVisibilityToggle = options.showVisibilityToggle !== false;
        items.push(
            {
                colSpan: 2,
                name: `${term}Item`,
                label: { text: title },
                template: _ => this.createTermSelectorControl(instance, term, caseProperty, isEditable, displayModeProperty, showVisibilityToggle)
            }
        );
        instance.option("items", items);
        TermControl.syncBaseShapeTermControl(this, instance, term, caseProperty);
    }

    resolveTermNumeric(term, caseNumber = 1) {
        const calculator = this.board.calculator;
        if (calculator.isTerm(term))
            return calculator.getByName(term, caseNumber);
        return parseFloat(term);
    }
}
