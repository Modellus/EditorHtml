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
        document.body.insertAdjacentHTML("beforeend", `<div id="help-context-menu"></div><div id="about-popup"></div><div id="feedback-popup"></div>`);
        this._helpMenu = $("#help-context-menu").dxContextMenu({
            items: [
                { text: "About", icon: "fa-light fa-circle-info" },
                { text: "Send Feedback", icon: "fa-light fa-envelope" }
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
                if (event.itemData.text === "About")
                    $("#about-popup").dxPopup("instance").show();
                else if (event.itemData.text === "Send Feedback")
                    $("#feedback-popup").dxPopup("instance").show();
            }
        }).dxContextMenu("instance");
        const translations = this.shell.board.translations;
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
                    <div style="overflow: hidden; margin-bottom: 12px; margin-top: 20px">
                        <img id="about-character-img" src="" alt="" style="float: right; height: 80px; margin: 0 0 4px 12px">
                        <p style="text-align: justify; margin: 0">${translations.get("About Beta")}</p>
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
            title: "Send Feedback",
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
                        { dataField: "title", label: { text: "Title" }, editorOptions: { placeholder: "Brief summary" }, validationRules: [{ type: "required" }] },
                        { dataField: "description", editorType: "dxTextArea", label: { text: "Description" }, editorOptions: { placeholder: "Describe your feedback", height: 120 } },
                        {
                            itemType: "button",
                            horizontalAlignment: "right",
                            buttonOptions: {
                                text: "Send",
                                icon: "fa-light fa-envelope",
                                type: "default",
                                onClick: () => this._submitFeedback()
                            }
                        }
                    ]
                });
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

    async _submitFeedback() {
        const formInstance = $("#feedback-form").dxForm("instance");
        const validationResult = formInstance.validate();
        if (!validationResult.isValid)
            return;
        const formData = formInstance.option("formData");
        const popup = $("#feedback-popup").dxPopup("instance");
        try {
            await this.shell.modelsApiClient.sendNotification({
                title: formData.title,
                message: formData.description,
                type: "Feedback"
            });
            popup.hide();
            formInstance.option("formData", {});
            window.DevExpress.ui.notify("Thank you for your feedback!", "success", 3000);
        } catch (error) {
            window.DevExpress.ui.notify("Failed to send feedback", "error", 3000);
        }
    }
}
