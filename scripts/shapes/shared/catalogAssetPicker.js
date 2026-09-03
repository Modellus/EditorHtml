// The images, audios and videos the catalogue offers, picked the same way wherever a shape takes
// one. A shape already takes a file dropped on it or chosen from disk; this picks one that is
// already published instead, and the entry's asset URL is what the shape shows — the same URL an
// upload would have left behind, so showing a picked asset and showing an uploaded one are the
// same thing.
//
// A title over a thumbnail says nothing about a sound and little about a film, so every card here
// plays what it offers before it is chosen. A picture is its own thumbnail, and the preview opens
// it at the size it was published at.
var CatalogAssetPickerMixin = {
    showCatalogAudioPopup(onAudioSelected = audio => this.applyCatalogAudio(audio)) {
        this.showCatalogAssetPopup({
            kind: "audio",
            title: this.board.translations.get("Catalog Audio") ?? "Catalog Audio",
            emptyText: this.board.translations.get("No audio available") ?? "No audio available",
            errorText: this.board.translations.get("Failed to load audios") ?? "Failed to load audios",
            placeholderIcon: "fa-light fa-waveform-lines",
            resolveThumbnailUrl: entry => entry.thumbnail_url,
            fetchEntries: apiClient => apiClient.fetchAudios(),
            onSelected: onAudioSelected
        });
    },
    showCatalogImagePopup(onImageSelected = image => this.applyCatalogImage(image)) {
        this.showCatalogAssetPopup({
            kind: "image",
            title: this.board.translations.get("Catalog Image") ?? "Catalog Image",
            emptyText: this.board.translations.get("No image available") ?? "No image available",
            errorText: this.board.translations.get("Failed to load images") ?? "Failed to load images",
            placeholderIcon: "fa-light fa-image",
            resolveThumbnailUrl: entry => entry.thumbnail_url || entry.asset_url,
            fetchEntries: apiClient => apiClient.fetchImages(),
            onSelected: onImageSelected
        });
    },
    showCatalogVideoPopup(onVideoSelected = video => this.applyCatalogVideo(video)) {
        this.showCatalogAssetPopup({
            kind: "video",
            title: this.board.translations.get("Catalog Video") ?? "Catalog Video",
            emptyText: this.board.translations.get("No video available") ?? "No video available",
            errorText: this.board.translations.get("Failed to load videos") ?? "Failed to load videos",
            placeholderIcon: "fa-light fa-video",
            resolveThumbnailUrl: entry => entry.thumbnail_url,
            fetchEntries: apiClient => apiClient.fetchVideos(),
            onSelected: onVideoSelected
        });
    },
    showCatalogAssetPopup(options) {
        this._selectedCatalogAsset = null;
        this._catalogAssetOptions = options;
        if (this._catalogAssetPopupInstance) {
            this._catalogAssetPopupInstance.option("title", options.title);
            this.buildCatalogAssetContent(this._catalogAssetPopupInstance.content());
            this._catalogAssetPopupInstance.show();
            return;
        }
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        this._catalogAssetPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: true,
            showTitle: true,
            title: options.title,
            width: 680,
            height: 520,
            dragEnabled: true,
            hideOnOutsideClick: event => !$(event.target).closest(".mdl-asset-preview-popup").length,
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
                        onClick: () => this.onCatalogAssetSelected()
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Cancel") ?? "Cancel",
                        stylingMode: "text",
                        onClick: () => this._catalogAssetPopupInstance.hide()
                    }
                }
            ],
            onHiding: () => AssetPreview.stopActive(),
            contentTemplate: contentElement => this.buildCatalogAssetContent(contentElement)
        });
    },
    async buildCatalogAssetContent(contentElement) {
        const options = this._catalogAssetOptions;
        const host = contentElement.get ? contentElement.get(0) : contentElement;
        host.innerHTML = `<div class="mdl-catalog-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
        const apiClient = this.board.shell?.modelsApiClient;
        if (!apiClient) {
            host.innerHTML = `<div class="mdl-catalog-data-status">${options.errorText}</div>`;
            return;
        }
        let entries = [];
        try {
            entries = await options.fetchEntries(apiClient);
        } catch (error) {
            host.innerHTML = `<div class="mdl-catalog-data-status">${options.errorText}</div>`;
            return;
        }
        if (!entries.length) {
            host.innerHTML = `<div class="mdl-catalog-data-status">${options.emptyText}</div>`;
            return;
        }
        host.innerHTML = `
            <div class="mdl-catalog-data-scroll">
                <div class="mdl-catalog-data-grid"></div>
            </div>`;
        const grid = host.querySelector(".mdl-catalog-data-grid");
        for (const entry of entries)
            this.appendCatalogAssetCard(grid, entry, options);
    },
    appendCatalogAssetCard(grid, entry, options) {
        const thumbnailUrl = options.resolveThumbnailUrl(entry);
        const thumbHtml = thumbnailUrl
            ? `<img class="mdl-catalog-data-thumb" src="${this.escapeCatalogAssetHtml(thumbnailUrl)}" alt="">`
            : `<div class="mdl-catalog-data-thumb-placeholder"><i class="${options.placeholderIcon}"></i></div>`;
        grid.insertAdjacentHTML("beforeend", `
            <div class="mdl-catalog-data-card" data-id="${this.escapeCatalogAssetHtml(entry.id ?? "")}">
                <div class="mdl-catalog-data-thumb-wrap">${thumbHtml}</div>
                <div class="mdl-catalog-data-title">${this.escapeCatalogAssetHtml(entry.title ?? "Untitled")}</div>
            </div>`);
        const cardElement = grid.lastElementChild;
        cardElement.addEventListener("click", () => {
            grid.querySelectorAll(".mdl-catalog-data-card").forEach(other => other.classList.remove("selected"));
            cardElement.classList.add("selected");
            this._selectedCatalogAsset = entry;
        });
        this.bindCatalogAssetPreview(cardElement, entry, options.kind);
        if (!entry.description)
            return;
        $('<div>').appendTo('body').dxTooltip({
            target: cardElement,
            contentTemplate: tooltipContent => {
                tooltipContent.append($('<div class="tooltip"/>').html(entry.description));
            },
            showEvent: { delay: 500, name: 'mouseenter' },
            hideEvent: 'mouseleave',
            position: 'top',
            width: 260,
            wrapperAttr: { class: "mdl-catalog-data-tooltip" }
        });
    },
    bindCatalogAssetPreview(cardElement, entry, kind) {
        const wrapElement = cardElement.querySelector(".mdl-catalog-data-thumb-wrap");
        const previewOptions = {
            assetUrl: entry.asset_url,
            title: entry.title,
            translations: this.board.translations,
            popupWrapperClass: this.getShapeNestedOverlayWrapperAttr().class
        };
        if (kind === "audio")
            AssetPreview.audio(wrapElement, previewOptions);
        else if (kind === "image")
            AssetPreview.image(wrapElement, previewOptions);
        else
            AssetPreview.video(wrapElement, previewOptions);
    },
    onCatalogAssetSelected() {
        if (!this._selectedCatalogAsset)
            return;
        this._catalogAssetOptions.onSelected(this._selectedCatalogAsset);
        this._catalogAssetPopupInstance.hide();
    },
    escapeCatalogAssetHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
