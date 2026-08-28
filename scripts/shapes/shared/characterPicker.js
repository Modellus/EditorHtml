// The characters the catalogue offers, and the popup that picks one of them. A body is not the
// only shape that wears a character: an object that marks a point on screen — a tracked pointer,
// a recorded position — places the same drawing by the same pivot, so the definitions, the image
// measurements and the picker live here rather than inside the body.
class CharacterLibrary {
    static definitions = new Map();
    static pendingFetches = new Map();
    static aspectRatios = new Map();

    static get(characterKey) {
        return CharacterLibrary.definitions.get(characterKey) ?? null;
    }

    static adapt(definition) {
        const animations = (definition.animations ?? []).map(animation => {
            const sortedFrames = [...(animation.frames ?? [])].sort((first, second) => (first.frame_index ?? 0) - (second.frame_index ?? 0));
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

    static fetch(characterKey, apiClient) {
        if (CharacterLibrary.definitions.has(characterKey))
            return Promise.resolve(CharacterLibrary.definitions.get(characterKey));
        if (CharacterLibrary.pendingFetches.has(characterKey))
            return CharacterLibrary.pendingFetches.get(characterKey);
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
                const adapted = CharacterLibrary.adapt(merged);
                CharacterLibrary.definitions.set(characterKey, adapted);
                CharacterLibrary.pendingFetches.delete(characterKey);
                return adapted;
            })
            .catch(error => {
                CharacterLibrary.pendingFetches.delete(characterKey);
                throw error;
            });
        CharacterLibrary.pendingFetches.set(characterKey, promise);
        return promise;
    }

    static getImageUrl(character) {
        return character?.animations?.[0]?.frameUrls?.[0] || character?.thumbnail_url || "";
    }

    // The pivot is a fraction of the drawn image, and an image that is not square is letterboxed
    // inside the box it is given, so the fraction is only worth anything once the shape of the
    // image is known. Until it loads it is taken as square, which is what a body does too.
    static getAspectRatio(imageUrl) {
        return CharacterLibrary.aspectRatios.get(imageUrl) ?? null;
    }

    static loadAspectRatio(imageUrl, onLoaded) {
        if (!imageUrl || CharacterLibrary.aspectRatios.has(imageUrl))
            return;
        CharacterLibrary.aspectRatios.set(imageUrl, null);
        const image = new Image();
        image.onload = () => {
            CharacterLibrary.aspectRatios.set(imageUrl, image.naturalWidth / image.naturalHeight);
            onLoaded();
        };
        image.src = imageUrl;
    }
}

var CharacterPickerMixin = {
    showCharacterPickerPopup(options = {}) {
        this._characterPickerProperty = options.property ?? "characterKey";
        this._characterPickerSelected = options.onSelected ?? (() => {});
        this._selectedCharacterKey = this.properties[this._characterPickerProperty] ?? "";
        if (this._characterPickerPopupInstance) {
            this.buildCharacterPickerContent(this._characterPickerPopupInstance.content());
            this._characterPickerPopupInstance.show();
            return;
        }
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        this._characterPickerPopupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: true,
            showTitle: true,
            title: this.board.translations.get("Select Character") ?? "Select Character",
            width: 1040,
            height: 600,
            dragEnabled: true,
            hideOnOutsideClick: true,
            showCloseButton: true,
            wrapperAttr: this.getShapeOverlayWrapperAttr("mdl-character-picker-popup"),
            toolbarItems: [
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Select") ?? "Select",
                        type: "default",
                        stylingMode: "contained",
                        onClick: () => this.applyPickedCharacter(this._selectedCharacterKey)
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Remove") ?? "Remove",
                        type: "danger",
                        stylingMode: "outlined",
                        onClick: () => this.applyPickedCharacter("")
                    }
                },
                {
                    widget: "dxButton",
                    location: "after",
                    toolbar: "bottom",
                    options: {
                        text: this.board.translations.get("Cancel") ?? "Cancel",
                        stylingMode: "text",
                        onClick: () => this._characterPickerPopupInstance.hide()
                    }
                }
            ],
            contentTemplate: contentElement => this.buildCharacterPickerContent(contentElement)
        });
    },
    applyPickedCharacter(characterKey) {
        this.setPropertyCommand(this._characterPickerProperty, characterKey);
        this._characterPickerSelected(characterKey);
        this._characterPickerPopupInstance.hide();
    },
    buildCharacterPickerContent(contentElement) {
        const host = contentElement.get ? contentElement.get(0) : contentElement;
        host.innerHTML = `<div class="mdl-catalog-data-status"><i class="fa-light fa-spinner fa-spin"></i></div>`;
        const apiClient = this.board.shell?.modelsApiClient;
        if (!apiClient) {
            host.innerHTML = `<div class="mdl-catalog-data-status">Characters unavailable.</div>`;
            return;
        }
        Promise.all([
            apiClient.fetchCharacters().catch(() => []),
            apiClient.fetchCharacterCategories().catch(() => [])
        ]).then(([characters, categories]) => {
            const categoryNameById = new Map(categories.map(category => [category.id, category.name]));
            const grouped = new Map();
            const sortedCharacters = [...characters].sort((first, second) => (first.title || "").localeCompare(second.title || ""));
            for (const character of sortedCharacters) {
                const categoryId = character.category_id || null;
                const categoryName = categoryId ? (categoryNameById.get(categoryId) || categoryId) : "Uncategorized";
                const groupKey = categoryId || "__uncategorized__";
                if (!grouped.has(groupKey))
                    grouped.set(groupKey, { name: categoryName, characters: [] });
                grouped.get(groupKey).characters.push(character);
            }
            const sortedGroups = Array.from(grouped.values()).sort((first, second) => {
                if (first.name === "Uncategorized") return 1;
                if (second.name === "Uncategorized") return -1;
                return first.name.localeCompare(second.name);
            });
            host.innerHTML = `
                <div class="mdl-char-picker-container">
                    <div class="mdl-char-picker-search-bar">
                        <input class="mdl-char-picker-search-input" type="text" placeholder="Search characters…" autocomplete="off">
                    </div>
                    <div class="mdl-catalog-data-scroll mdl-char-picker-scroll"><div class="mdl-char-picker-body"></div></div>
                </div>`;
            const body = host.querySelector(".mdl-char-picker-body");
            const searchInput = host.querySelector(".mdl-char-picker-search-input");
            for (const group of sortedGroups) {
                const groupId = `char-picker-group-${CSS.escape(group.name)}`;
                body.insertAdjacentHTML("beforeend", `
                    <div class="mdl-char-picker-group" id="${groupId}">
                        <div class="mdl-char-picker-group-label">${this.escapeCharacterPickerHtml(group.name)}</div>
                        <div class="mdl-catalog-data-grid"></div>
                    </div>`);
                const grid = body.querySelector(`#${groupId} .mdl-catalog-data-grid`);
                for (const character of group.characters) {
                    const cardId = `char-card-${CSS.escape(character.id)}`;
                    const isSelected = this._selectedCharacterKey === character.id;
                    const thumbHtml = character.thumbnail_url
                        ? `<img class="mdl-catalog-data-thumb" src="${this.escapeCharacterPickerHtml(character.thumbnail_url)}" alt="${this.escapeCharacterPickerHtml(character.title || "")}">`
                        : `<div class="mdl-catalog-data-thumb-placeholder"><i class="fa-light fa-person-running"></i></div>`;
                    grid.insertAdjacentHTML("beforeend", `
                        <div class="mdl-catalog-data-card${isSelected ? " selected" : ""}" id="${cardId}" data-character-id="${this.escapeCharacterPickerHtml(character.id)}" data-character-title="${this.escapeCharacterPickerHtml((character.title || "").toLowerCase())}">
                            <div class="mdl-catalog-data-thumb-wrap">${thumbHtml}</div>
                            <div class="mdl-catalog-data-title">${this.escapeCharacterPickerHtml(character.title || "")}</div>
                        </div>`);
                    const card = grid.lastElementChild;
                    AssetPreview.character(card.querySelector(".mdl-catalog-data-thumb-wrap"), { characterId: character.id, apiClient: apiClient, translations: this.board.translations });
                    card.addEventListener("click", () => {
                        host.querySelectorAll(".mdl-catalog-data-card").forEach(other => other.classList.remove("selected"));
                        card.classList.add("selected");
                        this._selectedCharacterKey = character.id;
                    });
                    if (character.title || character.description) {
                        $('<div>').appendTo('body').dxTooltip({
                            target: card,
                            contentTemplate: tooltipContent => {
                                tooltipContent.append($('<div class="card-desc-tooltip">').html(`<strong>${this.escapeCharacterPickerHtml(character.title || "")}</strong>${character.description ? `<p>${this.escapeCharacterPickerHtml(character.description)}</p>` : ``}`));
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
                    group.querySelectorAll(".mdl-catalog-data-card").forEach(card => {
                        const matches = !query || card.dataset.characterTitle.includes(query);
                        card.style.display = matches ? "" : "none";
                        if (matches) visibleCount++;
                    });
                    group.style.display = visibleCount > 0 ? "" : "none";
                });
            });
        });
    },
    escapeCharacterPickerHtml(text) {
        return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
};
