class TopToolbar {
    constructor(shell) {
        this.shell = shell;
        this.instance = null;
        this.expressionButton = null;
        this.valueButton = null;
        this.referentialButton = null;
        this.chartButton = null;
        this.tableButton = null;
        this.backgroundButton = null;
        this.textButton = null;
        this.rulerButton = null;
        this.protractorButton = null;
        this.gaugeButton = null;
        this._aboutAnimationIntervalId = null;
        this._create();
    }

    _create() {
        $("#toolbar").dxToolbar({
            onItemClick: () => this.shell.deselectShape(),
            items: [
                {
                    location: "before",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-bars",
                        hint: "",
                        elementAttr: {
                            id: "menu-button",
                            title: ""
                        },
                        onClick: _ => this.shell.contextMenuController.show()
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-function",
                        elementAttr: {
                            id: "expression-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ExpressionShape", "Expression"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Expression Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-shapes",
                        elementAttr: {
                            id: "referential-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ReferentialShape", "Simulation"),
                        template1: `<div class='dx-icon'>
                                <span class="fa-layers">
                                    <i class="fa-regular fa-circle" data-fa-transform="shrink-12 right-1 up-2"></i>
                                    <i class="fa-regular fa-arrow-right-long fa-rotate-by" data-fa-transform="shrink-12 right-3 up-2"></i>
                                    <i class="fa-thin fa-horizontal-rule" data-fa-transform="down-1"></i>
                                    <i class="fa-thin fa-pipe" data-fa-transform="shrink-4 left-4"></i>
                                    <i class="fa-thin fa-rectangle-wide"></i>
                                </span>
                            </div>`,
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Referential Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='representation-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "chart-button"
                        },
                        icon: "fa-light fa-chart-line",
                        onClick: _ => this.shell.commands.addShape("ChartShape", "Chart"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Chart Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "table-button"
                        },
                        icon: "fa-light fa-table",
                        onClick: _ => this.shell.commands.addShape("TableShape", "Table"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Table Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "range-selector-button"
                        },
                        icon: "fa-light fa-slider",
                        onClick: _ => this.shell.commands.addShape("SliderShape", "Slider"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Slider Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {                        icon: "fa-light fa-gauge",
                        elementAttr: {
                            id: "gauge-button"
                        },
                        onClick: _ => this.shell.commands.addShape("GaugeShape", "Gauge"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Gauge Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-input-numeric",
                        elementAttr: {
                            id: "value-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ValueShape", "Value"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Value Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='shape-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "background-button"
                        },
                        icon: "fa-light fa-image",
                        onClick: _ => this.shell.commands.addShape("ImageShape", "Image"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Background Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-quotes",
                        elementAttr: {
                            id: "text-button",
                            "data-fa-transform": "shrink-8 up-6"
                        },
                        onClick: _ => this.shell.commands.addShape("TextShape", "Text"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Text Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='measurement-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-ruler",
                        elementAttr: {
                            id: "ruler-button"
                        },
                        onClick: _ => this.shell.commands.addShape("RulerShape", "Ruler"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Ruler Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    widget: "dxButton",
                    options: {                        icon: "fa-light fa-angle",
                        elementAttr: {
                            id: "protractor-button"
                        },
                        onClick: _ => this.shell.commands.addShape("ProtractorShape", "Protractor"),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Protractor Tooltip", 280)
                    }
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='select-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    location: "center",
                    template: () => {
                        const container = $('<div id="select-shape-dropdown">');
                        container.dxDropDownButton({
                            icon: "fa-light fa-arrow-pointer",
                            showArrowIcon: false,
                            stylingMode: "text",
                            dropDownOptions: {
                                container: document.body,
                                wrapperAttr: { style: "z-index:99999" },
                                width: "auto",
                                onShowing: () => {
                                    if (this._shapesTreeView)
                                        this._shapesTreeView.option("items", this._buildShapeTreeItems());
                                },
                                contentTemplate: contentElement => {
                                    $(contentElement).empty();
                                    const treeContainer = $('<div>').appendTo(contentElement);
                                    treeContainer.dxTreeView({
                                        items: this._buildShapeTreeItems(),
                                        dataStructure: "tree",
                                        keyExpr: "id",
                                        displayExpr: "text",
                                        selectionMode: "single",
                                        selectByClick: true,
                                        itemTemplate: (data, _, el) => {
                                            el[0].innerHTML = BaseShape.renderShapeTreeItemHtml(data);
                                        },
                                        onItemClick: e => {
                                            const shape = this.shell.board.shapes.getById(e.itemData.id);
                                            if (shape)
                                                this.shell.board.selectShape(shape);
                                            this._selectDropdownInstance.close();
                                        }
                                    });
                                    this._shapesTreeView = treeContainer.dxTreeView("instance");
                                }
                            }
                        });
                        this._selectDropdownInstance = container.dxDropDownButton("instance");
                        return container;
                    }
                },
                {
                    location: "after",
                    template: () => {
                        const collabContainer = $('<div id="collab-button-host"></div>');
                        this._createCollabDropDownButton(collabContainer);
                        return collabContainer;
                    }
                },
                {
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-question",
                        elementAttr: { id: "help-button" },
                        onClick: () => this._helpMenu.show()
                    }
                }
            ]
        });
        this.instance = $("#toolbar").dxToolbar("instance");
        document.getElementById("svg-container").insertAdjacentHTML("afterend", `<div id="model-info-label"><span id="model-name-label">${this.shell.properties.name}</span></div>`);
        document.body.insertAdjacentHTML("beforeend", `<div id="help-context-menu"></div><div id="about-popup"></div><div id="feedback-popup"></div><div id="whats-new-popup"></div>`);
        const translations = this.shell.board.translations;
        this._helpMenu = $("#help-context-menu").dxContextMenu({
            items: [
                { text: translations.get("Help Menu About"), icon: "fa-light fa-circle-info" },
                { text: translations.get("Help Menu Feedback"), icon: "fa-light fa-envelope" },
                { text: translations.get("Help Menu Whats New"), icon: "fa-light fa-sparkles" }
            ],
            itemTemplate: itemData => {
                return `<div style="display: flex; justify-content: space-between; align-items: center; width: 100%">
                            <span class="${itemData.icon}" style="width: 15px; margin-right: 10px; text-align: left; display: inline-block"></span>
                            <span style="text-align: left; padding-right: 5px; flex-grow: 1">${itemData.text}</span>
                        </div>`;
            },
            target: "#help-button",
            position: {
                my: "top right",
                at: "bottom right",
                of: "#help-button",
                offset: "0 10"
            },
            onItemClick: event => {
                if (event.itemData.text === translations.get("Help Menu About"))
                    $("#about-popup").dxPopup("instance").show();
                else if (event.itemData.text === translations.get("Help Menu Feedback"))
                    $("#feedback-popup").dxPopup("instance").show();
                else if (event.itemData.text === translations.get("Help Menu Whats New"))
                    this.showWhatsNewPopup();
            }
        }).dxContextMenu("instance");
        $("#about-popup").dxPopup({
            title: translations.get("About Title"),
            visible: false,
            width: 460,
            height: "auto",
            showCloseButton: true,
            dragEnabled: false,
            shading: true,
            onShowing: () => this._startAboutAnimation(),
            onHiding: () => this._stopAboutAnimation(),
            contentTemplate: contentElement => {
                $(contentElement).html(`
                    <div style="overflow: hidden; margin-bottom: 12px">
                        <img src="scripts/themes/modellus.svg" alt="Modellus" style="float: left; height: 48px; margin: 0 12px 4px 0">
                        <p style="text-align: justify; margin: 0">${translations.get("About Description")}</p>
                    </div>
                    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; margin-top: 36px">
                        <p style="text-align: justify; margin: 0; flex: 1">${translations.get("About Beta")}</p>
                        <img id="about-character-img" src="" alt="" style="height: 80px; flex-shrink: 0">
                    </div>
                    <div id="about-understand-button" style="display: flex; justify-content: center; margin-top: 16px"></div>
                    <p style="text-align: center; margin-top: 16px">${translations.get("About Tagline")}</p>`);
                $("#about-understand-button").dxButton({
                    text: translations.get("About Understand"),
                    icon: "fa-light fa-check",
                    type: "default",
                    onClick: () => $("#about-popup").dxPopup("instance").hide()
                });
            }
        });
        $("#feedback-popup").dxPopup({
            title: translations.get("Feedback Title"),
            visible: false,
            width: 420,
            height: "auto",
            showCloseButton: true,
            dragEnabled: false,
            shading: true,
            contentTemplate: contentElement => {
                $(contentElement).html(`<div id="feedback-form"></div>`);
                $("#feedback-form").dxForm({
                    items: [
                        { dataField: "title", label: { text: translations.get("Feedback Field Title") }, editorOptions: { placeholder: translations.get("Feedback Field Title Placeholder"), inputAttr: { style: "font-family: 'Atma', sans-serif" } }, validationRules: [{ type: "required" }] },
                        { dataField: "description", editorType: "dxTextArea", label: { text: translations.get("Feedback Field Description") }, editorOptions: { placeholder: translations.get("Feedback Field Description Placeholder"), height: 120, inputAttr: { style: "font-family: 'Atma', sans-serif" } } },
                        { label: { text: translations.get("Feedback Field Image") }, template: () => {
                            this._feedbackImageControl = new ImageControl({
                                dropHint: translations.get("Feedback Field Image Hint"),
                                onUploadFile: file => {
                                    this._feedbackImageFile = file;
                                    return Promise.resolve(URL.createObjectURL(file));
                                },
                                onImageCleared: () => { this._feedbackImageFile = null; }
                            });
                            return this._feedbackImageControl.createHost();
                        } },
                        {
                            itemType: "button",
                            horizontalAlignment: "right",
                            buttonOptions: {
                                text: translations.get("Feedback Send Button"),
                                icon: "fa-light fa-envelope",
                                type: "default",
                                onClick: () => this._submitFeedback()
                            }
                        }
                    ]
                });
            }
        });
        $("#whats-new-popup").dxPopup({
            title: translations.get("Whats New Title"),
            visible: false,
            width: 560,
            height: 540,
            showCloseButton: true,
            dragEnabled: false,
            shading: true,
            onContentReady: e => {
                const overlayContent = e.component.$content()[0].closest(".dx-overlay-content");
                const labelEl = overlayContent?.querySelector(".dx-popup-title .dx-toolbar-label");
                if (labelEl && !labelEl.querySelector(".mdl-beta-badge")) {
                    const contentEl = labelEl.querySelector(".dx-toolbar-item-content");
                    if (contentEl) {
                        contentEl.style.display = "flex";
                        contentEl.style.alignItems = "center";
                        contentEl.insertAdjacentHTML("beforeend", `<span class="mdl-beta-badge" style="background:#e84c3d;color:white;font-size:0.7em;font-weight:bold;padding:1px 6px;border-radius:3px;text-transform:uppercase;margin-left:8px">beta</span>`);
                    }
                }
            },
            onShowing: () => {
                const sorted = (this._whatsNewEntries || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                this._whatsNewList?.option("dataSource", sorted);
            },
            contentTemplate: contentElement => {
                const listContainer = $('<div style="height:100%">').appendTo($(contentElement));
                listContainer.dxList({
                    dataSource: [],
                    height: "100%",
                    scrollingEnabled: true,
                    activeStateEnabled: false,
                    focusStateEnabled: false,
                    hoverStateEnabled: false,
                    itemTemplate: (data, _, el) => {
                        const dateObj = new Date(data.date);
                        const formattedDate = dateObj.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
                        const imageHtml = data.image_url ? `<img src="${data.image_url}" style="width:100%;max-width:100%;height:auto;border-radius:8px;margin-bottom:12px;display:block;box-sizing:border-box;border:1px solid #e5e7eb" alt="">` : "";
                        el[0].innerHTML = `<div style="box-sizing:border-box;width:100%;padding:12px 0;border-bottom:1px solid #e5e7eb">
                            ${imageHtml}
                            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px">${formattedDate}</div>
                            <div style="font-weight:600;font-size:15px;margin-bottom:8px;white-space:normal;word-break:break-word">${data.title}</div>
                            <p style="margin:0;font-size:13px;line-height:1.6;color:#374151;white-space:normal;word-break:break-word">${data.description}</p>
                        </div>`;
                    }
                });
                this._whatsNewList = listContainer.dxList("instance");
            }
        });
        this.expressionButton = $("#expression-button").dxButton("instance");
        this.valueButton = $("#value-button").dxButton("instance");
        this.referentialButton = $("#referential-button").dxButton("instance");
        this.chartButton = $("#chart-button").dxButton("instance");
        this.tableButton = $("#table-button").dxButton("instance");
        this.backgroundButton = $("#background-button").dxButton("instance");
        this.textButton = $("#text-button").dxButton("instance");
        this.rulerButton = $("#ruler-button").dxButton("instance");
        this.protractorButton = $("#protractor-button").dxButton("instance");
        this.gaugeButton = $("#gauge-button").dxButton("instance");
    }

    showAboutPopup() {
        $("#about-popup").dxPopup("instance").show();
    }

    _startAboutAnimation() {
        const idleCharacters = [
            { name: "giraffe", animation: { folder: "idle", frames: 40, startIndex: 1, filePrefix: "giraffe_idle" } },
            { name: "bird", animation: { folder: "idle", frames: 40, startIndex: 1, filePrefix: "bird_idle" } }
        ];
        const character = idleCharacters[Math.floor(Math.random() * idleCharacters.length)];
        const img = document.getElementById("about-character-img");
        if (!img)
            return;
        let frameIndex = character.animation.startIndex;
        img.src = `resources/characters/${character.name}/${character.animation.folder}/${character.animation.filePrefix}${frameIndex}.png`;
        this._aboutAnimationIntervalId = setInterval(() => {
            frameIndex++;
            if (frameIndex > character.animation.startIndex + character.animation.frames - 1)
                frameIndex = character.animation.startIndex;
            img.src = `resources/characters/${character.name}/${character.animation.folder}/${character.animation.filePrefix}${frameIndex}.png`;
        }, 80);
    }

    _stopAboutAnimation() {
        if (this._aboutAnimationIntervalId === null)
            return;
        clearInterval(this._aboutAnimationIntervalId);
        this._aboutAnimationIntervalId = null;
    }

    showAboutPopupIfNeeded() {
        const modelId = this.shell.getCurrentModelId();
        const storageKey = modelId ? `mp.about_seen.${modelId}` : null;
        if (storageKey && localStorage.getItem(storageKey))
            return;
        if (!storageKey && sessionStorage.getItem("mp.about_seen"))
            return;
        $("#about-popup").dxPopup("instance").show();
        if (storageKey)
            localStorage.setItem(storageKey, "1");
        else
            sessionStorage.setItem("mp.about_seen", "1");
    }

    async showWhatsNewIfNeeded() {
        if (!this.shell.modelsApiClient) return;
        const entries = await this.shell.modelsApiClient.fetchWhatsNew().catch(() => []);
        if (!entries.length) return;
        entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestDate = entries[0].date;
        const storedDate = localStorage.getItem("mp.whats_new_last_date");
        if (storedDate && storedDate >= latestDate) return;
        this._whatsNewEntries = entries;
        localStorage.setItem("mp.whats_new_last_date", latestDate);
        $("#whats-new-popup").dxPopup("instance").show();
    }

    async showWhatsNewPopup() {
        if (!this.shell.modelsApiClient) return;
        const entries = await this.shell.modelsApiClient.fetchWhatsNew().catch(() => []);
        this._whatsNewEntries = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        $("#whats-new-popup").dxPopup("instance").show();
    }

    _buildShapeTreeItems() {
        const allShapes = this.shell.board.shapes.shapes;
        const rootShapes = allShapes.filter(shape => !shape.parent);
        return rootShapes.map(shape => BaseShape.buildShapeTreeItem(shape));
    }

    updateModelName() {
        const label = document.getElementById("model-name-label");
        if (!label)
            return;
        label.textContent = this.shell.properties.name;
        this.updateModelNameColor();
    }

    updateModelInfo() {
        this.updateModelName();
        const container = document.getElementById("model-info-label");
        if (!container)
            return;
        const existingCreator = container.querySelector(".model-creator");
        if (existingCreator)
            existingCreator.remove();
        const creatorName = this.shell.modelCreatorName;
        const creatorAvatar = this.shell.modelCreatorAvatar;
        if (!creatorName)
            return;
        const avatarHtml = creatorAvatar ? `<img class="model-creator-avatar" src="${creatorAvatar}" alt="">` : "";
        container.insertAdjacentHTML("beforeend", `<span class="model-creator">${avatarHtml}<span class="model-creator-name">by ${creatorName}</span></span>`);
    }

    updateModelNameColor() {
        const container = document.getElementById("model-info-label");
        if (!container)
            return;
        const backgroundColor = this.shell.properties.backgroundColor;
        const isTransparent = !backgroundColor || backgroundColor === "transparent" || (backgroundColor.length === 9 && backgroundColor.slice(7) === "00");
        const hex = isTransparent ? "#FFFFFF" : backgroundColor;
        const red = parseInt(hex.slice(1, 3), 16);
        const green = parseInt(hex.slice(3, 5), 16);
        const blue = parseInt(hex.slice(5, 7), 16);
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
        const isLight = luminance > 0.5;
        const nameLabel = document.getElementById("model-name-label");
        if (nameLabel) {
            nameLabel.style.color = isLight ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
            nameLabel.style.webkitTextStroke = `2px ${hex}`;
        }
        const creatorLabel = container.querySelector(".model-creator");
        if (creatorLabel) {
            creatorLabel.style.color = isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.5)";
            creatorLabel.style.webkitTextStroke = `1.5px ${hex}`;
        }

    }

    update() {
        const disabled = this.shell.board.selection.selectedShape == null || !["BodyShape", "PointShape", "VectorShape", "ImageShape", "ReferentialShape"].includes(this.shell.board.selection.selectedShape.constructor.name);
    }

    _createCollabDropDownButton(container) {
        container.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            hint: "Collaboration",
            icon: "fa-light fa-users",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: { class: "mdl-collab-dropdown" },
                width: 300,
                position: {
                    my: "top right",
                    at: "bottom right",
                    of: "#collab-button-host",
                    offset: "0 5"
                },
                onShowing: () => this._collabSearchInstance?.option("value", null),
                contentTemplate: contentElement => this._buildCollabDropdownContent(contentElement)
            }
        });
        this._collabButtonContainer = container[0];
        this._collabDropdownInstance = container.dxDropDownButton("instance");
    }

    _buildCollabDropdownContent(contentElement) {
        $(contentElement).html(`
            <div class="mdl-collab-panel">
                <div class="mdl-collab-list-host"></div>
                <div class="mdl-collab-add-row">
                    <div class="mdl-collab-search-host"></div>
                    <div class="mdl-collab-add-btn-host"></div>
                </div>
            </div>`);
        const listHost = $(contentElement).find(".mdl-collab-list-host");
        const searchHost = $(contentElement).find(".mdl-collab-search-host");
        const addBtnHost = $(contentElement).find(".mdl-collab-add-btn-host");
        $(listHost).dxList({
            dataSource: [],
            noDataText: "No collaborators",
            itemTemplate: data => `
                <div class="mdl-collab-list-item">
                    <img class="mdl-collab-avatar" src="${data.avatar ?? ""}" alt="">
                    <span class="mdl-collab-name">${data.name ?? data.email ?? ""}</span>
                    <div class="mdl-collab-remove-host"></div>
                </div>`,
            onItemRendered: e => {
                const removeHost = e.itemElement[0].querySelector(".mdl-collab-remove-host");
                if (removeHost)
                    $(removeHost).dxButton({
                        icon: "fa-light fa-xmark",
                        stylingMode: "text",
                        hint: "Remove",
                        onClick: () => this._removeCollaborator(e.itemData.id)
                    });
            }
        });
        this._collabListInstance = $(listHost).dxList("instance");
        this._loadCollabData();
        $(searchHost).dxSelectBox({
            placeholder: "Add user...",
            searchEnabled: true,
            displayExpr: "name",
            valueExpr: "id",
            searchExpr: ["name", "email"],
            dataSource: this._collabUsers ?? [],
            onFocusIn: () => {
                if (this._collabUsersLoaded)
                    return;
                this._collabUsersLoaded = true;
                this.shell.modelsApiClient.fetchUsers().then(users => {
                    this._collabUsers = Array.isArray(users) ? users : [];
                    this._collabSearchInstance?.option("dataSource", this._collabUsers);
                }).catch(() => {});
            }
        });
        this._collabSearchInstance = $(searchHost).dxSelectBox("instance");
        $(addBtnHost).dxButton({
            icon: "fa-light fa-circle-plus",
            stylingMode: "text",
            onClick: () => this._addCollaborator()
        });
    }

    async _loadCollabData() {
        const modelId = this.shell.getCurrentModelId();
        if (!modelId || !this._collabListInstance)
            return;
        try {
            const collaborators = await this.shell.modelsApiClient.fetchCollaborators(modelId);
            this._collabListInstance.option("dataSource", Array.isArray(collaborators) ? collaborators : []);
        } catch (_) {
            this._collabListInstance.option("dataSource", []);
        }
    }

    async _removeCollaborator(userId) {
        const modelId = this.shell.getCurrentModelId();
        if (!modelId)
            return;
        try {
            await this.shell.modelsApiClient.removeCollaborator(modelId, userId);
            await this._loadCollabData();
        } catch (_) {}
    }

    async _addCollaborator() {
        const modelId = this.shell.getCurrentModelId();
        if (!modelId || !this._collabSearchInstance)
            return;
        const selectedUserId = this._collabSearchInstance.option("value");
        if (!selectedUserId)
            return;
        try {
            await this.shell.modelsApiClient.addCollaborator(modelId, selectedUserId);
            this._collabSearchInstance.option("value", null);
            await this._loadCollabData();
        } catch (_) {}
    }

    updateCollabButtonVisibility() {
        if (!this._collabButtonContainer)
            return;
        const modelId = this.shell.getCurrentModelId();
        const visible = !!modelId && this.shell.isModelCreator();
        this._collabButtonContainer.style.display = visible ? "" : "none";
    }

    async _submitFeedback() {        const formInstance = $("#feedback-form").dxForm("instance");
        const validationResult = formInstance.validate();
        if (!validationResult.isValid)
            return;
        const formData = formInstance.option("formData");
        const modelId = this.shell.getCurrentModelId();
        const popup = $("#feedback-popup").dxPopup("instance");
        try {
            await this.shell.modelsApiClient.sendNotification({
                title: formData.title,
                message: formData.description,
                type: "Feedback",
                model_id: modelId
            }, this._feedbackImageFile ?? null);
            popup.hide();
            formInstance.option("formData", {});
            this._feedbackImageFile = null;
            this._feedbackImageControl?.setImageSource("");
            window.DevExpress.ui.notify({ message: this.shell.board.translations.get("Feedback Success"), type: "success", displayTime: 3000, position: { at: "center", my: "center" }, elementAttr: { class: "feedback-toast" } });
        } catch (error) {
            window.DevExpress.ui.notify({ message: this.shell.board.translations.get("Feedback Error"), type: "error", displayTime: 3000, position: { at: "center", my: "center" }, elementAttr: { class: "feedback-toast" } });
        }
    }
}
