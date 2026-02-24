class BodyShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, parent, id);
    }

    createTransformer() { 
        return new CircleTransformer(this.board, this);
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        this.addTerm("xTerm", "x", "Horizontal", false, true, 1, "x");
        this.addTerm("yTerm", "y", "Vertical", true, true, 1, "y");
        items.push(
            {
                colSpan: 2,
                dataField: "trajectoryColor",
                label: { text: "Trajectory color" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    onContentReady: function(e) {
                        e.component.option("items").forEach((item, index) => {
                            const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                            buttonElement.find(".dx-icon").css("color", item.color == "#00000000" ? "#cccccc" : item.color);
                        });
                    },
                    items: this.board.theme.getBackgroundColors().map(c => ({
                        icon: "fa-solid " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                        color: c.color
                    })),
                    keyExpr: "color",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.trajectoryColor],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("trajectoryColor", e.itemData.color);
                        this.setProperty("trajectoryColor", e.itemData.color);
                    }
              }
            },
            {
                colSpan: 2,
                dataField: "stroboscopyColor",
                label: { text: "Stroboscopy color" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    onContentReady: function(e) {
                        e.component.option("items").forEach((item, index) => {
                            const buttonElement = e.element.find(`.dx-button:eq(${index})`);
                            buttonElement.find(".dx-icon").css("color", item.color == "#00000000" ? "#cccccc" : item.color);
                        });
                    },
                    items: this.board.theme.getBackgroundColors().map(c => ({
                        icon: "fa-solid " + (c.color == "#00000000" ? "fa-square-dashed" : "fa-square"),
                        color: c.color
                    })),
                    keyExpr: "color",
                    stylingMode: "text",
                    selectedItemKeys: [this.properties.stroboscopyColor],
                    onItemClick: e => {
                        let formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("stroboscopyColor", e.itemData.color);
                        this.setProperty("stroboscopyColor", e.itemData.color);
                    }
                }
            },
            {
                colSpan: 1,
                dataField: "stroboscopyInterval",
                label: { text: "Interval" },
                editorType: "dxNumberBox",
                editorOptions: {
                    showSpinButtons: true,
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 1,
                dataField: "stroboscopyOpacity",
                label: { text: "Opacity" },
                editorType: "dxNumberBox",
                editorOptions: {
                    showSpinButtons: true,
                    step: 0.1,
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 2,
                label: { text: "File" },
                template: _ => this.createImageDropZoneEditor()
            }
        );
        instance.option("items", items);
        return form;
    }

    createImageDropZoneEditor() {
        const container = $("<div class='shape-image-dropzone'></div>");
        const preview = $("<img class='shape-image-dropzone__preview' alt='Body image preview' />");
        const hint = $("<div class='shape-image-dropzone__hint'></div>").text("Drop an image or click to select");
        const removeButton = $("<button type='button' class='shape-image-dropzone__remove' aria-label='Remove image'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
        const uploaderHost = $("<div class='shape-image-dropzone__uploader'></div>");
        const dropZoneElement = container.get(0);
        const previewElement = preview.get(0);
        const hintElement = hint.get(0);
        const removeButtonElement = removeButton.get(0);
        this.updateImageDropZonePreview(previewElement, hintElement, removeButtonElement, this.getImageSource());
        container.append(preview, hint, removeButton, uploaderHost);
        removeButton.on("mousedown", event => this.onImageRemoveButtonMouseDown(event));
        removeButton.on("click", event => this.onImageRemoveButtonClick(event, previewElement, hintElement, removeButtonElement));
        container.on("dragover", e => this.onImageDropZoneDragOver(e));
        container.on("drop", e => this.onImageDropZoneDrop(e, previewElement, hintElement, removeButtonElement));
        uploaderHost.dxFileUploader({
            accept: "image/*",
            multiple: false,
            uploadMode: "useForm",
            dropZone: dropZoneElement,
            dialogTrigger: dropZoneElement,
            onValueChanged: e => this.onImageUploaderValueChanged(e, previewElement, hintElement, removeButtonElement),
            onDropZoneEnter: e => this.onImageDropZoneEnter(e),
            onDropZoneLeave: e => this.onImageDropZoneLeave(e)
        });
        return container;
    }

    async onImageUploaderValueChanged(event, previewElement, hintElement, removeButtonElement) {
        const file = event.value && event.value[0];
        if (!file)
            return;
        await this.setImageFromFile(file, previewElement, hintElement, removeButtonElement);
    }

    async setImageFromFile(file, previewElement, hintElement, removeButtonElement) {
        const imageUrl = await this.uploadAsset(file);
        if (!imageUrl)
            return;
        this.properties.imageBase64 = "";
        this.setProperty("imageUrl", imageUrl);
        this.updateImageDropZonePreview(previewElement, hintElement, removeButtonElement, imageUrl);
    }

    updateImageDropZonePreview(previewElement, hintElement, removeButtonElement, imageSource) {
        if (!previewElement || !hintElement || !removeButtonElement)
            return;
        if (imageSource) {
            previewElement.setAttribute("src", imageSource);
            hintElement.style.display = "none";
            removeButtonElement.style.display = "flex";
            return;
        }
        previewElement.removeAttribute("src");
        hintElement.style.display = "";
        removeButtonElement.style.display = "none";
    }

    onImageRemoveButtonMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    onImageRemoveButtonClick(event, previewElement, hintElement, removeButtonElement) {
        event.preventDefault();
        event.stopPropagation();
        this.clearImage(previewElement, hintElement, removeButtonElement);
    }

    clearImage(previewElement, hintElement, removeButtonElement) {
        this.properties.imageBase64 = "";
        this.setProperty("imageUrl", "");
        this.updateImageDropZonePreview(previewElement, hintElement, removeButtonElement, "");
    }

    onImageDropZoneEnter(event) {
        const dropZoneElement = this.toDomElement(event.dropZoneElement);
        if (!dropZoneElement)
            return;
        dropZoneElement.classList.add("drag-over");
    }

    onImageDropZoneLeave(event) {
        const dropZoneElement = this.toDomElement(event.dropZoneElement);
        if (!dropZoneElement)
            return;
        dropZoneElement.classList.remove("drag-over");
    }

    onImageDropZoneDragOver(event) {
        const dragEvent = this.toNativeDragEvent(event);
        if (!dragEvent)
            return;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        if (dragEvent.dataTransfer)
            dragEvent.dataTransfer.dropEffect = "copy";
    }

    async onImageDropZoneDrop(event, previewElement, hintElement, removeButtonElement) {
        const dragEvent = this.toNativeDragEvent(event);
        if (!dragEvent)
            return;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        const dropZoneElement = this.toDomElement(dragEvent.currentTarget);
        if (dropZoneElement)
            dropZoneElement.classList.remove("drag-over");
        const file = dragEvent.dataTransfer?.files?.[0];
        if (!file)
            return;
        await this.setImageFromFile(file, previewElement, hintElement, removeButtonElement);
    }

    getImageSource() {
        const imageUrl = this.properties.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.trim() !== "")
            return imageUrl;
        const imageBase64 = this.properties.imageBase64;
        if (typeof imageBase64 === "string" && imageBase64.trim() !== "")
            return `data:image/png;base64,${imageBase64}`;
        return "";
    }

    getCurrentModelId() {
        return new URLSearchParams(window.location.search).get("model_id");
    }

    getApiBaseUrl() {
        if (typeof apiBase === "string" && apiBase)
            return apiBase;
        return "https://modellus-api.interactivebook.workers.dev";
    }

    getAssetUploadUrl() {
        const modelId = this.getCurrentModelId();
        if (!modelId)
            return null;
        return `${this.getApiBaseUrl()}/models/${encodeURIComponent(modelId)}/assets`;
    }

    getApiHeaders() {
        if (typeof getAuthHeaders === "function")
            return getAuthHeaders();
        const headers = {};
        const session = window.modellus?.auth?.getSession ? window.modellus.auth.getSession() : null;
        if (session && session.token)
            headers.Authorization = `Bearer ${session.token}`;
        return headers;
    }

    async uploadAsset(file) {
        const uploadUrl = this.getAssetUploadUrl();
        if (!uploadUrl) {
            this.showUploadError("Open a saved model before uploading assets.");
            return null;
        }
        const formData = new FormData();
        formData.append("id", this.id);
        formData.append("file", file);
        try {
            const response = await fetch(uploadUrl, {
                method: "POST",
                headers: this.getApiHeaders(),
                body: formData
            });
            if (!response.ok)
                throw new Error(await this.getUploadError(response));
            const payload = await response.json();
            const imageUrl = payload?.url;
            if (!imageUrl)
                throw new Error("The API did not return an asset URL.");
            return imageUrl;
        } catch (error) {
            this.showUploadError(error?.message || "Failed to upload asset.");
            return null;
        }
    }

    async getUploadError(response) {
        try {
            const payload = await response.json();
            if (payload?.error)
                return payload.error;
        } catch (_) {}
        return `Upload failed (${response.status})`;
    }

    showUploadError(message) {
        if (window.DevExpress?.ui?.notify)
            window.DevExpress.ui.notify(message, "error", 3000);
    }

    toNativeDragEvent(event) {
        if (!event)
            return null;
        if (event.originalEvent)
            return event.originalEvent;
        return event;
    }

    toDomElement(element) {
        if (!element)
            return null;
        if (element instanceof HTMLElement)
            return element;
        if (element.get && element.get(0) instanceof HTMLElement)
            return element.get(0);
        if (element[0] instanceof HTMLElement)
            return element[0];
        return null;
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.circle = this.board.createSvgElement("circle");
        element.appendChild(this.circle);
        this.image = this.board.createSvgElement("image");
        this.image.setAttribute("pointer-events", "none");
        element.appendChild(this.image);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        element.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        element.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        this.properties.xTerm = "0";
        this.properties.yTerm = "0";
        this.properties.name = this.board.translations.get("Body Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.angle = 0;
        this.properties.width = 10;
        this.properties.height = 10;
        this.properties.radius = (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5;
        this.properties.backgroundColor = this.board.theme.getBackgroundColors()[3].color;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[3].color;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyInterval = 10;
        this.properties.stroboscopyOpacity = 0.5;
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
    }

    update() {
        super.update();
        const imageSource = this.getImageSource();
        if (imageSource != "")
            this.image.setAttribute("href", imageSource);
        else
            this.image.removeAttribute("href");
    }

    draw() {
        super.draw();
        this.drawShape();
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 0;
        const diameter = radius * 2;
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", this.properties.backgroundColor);
        this.circle.setAttribute("stroke", this.properties.foregroundColor);
        this.image.setAttribute("x", position.x - radius);
        this.image.setAttribute("y", position.y - radius);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid meet");
    }

    tick() {
        super.tick();
        this.tickShape();
        this.tickTrajectory();
        this.tickStroboscopy();
        this.board.markDirty(this);
    }

    tickShape() {
        const scale = this.getScale();
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const x = this.resolveTermNumeric(this.properties.xTerm, xCase);
        this.properties.x = scale.x !== 0 ? x / scale.x : 0;
        const y = -this.resolveTermNumeric(this.properties.yTerm, yCase);
        this.properties.y = scale.y !== 0 ? y / scale.y : 0;
    }

    tickTrajectory() {
        const lastIteration = this.board.calculator.getLastIteration();
        this.trajectory.values = this.trajectory.values.slice(0, lastIteration);
        if (this.trajectory.values.length <= lastIteration) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x, y: position.y });
        }
        const currentCount = this.trajectory.values.length;
        if (currentCount !== this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = currentCount;
        }
    }

    tickStroboscopy() {
        const defaultStrobeColor = this.board.theme.getBackgroundColors()[0].color;
        if (this.properties.stroboscopyColor === defaultStrobeColor) {
            this._stroboscopyPositions = [];
            return;
        }
        const lastIteration = this.board.calculator.getLastIteration();
        if (lastIteration === 0)
            this._stroboscopyPositions = [];
        const interval = Math.max(1, this.properties.stroboscopyInterval);
        const desired = Math.floor(lastIteration / interval);
        const positions = [];
        for (let i = 0; i < desired; i++) {
            const idx = i * interval;
            const pos = this.trajectory.values[idx] ?? this.getBoardPosition();
            positions.push(pos);
        }
        this._stroboscopyPositions = positions;
    }

    drawTrajectory() {
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    drawStroboscopy() {
        const defaultStrobeColor = this.board.theme.getBackgroundColors()[0].color;
        if (this.properties.stroboscopyColor === defaultStrobeColor) {
            while (this.stroboscopy.firstChild)
                this.stroboscopy.removeChild(this.stroboscopy.firstChild);
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        while (this.stroboscopy.children.length > desiredLength)
            this.stroboscopy.removeChild(this.stroboscopy.lastChild);
        for (let i = 0; i < desiredLength; i++) {
            const pos = positions[i];
            let circle = this.stroboscopy.children[i];
            if (!circle) {
                circle = this.board.createSvgElement("circle");
                this.stroboscopy.appendChild(circle);
            }
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", this.properties.radius);
            circle.setAttribute("fill", this.properties.stroboscopyColor);
            circle.setAttribute("opacity", this.properties.stroboscopyOpacity);
        }
    }
}
