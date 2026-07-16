class BackgroundToolbar {
    constructor(shell) {
        this.shell = shell;
        this.colorControl = new ColorControl();
        this.host = document.createElement("div");
        this.host.className = "shape-context-toolbar mdl-background-toolbar";
        document.body.appendChild(this.host);
        $(this.host).dxToolbar({ items: this.createItems(), width: "auto" });
        this.toolbarInstance = $(this.host).dxToolbar("instance");
        this.shell.board.svg.addEventListener("selected", () => this.hide());
        document.addEventListener("mousedown", e => this.onDocumentPointerDown(e));
    }

    onDocumentPointerDown(event) {
        if (!this.isVisible())
            return;
        const target = event.target;
        if (!(target instanceof Element))
            return;
        if (this.host.contains(target))
            return;
        if (target.closest(".dx-overlay-wrapper, .dx-overlay-content, .dx-context-menu"))
            return;
        // Clicks inside the board svg are handled by the selection logic:
        // selecting a shape hides the toolbar and an empty-space click
        // toggles it, so only clicks outside the board dismiss it here.
        if (this.shell.board.svg.contains(target))
            return;
        this.hide();
    }

    get translations() {
        return this.shell.board.translations;
    }

    createSeparator() {
        return { location: "center", template: () => $('<div class="toolbar-separator">|</div>') };
    }

    createItems() {
        return [
            this.createNameItem(),
            this.createSeparator(),
            this.createThemeItem(),
            this.createBackgroundColorItem(),
            this.createBackgroundPickerItem()
        ];
    }

    createNameItem() {
        return {
            location: "center",
            template: () => {
                const wrapper = $('<div class="mdl-background-toolbar-name">');
                wrapper.dxTextBox({
                    value: this.shell.properties.name,
                    stylingMode: "filled",
                    width: 160,
                    placeholder: this.translations.get("Model Name") ?? "Model name",
                    onInitialized: e => {
                        this._nameTextBox = e.component;
                        this.shell.createTranslatedTooltip(e, "Model Name Tooltip", 280);
                    },
                    onValueChanged: event => {
                        if (event.event)
                            this.shell.setPropertyCommand("name", event.value);
                    }
                });
                return wrapper;
            }
        };
    }

    getThemeMenuItems() {
        return [
            { key: "midSchool", icon: "fa-light fa-pencil", text: this.translations.get("Mid School") ?? "Mid School" },
            { key: "university", icon: "fa-light fa-graduation-cap", text: this.translations.get("University") ?? "University" }
        ];
    }

    renderThemeButtonTemplate(element) {
        const items = this.getThemeMenuItems();
        const current = items.find(item => item.key === this.shell.properties.educationLevel) ?? items[0];
        element.innerHTML = `<span class="mdl-focused-toolbar-button"><i class="${current.icon}"></i></span>`;
    }

    createThemeItem() {
        return {
            location: "center",
            template: () => {
                this._themeDropdownElement = $('<div class="mdl-theme-selector">');
                this._themeDropdownElement.dxDropDownButton({
                    showArrowIcon: false,
                    stylingMode: "text",
                    useSelectMode: false,
                    onInitialized: e => this.shell.createTranslatedTooltip(e, "Model Theme Tooltip", 280),
                    template: (data, element) => this.renderThemeButtonTemplate(element[0]),
                    dropDownOptions: {
                        container: document.body,
                        wrapperAttr: { class: "mdl-shape-overlay-popup" },
                        width: "auto",
                        contentTemplate: contentElement => this.buildThemeMenuContent(contentElement)
                    }
                });
                return this._themeDropdownElement;
            }
        };
    }

    buildThemeMenuContent(contentElement) {
        $(contentElement).empty();
        this._themeList = $("<div>").appendTo(contentElement).dxList({
            dataSource: this.getThemeMenuItems(),
            scrollingEnabled: false,
            itemTemplate: (data, _, el) => {
                const check = this.shell.properties.educationLevel === data.key ? '<i class="fa-light fa-check mdl-background-toolbar-check"></i>' : "";
                el[0].innerHTML = `<div class="mdl-dropdown-list-item"><i class="dx-icon ${data.icon}"></i><span class="mdl-dropdown-list-label">${data.text}</span>${check}</div>`;
            },
            onItemClick: e => {
                this.shell.setPropertyCommand("educationLevel", e.itemData.key);
                this.refreshThemeControls();
                this.getDropDownButtonInstance(this._themeDropdownElement)?.close();
            }
        }).dxList("instance");
    }

    refreshThemeControls() {
        const buttonContentElement = this._themeDropdownElement?.find(".dx-button-content")[0];
        if (buttonContentElement)
            this.renderThemeButtonTemplate(buttonContentElement);
        this._themeList?.option("dataSource", this.getThemeMenuItems());
    }

    createBackgroundColorItem() {
        return {
            location: "center",
            template: () => {
                this._backgroundColorPicker = this.colorControl.createEditor(this.shell.properties.backgroundColor, value => this.shell.setPropertyCommand("backgroundColor", value));
                Utils.createTranslatedTooltip({ component: { element: () => this._backgroundColorPicker } }, "Model Background Color Tooltip", this.translations, 280);
                return this._backgroundColorPicker;
            }
        };
    }

    createBackgroundPickerItem() {
        return {
            location: "center",
            template: () => {
                this._backgroundDropdownElement = $('<div class="mdl-bg-selector">');
                this._backgroundDropdownElement.dxDropDownButton({
                    showArrowIcon: false,
                    stylingMode: "text",
                    useSelectMode: false,
                    onInitialized: e => this.shell.createTranslatedTooltip(e, "Model Background Tooltip", 280),
                    template: (data, element) => {
                        element[0].innerHTML = '<span class="mdl-focused-toolbar-button"><i class="fa-light fa-image"></i></span>';
                    },
                    dropDownOptions: {
                        container: document.body,
                        wrapperAttr: { class: "mdl-shape-overlay-popup" },
                        width: 320,
                        contentTemplate: contentElement => this.buildBackgroundMenuContent(contentElement)
                    }
                });
                return this._backgroundDropdownElement;
            }
        };
    }

    buildBackgroundMenuContent(contentElement) {
        const container = document.createElement("div");
        container.className = "mdl-bg-picker";
        const currentId = this.shell.properties.backgroundId || "";
        const noneSelected = !currentId ? " selected" : "";
        container.innerHTML = `
            <div class="mdl-bg-picker-card${noneSelected}" data-bg-id="">
                <div class="mdl-bg-picker-thumb mdl-bg-picker-none"><i class="fa-light fa-xmark"></i></div>
                <div class="mdl-bg-picker-label">${this.translations.get("None") ?? "None"}</div>
            </div>
            ${BACKGROUNDS.map(bg => {
                const selected = bg.id === currentId ? " selected" : "";
                return `<div class="mdl-bg-picker-card${selected}" data-bg-id="${bg.id}">
                    <div class="mdl-bg-picker-thumb">${bg.thumbnail_svg}</div>
                    <div class="mdl-bg-picker-label">${bg.title}</div>
                </div>`;
            }).join("")}`;
        container.addEventListener("click", event => {
            const card = event.target.closest(".mdl-bg-picker-card");
            if (!card)
                return;
            container.querySelectorAll(".mdl-bg-picker-card").forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            this.shell.setPropertyCommand("backgroundId", card.dataset.bgId);
        });
        this._backgroundPickerContainer = container;
        $(contentElement).empty().append(container);
    }

    refreshBackgroundPickerSelection() {
        if (!this._backgroundPickerContainer)
            return;
        const currentId = this.shell.properties.backgroundId || "";
        this._backgroundPickerContainer.querySelectorAll(".mdl-bg-picker-card").forEach(card => {
            card.classList.toggle("selected", card.dataset.bgId === currentId);
        });
    }

    getDropDownButtonInstance(element) {
        const hostElement = element?.[0] ?? element;
        if (!(hostElement instanceof Element))
            return null;
        return window.DevExpress?.ui?.dxDropDownButton?.getInstance(hostElement) ?? null;
    }

    toggle(point) {
        if (this.isVisible())
            this.hide();
        else
            this.show(point);
    }

    show(point) {
        if (!this.shell.board.isModelCreator())
            return;
        if (document.body.classList.contains("read-only"))
            return;
        this.refresh();
        this.host.classList.add("visible");
        requestAnimationFrame(() => requestAnimationFrame(() => this.position(point)));
    }

    hide() {
        this.host.classList.remove("visible");
    }

    isVisible() {
        return this.host.classList.contains("visible");
    }

    refresh() {
        this._nameTextBox?.option("value", this.shell.properties.name);
        if (this._backgroundColorPicker)
            this.colorControl.refreshColorPickerButtonTemplate(this._backgroundColorPicker, this.shell.properties.backgroundColor);
        this.refreshThemeControls();
        this.refreshBackgroundPickerSelection();
    }

    position(point) {
        if (!point)
            return;
        const rect = this.host.getBoundingClientRect();
        const width = rect.width || this.host.offsetWidth || 0;
        const height = rect.height || this.host.offsetHeight || 0;
        const padding = 8;
        let left = point.clientX - width / 2;
        let top = point.clientY + padding;
        left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - height - padding));
        this.host.style.left = `${left}px`;
        this.host.style.top = `${top}px`;
    }
}
