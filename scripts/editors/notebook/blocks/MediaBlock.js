class MediaNotebookShape extends NotebookShape {
    renderContentHtml() {
        return `<div id="${this.getHostId()}" class="notebook-media-control"></div>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        const mediaContainer = contentElement.querySelector(`#${this.getHostId()}`);
        if (!mediaContainer)
            return;
        this.imageControl = this.createMediaImageControl();
        $(mediaContainer).append(this.imageControl.createHost());
    }

    createMediaImageControl() {
        return new ImageControl({
            imageSource: this.getImageSource(),
            accept: "image/*,video/*,audio/*",
            dropHint: "Drop an image, video or audio, or click to select",
            onImageChanged: (url, mimeType) => this.onImageControlChanged(url, mimeType),
            onImageCleared: () => this.onImageControlCleared()
        });
    }

    createImageDropZoneEditor() {
        this.imageDropZoneControl = this.createMediaImageControl();
        return this.imageDropZoneControl.createHost();
    }

    getImageSource() {
        return this.block.content || "";
    }

    onImageControlChanged(url, mimeType) {
        this.block.mimeType = mimeType ?? "";
        this.setPropertyCommand("content", url);
        this.refreshMediaControls(url, mimeType);
    }

    onImageControlCleared() {
        this.block.mimeType = "";
        this.setPropertyCommand("content", "");
        this.refreshMediaControls("", "");
    }

    refreshMediaControls(url, mimeType) {
        for (const control of [this.imageControl, this.imageDropZoneControl]) {
            if (!control)
                continue;
            if (typeof mimeType === "string" && mimeType.startsWith("video/"))
                control.setVideoSource(url);
            else if (typeof mimeType === "string" && mimeType.startsWith("audio/"))
                control.setAudioSource(url);
            else
                control.setImageSource(url);
        }
    }

    applyCatalogImage(image) {
        this.applyCatalogAsset(image, "image/*");
    }

    applyCatalogAudio(audio) {
        this.applyCatalogAsset(audio, "audio/*");
    }

    applyCatalogVideo(video) {
        this.applyCatalogAsset(video, "video/*");
    }

    applyCatalogAsset(entry, mimeType) {
        const assetUrl = entry?.asset_url;
        if (!assetUrl)
            return;
        this.onImageControlChanged(assetUrl, mimeType);
    }
}

BlocksRegistry.register("media", {
    defaultContent: "",
    resizable: true,
    createShape: (notebookEditor, block) => new MediaNotebookShape(notebookEditor, block)
});

var MediaBlock = MediaNotebookShape;
