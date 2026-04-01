class BodyShape extends ChildShape {
    static characters;
    static loadCharactersPromise;

    static setup() {
        super.setup();
        this.loadCharacters();
    }

    static loadCharacters() {
        if (this.loadCharactersPromise)
            return this.loadCharactersPromise;
        this.loadCharactersPromise = fetch("resources/characters/characters.json")
            .then(file => file.json())
            .then(directories => Promise.all(directories.map(directory => this.loadCharacter(directory))))
            .then(results => {
                this.characters = results;
                return results;
            });
        return this.loadCharactersPromise;
    }

    static loadCharacter(directory) {
        return fetch(`resources/characters/${directory}/character.json`)
            .then(file => file.json())
            .then(data => {
                data.folder = directory;
                return data;
            });
    }

    static getCharacters() {
        if (!this.characters)
            return [];
        return this.characters;
    }

    static getCharacterByKey(characterKey) {
        return this.getCharacters().find(character => character.folder === characterKey);
    }

    constructor(board, parent, id) {
        super(board, parent, id);
        this.ensureMotionTermMappings();
    }

    ensureMotionTermMappings() {
        if (!this.termsMapping.some(mapping => mapping.termProperty === "xTerm")) {
            this.termsMapping.push({
                termProperty: "xTerm",
                termValue: 0,
                property: "x",
                isInverted: false,
                scaleProperty: "x",
                caseProperty: "xTermCase"
            });
        }
        if (!this.termsMapping.some(mapping => mapping.termProperty === "yTerm")) {
            this.termsMapping.push({
                termProperty: "yTerm",
                termValue: 0,
                property: "y",
                isInverted: true,
                scaleProperty: "y",
                caseProperty: "yTermCase"
            });
        }
        if (!this.termsMapping.some(mapping => mapping.termProperty === "sizeTerm")) {
            this.termsMapping.push({
                termProperty: "sizeTerm",
                termValue: 0,
                property: "radius",
                isInverted: false,
                scaleProperty: "x",
                caseProperty: "sizeTermCase"
            });
        }
    }

    setProperties(properties) {
        super.setProperties(properties);
        this.character = this.getSelectedCharacter();
        if (!this.character && this.properties.characterKey)
            BodyShape.loadCharactersPromise?.then(() => {
                this.character = this.getSelectedCharacter();
                this.synchronizeIdleAnimationTicker();
                this.board.markDirty(this);
            });
        this.synchronizeIdleAnimationTicker();
    }

    setProperty(name, value) {
        if (name === "name")
            this.properties.nameIsDefault = false;
        if (name === "characterKey")
            this.character = BodyShape.getCharacterByKey(value);
        super.setProperty(name, value);
        if (name === "characterKey") {
            this.synchronizeIdleAnimationTicker();
            if (this.properties.nameIsDefault) {
                const character = this.getSelectedCharacter();
                if (character) {
                    const uniqueName = window.shell?.commands?.uniquifyShapeName(character.name) ?? character.name;
                    this.properties.nameIsDefault = true;
                    super.setProperty("name", uniqueName);
                    this.refreshNameToolbarControl();
                } else {
                    const defaultName = this.board.translations.get("Body Name") ?? "Body";
                    const uniqueName = window.shell?.commands?.uniquifyShapeName(defaultName) ?? defaultName;
                    this.properties.nameIsDefault = true;
                    super.setProperty("name", uniqueName);
                    this.refreshNameToolbarControl();
                }
            }
            this.refreshShapeColorToolbarControl();
        }
    }

    getHandles() {
        const handleSize = 12;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    const radius = this.properties.radius ?? 0;
                    return { x: position.x - radius, y: position.y - radius, width: radius * 2, height: radius * 2 };
                },
                getTransform: e => ({
                    x: this.delta("x", e.dx),
                    y: this.delta("y", e.dy)
                })
            },
            {
                className: "handle top-left",
                getAttributes: () => this.getCornerHandleAttributes("top-left", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle top-right",
                getAttributes: () => this.getCornerHandleAttributes("top-right", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle bottom-left",
                getAttributes: () => this.getCornerHandleAttributes("bottom-left", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle bottom-right",
                getAttributes: () => this.getCornerHandleAttributes("bottom-right", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            }
        ];
    }

    getCornerHandleAttributes(corner, handleSize) {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 0;
        if (corner === "top-left")
            return { x: position.x - radius - handleSize / 2, y: position.y - radius - handleSize / 2, width: handleSize, height: handleSize };
        if (corner === "top-right")
            return { x: position.x + radius - handleSize / 2, y: position.y - radius - handleSize / 2, width: handleSize, height: handleSize };
        if (corner === "bottom-left")
            return { x: position.x - radius - handleSize / 2, y: position.y + radius - handleSize / 2, width: handleSize, height: handleSize };
        return { x: position.x + radius - handleSize / 2, y: position.y + radius - handleSize / 2, width: handleSize, height: handleSize };
    }

    getCornerResizeTransform(eventPoint) {
        const position = this.getBoardPosition();
        const horizontalRadius = Math.abs(eventPoint.x - position.x);
        const verticalRadius = Math.abs(eventPoint.y - position.y);
        const radius = Math.max(5, Math.max(horizontalRadius, verticalRadius));
        const scale = this.getScale();
        const axisScale = scale.x ?? 1;
        const sizeValue = axisScale !== 0 ? radius * axisScale : radius;
        const calculator = this.board.calculator;
        const termValue = this.properties.sizeTerm;
        if (calculator.isTerm(termValue) && !this.isTermLocked("sizeTerm")) {
            const caseNumber = this.properties.sizeTermCase ?? 1;
            calculator.setTermValue(termValue, sizeValue, calculator.system.iteration, caseNumber);
            calculator.calculate();
        } else if (!calculator.isTerm(termValue))
            this.properties.sizeTerm = String(Utils.roundToPrecision(sizeValue, calculator.getPrecision()));
        return {
            radius: radius,
            width: radius * 2,
            height: radius * 2
        };
    }

    getHandleRotationCenter() {
        const position = this.getBoardPosition();
        return { x: position.x, y: position.y };
    }

    enterEditMode() {
        return false;
    }

    getScreenAnchorPoint() {
        return this.parent?.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }

    createToolbar() {
        const items = super.createToolbar();
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const sizeDisplayMode = this.getTermDisplayModeProperty("sizeTerm");
        const sizeDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "sizeTerm", "sizeTermCase", true, sizeDisplayMode, true);
        this.termFormControls["sizeTerm"] = { termControl: sizeDescriptor.termControl };
        this._sizeDescriptor = sizeDescriptor;
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
                template: () => $(`<div class="toolbar-separator">|</div>`)
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
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createMotionDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            this.createRemoveToolbarItem()
        );
        return items;
    }

    createCharacterPickerButton() {
        const baseItemSize = 50;
        const columns = 4;
        const itemMargin = 2;
        const step = baseItemSize + itemMargin * 2;
        const popupPadding = 6;
        this._characterPicker = $('<div class="mdl-character-picker"></div>');
        this._characterPicker.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Character",
            buttonTemplate: (data, element) => this.renderCharacterPickerButtonTemplate(element),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-character-picker-menu", style: "z-index:20000" },
                width: "auto",
                contentTemplate: contentElement => this.createCharacterPickerGrid(contentElement)
            }
        });
        return this._characterPicker;
    }

    renderCharacterPickerButtonTemplate(element) {
        const character = this.getSelectedCharacter();
        const content = $('<div class="mdl-character-picker-button-template"></div>');
        if (character)
            content.html(`<img src="resources/characters/${character.folder}/${character.image}" alt="${character.name}" />`);
        else
            content.html(`<i class="fa-light fa-circle mdl-character-picker-button-icon"></i>`);
        $(element).empty().append(content);
    }

    createCharacterPickerGrid(contentElement) {
        const baseItemSize = 50;
        const columns = 4;
        const itemMargin = 2;
        const step = baseItemSize + itemMargin * 2;
        const characters = BodyShape.characters ?? [];
        const allItems = [
            { key: "", name: "None", description: "", icon: null },
            ...characters.map(c => ({ key: c.folder, name: c.name, description: c.description ?? "", icon: `resources/characters/${c.folder}/${c.image}` }))
        ];
        const rows = Math.ceil(allItems.length / columns);
        $(contentElement).empty();
        const container = $('<div class="mdl-character-picker-grid"></div>');
        $(contentElement).append(container);
        container.dxTileView({
            items: allItems,
            baseItemHeight: baseItemSize,
            baseItemWidth: baseItemSize,
            itemMargin: itemMargin,
            direction: "vertical",
            height: rows * step,
            width: columns * step,
            itemTemplate: (itemData, index, element) => {
                const cell = $(`<div class="mdl-character-picker-item"></div>`);
                if (itemData.icon)
                    cell.html(`<img src="${itemData.icon}" alt="${itemData.name}" />`);
                else
                    cell.html(`<i class="fa-light fa-ban"></i>`);
                $(element).append(cell);
                this.configureCharacterTooltip(itemData, $(element)[0]);
            },
            onItemClick: e => {
                this.setPropertyCommand("characterKey", e.itemData.key ?? "");
                this._characterPicker?.dxDropDownButton("instance")?.close();
                this.refreshCharacterPickerButtonTemplate();
            }
        });
    }

    refreshCharacterPickerButtonTemplate() {
        if (!this._characterPicker)
            return;
        const buttonContentElement = this._characterPicker.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderCharacterPickerButtonTemplate(buttonContentElement);
    }

    renderParentButtonTemplate(element) {
        const parentShape = this.parent ?? this.getReferential();
        const parentCharacter = parentShape?.character;
        if (parentCharacter) {
            const name = parentShape.properties.name ?? parentCharacter.name;
            element.innerHTML = `<img class="mdl-parent-btn-character" src="resources/characters/${parentCharacter.folder}/${parentCharacter.image}" title="${name}" alt="${name}"/>`;
            return;
        }
        super.renderParentButtonTemplate(element);
    }

    renderShapeColorButtonTemplate(element) {
        const name = this.properties.name ?? "";
        if (this.character) {
            element.innerHTML = `<img class="mdl-name-btn-character" src="resources/characters/${this.character.folder}/${this.character.image}" alt="${name}"/><span>${name}</span>`;
            return;
        }
        super.renderShapeColorButtonTemplate(element);
    }

    populateShapeColorMenuSections(sections) {
        sections.push(
            {
                text: "Character",
                items: [
                    {
                        text: "",
                        buildControl: $p => this.createCharacterPickerGrid($p[0])
                    }
                ]
            },
            {
                text: "Image",
                items: [
                    {
                        text: "Upload",
                        buildControl: $p => $('<div>').dxButton({
                            icon: "fa-light fa-image",
                            hint: "Image",
                            stylingMode: "text",
                            onClick: _ => this.openImageFileDialog()
                        }).appendTo($p)
                    }
                ]
            }
        );
    }

    populateTermsMenuSections(listItems) {
        listItems.push(
            { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
            { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) },
            { text: "Size", stacked: true, buildControl: $p => $p.append(this._sizeDescriptor.control) },
            {
                text: "Attached To",
                parentSelector: true,
                buildControl: $el => {
                    const iconSpan = $('<span class="mdl-parent-selector-icon"></span>');
                    this._parentInlineIconHolder = iconSpan;
                    this.renderParentButtonTemplate(iconSpan[0]);
                    const treeContainer = $('<div class="mdl-parent-inline-tree" style="display:none"></div>');
                    const row = $(`<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">Attached To</span></div>`);
                    row.append(iconSpan);
                    iconSpan.on("click", () => {
                        if (treeContainer.is(":visible")) {
                            treeContainer.hide();
                            return;
                        }
                        treeContainer.empty();
                        $('<div>').dxTreeView({
                            items: this.buildParentTreeItems(this.getReferential()),
                            dataStructure: "tree",
                            keyExpr: "id",
                            displayExpr: "text",
                            selectionMode: "single",
                            selectByClick: true,
                            itemTemplate: (data, _, el) => {
                                if (data.characterImage)
                                    el[0].innerHTML = `<img class="mdl-parent-tree-character" src="${data.characterImage}" alt="${data.text}"/>${data.text}`;
                                else {
                                    const solidIcon = data.icon.replace("fa-light", "fa-solid");
                                    const colorStyle = data.color ? ` style="color:${data.color}"` : "";
                                    el[0].innerHTML = `<i class="dx-icon ${solidIcon}"${colorStyle}></i>${data.text}`;
                                }
                            },
                            onItemClick: e => {
                                const targetShape = this.board.shapes.getById(e.itemData.id);
                                if (this.wouldCreateCycle(targetShape))
                                    return;
                                this.setPropertyCommand("parentId", e.itemData.id);
                                treeContainer.hide();
                                this.renderParentButtonTemplate(iconSpan[0]);
                                this._termsDropdownElement.dxDropDownButton("instance").close();
                            }
                        }).appendTo(treeContainer);
                        treeContainer.show();
                    });
                    $el.empty();
                    $el.append(row, treeContainer);
                }
            }
        );
    }

    refreshParentToolbarControl() {
        if (this._parentInlineIconHolder)
            this.renderParentButtonTemplate(this._parentInlineIconHolder[0]);
    }

    renderTermsButtonTemplate(element) {
        const xTerm = this.formatTermForDisplay(this.properties.xTerm);
        const yTerm = this.formatTermForDisplay(this.properties.yTerm);
        const sizeTerm = this.formatTermForDisplay(this.properties.sizeTerm);
        element.innerHTML =
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${xTerm}</span></span>` +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${yTerm}</span></span>` +
            `<i class="fa-light fa-arrow-up-right mdl-name-btn-separator"></i>` +
            `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text">${sizeTerm}</span></span>`;
    }

    refreshNameToolbarControl() {
        super.refreshNameToolbarControl();
        this.refreshTermsToolbarControl();
        this.refreshShapeColorToolbarControl();
    }

    renderMotionButtonTemplate(element) {
        element.innerHTML = `<i class="fa-light fa-scribble"></i>`;
    }

    populateMotionMenuSections(sections) {
        super.populateMotionMenuSections(sections);
        sections[0].items.push(
            {
                text: "Frame step",
                buildControl: $p => $('<div>').dxNumberBox({
                    value: this.properties.animationFrameStep,
                    showSpinButtons: true,
                    min: 1,
                    width: 90,
                    stylingMode: "filled",
                    onInitialized: e => { this.animationFrameStepToolbarWidget = e.component; },
                    onValueChanged: e => this.setPropertyCommand("animationFrameStep", e.value)
                }).appendTo($p)
            }
        );
    }

    refreshStroboscopyToolbarControl() {
        super.refreshStroboscopyToolbarControl();
        this.animationFrameStepToolbarWidget?.option("value", this.properties.animationFrameStep);
    }

    showContextToolbar() {
        this.refreshParentToolbarControl();
        this.refreshMotionToolbarControl();
        this.termFormControls["xTerm"]?.termControl?.refresh();
        this.termFormControls["yTerm"]?.termControl?.refresh();
        this.termFormControls["sizeTerm"]?.termControl?.refresh();
        super.showContextToolbar();
    }

    openImageFileDialog() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async e => {
            const imageSource = await this.board.assetManager.uploadAsset(this.id, e.target.files[0]);
            if (imageSource)
                this.onImageControlChanged(imageSource);
        };
        input.click();
    }

    configureCharacterTooltip(itemData, itemElement) {
        if (itemElement.dataset.tooltipInitialized === "true")
            return;
        itemElement.dataset.tooltipInitialized = "true";
        const name = this.escapeCharacterTooltipText(itemData.name ?? "");
        const description = this.escapeCharacterTooltipText(itemData.description ?? "");
        const tooltipHtml = `<div class="tooltip"><strong>${name}</strong><div>${description}</div></div>`;
        $("<div>")
            .appendTo("body")
            .dxTooltip({
                target: itemElement,
                contentTemplate: contentElement => contentElement.append($("<div class='tooltip'/>").html(tooltipHtml)),
                showEvent: {
                    delay: 300,
                    name: "mouseenter"
                },
                hideEvent: "mouseleave",
                position: "top",
                width: 220
            });
    }

    escapeCharacterTooltipText(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    createImageDropZoneEditor() {
        this.imageDropZoneControl = new ImageControl({
            imageSource: this.getImageSource(),
            onUploadFile: file => this.board.assetManager.uploadAsset(this.id, file),
            onImageChanged: imageSource => this.onImageControlChanged(imageSource),
            onImageCleared: () => this.onImageControlCleared()
        });
        return this.imageDropZoneControl.createHost();
    }

    onImageControlChanged(imageSource) {
        this.properties.imageBase64 = "";
        this.setPropertyCommand("imageUrl", imageSource);
    }

    onImageControlCleared() {
        this.properties.imageBase64 = "";
        this.setPropertyCommand("imageUrl", "");
    }

    getImageSource() {
        const imageUrl = this.properties.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.trim() !== "")
            return imageUrl;
        const imageBase64 = this.properties.imageBase64;
        if (typeof imageBase64 === "string" && imageBase64.trim() !== "")
            return `data:image/png;base64,${imageBase64}`;
        return "";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.hitArea = this.board.createSvgElement("rect");
        this.hitArea.setAttribute("fill", "transparent");
        this.hitArea.setAttribute("stroke", "none");
        this.hitArea.setAttribute("pointer-events", "all");
        element.appendChild(this.hitArea);
        this.circle = this.board.createSvgElement("circle");
        this.circle.setAttribute("pointer-events", "all");
        element.appendChild(this.circle);
        this.image = this.board.createSvgElement("image");
        this.image.setAttribute("pointer-events", "none");
        element.appendChild(this.image);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        element.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        element.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        const metrics = this.getReferentialDefaultMetrics();
        this.properties.xTerm = metrics ? String(metrics.centerX) : "0";
        this.properties.yTerm = metrics ? String(metrics.centerY) : "0";
        this.properties.name = this.board.translations.get("Body Name");
        this.properties.x = metrics ? metrics.centerX / metrics.scaleX : 0;
        this.properties.y = metrics ? -metrics.centerY / metrics.scaleY : 0;
        this.properties.angle = 0;
        const radius = metrics ? metrics.size / metrics.scaleX : 10;
        this.properties.sizeTerm = String(metrics ? metrics.size : radius);
        this.properties.width = radius * 2;
        this.properties.height = radius * 2;
        this.properties.radius = radius;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.animationFrameStep = 1;
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
        this.properties.characterKey = "";
        this.properties.nameIsDefault = true;
        this.character = null;
        this.lastBoardHorizontalPosition = null;
        this.flipImageHorizontally = false;
        this.idleAnimationIntervalId = null;
        this.idleAnimationIntervalMs = null;
    }

    clearIdleAnimationTicker() {
        if (this.idleAnimationIntervalId == null)
            return;
        clearInterval(this.idleAnimationIntervalId);
        this.idleAnimationIntervalId = null;
        this.idleAnimationIntervalMs = null;
    }

    synchronizeIdleAnimationTicker() {
        const character = this.getSelectedCharacter();
        if (!character) {
            this.clearIdleAnimationTicker();
            return;
        }
        const idleAnimation = this.getCharacterIdleAnimation(character);
        if (!idleAnimation) {
            this.clearIdleAnimationTicker();
            return;
        }
        const frameCount = idleAnimation.frames;
        if (!Number.isFinite(frameCount) || frameCount <= 1) {
            this.clearIdleAnimationTicker();
            return;
        }
        const intervalMs = 1000 / frameCount;
        if (this.idleAnimationIntervalId != null && this.idleAnimationIntervalMs === intervalMs)
            return;
        this.clearIdleAnimationTicker();
        this.idleAnimationIntervalMs = intervalMs;
        this.idleAnimationIntervalId = setInterval(() => {
            if (this.isSimulationPlaying())
                return;
            if (!this.getSelectedCharacter())
                return;
            this.board.markDirty(this);
        }, intervalMs);
    }

    update() {
        super.update();
        this.synchronizeIdleAnimationTicker();
        const character = this.getSelectedCharacter();
        if (character) {
            if (this.imageDropZoneControl)
                this.imageDropZoneControl.setImageSource(this.getImageSource());
            return;
        }
        const imageSource = this.getImageSource();
        if (imageSource != "")
            this.image.setAttribute("href", imageSource);
        else
            this.image.removeAttribute("href");
        if (this.imageDropZoneControl)
            this.imageDropZoneControl.setImageSource(imageSource);
    }

    draw() {
        super.draw();
        this.drawShape();
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 0;
        const diameter = radius * 2;
        this.hitArea.setAttribute("x", position.x - radius);
        this.hitArea.setAttribute("y", position.y - radius);
        this.hitArea.setAttribute("width", diameter);
        this.hitArea.setAttribute("height", diameter);
        const character = this.getSelectedCharacter();
        if (character) {
            this.drawCharacter(position, radius, diameter, character);
            this.applyImageFlipTransform(position, true);
            return;
        }
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", this.properties.foregroundColor);
        this.applyBorderStroke(this.circle, 1);
        this.image.setAttribute("x", position.x - radius);
        this.image.setAttribute("y", position.y - radius);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        this.applyImageFlipTransform(position, this.image.hasAttribute("href"));
    }

    applyImageFlipTransform(position, hasImage) {
        if (!hasImage || !this.flipImageHorizontally) {
            this.image.removeAttribute("transform");
            return;
        }
        this.image.setAttribute("transform", `translate(${position.x * 2} 0) scale(-1 1)`);
    }

    getSelectedCharacter() {
        if (!this.properties.characterKey)
            return null;
        return BodyShape.getCharacterByKey(this.properties.characterKey);
    }

    drawCharacter(position, radius, diameter, character) {
        this.synchronizeIdleAnimationTicker();
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", "transparent");
        this.circle.setAttribute("stroke", "transparent");
        const pivotX = character.centerPoint?.x ?? 0.5;
        const pivotY = character.centerPoint?.y ?? 0.5;
        this.image.setAttribute("x", position.x - pivotX * diameter);
        this.image.setAttribute("y", position.y - pivotY * diameter);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid meet");
        const iteration = this.board.calculator.getIteration();
        const animation = this.getCharacterAnimation(character);
        const frameCount = animation.frames;
        const animationFolder = animation.folder;
        const startIndex = animation.startIndex ?? 0;
        const rawFrameIndex = this.getAnimationFrameIndex(animation, frameCount, iteration, startIndex);
        const padLength = animation.padLength ?? 0;
        const frameIndex = padLength > 0 ? String(rawFrameIndex).padStart(padLength, "0") : String(rawFrameIndex);
        const filePrefix = animation.filePrefix ?? `${character.name} ${animation.name} `;
        const frameName = `${filePrefix}${frameIndex}.png`;
        this.image.setAttribute("href", `resources/characters/${character.folder}/${animationFolder}/${frameName}`);
        this._lastFrameName = frameName;
        this._lastAnimationFolder = animationFolder;
        this._lastCharacterFolder = character.folder;
    }

    getAnimationFrameIndex(animation, frameCount, iteration, startIndex) {
        if (!this.isSimulationPlaying() && animation.name === "Idle") {
            const frameIntervalMs = 1000 / frameCount;
            const elapsedFrames = Math.floor(Date.now() / frameIntervalMs) % frameCount;
            return elapsedFrames + startIndex;
        }
        const frameStep = Math.max(1, this.properties.animationFrameStep ?? 1);
        return (Math.floor(iteration / frameStep) % frameCount) + startIndex;
    }

    getCharacterAnimation(character) {
        const animations = character.animations ?? [];
        if (animations.length === 0)
            return { name: "Idle", folder: "", frames: 1 };
        const idleAnimation = this.getCharacterIdleAnimation(character);
        if (!this.isSimulationPlaying() && idleAnimation)
            return idleAnimation;
        const movingAnimation = this.getCharacterMovingAnimation(character);
        return movingAnimation ?? idleAnimation ?? animations[0];
    }

    isSimulationPlaying() {
        const playingStatus = typeof STATUS !== "undefined" ? STATUS.PLAYING : 0;
        return this.board.calculator.status === playingStatus;
    }

    getCharacterIdleAnimation(character) {
        return character.animations.find(animation => animation.name === "Idle") ?? null;
    }

    getCharacterMovingAnimation(character) {
        const walkAnimation = character.animations.find(animation => animation.name === "Walk");
        if (walkAnimation)
            return walkAnimation;
        const nonIdleAnimation = character.animations.find(animation => animation.name !== "Idle");
        if (nonIdleAnimation)
            return nonIdleAnimation;
        return character.animations[0] ?? null;
    }

    tickShape() {
        const scale = this.getScale();
        for (const mapping of this.termsMapping) {
            const termValue = this.properties[mapping.termProperty];
            if (mapping.termProperty === "sizeTerm" && (termValue == null || String(termValue).trim() === ""))
                continue;
            const caseNumber = this.properties[mapping.caseProperty] ?? 1;
            const rawValue = this.resolveTermNumeric(termValue, caseNumber);
            const axisScale = scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
    }

    tick() {
        super.tick();
        const boardPosition = this.getBoardPosition();
        if (this.lastBoardHorizontalPosition !== boardPosition.x) {
            this.flipImageHorizontally = this.lastBoardHorizontalPosition !== null && this.lastBoardHorizontalPosition > boardPosition.x;
            this.lastBoardHorizontalPosition = boardPosition.x;
        }
    }

    getStroboscopyRadius() {
        return this.properties.radius;
    }
}
