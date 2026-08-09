class ObjectPicker {
    static buttonId = "components-button";
    static previewSize = 132;
    static catalogueIcon = "fa-light fa-shapes";

    constructor(shell) {
        this.shell = shell;
        this.popupInstance = null;
        this.compiler = null;
        this.searchText = "";
        this.bodyElement = null;
        this.searchInputElement = null;
        this.keyDownHandler = event => this.onKeyDown(event);
    }

    get translations() {
        return this.shell.board.translations;
    }

    static escape(value) {
        return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
    }

    show() {
        if (this.popupInstance)
            this.renderItems();
        else
            this.createPopup();
        this.popupInstance.show();
        this.loadCatalogue();
    }

    async loadCatalogue() {
        await BlockObjectCatalogue.load(this.shell.modelsApiClient);
        this.renderItems();
    }

    createPopup() {
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        this.popupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: false,
            showTitle: true,
            title: this.translations.get("Objects Title"),
            width: 780,
            height: 620,
            dragEnabled: true,
            hideOnOutsideClick: true,
            showCloseButton: true,
            wrapperAttr: { class: "mdl-shape-overlay-popup mdl-object-picker-popup" },
            contentTemplate: contentElement => this.buildContent(contentElement),
            onShown: () => this.searchInputElement.focus()
        });
        document.addEventListener("keydown", this.keyDownHandler, true);
    }

    buildContent(contentElement) {
        const host = contentElement.get(0);
        host.innerHTML = `
            <div class="mdl-object-picker">
                <div class="mdl-char-picker-search-bar">
                    <input class="mdl-char-picker-search-input" type="text" placeholder="${ObjectPicker.escape(this.translations.get("Search Objects"))}" autocomplete="off">
                </div>
                <div class="mdl-catalog-data-scroll mdl-char-picker-scroll"><div class="mdl-object-picker-body"></div></div>
            </div>`;
        this.bodyElement = host.querySelector(".mdl-object-picker-body");
        this.searchInputElement = host.querySelector(".mdl-char-picker-search-input");
        this.searchInputElement.value = this.searchText;
        this.searchInputElement.addEventListener("input", event => this.onSearchChanged(event.target.value));
        this.renderItems();
    }

    // Capture phase, because the toolbar button keeps the focus when the popup opens and the widget
    // it belongs to stops the key before it bubbles as far as the document.
    onKeyDown(event) {
        if (event.key === "Escape" && this.popupInstance.option("visible"))
            this.popupInstance.hide();
    }

    onSearchChanged(value) {
        this.searchText = value;
        this.renderItems();
    }

    renderItems() {
        const items = this.getVisibleItems();
        if (items.length === 0) {
            this.bodyElement.innerHTML = `<div class="mdl-catalog-data-status">${ObjectPicker.escape(this.translations.get("No Objects Found"))}</div>`;
            return;
        }
        this.bodyElement.innerHTML = `<div class="mdl-catalog-data-grid"></div>`;
        const grid = this.bodyElement.querySelector(".mdl-catalog-data-grid");
        for (const item of items) {
            grid.insertAdjacentHTML("beforeend", this.getCardMarkup(item));
            grid.lastElementChild.addEventListener("click", () => this.place(item));
        }
    }

    getCardMarkup(item) {
        return `
            <div class="mdl-catalog-data-card mdl-object-picker-card" data-object-key="${ObjectPicker.escape(item.key)}" title="${ObjectPicker.escape(item.description)}">
                <div class="mdl-object-picker-preview">${this.getPreviewMarkup(item)}</div>
                <div class="mdl-catalog-data-title">${ObjectPicker.escape(item.title)}</div>
                <div class="mdl-object-picker-description">${ObjectPicker.escape(item.description)}</div>
            </div>`;
    }

    // A catalogue object is drawn from its screenshot: its definition is only read when it is
    // placed, so there is nothing to compile a preview from until then.
    getPreviewMarkup(item) {
        if (item.thumbnailUrl)
            return `<img class="mdl-catalog-data-thumb" src="${ObjectPicker.escape(item.thumbnailUrl)}" alt="${ObjectPicker.escape(item.title)}">`;
        if (!BlockRegistry.has(item.componentType))
            return `<div class="mdl-catalog-data-thumb-placeholder"><i class="${ObjectPicker.escape(item.icon)}"></i></div>`;
        const size = ObjectPicker.previewSize;
        const definition = BlockObjects.createComponentInstance(item.componentType);
        const parameters = this.getPreviewParameters(item.componentType, definition.preset);
        const compilation = this.getCompiler().compile(definition, {
            width: size,
            height: size,
            parameters: parameters,
            tokens: new BlockTokens(definition.preset)
        });
        return BlockRenderer.toStandaloneSvg(compilation.nodes, size, size, "none");
    }

    getPreviewParameters(componentType, preset) {
        const parameters = BlockObjects.getInstancePropertyDefaults(componentType, preset);
        const preview = BlockDefinitionLoader.getDocument(componentType)?.preview;
        return Object.assign(parameters, preview?.parameters ?? {});
    }

    getCompiler() {
        if (!this.compiler)
            this.compiler = new BlockCompiler(BlockRegistry, new BlockBindings(this.shell.board.calculator));
        this.compiler.setCalculator(this.shell.board.calculator);
        return this.compiler;
    }

    // A catalogue entry and a registered object can name the same type — once an object has been
    // placed, it is registered for the session and the model carries it. The catalogue entry wins:
    // it is the one with a screenshot and the description its author wrote.
    // By name, because the palette is scanned by name. It is also what keeps the grid still: the
    // picker draws what is registered and draws again when the catalogue answers, and the
    // catalogue lists newest first, so any order that follows the source would rearrange the
    // cards under the pointer. The chart is a shape rather than an object and stays at the end.
    getItems() {
        const catalogueItems = this.getCatalogueItems();
        const catalogueTypes = new Set(catalogueItems.map(item => item.componentType));
        const registryItems = this.getObjectItems().filter(item => !catalogueTypes.has(item.componentType));
        const objectItems = registryItems.concat(catalogueItems).sort((left, right) => left.title.localeCompare(right.title));
        return objectItems.concat(this.getShapeItems());
    }

    getCatalogueItems() {
        return BlockObjectCatalogue.getEntries().map(entry => ({
            key: entry.type,
            componentType: entry.type,
            catalogueId: entry.id,
            title: entry.title,
            description: entry.description ?? "",
            thumbnailUrl: entry.thumbnail_url ?? "",
            icon: ObjectPicker.catalogueIcon,
            tags: entry.tags ?? []
        }));
    }

    getObjectItems() {
        return BlockRegistry.list("component", { agentAccessibleOnly: true })
            .filter(registration => registration.tags.includes("object"))
            .map(registration => ({
                key: registration.type,
                componentType: registration.type,
                title: registration.displayName,
                description: registration.description,
                icon: registration.icon,
                tags: registration.tags
            }));
    }

    getShapeItems() {
        return [{
            key: "BlockChartShape",
            shapeType: "BlockChartShape",
            shapeName: this.translations.get("Chart Name"),
            title: this.translations.get("Block Chart Name"),
            description: this.translations.get("Block Chart Description"),
            icon: BaseShape.shapeIcons.BlockChartShape,
            tags: ["chart", "plot", "graph"]
        }];
    }

    getVisibleItems() {
        const terms = this.searchText.toLowerCase().split(/\s+/).filter(term => term !== "");
        const items = this.getItems();
        if (terms.length === 0)
            return items;
        return items.filter(item => {
            const haystack = `${item.title} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
            return terms.every(term => haystack.includes(term));
        });
    }

    async place(item) {
        if (item.catalogueId && !await this.registerCatalogueObject(item))
            return;
        this.popupInstance.hide();
        if (item.componentType) {
            const componentProperties = ComponentShape.createInstanceProperties(item.componentType);
            this.shell.shapeDrawController.toggle("ComponentShape", componentProperties.name, ObjectPicker.buttonId, componentProperties);
            return;
        }
        this.shell.shapeDrawController.toggle(item.shapeType, item.shapeName, ObjectPicker.buttonId);
    }

    // The picker stays open when the definition cannot be read, so the choice is not lost and the
    // reason is said out loud rather than leaving a card that does nothing when clicked.
    async registerCatalogueObject(item) {
        try {
            await BlockObjectCatalogue.ensureRegistered(item.catalogueId, this.shell.modelsApiClient);
            return true;
        } catch (error) {
            DevExpress.ui.notify(`${this.translations.get("Object Unavailable")} ${error.message}`, "error", 4000);
            return false;
        }
    }
}
