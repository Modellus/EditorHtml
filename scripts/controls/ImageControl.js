class ImageControl {
    constructor(options = {}) {
        this.options = {
            imageSource: "",
            dropHint: "Drop, paste or click to select an image",
            accept: "image/*",
            onUploadFile: null,
            onImageChanged: null,
            onImageCleared: null,
            onImageTransformChanged: null,
            ...options
        };
        this.currentImageSource = this.normalizeImageSource(this.options.imageSource);
        this.currentIsVideo = false;
        this._thumbnailCapturedFor = null;
        this.container = null;
        this.previewElement = null;
        this.hintElement = null;
        this.removeButtonElement = null;
        this.progressBarElement = null;
        this._fileInput = null;
        this._translateX = 0;
        this._translateY = 0;
        this._zoomLevel = 1;
        this._isDraggingImage = false;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._dragStartTranslateX = 0;
        this._dragStartTranslateY = 0;
        this._boundDocumentPaste = null;
    }

    createHost() {
        this.container = $("<div class='shape-image-dropzone' tabindex='0'></div>");
        const preview = $("<img class='shape-image-dropzone__preview' alt='Body image preview' />");
        const hint = $("<div class='shape-image-dropzone__hint'></div>").text(this.options.dropHint);
        const removeButton = $("<button type='button' class='shape-image-dropzone__remove' aria-label='Remove image'><i class='fa-light fa-trash-can trash'></i><i class='fa-solid fa-trash-can trash-hover'></i></button>");
        const fileInput = $(`<input type="file" accept="${this.options.accept}" style="display:none">`);
        const uploaderHost = $("<div class='shape-image-dropzone__uploader'></div>");
        const progressBarHost = $('<div class="shape-image-dropzone__progress"></div>');
        this.previewElement = preview.get(0);
        this.hintElement = hint.get(0);
        this.removeButtonElement = removeButton.get(0);
        this._fileInput = fileInput.get(0);
        this.progressBarElement = progressBarHost.get(0);
        progressBarHost.dxProgressBar({ min: 0, max: 100, value: 0, visible: false });
        this.updatePreview();
        this.container.append(preview, hint, removeButton, progressBarHost, fileInput, uploaderHost);
        removeButton.on("mousedown", event => this.onRemoveButtonMouseDown(event));
        removeButton.on("click", event => this.onRemoveButtonClick(event));
        fileInput.on("change", event => this.onFileInputChange(event));
        this.container.on("dragover", event => this.onDropZoneDragOver(event));
        this.container.on("drop", event => this.onDropZoneDrop(event));
        this.container.on("paste", event => this.onContainerPaste(event));
        this.container.get(0).addEventListener("click", event => this.onContainerClick(event), { capture: true });
        this.initializeDragBehavior();
        uploaderHost.dxFileUploader({
            accept: this.options.accept,
            multiple: false,
            uploadMode: "useForm",
            dropZone: this.container.get(0),
            onDropZoneEnter: event => this.onDropZoneEnter(event),
            onDropZoneLeave: event => this.onDropZoneLeave(event)
        });
        return this.container;
    }

    setImageSource(imageSource) {
        this.currentIsVideo = false;
        this.currentIsAudio = false;
        this.currentImageSource = this.normalizeImageSource(imageSource);
        this.updatePreview();
    }

    setVideoSource(videoUrl) {
        this.currentIsVideo = true;
        this.currentIsAudio = false;
        this.currentImageSource = this.normalizeImageSource(videoUrl);
        this.updatePreview();
    }

    setAudioSource(audioUrl) {
        this.currentIsVideo = false;
        this.currentIsAudio = true;
        this.currentImageSource = this.normalizeImageSource(audioUrl);
        this.updatePreview();
    }

    normalizeImageSource(imageSource) {
        if (typeof imageSource !== "string")
            return "";
        return imageSource.trim();
    }

    isVideoSource(source) {
        if (this.currentIsVideo)
            return true;
        return /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(source);
    }

    captureVideoFirstFrame(url) {
        const video = document.createElement("video");
        video.src = url;
        video.muted = true;
        video.preload = "metadata";
        video.crossOrigin = "anonymous";
        video.addEventListener("loadeddata", () => { video.currentTime = 0; }, { once: true });
        video.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;
            canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
            if (this.previewElement) {
                this.previewElement.setAttribute("src", canvas.toDataURL("image/jpeg", 0.85));
                this.hintElement.style.display = "none";
            }
            video.src = "";
        }, { once: true });
        video.load();
    }

    updatePreview() {
        if (!this.previewElement || !this.hintElement || !this.removeButtonElement)
            return;
        if (this.currentImageSource !== "") {
            this.removeButtonElement.style.display = "flex";
            if (this.currentIsAudio) {
                this.previewElement.removeAttribute("src");
                this.hintElement.innerHTML = "<i class='fa-light fa-music fa-2x'></i>";
                this.hintElement.style.display = "";
                return;
            }
            if (this.isVideoSource(this.currentImageSource)) {
                if (this._thumbnailCapturedFor !== this.currentImageSource) {
                    this._thumbnailCapturedFor = this.currentImageSource;
                    this.previewElement.removeAttribute("src");
                    this.hintElement.innerHTML = "<i class='fa-light fa-film fa-2x'></i>";
                    this.hintElement.style.display = "";
                    this.captureVideoFirstFrame(this.currentImageSource);
                }
                return;
            }
            this.previewElement.setAttribute("src", this.currentImageSource);
            this.hintElement.style.display = "none";
            this.applyImageTransform();
            return;
        }
        this._thumbnailCapturedFor = null;
        this.previewElement.removeAttribute("src");
        this.hintElement.textContent = this.options.dropHint;
        this.hintElement.style.display = "";
        this.removeButtonElement.style.display = "none";
    }

    onContainerClick(event) {
        if (event.target === this.removeButtonElement || this.removeButtonElement?.contains(event.target))
            return;
        if (event.target === this._fileInput)
            return;
        this._fileInput.click();
    }

    async onFileInputChange(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        event.target.value = "";
        await this.handleFile(file);
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

    activateDocumentPaste() {
        if (this._boundDocumentPaste)
            return;
        this._boundDocumentPaste = event => this.onDocumentKeyDown(event);
        document.addEventListener("keydown", this._boundDocumentPaste, { capture: true });
    }

    deactivateDocumentPaste() {
        if (!this._boundDocumentPaste)
            return;
        document.removeEventListener("keydown", this._boundDocumentPaste, { capture: true });
        this._boundDocumentPaste = null;
    }

    async onDocumentKeyDown(event) {
        if (!(event.key === "v" && (event.ctrlKey || event.metaKey)))
            return;
        const activeElement = document.activeElement;
        if (activeElement?.matches("input, textarea") || activeElement?.isContentEditable)
            return;
        let clipboardItems;
        try {
            clipboardItems = await navigator.clipboard.read();
        } catch {
            return;
        }
        for (const clipboardItem of clipboardItems) {
            const imageType = clipboardItem.types.find(type => type.startsWith("image/"));
            if (!imageType)
                continue;
            const blob = await clipboardItem.getType(imageType);
            const extension = imageType.split("/")[1] || "png";
            const file = new File([blob], `pasted-image.${extension}`, { type: imageType });
            await this.handleFile(file);
            break;
        }
    }

    async onContainerPaste(event) {
        const nativeEvent = event.originalEvent ?? event;
        const items = nativeEvent.clipboardData?.items;
        if (!items)
            return;
        const imageItem = Array.from(items).find(item => item.type.startsWith("image/"));
        if (!imageItem)
            return;
        const file = imageItem.getAsFile();
        if (!file)
            return;
        nativeEvent.preventDefault();
        await this.handleFile(file);
    }

    setProgress(percent) {
        if (!this.progressBarElement)
            return;
        const instance = $(this.progressBarElement).dxProgressBar("instance");
        if (!instance)
            return;
        instance.option("value", percent);
        instance.option("visible", true);
    }

    clearProgress() {
        if (!this.progressBarElement)
            return;
        const instance = $(this.progressBarElement).dxProgressBar("instance");
        if (!instance)
            return;
        instance.option("visible", false);
        instance.option("value", 0);
    }

    async handleFile(file) {
        const onUploadFile = this.options.onUploadFile;
        if (typeof onUploadFile !== "function")
            return;
        this.setProgress(0);
        const imageSource = await onUploadFile(file, percent => this.setProgress(percent));
        this.clearProgress();
        if (!imageSource)
            return;
        this.currentImageSource = this.normalizeImageSource(imageSource);
        this._translateX = 0;
        this._translateY = 0;
        this._zoomLevel = 1;
        this.updatePreview();
        const onImageChanged = this.options.onImageChanged;
        if (typeof onImageChanged === "function")
            onImageChanged(this.currentImageSource, file.type);
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

    initializeDragBehavior() {
        this.previewElement.addEventListener("mousedown", event => this.onPreviewMouseDown(event));
        this.previewElement.addEventListener("click", event => event.stopPropagation());
        this.previewElement.addEventListener("wheel", event => this.onPreviewWheel(event), { passive: false });
        document.addEventListener("mousemove", event => this.onDocumentMouseMove(event));
        document.addEventListener("mouseup", () => this.onDocumentMouseUp());
    }

    onPreviewMouseDown(event) {
        if (!this.currentImageSource)
            return;
        event.preventDefault();
        event.stopPropagation();
        this._isDraggingImage = true;
        this._dragStartX = event.clientX;
        this._dragStartY = event.clientY;
        this._dragStartTranslateX = this._translateX;
        this._dragStartTranslateY = this._translateY;
        this.previewElement.style.cursor = "grabbing";
    }

    onPreviewWheel(event) {
        if (!this.currentImageSource)
            return;
        event.preventDefault();
        event.stopPropagation();
        const zoomStep = 0.12;
        const direction = event.deltaY < 0 ? 1 : -1;
        this._zoomLevel = Math.max(1, this._zoomLevel + direction * zoomStep);
        this.clampTranslation();
        this.applyImageTransform();
        this.fireTransformChanged();
    }

    onDocumentMouseMove(event) {
        if (!this._isDraggingImage)
            return;
        this._translateX = this._dragStartTranslateX + (event.clientX - this._dragStartX);
        this._translateY = this._dragStartTranslateY + (event.clientY - this._dragStartY);
        this.clampTranslation();
        this.applyImageTransform();
        this.fireTransformChanged();
    }

    onDocumentMouseUp() {
        if (!this._isDraggingImage)
            return;
        this._isDraggingImage = false;
        this.previewElement.style.cursor = "";
    }

    clampTranslation() {
        const containerElement = this.container?.get(0);
        if (!containerElement)
            return;
        const maxTranslateX = (this._zoomLevel - 1) * containerElement.offsetWidth / 2;
        const maxTranslateY = (this._zoomLevel - 1) * containerElement.offsetHeight / 2;
        this._translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this._translateX));
        this._translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this._translateY));
    }

    applyImageTransform() {
        this.previewElement.style.transform = `translate(${this._translateX}px, ${this._translateY}px) scale(${this._zoomLevel})`;
    }

    fireTransformChanged() {
        const onImageTransformChanged = this.options.onImageTransformChanged;
        if (typeof onImageTransformChanged === "function")
            onImageTransformChanged(this._translateX, this._translateY, this._zoomLevel);
    }

    setImageTransform(translateX, translateY, zoomLevel) {
        this._zoomLevel = Math.max(1, zoomLevel);
        this._translateX = translateX;
        this._translateY = translateY;
        this.clampTranslation();
        this.applyImageTransform();
    }
}
