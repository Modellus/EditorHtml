class MediaNotebookShape extends NotebookShape {
    renderContentHtml() {
        return `<div id="${this.getHostId()}" class="notebook-media-control"></div>`;
    }

    mount(contentElement, dragHandleElement) {
        super.mount(contentElement, dragHandleElement);
        const mediaContainer = contentElement.querySelector(`#${this.getHostId()}`);
        if (!mediaContainer)
            return;
        this.imageControl = new ImageControl({
            imageSource: this.block.content || "",
            onImageChanged: (url, mimeType) => this.onImageChanged(url, mimeType),
            onImageCleared: () => this.onImageCleared()
        });
        $(mediaContainer).append(this.imageControl.createHost());
    }

    onImageChanged(url, mimeType) {
        this.block.content = url;
        this.block.mimeType = mimeType;
        this.markChanged();
    }

    onImageCleared() {
        this.block.content = "";
        this.block.mimeType = "";
        this.markChanged();
    }
}

BlocksRegistry.register("media", {
    defaultContent: "",
    createShape: (notebookEditor, block) => new MediaNotebookShape(notebookEditor, block)
});

var MediaBlock = MediaNotebookShape;
