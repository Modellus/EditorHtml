class MindMapNodeShape extends BaseShape {
    setDefaults() {
        super.setDefaults();
        this.properties.width = 180;
        this.properties.height = 100;
        const center = this.board.getClientCenter();
        this.properties.x = center.x - this.properties.width / 2;
        this.properties.y = center.y - this.properties.height / 2;
        this.properties.text = "";
        this.properties.textColor = "#000000";
        this.properties.fontSize = 16;
        this.properties.lineWidth = 2;
        this.properties.foregroundColor = this.board.theme.getRandomStrokeColor();
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[2].color;
    }

    getMinimumDrawSize() {
        return { width: 180, height: 100 };
    }

    getBodyTag() {
        return "rect";
    }

    getTextInset() {
        return { horizontal: 12, vertical: 10 };
    }

    getResizeHandleBounds() {
        const position = this.getBoardPosition();
        return { x: position.x, y: position.y, width: this.properties.width, height: this.properties.height };
    }

    getAdditionalHandles() {
        return [];
    }

    getHandles() {
        const handles = super.getHandles();
        const handleRadius = 4;
        const topLeftHandle = handles.find(handle => handle.className.includes("top-left"));
        const topRightHandle = handles.find(handle => handle.className.includes("top-right"));
        const bottomLeftHandle = handles.find(handle => handle.className.includes("bottom-left"));
        const bottomRightHandle = handles.find(handle => handle.className.includes("bottom-right"));
        topLeftHandle.getAttributes = () => {
            const bounds = this.getResizeHandleBounds();
            return { cx: bounds.x, cy: bounds.y, r: handleRadius };
        };
        topRightHandle.getAttributes = () => {
            const bounds = this.getResizeHandleBounds();
            return { cx: bounds.x + bounds.width, cy: bounds.y, r: handleRadius };
        };
        bottomLeftHandle.getAttributes = () => {
            const bounds = this.getResizeHandleBounds();
            return { cx: bounds.x, cy: bounds.y + bounds.height, r: handleRadius };
        };
        bottomRightHandle.getAttributes = () => {
            const bounds = this.getResizeHandleBounds();
            return { cx: bounds.x + bounds.width, cy: bounds.y + bounds.height, r: handleRadius };
        };
        return handles.concat(this.getAdditionalHandles());
    }

    showHandles() {
        super.showHandles();
        this.handleElements.forEach(handle => {
            if (!handle.classList.contains("move"))
                handle.setAttribute("visibility", "visible");
        });
    }

    createElement() {
        const { group } = this.createForeignObjectGroup();
        this.bodyElement = this.board.createSvgElement(this.getBodyTag());
        group.insertBefore(this.bodyElement, this.foreignObject);
        this.createTextElements();
        return group;
    }

    createTextElements() {
        this.foreignObject.setAttribute("pointer-events", "none");
        const textHost = $(`<div class="mdl-mindmap-text-host"><div class="mdl-mindmap-text" contenteditable="false"></div></div>`).appendTo(this.foreignObject);
        this.textHost = textHost.get(0);
        this.textElement = this.textHost.firstElementChild;
        this.textElement.addEventListener("input", () => this.onTextInput());
    }

    onTextInput() {
        this._editedText = this.textElement.textContent;
    }

    enterEditMode() {
        this._editedText = this.properties.text;
        this._isEditingText = true;
        this.foreignObject.setAttribute("pointer-events", "all");
        this.textElement.setAttribute("contenteditable", "true");
        this.textHost.style.cursor = "text";
        this.board.pointerLocked = true;
        document.addEventListener("mousedown", this._onDocumentMouseDown);
        this.textElement.focus();
        document.getSelection().selectAllChildren(this.textElement);
        return true;
    }

    exitEditMode() {
        this._isEditingText = false;
        this.foreignObject.setAttribute("pointer-events", "none");
        this.textElement.setAttribute("contenteditable", "false");
        this.textHost.style.cursor = "";
        this.board.pointerLocked = false;
        this.textElement.blur();
        super.exitEditMode();
        const editedText = this._editedText;
        this._editedText = null;
        if (editedText != null && editedText !== this.properties.text)
            this.setPropertyCommand("text", editedText);
    }

    supportsConnectorAttachment() {
        return !this.isLocked();
    }

    getSelectionOutlinePrimitives() {
        const position = this.getBoardPosition();
        return [{
            tag: "rect",
            mode: "fill",
            attributes: { x: position.x, y: position.y, width: this.properties.width, height: this.properties.height }
        }];
    }

    draw() {
        this.applyForeignObjectLayout();
        super.draw();
        this.drawBody();
        this.drawText();
    }

    drawBody() {
        this.bodyElement.setAttribute("x", 0);
        this.bodyElement.setAttribute("y", 0);
        this.bodyElement.setAttribute("width", this.properties.width);
        this.bodyElement.setAttribute("height", this.properties.height);
        this.applyBodyStyle();
    }

    applyBodyStyle() {
        this.bodyElement.setAttribute("fill", this.properties.backgroundColor ?? "transparent");
        this.bodyElement.setAttribute("stroke", this.getBorderColor());
        this.bodyElement.setAttribute("stroke-width", this.properties.lineWidth);
    }

    drawText() {
        const inset = this.getTextInset();
        this.textHost.style.padding = `${inset.vertical}px ${inset.horizontal}px`;
        this.textElement.style.color = this.properties.textColor;
        this.textElement.style.fontSize = `${this.properties.fontSize}px`;
        if (this._isEditingText)
            return;
        if (this.textElement.textContent !== this.properties.text)
            this.textElement.textContent = this.properties.text;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapNodeShape;
