var QuestionShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, QuestionShapeToolbarMixin.createToolbar);
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
                    this.createAnswerModeDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createScoringToggle(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createQuestionImageDropDownButton(container);
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
    },
    createAnswerModeDropDownButton(itemElement) {
        this._answerModeDropdownElement = $('<div>');
        this._answerModeDropdownElement.dxDropDownButton({
            showArrowIcon: true,
            stylingMode: "text",
            useSelectMode: false,
            icon: "fa-light fa-circle-dot",
            selectedItemKey: this.properties.answerMode,
            keyExpr: "value",
            displayExpr: "text",
            items: [
                { value: "single", text: "Single Answer", icon: "fa-light fa-circle-dot" },
                { value: "multiple", text: "Multiple Answers", icon: "fa-light fa-list-check" },
                { value: "freetext", text: "Free Text", icon: "fa-light fa-keyboard" }
            ],
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 180
            },
            onItemClick: e => {
                this.setPropertyCommand("answerMode", e.itemData.value);
                this.rebuildContent();
            }
        });
        this._answerModeDropdownElement.appendTo(itemElement);
    },
    createQuestionImageDropDownButton(itemElement) {
        this._imageDropdownElement = $('<div class="mdl-image-settings-selector">');
        this._imageDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            icon: this.questionImageButtonIcon(),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 280,
                onShown: () => this.imageDropZoneControl?.activateDocumentPaste(),
                onHidden: () => this.imageDropZoneControl?.deactivateDocumentPaste(),
                contentTemplate: contentElement => {
                    $(contentElement).empty();
                    const container = $('<div class="mdl-question-image-dropdown">');
                    container.append(this.createImageDropZoneEditor());
                    $(contentElement).append(container);
                }
            }
        });
        this._imageDropdownElement.appendTo(itemElement);
    },
    questionImageButtonIcon() {
        return this.getImageSource() ? "fa-solid fa-image" : "fa-light fa-image";
    },
    refreshImageToolbarButtonIcon() {
        const instance = this._imageDropdownElement?.dxDropDownButton("instance");
        instance?.option("icon", this.questionImageButtonIcon());
    },
    createImageDropZoneEditor() {
        this.imageDropZoneControl = new ImageControl({
            imageSource: this.getImageSource(),
            onUploadFile: (file, onProgress) => this.board.assetManager.uploadAsset(this.id, file, file.name, onProgress),
            onImageChanged: imageSource => this.onImageControlChanged(imageSource),
            onImageCleared: () => this.onImageControlCleared()
        });
        return this.imageDropZoneControl.createHost();
    },
    createScoringToggle(itemElement) {
        this._scoringDropdownElement = $('<div>');
        this._scoringDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: () => {
                setTimeout(() => {
                    const buttonContent = this._scoringDropdownElement.find(".dx-button-content")[0];
                    if (buttonContent)
                        buttonContent.innerHTML = this.scoringButtonIcon();
                }, 0);
            },
            items: [
                { value: false, text: "No Score", iconHtml: `<span class="fa-stack mdl-scoring-icon-sm"><i class="fa-light fa-trophy fa-stack-1x"></i><i class="fa-light fa-slash fa-stack-1x"></i></span>` },
                { value: true, text: "Score", iconHtml: `<span class="fa-stack mdl-scoring-icon-sm"><i class="fa-light fa-trophy fa-stack-1x"></i></span>` }
            ],
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: 160
            },
            itemTemplate: (data, _, element) => {
                element[0].innerHTML = `<div class="mdl-scoring-dropdown-item">${data.iconHtml}<span>${data.text}</span></div>`;
            },
            onItemClick: e => {
                const newValue = e.itemData.value;
                this.setPropertyCommand("hasScoring", newValue);
                const buttonContent = this._scoringDropdownElement.find(".dx-button-content")[0];
                if (buttonContent)
                    buttonContent.innerHTML = this.scoringButtonIcon();
                this.rebuildContent();
            }
        });
        this._scoringDropdownElement.appendTo(itemElement);
    }
};
if (typeof QuestionShape !== "undefined") Object.assign(QuestionShape.prototype, QuestionShapeToolbarMixin);
