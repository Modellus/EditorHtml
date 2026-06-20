var MediaShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, MediaShapeToolbarMixin.createToolbar);
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
                    this.createMediaSettingsDropDownButton(container);
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
    createMediaSettingsDropDownButton(container) {
        this._mediaSettingsDropdownElement = $('<div class="mdl-image-settings-selector">');
        this._mediaSettingsDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Media Settings Tooltip", this.board.translations, 280),
            icon: "fa-light fa-photo-film-music",
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                onShown: () => this.imageDropZoneControl?.activateDocumentPaste(),
                onHidden: () => this.imageDropZoneControl?.deactivateDocumentPaste(),
                contentTemplate: contentElement => this.buildMediaSettingsMenuContent(contentElement)
            }
        });
        this._mediaSettingsDropdownElement.appendTo(container);
    },
    buildMediaSettingsMenuContent(contentElement) {
        const listItems = [
            {
                text: "Media",
                stacked: true,
                buildControl: $container => $container.append(this.createImageDropZoneEditor())
            },
            {
                text: "Keep Proportions",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxSwitch({
                        value: this.properties.lockAspectRatio !== false,
                        onInitialized: e => { this._lockAspectRatioSwitchInstance = e.component; },
                        onValueChanged: e => this.setPropertyCommand("lockAspectRatio", e.value)
                    });
                }
            },
            {
                text: "Synced",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxSwitch({
                        value: this.properties.mediaSynced !== false,
                        onInitialized: e => { this._mediaSyncedSwitchInstance = e.component; },
                        onValueChanged: e => this.setPropertyCommand("mediaSynced", e.value)
                    });
                }
            },
            {
                text: "Iterations/Frame",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxNumberBox({
                        value: this.properties.videoStepsPerFrame,
                        showSpinButtons: true,
                        min: 1,
                        step: 1,
                        stylingMode: "filled",
                        onInitialized: e => { this._videoStepsBoxInstance = e.component; },
                        onValueChanged: e => this.setPropertyCommand("videoStepsPerFrame", e.value)
                    });
                }
            }
        ];
        $(contentElement).empty();
        $(contentElement).dxScrollView({ height: 350, width: "100%" });
        const scrollContent = $(contentElement).dxScrollView("instance").content();
        $('<div>').appendTo(scrollContent).dxList({
            dataSource: listItems,
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                if (data.stacked) {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item-stacked"><span class="mdl-dropdown-list-stacked-label">${data.text}</span><span class="mdl-dropdown-list-stacked-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-stacked-control"));
                } else {
                    el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                    data.buildControl($(el).find(".mdl-dropdown-list-control"));
                }
            }
        });
    }
};
if (typeof MediaShape !== "undefined") Object.assign(MediaShape.prototype, MediaShapeToolbarMixin);
