class BodyShape extends ChildShape {
    static apiCharacterDefinitions = new Map();
    static pendingApiCharacterFetches = new Map();
    static characterImageAspectCache = new Map();

    loadImageAspectIfNeeded(imageUrl) {
        if (!imageUrl || BodyShape.characterImageAspectCache.has(imageUrl))
            return;
        BodyShape.characterImageAspectCache.set(imageUrl, null);
        const img = new Image();
        img.onload = () => {
            BodyShape.characterImageAspectCache.set(imageUrl, img.naturalWidth / img.naturalHeight);
            this.board.markDirty(this);
        };
        img.src = imageUrl;
    }

    static computeLetterboxedPivotOffset(pivotX, pivotY, diameter, imageAspectRatio) {
        let renderedWidth, renderedHeight;
        if (imageAspectRatio >= 1) {
            renderedWidth = diameter;
            renderedHeight = diameter / imageAspectRatio;
        } else {
            renderedWidth = diameter * imageAspectRatio;
            renderedHeight = diameter;
        }
        return {
            x: (diameter - renderedWidth) / 2 + pivotX * renderedWidth,
            y: (diameter - renderedHeight) / 2 + pivotY * renderedHeight
        };
    }

    static getCharacterByKey(characterKey) {
        return this.apiCharacterDefinitions.get(characterKey) ?? null;
    }

    static adaptApiCharacterDefinition(definition) {
        const animations = (definition.animations ?? []).map(animation => {
            const sortedFrames = [...(animation.frames ?? [])].sort((a, b) => (a.frame_index ?? 0) - (b.frame_index ?? 0));
            const frameUrls = sortedFrames.map(frame => frame.image_url);
            return {
                name: animation.name || "Idle",
                frames: frameUrls.length || 1,
                frameUrls,
                startIndex: 0
            };
        });
        return {
            id: definition.id,
            name: definition.title || "",
            title: definition.title || "",
            thumbnail_url: definition.thumbnail_url,
            folder: null,
            centerPoint: { x: definition.pivot_x ?? 0.5, y: definition.pivot_y ?? 0.5 },
            shouldRotate: !!definition.should_rotate,
            animations
        };
    }

    static fetchApiCharacterDefinition(characterKey, apiClient) {
        if (this.apiCharacterDefinitions.has(characterKey))
            return Promise.resolve(this.apiCharacterDefinitions.get(characterKey));
        if (this.pendingApiCharacterFetches.has(characterKey))
            return this.pendingApiCharacterFetches.get(characterKey);
        const promise = Promise.all([
                apiClient.fetchCharacterById(characterKey),
                apiClient.fetchCharacterDefinition(characterKey)
            ])
            .then(([character, definition]) => {
                const merged = Object.assign({}, definition, {
                    pivot_x: character.pivot_x,
                    pivot_y: character.pivot_y,
                    should_rotate: character.should_rotate
                });
                const adapted = BodyShape.adaptApiCharacterDefinition(merged);
                BodyShape.apiCharacterDefinitions.set(characterKey, adapted);
                BodyShape.pendingApiCharacterFetches.delete(characterKey);
                return adapted;
            })
            .catch(error => {
                BodyShape.pendingApiCharacterFetches.delete(characterKey);
                throw error;
            });
        this.pendingApiCharacterFetches.set(characterKey, promise);
        return promise;
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
                caseProperty: "sizeTermCase"
            });
        }
    }

    setProperties(properties) {
        if ("isPhysical" in properties) {
            const isPhysical = properties.isPhysical;
            const excludedKeys = isPhysical ? ["isPhysical", "xTermLocked", "yTermLocked"] : ["isPhysical"];
            const rest = Object.fromEntries(Object.entries(properties).filter(([key]) => !excludedKeys.includes(key)));
            this.setProperty("isPhysical", isPhysical);
            super.setProperties(rest);
        } else {
            super.setProperties(properties);
            if ("name" in properties && this.properties.isPhysical) {
                const prefix = String(properties.name ?? "").replace(/\s+/g, "");
                this.properties.xTerm = `${prefix}.x`;
                this.properties.yTerm = `${prefix}.y`;
                this._termsDropdownElement?.dxDropDownButton("instance")?.close();
                this.refreshTermsToolbarControl();
                this.dispatchEvent("changed", {});
            }
        }
        if ("characterKey" in properties)
            this.character = BodyShape.getCharacterByKey(this.properties.characterKey);
        if (!this.character && this.properties.characterKey)
            this.loadApiCharacterIfNeeded(this.properties.characterKey);
        this.synchronizeIdleAnimationTicker();
    }

    setProperty(name, value) {
        if (name === "name")
            this.properties.nameIsDefault = false;
        if (name === "characterKey") {
            this.character = BodyShape.getCharacterByKey(value);
            if (!this.character && value)
                this.loadApiCharacterIfNeeded(value);
        }
        if (name === "isPhysical") {
            if (value === true) {
                const prefix = (this.properties.name ?? "").replace(/\s+/g, "");
                this.properties.xTerm = `${prefix}.x`;
                this.properties.yTerm = `${prefix}.y`;
                this.properties.xTermLocked = false;
                this.properties.yTermLocked = false;
            } else {
                const scale = this.getScale();
                const referentialX = Utils.roundToPrecision(this.properties.x * (scale.x ?? 1), this.board.calculator.getPrecision());
                const referentialY = Utils.roundToPrecision(-this.properties.y * (scale.y ?? 1), this.board.calculator.getPrecision());
                this.properties.xTerm = String(referentialX);
                this.properties.yTerm = String(referentialY);
            }
        }
        if (name === "name" && this.properties.isPhysical) {
            const prefix = String(value ?? "").replace(/\s+/g, "");
            this.properties.xTerm = `${prefix}.x`;
            this.properties.yTerm = `${prefix}.y`;
        }
        super.setProperty(name, value);
        if (name === "isPhysical" && value === false) {
            const prefix = (this.properties.name ?? "").replace(/\s+/g, "");
            const physicalTermNames = new Set([`${prefix}.x`, `${prefix}.y`, `${prefix}.vx`, `${prefix}.vy`, `${prefix}.ax`, `${prefix}.ay`, `${prefix}.mass`]);
            this.board.shapes.shapes.forEach(shape => {
                if (shape === this)
                    return;
                let hadStaleTerms = false;
                shape.termDisplayEntries.forEach(entry => {
                    if (physicalTermNames.has(shape.properties[entry.term])) {
                        shape.properties[entry.term] = "";
                        hadStaleTerms = true;
                    }
                });
                if (hadStaleTerms)
                    Object.values(shape.termFormControls).forEach(({ termControl }) => termControl?.refresh());
                shape.clearStaleTermCollectionReferences(physicalTermNames);
            });
        }
        if (name === "isPhysical" || (name === "name" && this.properties.isPhysical)) {
            this._termsDropdownElement?.dxDropDownButton("instance")?.close();
            this.refreshTermsToolbarControl();
            if (this._termsMenuContentElement)
                this.buildTermsMenuContent(this._termsMenuContentElement);
            this.dispatchEvent("changed", {});
        }
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
                className: "handle edge-resize",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    const radius = this.properties.radius ?? 0;
                    return { x: position.x - radius, y: position.y - radius, width: radius * 2, height: radius * 2 };
                },
                getTransform: e => this.getCornerResizeTransform(e)
            }
        ];
    }

    getCornerResizeTransform(eventPoint) {
        const position = this.getBoardPosition();
        const horizontalRadius = Math.abs(eventPoint.x - position.x);
        const verticalRadius = Math.abs(eventPoint.y - position.y);
        const radius = Math.max(5, Math.max(horizontalRadius, verticalRadius));
        const sizeValue = radius;
        const calculator = this.board.calculator;
        const termValue = this.properties.sizeTerm;
        if (this.isTermLocked("sizeTerm"))
            return { radius, width: radius * 2, height: radius * 2 };
        if (calculator.isTerm(termValue)) {
            const caseNumber = this.properties.sizeTermCase ?? 1;
            calculator.setTermValue(termValue, sizeValue, calculator.system.iteration, caseNumber);
            calculator.calculate();
        } else
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
        return this.parent.getScreenAnchorPoint?.() ?? super.getScreenAnchorPoint();
    }

    createPhysicalTermVisibilityControl(formAdapter, termProperty, displayModeProperty) {
        const termValue = this.properties[termProperty] ?? "";
        const displayModeValue = this.properties[displayModeProperty] ?? "none";
        const isVisible = displayModeValue !== false && displayModeValue !== "none";
        const control = $('<div class="term-packed-control">');
        const buttonHost = $('<div class="term-packed-control__button">');
        TermControl.createVisibilityCheckbox(buttonHost, isVisible, value => {
            formAdapter.updateData(displayModeProperty, value ? "nameValue" : "none");
            this.board.markDirty(this);
        });
        control.append(buttonHost);
        const selectHost = $('<div class="term-packed-control__select">');
        selectHost.dxSelectBox({
            value: termValue || null,
            items: termValue ? [{ term: termValue, text: termValue }] : [],
            disabled: true,
            stylingMode: "filled",
            displayExpr: "text",
            valueExpr: "term",
            placeholder: "",
            inputAttr: { class: "mdl-variable-selector" },
            elementAttr: { class: "mdl-variable-selector" }
        });
        control.append(selectHost);
        return { control };
    }

    _buildCharacterPickerContent(contentElement) {
        const host = contentElement.get ? contentElement.get(0) : contentElement;
        host.innerHTML = `<div class="mdl-marketplace-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
        const apiClient = this.board.shell?.modelsApiClient;
        if (!apiClient) {
            host.innerHTML = `<div class="mdl-marketplace-data-status">Characters unavailable.</div>`;
            return;
        }
        Promise.all([
            apiClient.fetchCharacters().catch(() => []),
            apiClient.fetchCharacterCategories().catch(() => [])
        ]).then(([characters, categories]) => {
            const categoryNameById = new Map(categories.map(cat => [cat.id, cat.name]));
            const grouped = new Map();
            const sortedCharacters = [...characters].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
            for (const character of sortedCharacters) {
                const categoryId = character.category_id || null;
                const categoryName = categoryId ? (categoryNameById.get(categoryId) || categoryId) : "Uncategorized";
                const groupKey = categoryId || "__uncategorized__";
                if (!grouped.has(groupKey))
                    grouped.set(groupKey, { name: categoryName, characters: [] });
                grouped.get(groupKey).characters.push(character);
            }
            const sortedGroups = Array.from(grouped.values()).sort((a, b) => {
                if (a.name === "Uncategorized") return 1;
                if (b.name === "Uncategorized") return -1;
                return a.name.localeCompare(b.name);
            });
            host.innerHTML = `
                <div class="mdl-char-picker-container">
                    <div class="mdl-char-picker-search-bar">
                        <input class="mdl-char-picker-search-input" type="text" placeholder="Search characters…" autocomplete="off">
                    </div>
                    <div class="mdl-marketplace-data-scroll mdl-char-picker-scroll"><div class="mdl-char-picker-body"></div></div>
                </div>`;
            const body = host.querySelector(".mdl-char-picker-body");
            const searchInput = host.querySelector(".mdl-char-picker-search-input");
            for (const group of sortedGroups) {
                const groupId = `char-picker-group-${CSS.escape(group.name)}`;
                body.insertAdjacentHTML("beforeend", `
                    <div class="mdl-char-picker-group" id="${groupId}">
                        <div class="mdl-char-picker-group-label">${this._escapePickerHtml(group.name)}</div>
                        <div class="mdl-marketplace-data-grid"></div>
                    </div>`);
                const grid = body.querySelector(`#${groupId} .mdl-marketplace-data-grid`);
                for (const character of group.characters) {
                    const cardId = `char-card-${CSS.escape(character.id)}`;
                    const isSelected = this._selectedCharacterKey === character.id;
                    const thumbHtml = character.thumbnail_url
                        ? `<img class="mdl-marketplace-data-thumb" src="${this._escapePickerHtml(character.thumbnail_url)}" alt="${this._escapePickerHtml(character.title || "")}">`
                        : `<div class="mdl-marketplace-data-thumb-placeholder"><i class="fa-light fa-person-running"></i></div>`;
                    grid.insertAdjacentHTML("beforeend", `
                        <div class="mdl-marketplace-data-card${isSelected ? " selected" : ""}" id="${cardId}" data-character-id="${this._escapePickerHtml(character.id)}" data-character-title="${this._escapePickerHtml((character.title || "").toLowerCase())}">
                            ${thumbHtml}
                            <div class="mdl-marketplace-data-title">${this._escapePickerHtml(character.title || "")}</div>
                        </div>`);
                    const card = grid.lastElementChild;
                    card.addEventListener("click", () => {
                        host.querySelectorAll(".mdl-marketplace-data-card").forEach(c => c.classList.remove("selected"));
                        card.classList.add("selected");
                        this._selectedCharacterKey = character.id;
                    });
                    if (character.title || character.description) {
                        $('<div>').appendTo('body').dxTooltip({
                            target: card,
                            contentTemplate: tooltipContent => {
                                tooltipContent.append($('<div class="card-desc-tooltip">').html(`<strong>${this._escapePickerHtml(character.title || "")}</strong>${character.description ? `<p>${this._escapePickerHtml(character.description)}</p>` : ``}`));
                            },
                            showEvent: { delay: 600, name: "mouseenter" },
                            hideEvent: "mouseleave",
                            position: "bottom",
                            maxWidth: 300,
                            zIndex: 95000
                        });
                    }
                }
            }
            searchInput.addEventListener("input", event => {
                const query = event.target.value.toLowerCase().trim();
                body.querySelectorAll(".mdl-char-picker-group:not([data-none-group])").forEach(group => {
                    let visibleCount = 0;
                    group.querySelectorAll(".mdl-marketplace-data-card").forEach(card => {
                        const matches = !query || card.dataset.characterTitle.includes(query);
                        card.style.display = matches ? "" : "none";
                        if (matches) visibleCount++;
                    });
                    group.style.display = visibleCount > 0 ? "" : "none";
                });
            });
        });
    }

    _escapePickerHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    resolveCharacterImageSrc(character) {
        return character.thumbnail_url || null;
    }

    renderParentButtonTemplate(element) {
        const parentShape = this.parent ?? this.getReferential();
        const parentCharacter = parentShape?.character;
        if (parentCharacter) {
            const name = parentShape.properties.name ?? parentCharacter.name;
            const characterImageSrc = this.resolveCharacterImageSrc(parentCharacter);
            if (characterImageSrc) {
                element.innerHTML = `<img class="mdl-parent-btn-character" src="${characterImageSrc}" title="${name}" alt="${name}"/>`;
                return;
            }
        }
        super.renderParentButtonTemplate(element);
    }

    renderShapeColorButtonTemplate(element) {
        const name = this.properties.name ?? "";
        if (this.character) {
            const characterImageSrc = this.resolveCharacterImageSrc(this.character);
            if (characterImageSrc) {
                element.innerHTML = `<img class="mdl-name-btn-character" src="${characterImageSrc}" alt="${name}"/><span>${name}</span>`;
                return;
            }
            element.innerHTML = `<i class="fa-light fa-person-running"></i><span>${name}</span>`;
            return;
        }
        super.renderShapeColorButtonTemplate(element);
    }

    populateShapeColorMenuSections(sections) {
        sections[0].items.push(
            {
                text: "Show Center",
                buildControl: $p => {
                    $('<div>').dxSwitch({
                        value: this.properties.showCenter === true,
                        onValueChanged: e => this.setPropertyCommand("showCenter", e.value)
                    }).appendTo($p);
                }
            },
            {
                text: "Drop Shadow",
                buildControl: $p => {
                    $('<div>').dxSwitch({
                        value: this.properties.dropShadow === true,
                        onValueChanged: e => this.setPropertyCommand("dropShadow", e.value)
                    }).appendTo($p);
                }
            }
        );
        sections.push(
            {
                text: "Character",
                items: [
                    {
                        text: "Character",
                        buildControl: $p => {
                            $('<div>').dxButton({
                                icon: "fa-light fa-person-running",
                                stylingMode: "text",
                                onClick: () => this.showCharacterPickerPopup()
                            }).appendTo($p);
                        }
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
                            stylingMode: "text",
                            onClick: _ => this.openImageFileDialog()
                        }).appendTo($p)
                    }
                ]
            }
        );
    }

    populateTermsMenuSections(listItems) {
        if (this.properties.isPhysical) {
            const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
            const xPhysicalControl = this.createPhysicalTermVisibilityControl(formAdapter, "xTerm", this.getTermDisplayModeProperty("xTerm"));
            const yPhysicalControl = this.createPhysicalTermVisibilityControl(formAdapter, "yTerm", this.getTermDisplayModeProperty("yTerm"));
            listItems.push(
                { text: "Horizontal", stacked: true, buildControl: $p => $p.append(xPhysicalControl.control) },
                { text: "Vertical", stacked: true, buildControl: $p => $p.append(yPhysicalControl.control) }
            );
        } else {
            listItems.push(
                { text: "Horizontal", stacked: true, buildControl: $p => $p.append(this._xDescriptor.control) },
                { text: "Vertical", stacked: true, buildControl: $p => $p.append(this._yDescriptor.control) }
            );
        }
        listItems.push(
            { text: "Size", stacked: true, buildControl: $p => $p.append(this._sizeDescriptor.control) },
            {
                text: "Physical body",
                buildControl: $p => {
                    $('<div>').dxSwitch({
                        value: this.properties.isPhysical === true,
                        onInitialized: e => { this._physicalSwitchInstance = e.component; },
                        onValueChanged: e => this.setPropertyCommand("isPhysical", e.value)
                    }).appendTo($p);
                }
            },
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
                                el[0].innerHTML = BaseShape.renderShapeTreeItemHtml(data);
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
            this.createNameButtonTermMarkup(xTerm) +
            `<i class="fa-light fa-x mdl-name-btn-separator"></i>` +
            this.createNameButtonTermMarkup(yTerm) +
            `<i class="fa-light fa-arrow-up-right mdl-name-btn-separator"></i>` +
            this.createNameButtonTermMarkup(sizeTerm);
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
        if (!this.properties.isPhysical) {
            this.termFormControls["xTerm"]?.termControl?.refresh();
            this.termFormControls["yTerm"]?.termControl?.refresh();
        }
        this.termFormControls["sizeTerm"]?.termControl?.refresh();
        super.showContextToolbar();
    }

    openImageFileDialog() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async e => {
            const file = e.target.files[0];
            const imageSource = await this.board.assetManager.uploadAsset(this.id, file, file.name);
            if (imageSource)
                this.onImageControlChanged(imageSource);
        };
        input.click();
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
        this.centerDot = this.board.createSvgElement("circle");
        this.centerDot.setAttribute("pointer-events", "none");
        element.appendChild(this.centerDot);
        this.motionGroup = this.board.createSvgElement("g");
        this.motionGroup.setAttribute("pointer-events", "none");
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        this.motionGroup.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        this.motionGroup.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }

    tickStroboscopy() {
        super.tickStroboscopy();
        const character = this.getSelectedCharacter();
        const imageSource = this.getImageSource();
        if (!character && !imageSource)
            return;
        if (!character) {
            this._stroboscopyPositions = this._stroboscopyPositions.map(pos => ({ ...pos, href: imageSource }));
            return;
        }
        const animation = this.getCharacterAnimation(character);
        const frameCount = animation.frames;
        const startIndex = animation.startIndex ?? 0;
        const interval = Math.max(1, this.properties.stroboscopyInterval);
        this._stroboscopyPositions = this._stroboscopyPositions.map((pos, i) => {
            const iteration = i === 0 ? 1 : i * interval;
            const rawFrameIndex = this.getAnimationFrameIndex(animation, frameCount, iteration, startIndex);
            const href = animation.frameUrls?.[Math.min(rawFrameIndex, (animation.frameUrls.length || 1) - 1)] || character.thumbnail_url || "";
            return { ...pos, href };
        });
    }

    drawStroboscopy() {
        const hasCharacterOrImage = !!(this.getSelectedCharacter() || this.getImageSource());
        if (!this.properties.stroboscopyColor || this.properties.stroboscopyColor === "transparent" || this.properties.stroboscopyColor === "#00000000") {
            while (this.stroboscopy.firstChild)
                this.stroboscopy.removeChild(this.stroboscopy.firstChild);
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        while (this.stroboscopy.children.length > desiredLength)
            this.stroboscopy.removeChild(this.stroboscopy.lastChild);
        const radius = this.getStroboscopyRadius();
        for (let i = 0; i < desiredLength; i++) {
            const pos = positions[i];
            if (hasCharacterOrImage) {
                let imageClone = this.stroboscopy.children[i];
                if (!imageClone || imageClone.tagName !== "image") {
                    imageClone = this.board.createSvgElement("image");
                    if (this.stroboscopy.children[i])
                        this.stroboscopy.replaceChild(imageClone, this.stroboscopy.children[i]);
                    else
                        this.stroboscopy.appendChild(imageClone);
                }
                const character = this.getSelectedCharacter();
                const href = pos.href ?? (character ? this.image.getAttribute("href") : this.getImageSource());
                imageClone.setAttribute("href", href ?? "");
                const diameter = radius * 2;
                const pivotX = character?.centerPoint?.x ?? 0.5;
                const pivotY = character?.centerPoint?.y ?? 0.5;
                const imageAspectRatio = BodyShape.characterImageAspectCache.get(href ?? "") ?? 1;
                const pivotOffset = BodyShape.computeLetterboxedPivotOffset(pivotX, pivotY, diameter, imageAspectRatio);
                imageClone.setAttribute("x", pos.x - pivotOffset.x);
                imageClone.setAttribute("y", pos.y - pivotOffset.y);
                imageClone.setAttribute("width", diameter);
                imageClone.setAttribute("height", diameter);
                imageClone.setAttribute("preserveAspectRatio", "xMidYMid meet");
                imageClone.setAttribute("opacity", this.properties.stroboscopyOpacity);
            } else {
                let circle = this.stroboscopy.children[i];
                if (!circle || circle.tagName !== "circle") {
                    circle = this.board.createSvgElement("circle");
                    if (this.stroboscopy.children[i])
                        this.stroboscopy.replaceChild(circle, this.stroboscopy.children[i]);
                    else
                        this.stroboscopy.appendChild(circle);
                }
                circle.setAttribute("cx", pos.x);
                circle.setAttribute("cy", pos.y);
                circle.setAttribute("r", radius);
                circle.setAttribute("fill", this.properties.stroboscopyColor);
                circle.setAttribute("opacity", this.properties.stroboscopyOpacity);
            }
        }
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
        this.properties.sizeTerm = String(radius);
        this.properties.width = radius * 2;
        this.properties.height = radius * 2;
        this.properties.radius = radius;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.animationFrameStep = 1;
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
        this.properties.characterKey = "";
        this.properties.dropShadow = false;
        this.properties.showCenter = false;
        this.properties.nameIsDefault = true;
        this.properties.isPhysical = false;
        this.character = null;
        this.lastBoardHorizontalPosition = null;
        this.lastBoardPosition = null;
        this.characterMovementAngle = null;
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
        if (this.properties.characterKey) {
            this.image.removeAttribute("href");
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
        const shadowFilter = this.properties.dropShadow ? "drop-shadow(3px 3px 5px rgba(0,0,0,0.7))" : "";
        this.image.style.filter = shadowFilter;
        this.circle.style.filter = shadowFilter;
        const character = this.getSelectedCharacter();
        if (character) {
            this.drawCharacter(position, radius, diameter, character);
            this.drawCenterDot(position);
            return;
        }
        if (this.properties.characterKey) {
            this.circle.setAttribute("r", 0);
            this.image.removeAttribute("href");
            this.drawCenterDot(position);
            return;
        }
        const imageSource = this.getImageSource();
        if (imageSource) {
            this.circle.setAttribute("r", 0);
            this.circle.setAttribute("stroke", "none");
        } else {
            this.circle.setAttribute("cx", position.x);
            this.circle.setAttribute("cy", position.y);
            this.circle.setAttribute("r", radius);
            this.circle.setAttribute("fill", this.properties.foregroundColor);
            this.applyBorderStroke(this.circle, 1);
        }
        this.image.setAttribute("x", position.x - radius);
        this.image.setAttribute("y", position.y - radius);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        this.applyImageFlipTransform(position, this.image.hasAttribute("href"));
        this.drawCenterDot(position);
    }

    drawCenterDot(position) {
        if (!this.properties.showCenter) {
            this.centerDot.setAttribute("r", 0);
            return;
        }
        const dotRadius = 4;
        this.centerDot.setAttribute("cx", position.x);
        this.centerDot.setAttribute("cy", position.y);
        this.centerDot.setAttribute("r", dotRadius);
        this.centerDot.setAttribute("fill", this.properties.foregroundColor);
        this.centerDot.setAttribute("stroke", Utils.getContrastColor(this.properties.foregroundColor));
        this.centerDot.setAttribute("stroke-width", 1);
    }

    applyImageFlipTransform(position, hasImage) {
        if (!hasImage || !this.flipImageHorizontally) {
            this.image.removeAttribute("transform");
            return;
        }
        this.image.setAttribute("transform", `translate(${position.x * 2} 0) scale(-1 1)`);
    }

    loadApiCharacterIfNeeded(characterKey) {
        const apiClient = this.board.shell?.modelsApiClient;
        if (!apiClient || !characterKey)
            return;
        BodyShape.fetchApiCharacterDefinition(characterKey, apiClient)
            .then(adapted => {
                if (this.properties.characterKey !== characterKey)
                    return;
                this.character = adapted;
                this.synchronizeIdleAnimationTicker();
                this.board.markDirty(this);
            })
            .catch(() => {});
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
        const iteration = this.board.calculator.getIteration();
        const animation = this.getCharacterAnimation(character);
        const frameCount = animation.frames;
        const startIndex = animation.startIndex ?? 0;
        const rawFrameIndex = this.getAnimationFrameIndex(animation, frameCount, iteration, startIndex);
        const frameUrl = animation.frameUrls?.[Math.min(rawFrameIndex, (animation.frameUrls.length || 1) - 1)];
        const imageUrl = frameUrl || character.thumbnail_url || "";
        this.loadImageAspectIfNeeded(imageUrl);
        const imageAspectRatio = BodyShape.characterImageAspectCache.get(imageUrl) ?? 1;
        const pivotOffset = BodyShape.computeLetterboxedPivotOffset(pivotX, pivotY, diameter, imageAspectRatio);
        this.image.setAttribute("x", position.x - pivotOffset.x);
        this.image.setAttribute("y", position.y - pivotOffset.y);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid meet");
        if (character.shouldRotate && this.characterMovementAngle !== null) {
            this.image.setAttribute("transform", `rotate(${this.characterMovementAngle} ${position.x} ${position.y})`);
        } else {
            this.image.removeAttribute("transform");
        }
        this.image.setAttribute("href", imageUrl);
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
            const axisScale = mapping.termProperty === "sizeTerm" ? 1 : scale[mapping.scaleProperty] ?? 1;
            const value = mapping.isInverted ? -rawValue : rawValue;
            this.properties[mapping.property] = Number.isFinite(value) ? (axisScale !== 0 ? value / axisScale : 0) : 0;
        }
    }

    tick() {
        super.tick();
        const boardPosition = this.getBoardPosition();
        const character = this.getSelectedCharacter();
        if (character?.shouldRotate) {
            if (this.lastBoardPosition !== null) {
                const dx = boardPosition.x - this.lastBoardPosition.x;
                const dy = boardPosition.y - this.lastBoardPosition.y;
                if (Math.hypot(dx, dy) > 0.01)
                    this.characterMovementAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            }
        } else if (character) {
            this.characterMovementAngle = null;
            this.flipImageHorizontally = false;
        } else {
            this.characterMovementAngle = null;
            if (this.lastBoardHorizontalPosition !== boardPosition.x) {
                this.flipImageHorizontally = this.lastBoardHorizontalPosition !== null && this.lastBoardHorizontalPosition > boardPosition.x;
                this.lastBoardHorizontalPosition = boardPosition.x;
            }
        }
        this.lastBoardPosition = { x: boardPosition.x, y: boardPosition.y };
    }

    getStroboscopyRadius() {
        return this.properties.radius;
    }
}
