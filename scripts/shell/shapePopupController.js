class ShapePopupController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.selectionEnabled = true;
        this.pendingShape = null;
        this.pendingOptions = null;
        this.selectionFrame = null;
        this.shapeForm = null;
        this._create();
    }

    _create() {
        let savedPosition = null;
        let savedSize = { width: 240, height: 400 };
        try {
            const stored = localStorage.getItem("modellus.shapePopupState");
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.position)
                    savedPosition = parsed.position;
                if (parsed && parsed.size)
                    savedSize = parsed.size;
            }
        } catch (error) {
        }
        $("#shape-popup").dxPopup({
            width: savedSize.width,
            height: savedSize.height,
            shading: false,
            showTitle: true,
            dragEnabled: true,
            resizeEnabled: true,
            hideOnOutsideClick: false,
            focusStateEnabled: false,
            animation: null,
            title: this.shell.board.translations.get("Properties Title"),
            target: "#svg",
            position: {
                my: "left center",
                at: "left center",
                of: "#svg",
                offset: "20, 0"
            },
            onInitialized(e) {
                this.shapePopup = e.component;
            },
            onPositioned: e => {
                const $content = e.component.content();
                const $overlay = $content.closest(".dx-overlay-content");
                const rect = $overlay.length ? $overlay.get(0).getBoundingClientRect() : null;
                if (rect) {
                    savedPosition = { left: rect.left, top: rect.top };
                    savedSize = { width: rect.width, height: rect.height };
                }
                try {
                    localStorage.setItem("modellus.shapePopupState", JSON.stringify({
                        position: savedPosition,
                        size: savedSize
                    }));
                } catch (error) {
                }
            },
            onHiding: e => {
                const $content = e.component.content();
                const $overlay = $content.closest(".dx-overlay-content");
                const rect = $overlay.length ? $overlay.get(0).getBoundingClientRect() : null;
                if (rect) {
                    savedPosition = { left: rect.left, top: rect.top };
                    savedSize = { width: rect.width, height: rect.height };
                }
                try {
                    localStorage.setItem("modellus.shapePopupState", JSON.stringify({
                        position: savedPosition,
                        size: savedSize
                    }));
                } catch (error) {
                }
            },
            onShowing: e => {
                if (savedPosition) {
                    e.component.option("position", {
                        my: "top left",
                        at: "top left",
                        of: window,
                        offset: `${savedPosition.left} ${savedPosition.top}`
                    });
                    if (savedSize && savedSize.width && savedSize.height) {
                        e.component.option("width", savedSize.width);
                        e.component.option("height", savedSize.height);
                    }
                }
            },
            onShown: e => {
                if (savedSize && savedSize.width && savedSize.height) {
                    e.component.option("width", savedSize.width);
                    e.component.option("height", savedSize.height);
                }
            }
        });
        this.popup = $("#shape-popup").dxPopup("instance");
    }

    shouldShowOnSelection(forceShowProperties = false) {
        return forceShowProperties || this.selectionEnabled;
    }

    select(shape, { forceShowProperties = false } = {}) {
        if (window.modellusReadOnly)
            return;
        this.shell.topToolbar.update();
        this.shapeForm = null;
        if (!this.shouldShowOnSelection(forceShowProperties)) {
            this.popup.hide();
            return;
        }
        const form = shape.getForm();
        if (form == null) {
            this.popup.hide();
            return;
        }
        this.shapeForm = form.dxForm("instance");
        this.popup.content().empty();
        this.popup.content().append(form);
        this.popup.show();
    }

    scheduleSelection(shape, { forceShowProperties = false } = {}) {
        this.pendingShape = shape;
        this.pendingOptions = { forceShowProperties };
        if (this.selectionFrame != null)
            cancelAnimationFrame(this.selectionFrame);
        this.selectionFrame = requestAnimationFrame(() => {
            this.selectionFrame = null;
            const pendingShape = this.pendingShape;
            const pendingOptions = this.pendingOptions ?? { forceShowProperties: false };
            this.pendingShape = null;
            this.pendingOptions = null;
            if (!pendingShape)
                return;
            this.select(pendingShape, pendingOptions);
        });
    }

    deselect({ skipBoard = false } = {}) {
        this.pendingShape = null;
        this.pendingOptions = null;
        if (this.selectionFrame != null) {
            cancelAnimationFrame(this.selectionFrame);
            this.selectionFrame = null;
        }
        if (!skipBoard && this.shell.board?.selection?.selectedShape)
            this.shell.board.selection.deselect();
        this.shell.topToolbar.update();
        this.popup.hide();
    }

    toggleSelectionEnabled() {
        this.selectionEnabled = !this.selectionEnabled;
        this.shell.bottomToolbar.updatePropertiesPopupToggleButton();
        const selectedShape = this.shell.board.selection.selectedShape;
        if (!selectedShape) {
            this.popup.hide();
            return;
        }
        if (this.selectionEnabled) {
            this.scheduleSelection(selectedShape, { forceShowProperties: true });
            return;
        }
        this.popup.hide();
    }
}
