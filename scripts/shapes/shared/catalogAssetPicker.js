// The audios the catalogue offers, picked the same way wherever a shape takes a sound. A shape
// already takes an audio file dropped on it or chosen from disk; this picks one that is already
// published instead, and the entry's asset URL is what the shape plays — the same URL an upload
// would have left behind, so playing a picked audio and playing an uploaded one are the same thing.
var CatalogAudioPickerMixin = {
    showCatalogAudioPopup(onAudioSelected = audio => this.applyCatalogAudio(audio)) {
        this._selectedCatalogAudio = null;
        this._onCatalogAudioSelected = onAudioSelected;
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
        this._onCatalogAudioSelected(this._selectedCatalogAudio);
        this._catalogAudioPopupInstance.hide();
    },
    escapeCatalogAudioHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
