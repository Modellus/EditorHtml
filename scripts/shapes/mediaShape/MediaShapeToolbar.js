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
                buildControl: $container => $container.append(this.createImageDropZoneEditor())
            },
            {
                text: "Catalog Audio",
                buildControl: $container => {
                    $('<div>').appendTo($container).dxButton({
                        icon: "fa-light fa-waveform-lines",
                        stylingMode: "text",
                        onClick: () => {
                            this._mediaSettingsDropdownElement.dxDropDownButton("instance").close();
                            this.showCatalogAudioPopup();
                        }
                    });
                }
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
        Utils.renderDropdownMenuScroll(contentElement, 350, scrollContent => {
            $('<div>').appendTo(scrollContent).dxList({
                dataSource: listItems,
                scrollingEnabled: false,
                itemTemplate: (data, _, el) => Utils.renderDropdownListItem(el, data)
            });
        });
    },
    // The audios the catalogue offers. A media shape already takes an audio file dropped on it;
    // this picks one that is already published instead, and the entry's asset URL is what the
    // shape plays — the same URL an upload would have left behind.
    showCatalogAudioPopup() {
        this._selectedCatalogAudio = null;
        const buildContent = async contentElement => {
            const host = contentElement.get ? contentElement.get(0) : contentElement;
            host.innerHTML = `<div class="mdl-catalog-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
            const apiClient = this.board.shell?.modelsApiClient;
            if (!apiClient) {
                host.innerHTML = `<div class="mdl-catalog-data-status">${this.board.translations.get("Failed to load audios") ?? "Failed to load audios"}</div>`;
                return;
            }
            let audios = [];
            try {
                audios = await apiClient.fetchAudios();
            } catch (error) {
                host.innerHTML = `<div class="mdl-catalog-data-status">${this.board.translations.get("Failed to load audios") ?? "Failed to load audios"}</div>`;
                return;
            }
            if (!audios.length) {
                host.innerHTML = `<div class="mdl-catalog-data-status">${this.board.translations.get("No audio available") ?? "No audio available"}</div>`;
                return;
            }
            host.innerHTML = `
                <div class="mdl-catalog-data-scroll">
                    <div class="mdl-catalog-data-grid"></div>
                </div>`;
            const grid = host.querySelector(".mdl-catalog-data-grid");
            for (const audio of audios) {
                const thumbHtml = audio.thumbnail_url
                    ? `<img class="mdl-catalog-data-thumb" src="${this.escapeCatalogAudioHtml(audio.thumbnail_url)}" alt="">`
                    : `<div class="mdl-catalog-data-thumb-placeholder"><i class="fa-light fa-waveform-lines"></i></div>`;
                grid.insertAdjacentHTML("beforeend", `
                    <div class="mdl-catalog-data-card" data-id="${this.escapeCatalogAudioHtml(audio.id ?? "")}">
                        ${thumbHtml}
                        <div class="mdl-catalog-data-title">${this.escapeCatalogAudioHtml(audio.title ?? "Untitled")}</div>
                    </div>`);
                const cardElement = grid.lastElementChild;
                cardElement.addEventListener("click", () => {
                    grid.querySelectorAll(".mdl-catalog-data-card").forEach(other => other.classList.remove("selected"));
                    cardElement.classList.add("selected");
                    this._selectedCatalogAudio = audio;
                });
                if (audio.description) {
                    $('<div>').appendTo('body').dxTooltip({
                        target: cardElement,
                        contentTemplate: tooltipContent => {
                            tooltipContent.append($('<div class="tooltip"/>').html(audio.description));
                        },
                        showEvent: { delay: 500, name: 'mouseenter' },
                        hideEvent: 'mouseleave',
                        position: 'top',
                        width: 260,
                        wrapperAttr: { class: "mdl-catalog-data-tooltip" }
                    });
                }
            }
        };
        if (this._catalogAudioPopupInstance) {
            buildContent(this._catalogAudioPopupInstance.content());
            this._catalogAudioPopupInstance.show();
            return;
        }
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        this._catalogAudioPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: true,
            showTitle: true,
            title: this.board.translations.get("Catalog Audio") ?? "Catalog Audio",
            width: 680,
            height: 520,
            dragEnabled: true,
            hideOnOutsideClick: true,
            showCloseButton: true,
            wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-catalog-data-popup"),
            toolbarItems: [
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Select") ?? "Select",
                        type: "default",
                        stylingMode: "contained",
                        onClick: () => this.onCatalogAudioSelected()
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Cancel") ?? "Cancel",
                        stylingMode: "text",
                        onClick: () => this._catalogAudioPopupInstance.hide()
                    }
                }
            ],
            contentTemplate: contentElement => buildContent(contentElement)
        });
    },
    onCatalogAudioSelected() {
        if (!this._selectedCatalogAudio)
            return;
        this.applyCatalogAudio(this._selectedCatalogAudio);
        this._catalogAudioPopupInstance.hide();
    },
    escapeCatalogAudioHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
if (typeof MediaShape !== "undefined") Object.assign(MediaShape.prototype, MediaShapeToolbarMixin);
