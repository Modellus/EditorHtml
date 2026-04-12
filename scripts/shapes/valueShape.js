class ValueShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.isEditingValue = this.isEditingValue ?? false;
        this.editingTerm = this.editingTerm ?? "";
        this.editingCaseNumber = this.editingCaseNumber ?? 1;
        this.valueEditor = this.valueEditor ?? null;
        this.valueEditorHost = this.valueEditorHost ?? null;
        this.valueEditorContainer = this.valueEditorContainer ?? null;
        this.pendingEditorValue = this.pendingEditorValue ?? null;
        this.pendingEditorFocus = this.pendingEditorFocus ?? false;
    }

    enterEditMode() {
        const term = this.getSelectedTerm();
        if (!this.canEditTermValue(term))
            return false;
        const caseNumber = this.getSelectedCaseNumber(term);
        const currentValue = this.board.calculator.getByName(term, caseNumber);
        if (!Number.isFinite(currentValue))
            return false;
        this.beginValueEdit(term, caseNumber, currentValue);
        return true;
    }

    createToolbar() {
        const items = super.createToolbar();
        this._termControl = this.createTermControl("term", "Term", true);
        const fontSizeCaseProperty = "fontSizeTermCase";
        const fontSizeDisplayModeProperty = this.getTermDisplayModeProperty("fontSizeTerm");
        if (this.properties[fontSizeCaseProperty] == null)
            this.properties[fontSizeCaseProperty] = 1;
        if (this.properties[fontSizeDisplayModeProperty] == null)
            this.properties[fontSizeDisplayModeProperty] = "none";
        const fontSizeFormAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        this._fontSizeTermControl = this.createTermSelectorControl(fontSizeFormAdapter, "fontSizeTerm", fontSizeCaseProperty, true, fontSizeDisplayModeProperty, false);
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createFontDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $('<div class="toolbar-separator">|</div>')
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    populateShapeColorMenuSections(sections) {
        const bgLabel = this.board.translations.get("Background Color") ?? "Background";
        this._bgColorPicker = this.createColorPickerEditor("backgroundColor");
        sections[0].items.push({
            text: bgLabel,
            iconHtml: this.menuIconHtml("fa-fill", !!this.properties.backgroundColor),
            buildControl: $p => $p.append(this._bgColorPicker)
        });
    }

    refreshShapeColorToolbarControl() {
        super.refreshShapeColorToolbarControl();
        if (this._bgColorPicker)
            this.getColorControl().refreshColorPickerButtonTemplate(this._bgColorPicker, this.properties.backgroundColor);
    }

    populateTermsMenuSections(listItems) {
        listItems.push({ text: "Term", stacked: true, buildControl: $p => $p.append(this._termControl) });
    }

    buildTermDisplayLabel(entry) {
        if (this.properties.termDisplayMode === "nameValue")
            return null;
        return super.buildTermDisplayLabel(entry);
    }

    getContentClipId() {
        return `clip-value-${this.id}`;
    }

    renderTermsButtonTemplate(element) {
        const term = this.formatTermForDisplay(this.properties.term);
        element.innerHTML = term
            ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${term}</span></span>`
            : `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Term</span></span>`;
    }

    createFontDropDownButton(itemElement) {
        this._fontDropdownElement = $('<div class="mdl-font-selector">');
        this._fontDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Font",
            buttonTemplate: (data, element) => {
                element[0].innerHTML = `<i class="fa-light fa-text"></i>`;
            },
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { style: "z-index:99999" },
                width: "auto",
                contentTemplate: contentElement => this.buildFontMenuContent(contentElement)
            }
        });
        this._fontDropdownElement.appendTo(itemElement);
    }

    buildFontMenuContent(contentElement) {
        const listItems = [
            {
                text: "Size",
                stacked: true,
                buildControl: $parent => $parent.append(this._fontSizeTermControl)
            },
            {
                text: "Style",
                stacked: true,
                buildControl: $parent => {
                    const boldButtonId = `font-bold-btn-${this.id}`;
                    const italicButtonId = `font-italic-btn-${this.id}`;
                    $parent[0].innerHTML = `<div style="display:flex;gap:4px"><div id="${boldButtonId}"></div><div id="${italicButtonId}"></div></div>`;
                    $(`#${boldButtonId}`, $parent).dxButton({
                        text: "B",
                        stylingMode: this.properties.fontBold ? "contained" : "outlined",
                        hint: "Bold",
                        onClick: () => {
                            const newValue = !this.properties.fontBold;
                            this.setPropertyCommand("fontBold", newValue);
                            $(`#${boldButtonId}`, $parent).dxButton("instance").option("stylingMode", newValue ? "contained" : "outlined");
                        }
                    });
                    $(`#${italicButtonId}`, $parent).dxButton({
                        text: "I",
                        stylingMode: this.properties.fontItalic ? "contained" : "outlined",
                        hint: "Italic",
                        onClick: () => {
                            const newValue = !this.properties.fontItalic;
                            this.setPropertyCommand("fontItalic", newValue);
                            $(`#${italicButtonId}`, $parent).dxButton("instance").option("stylingMode", newValue ? "contained" : "outlined");
                        }
                    });
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: "auto", width: "auto" });
        $('<div>').appendTo($(contentElement).dxScrollView("instance").content()).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
            }
        });
    }

    showContextToolbar() {
        this.termFormControls["term"]?.termControl?.refresh();
        this.termFormControls["fontSizeTerm"]?.termControl?.refresh();
        this.refreshTermsToolbarControl();
        this.refreshFontToolbarControl();
        super.showContextToolbar();
    }

    refreshFontToolbarControl() {
        if (!this._fontDropdownElement)
            return;
        const buttonContentElement = this._fontDropdownElement.find(".dx-button-content")[0];
        if (buttonContentElement)
            buttonContentElement.innerHTML = `<i class="fa-light fa-text"></i>`;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Value Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 90;
        this.properties.y = center.y - 20;
        this.properties.width = 180;
        this.properties.height = 40;
        this.properties.term = this.board.calculator.getDefaultTerm();
        this.properties.termCase = 1;
        this.properties.backgroundColor = "#FFFFFF";
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[2].color;
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.fontSizeTerm = "14";
        this.properties.fontBold = false;
        this.properties.fontItalic = false;
        this.properties.termDisplayMode = "nameValue";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("rect");
        this.valueText = this.board.createSvgElement("text");
        this.valueText.setAttribute("text-anchor", "middle");
        this.valueText.setAttribute("dominant-baseline", "middle");
        this.caseIconHost = this.board.createSvgElement("foreignObject");
        this.caseIconHost.setAttribute("class", "shape-term-case-icon-host");
        const iconContainer = this.board.createElement("div");
        iconContainer.setAttribute("class", "shape-term-case-icon-container");
        const icon = this.board.createElement("i");
        icon.setAttribute("class", "shape-term-case-icon");
        iconContainer.appendChild(icon);
        this.caseIconHost.appendChild(iconContainer);
        this.caseIconElement = icon;
        const defs = this.board.createSvgElement("defs");
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", this.getContentClipId());
        clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
        this.contentClipRect = this.board.createSvgElement("rect");
        clipPath.appendChild(this.contentClipRect);
        defs.appendChild(clipPath);
        const clippedContent = this.board.createSvgElement("g");
        clippedContent.setAttribute("clip-path", `url(#${this.getContentClipId()})`);
        clippedContent.appendChild(this.valueText);
        clippedContent.appendChild(this.caseIconHost);
        this.valueEditorHost = this.board.createSvgElement("foreignObject");
        this.valueEditorHost.setAttribute("display", "none");
        this.valueEditorHost.setAttribute("class", "value-shape-editor-host");
        this.valueEditorContainer = this.board.createElement("div");
        this.valueEditorContainer.setAttribute("class", "value-shape-editor");
        this.valueEditorHost.appendChild(this.valueEditorContainer);
        element.appendChild(defs);
        element.appendChild(this.container);
        element.appendChild(clippedContent);
        element.appendChild(this.valueEditorHost);
        return element;
    }

    canEditTermValue(term) {
        if (term == null || term === "")
            return false;
        const calculator = this.board.calculator;
        if (!calculator.isTerm(term))
            return false;
        return calculator.isEditable(term);
    }

    createValueEditor() {
        if (!this.valueEditorContainer || this.valueEditor)
            return;
        const editorOptions = this.getPrecisionNumberEditorOptions({
            showSpinButtons: false,
            stylingMode: "filled",
            onEnterKey: _ => this.commitAndExitValueEdit(),
            onFocusOut: _ => this.commitAndExitValueEdit(),
            onKeyDown: event => this.onValueEditorKeyDown(event)
        });
        this.valueEditor = $(this.valueEditorContainer).dxNumberBox(editorOptions).dxNumberBox("instance");
    }

    onValueEditorKeyDown(event) {
        const keydownEvent = event?.event;
        if (!keydownEvent)
            return;
        if (keydownEvent.key !== "Escape")
            return;
        keydownEvent.preventDefault();
        keydownEvent.stopPropagation();
        this.cancelAndExitValueEdit();
    }

    beginValueEdit(term, caseNumber, value) {
        this.board.enableSelection(false);
        this.isEditingValue = true;
        this.editingTerm = term;
        this.editingCaseNumber = caseNumber;
        this.pendingEditorValue = value;
        this.pendingEditorFocus = true;
        this.showValueEditor();
        this.board.markDirty(this);
    }

    focusValueEditor() {
        if (!this.valueEditor)
            return;
        this.valueEditor.focus();
        const input = this.valueEditorContainer?.querySelector("input");
        if (input && typeof input.select === "function")
            input.select();
    }

    commitAndExitValueEdit() {
        if (!this.isEditingValue)
            return;
        this.commitEditedValue();
        this.endValueEdit();
    }

    cancelAndExitValueEdit() {
        if (!this.isEditingValue)
            return;
        this.endValueEdit();
    }

    commitEditedValue() {
        if (!this.valueEditor || !this.canEditTermValue(this.editingTerm))
            return;
        const numericValue = Number(this.valueEditor.option("value"));
        if (!Number.isFinite(numericValue))
            return;
        const calculator = this.board.calculator;
        calculator.setTermValue(this.editingTerm, numericValue, calculator.getIteration(), this.editingCaseNumber);
        calculator.calculate();
    }

    endValueEdit() {
        this.isEditingValue = false;
        this.editingTerm = "";
        this.editingCaseNumber = 1;
        this.pendingEditorValue = null;
        this.pendingEditorFocus = false;
        this.hideValueEditor();
        this.board.enableSelection(true);
        this.board.markDirty(this);
    }

    showValueEditor() {
        if (!this.valueEditorHost)
            return;
        this.valueEditorHost.removeAttribute("display");
    }

    hideValueEditor() {
        if (!this.valueEditorHost)
            return;
        this.valueEditorHost.setAttribute("display", "none");
    }

    getSelectedTerm() {
        return TermControl.normalizeTermValue(this.properties.term);
    }

    getSelectedCaseNumber(term) {
        return TermControl.getShapeCaseNumber(this, term, this.properties.termCase ?? 1);
    }

    shouldShowCaseIcon(term) {
        return TermControl.shouldShowCaseSelectionForShapeTerm(this, term);
    }

    resolveDisplayedValue(term, caseNumber) {
        if (term === "")
            return "-";
        const calculator = this.board.calculator;
        if (calculator.isTerm(term)) {
            const value = calculator.getByName(term, caseNumber);
            if (Number.isFinite(value))
                return this.formatModelValue(value);
            return "-";
        }
        const numericValue = Number(term);
        if (Number.isFinite(numericValue))
            return this.formatModelValue(numericValue);
        return term;
    }

    setValueTextContent(termText, valueText) {
        while (this.valueText.firstChild)
            this.valueText.removeChild(this.valueText.firstChild);
        if (termText === "") {
            const emptySpan = this.board.createSvgElement("tspan");
            emptySpan.setAttribute("font-family", "Katex_Main");
            emptySpan.textContent = valueText;
            this.valueText.appendChild(emptySpan);
            return;
        }
        const termSpan = this.board.createSvgElement("tspan");
        termSpan.setAttribute("font-family", "Katex_Math");
        termSpan.textContent = Utils.convertGreekLetters(termText);
        this.valueText.appendChild(termSpan);
        const separatorSpan = this.board.createSvgElement("tspan");
        separatorSpan.setAttribute("font-family", "Katex_Main");
        separatorSpan.textContent = " = ";
        this.valueText.appendChild(separatorSpan);
        const valueSpan = this.board.createSvgElement("tspan");
        valueSpan.setAttribute("font-family", "Katex_Main");
        valueSpan.textContent = valueText;
        this.valueText.appendChild(valueSpan);
    }

    updateCaseIcon(caseNumber, termText, showCaseIcon) {
        if (!showCaseIcon || termText === "") {
            this.caseIconHost.setAttribute("display", "none");
            return;
        }
        this.caseIconHost.removeAttribute("display");
        const iconClass = `${TermControl.getCaseNumberIconClass(caseNumber)} shape-term-case-icon`;
        if (this.caseIconElement.getAttribute("class") != iconClass)
            this.caseIconElement.setAttribute("class", iconClass);
        this.caseIconElement.style.color = TermControl.getCaseIconColor(caseNumber);
    }

    placeCaseIcon(position, width, height) {
        if (this.caseIconHost.getAttribute("display") == "none")
            return;
        let textRight = position.x + width / 2;
        try {
            const box = this.valueText.getBBox();
            textRight = box.x + box.width;
        } catch (_) {}
        const iconSize = 10;
        const iconX = Math.min(position.x + width - iconSize - 4, textRight + 4);
        const iconY = position.y + (height - iconSize) / 2;
        this.caseIconHost.setAttribute("x", `${iconX}`);
        this.caseIconHost.setAttribute("y", `${iconY}`);
        this.caseIconHost.setAttribute("width", `${iconSize}`);
        this.caseIconHost.setAttribute("height", `${iconSize + 1}`);
    }

    placeValueEditor(position, width, height) {
        if (!this.isEditingValue || !this.valueEditorHost)
            return;
        let editorBox = this.getValueTextBounds();
        if (!editorBox) {
            const fallbackWidth = Math.max(24, width * 0.3);
            const fallbackHeight = Math.max(12, height * 0.5);
            const fallbackX = position.x + width / 2 - fallbackWidth / 2;
            const fallbackY = position.y + height / 2 - fallbackHeight / 2;
            this.setValueEditorHostBounds(fallbackX, fallbackY, fallbackWidth, fallbackHeight);
            return;
        }
        this.setValueEditorHostBounds(editorBox.x, editorBox.y, editorBox.width, editorBox.height);
    }

    getValueEditorHorizontalPadding() {
        return 3;
    }

    getValueEditorVerticalOffset() {
        return -1;
    }

    getEditingTextVerticalOffset() {
        return this.getValueEditorVerticalOffset();
    }

    setValueEditorHostBounds(x, y, width, height) {
        const horizontalPadding = this.getValueEditorHorizontalPadding();
        const verticalOffset = this.getValueEditorVerticalOffset();
        const adjustedX = x - horizontalPadding;
        const adjustedY = y + verticalOffset;
        const adjustedWidth = Math.max(1, width + horizontalPadding * 2);
        const adjustedHeight = Math.max(1, height + 2);
        this.valueEditorHost.setAttribute("x", `${adjustedX}`);
        this.valueEditorHost.setAttribute("y", `${adjustedY}`);
        this.valueEditorHost.setAttribute("width", `${adjustedWidth}`);
        this.valueEditorHost.setAttribute("height", `${adjustedHeight}`);
    }

    getValueTextBounds() {
        if (!this.valueText?.lastChild)
            return null;
        try {
            const valueBounds = this.valueText.lastChild.getBBox();
            if (!Number.isFinite(valueBounds.x) || !Number.isFinite(valueBounds.y) || !Number.isFinite(valueBounds.width) || !Number.isFinite(valueBounds.height))
                return null;
            return valueBounds;
        } catch (_) {
            return null;
        }
    }

    draw() {
        super.draw();
        const position = this.getBoardPosition();
        const width = Math.max(20, Number(this.properties.width) || 20);
        const height = Math.max(16, Number(this.properties.height) || 16);
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", width);
        this.container.setAttribute("height", height);
        this.container.setAttribute("rx", 4);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.container, 1);
        this.contentClipRect.setAttribute("x", position.x);
        this.contentClipRect.setAttribute("y", position.y);
        this.contentClipRect.setAttribute("width", width);
        this.contentClipRect.setAttribute("height", height);
        const termText = this.getSelectedTerm();
        const caseNumber = this.getSelectedCaseNumber(termText);
        const valueText = this.resolveDisplayedValue(termText, caseNumber);
        const isEditingCurrentTerm = this.isEditingValue && this.editingTerm === termText && termText !== "";
        const textVerticalOffset = isEditingCurrentTerm ? this.getEditingTextVerticalOffset() : 0;
        this.valueText.setAttribute("x", `${position.x + width / 2}`);
        this.valueText.setAttribute("y", `${position.y + height / 2 + textVerticalOffset}`);
        this.valueText.setAttribute("fill", this.properties.foregroundColor);
        const resolvedFontSize = this.resolveTermNumeric(this.properties.fontSizeTerm, this.properties.fontSizeTermCase ?? 1);
        this.valueText.setAttribute("font-size", Number.isFinite(resolvedFontSize) ? Math.max(1, resolvedFontSize) : 14);
        this.valueText.setAttribute("font-weight", this.properties.fontBold ? "bold" : "normal");
        this.valueText.setAttribute("font-style", this.properties.fontItalic ? "italic" : "normal");
        this.setValueTextContent(this.properties.termDisplayMode === "nameValue" ? termText : "", valueText);
        const valueTextBounds = isEditingCurrentTerm ? this.getValueTextBounds() : null;
        if (isEditingCurrentTerm && this.valueText.lastChild)
            this.valueText.lastChild.setAttribute("fill-opacity", "0");
        this.updateCaseIcon(caseNumber, termText, this.shouldShowCaseIcon(termText));
        this.placeCaseIcon(position, width, height);
        if (isEditingCurrentTerm) {
            this.showValueEditor();
            if (valueTextBounds) {
                this.setValueEditorHostBounds(valueTextBounds.x, valueTextBounds.y, valueTextBounds.width, valueTextBounds.height);
            } else
                this.placeValueEditor(position, width, height);
            this.createValueEditor();
            if (this.valueEditor && this.pendingEditorValue != null) {
                this.valueEditor.option("value", this.pendingEditorValue);
                this.pendingEditorValue = null;
            }
            if (this.valueEditor)
                this.valueEditor.repaint();
            if (this.valueEditor && this.pendingEditorFocus) {
                this.pendingEditorFocus = false;
                requestAnimationFrame(() => this.focusValueEditor());
            }
        } else
            this.hideValueEditor();
        this.element.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + width / 2}, ${position.y + height / 2})`);
    }

    tick() {
        super.tick();
        this.board.markDirty(this);
    }
}
