class ImageControl {
    constructor(options = {}) {
        this.options = {
            imageSource: "",
            dropHint: "Drop an image or click to select",
            onUploadFile: null,
            onImageChanged: null,
            onImageCleared: null,
            ...options
        };
        this.currentImageSource = this.normalizeImageSource(this.options.imageSource);
        this.container = null;
        this.previewElement = null;
        this.hintElement = null;
        this.removeButtonElement = null;
    }

    createHost() {
        this.container = $("<div class='shape-image-dropzone'></div>");
        const preview = $("<img class='shape-image-dropzone__preview' alt='Body image preview' />");
        const hint = $("<div class='shape-image-dropzone__hint'></div>").text(this.options.dropHint);
        const removeButton = $("<button type='button' class='shape-image-dropzone__remove' aria-label='Remove image'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
        const uploaderHost = $("<div class='shape-image-dropzone__uploader'></div>");
        this.previewElement = preview.get(0);
        this.hintElement = hint.get(0);
        this.removeButtonElement = removeButton.get(0);
        this.updatePreview();
        this.container.append(preview, hint, removeButton, uploaderHost);
        removeButton.on("mousedown", event => this.onRemoveButtonMouseDown(event));
        removeButton.on("click", event => this.onRemoveButtonClick(event));
        this.container.on("dragover", event => this.onDropZoneDragOver(event));
        this.container.on("drop", event => this.onDropZoneDrop(event));
        uploaderHost.dxFileUploader({
            accept: "image/*",
            multiple: false,
            uploadMode: "useForm",
            dropZone: this.container.get(0),
            dialogTrigger: this.container.get(0),
            onValueChanged: event => this.onUploaderValueChanged(event),
            onDropZoneEnter: event => this.onDropZoneEnter(event),
            onDropZoneLeave: event => this.onDropZoneLeave(event)
        });
        return this.container;
    }

    setImageSource(imageSource) {
        this.currentImageSource = this.normalizeImageSource(imageSource);
        this.updatePreview();
    }

    normalizeImageSource(imageSource) {
        if (typeof imageSource !== "string")
            return "";
        return imageSource.trim();
    }

    updatePreview() {
        if (!this.previewElement || !this.hintElement || !this.removeButtonElement)
            return;
        if (this.currentImageSource !== "") {
            this.previewElement.setAttribute("src", this.currentImageSource);
            this.hintElement.style.display = "none";
            this.removeButtonElement.style.display = "flex";
            return;
        }
        this.previewElement.removeAttribute("src");
        this.hintElement.style.display = "";
        this.removeButtonElement.style.display = "none";
    }

    onRemoveButtonMouseDown(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    onRemoveButtonClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.currentImageSource = "";
        this.updatePreview();
        const onImageCleared = this.options.onImageCleared;
        if (typeof onImageCleared === "function")
            onImageCleared();
    }

    onDropZoneEnter(event) {
        const dropZoneElement = this.toDomElement(event.dropZoneElement);
        if (!dropZoneElement)
            return;
        dropZoneElement.classList.add("drag-over");
    }

    onDropZoneLeave(event) {
        const dropZoneElement = this.toDomElement(event.dropZoneElement);
        if (!dropZoneElement)
            return;
        dropZoneElement.classList.remove("drag-over");
    }

    onDropZoneDragOver(event) {
        const dragEvent = this.toNativeDragEvent(event);
        if (!dragEvent)
            return;
        dragEvent.preventDefault();
        dragEvent.stopPropagation();
        if (dragEvent.dataTransfer)
            dragEvent.dataTransfer.dropEffect = "copy";
    }

    async onDropZoneDrop(event) {
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
        await this.handleFile(file);
    }

    async onUploaderValueChanged(event) {
        const file = event.value && event.value[0];
        if (!file)
            return;
        await this.handleFile(file);
    }

    async handleFile(file) {
        const onUploadFile = this.options.onUploadFile;
        if (typeof onUploadFile !== "function")
            return;
        const imageSource = await onUploadFile(file);
        if (!imageSource)
            return;
        this.currentImageSource = this.normalizeImageSource(imageSource);
        this.updatePreview();
        const onImageChanged = this.options.onImageChanged;
        if (typeof onImageChanged === "function")
            onImageChanged(this.currentImageSource);
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
}
