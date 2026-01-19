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
        var name = this.constructor.name.split(/(?=[A-Z])/)[0];
        this.properties.name = name;
    }

    initializeElement() {
        this.element = this.createElement();
        this.element.setAttribute("id", this.id);
        this.element.setAttribute("clip-path", `url(#${this.getClipId()})`);
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
                            editorType: "dxTextBox",
                            editorOptions: {
                                stylingMode: "filled"
                            }
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
                            colSpan: 2,
                            dataField: "backgroundColor",
                            label: { text: "Background color" },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                onContentReady: function(e) {
                                    e.component.option("items").forEach((item, index) => {
                                        const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                        const color = item.color == "#00000000" ? "#cccccc" : item.color;
                                        buttonElement.find(".dx-icon").css("color", color);
                                        if (item.color == "#ffffff")
                                            buttonElement[0].style.setProperty("--fa-primary-color", "#000000");
                                    });
                                },
                                items: this.board.theme.getBackgroundColors().map(c => ({
                                    icon: c.color == "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square",
                                    color: c.color
                                })),
                                keyExpr: "color",
                                stylingMode: "text",
                                selectedItemKeys: [this.properties.backgroundColor],
                                onItemClick: e => {
                                    let formInstance = $("#shape-form").dxForm("instance");
                                    formInstance.updateData("backgroundColor", e.itemData.color);
                                    this.setProperty("backgroundColor", e.itemData.color);
                                }
                            }
                        },
                        {
                            colSpan: 2,
                            dataField: "foregroundColor",
                            label: { text: "Color" },
                            editorType: "dxButtonGroup",
                            editorOptions: {
                                onContentReady: function(e) {
                                    e.component.option("items").forEach((item, index) => {
                                        const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                                        const color = item.color == "#00000000" ? "#cccccc" : item.color;
                                        buttonElement.find(".dx-icon").css("color", color);
                                        if (item.color == "#ffffff")
                                            buttonElement[0].style.setProperty("--fa-primary-color", "#000000");
                                    });
                                },
                                items: this.board.theme.getStrokeColors().map(c => ({
                                    icon: c.color == "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square",
                                    color: c.color
                                })),
                                keyExpr: "color",
                                stylingMode: "text",
                                selectedItemKeys: [this.properties.foregroundColor],
                                onItemClick: e => {
                                    let formInstance = $("#shape-form").dxForm("instance");
                                    formInstance.updateData("foregroundColor", e.itemData.color);
                                    this.setProperty("foregroundColor", e.itemData.color);
                                }
                            }
                        }
                    ]
                }
            ]
        });
        return this.form;
    }

    delta(property, delta) {
        var termMapping = this.termsMapping.find(t => t.property === property);
        if (termMapping != null) {
            const scale = this.getScale();
            let axisScale = scale[termMapping.scaleProperty] ?? 1;
            var term = this.properties[termMapping.termProperty];
            const caseNumber = this.properties[termMapping.caseProperty] ?? 1;
            const calculator = this.board.calculator;
            var isTerm = calculator.isTerm(term);
            delta = delta * axisScale * (termMapping.isInverted ? -1 : 1);
            if (isTerm) {
                var value = calculator.getByName(term, caseNumber);
                calculator.setTermValue(term, value + delta, calculator.system.iteration, caseNumber);
                calculator.calculate();
            } else
                this.properties[termMapping.termProperty] = Utils.roundToPrecision(
                    parseFloat(this.properties[termMapping.termProperty]) + delta, calculator.getPrecision());
        } else
            this.properties[property] = parseFloat(this.properties[property]) + delta;
        this.tick();
        this.board.markDirty(this);
        this.dispatchEvent("shapeChanged", { property: property, value: value });
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
        var referential = this.parent;
        while (referential != null && !referential.isReferential)
            referential = referential.parent;
        return {
            x: referential?.properties.scaleX ?? 1,
            y: referential?.properties.scaleY ?? 1,
        };
    }

    remove() {
        this.board.removeShape(this);
    }

    dragStart() {
        this.dispatchEvent("shapeDragStart", {});
    }

    dragEnd() {
        this.dispatchEvent("shapeDragEnd", {});
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

    addTermToForm(term, title, isEditable = true, colSpan = 1) {
        if (this.form == null)
            return;
        var instance = this.form.dxForm("instance");
        var items = instance.option("items");
        const caseProperty = `${term}Case`;
        if (this.properties[caseProperty] == null)
            this.properties[caseProperty] = 1;
        const calculator = this.board.calculator;
        const caseColors = this.board.theme.getBackgroundColors().map(c => c.color);
        const getCaseIconClass = color => color == "#00000000" ? "fa-solid fa-square-dashed" : "fa-duotone fa-thin fa-square";
        const getCaseIconColor = color => color == "#00000000" ? "#cccccc" : color;
        const getCasesCount = () => Math.max(1, parseInt(calculator.properties.casesCount ?? 1, 10) || 1);
        const buildCaseItems = () => {
            const count = getCasesCount();
            const items = [];
            for (let i = 1; i <= count; i++) {
                const color = caseColors[(i - 1) % caseColors.length];
                items.push({ value: i, color: color });
            }
            return items;
        };
        const groupPath = `items[${items.length}]`;
        const updateCaseVisibility = value => {
            const isTerm = calculator.isTerm(value);
            const showCase = isTerm && getCasesCount() > 1;
            instance.itemOption(`${groupPath}.items[1]`, "visible", showCase);
            instance.itemOption(`${groupPath}.items[0]`, "colSpan", showCase ? 1 : 2);
            if (showCase && !this.properties[caseProperty])
                instance.updateData(caseProperty, 1);
        };
        const initialShowCase = calculator.isTerm(this.properties[term]) && getCasesCount() > 1;
        items.push(
            {
                colSpan: 2,
                itemType: "group",
                colCount: 2,
                items: [
                    {
                        colSpan: initialShowCase ? 1 : 2,
                        dataField: term,
                        label: { text: title },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            items: Utils.getTerms(this.board.calculator.getTermsNames()),
                            stylingMode: "filled",
                            displayExpr: "text",
                            valueExpr: "term",
                            placeholder: "",
                            acceptCustomValue: isEditable,
                            inputAttr: { class: "mdl-variable-selector" },
                            elementAttr: { class: "mdl-variable-selector" },
                            itemTemplate: function (data, index, element) {
                                const item = $("<div>").text(data.text);
                                item.addClass("mdl-variable-selector");
                                element.append(item);
                            },
                            onValueChanged: e => updateCaseVisibility(e.value),
                            onCustomItemCreating: function(e) {
                                instance.updateData(term, e.text);
                                e.component.option("value", e.text);
                                e.customItem = { text: e.text, term: e.text };
                                updateCaseVisibility(e.text);
                            }
                        }
                    },
                    {
                        colSpan: 1,
                        dataField: caseProperty,
                        label: { text: this.board.translations.get("Case") },
                        editorType: "dxSelectBox",
                        visible: initialShowCase,
                        editorOptions: {
                            items: buildCaseItems(),
                            valueExpr: "value",
                            displayExpr: "value",
                            fieldAddons: {
                                before: data => {
                                    const color = data?.color ?? caseColors[0];
                                    const icon = $(`<i class="${getCaseIconClass(color)} case-select__icon"></i>`);
                                    icon.css("color", getCaseIconColor(color));
                                    if (color == "#ffffff")
                                        icon[0].style.setProperty("--fa-primary-color", "#000000");
                                    return icon;
                                }
                            },
                            itemTemplate: (itemData, _, element) => {
                                const content = $("<div>").addClass("case-select");
                                const icon = $(`<i class="${getCaseIconClass(itemData.color)} case-select__icon"></i>`);
                                icon.css("color", getCaseIconColor(itemData.color));
                                if (itemData.color == "#ffffff")
                                    icon[0].style.setProperty("--fa-primary-color", "#000000");
                                const label = $("<span>").addClass("case-select__label").text(itemData.value);
                                content.append(icon, label);
                                element.append(content);
                            },
                            stylingMode: "filled"
                        }
                    }
                ]
            }
        );
        updateCaseVisibility(this.properties[term]);
    }

    resolveTermNumeric(term, caseNumber = 1) {
        const calculator = this.board.calculator;
        if (calculator.isTerm(term))
            return calculator.getByName(term, caseNumber);
        return parseFloat(term);
    }
}
