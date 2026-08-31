export const maxGroupImageBytes = 5 * 1024 * 1024;

const groupImageTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"];

export function isGroupImage(file) {
    return groupImageTypes.includes(String(file.type).toLowerCase());
}

export class ImageDropTarget {
    constructor(element, onFile, onMessage) {
        this.element = element;
        this.onFile = onFile;
        this.onMessage = onMessage;
        this.dragDepth = 0;
        this.input = document.createElement("input");
        this.input.type = "file";
        this.input.accept = groupImageTypes.join(",");
        this.input.hidden = true;
        this.element.appendChild(this.input);
        this.bind();
    }

    static carriesFiles(event) {
        return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    bind() {
        this.element.addEventListener("click", event => this.onClick(event));
        this.input.addEventListener("change", () => {
            this.take(this.input.files[0]);
            this.input.value = "";
        });
        this.element.addEventListener("dragenter", event => this.onDragEnter(event));
        this.element.addEventListener("dragover", event => this.onDragOver(event));
        this.element.addEventListener("dragleave", event => this.onDragLeave(event));
        this.element.addEventListener("drop", event => this.onDrop(event));
    }

    onClick(event) {
        if (event.target.closest("[data-clear-image]"))
            return;
        this.input.click();
    }

    onDragEnter(event) {
        if (!ImageDropTarget.carriesFiles(event))
            return;
        event.preventDefault();
        this.dragDepth += 1;
        this.element.classList.add("is-dragging");
    }

    onDragOver(event) {
        if (!ImageDropTarget.carriesFiles(event))
            return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    }

    onDragLeave(event) {
        if (!ImageDropTarget.carriesFiles(event))
            return;
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (this.dragDepth === 0)
            this.element.classList.remove("is-dragging");
    }

    onDrop(event) {
        if (!ImageDropTarget.carriesFiles(event))
            return;
        event.preventDefault();
        this.dragDepth = 0;
        this.element.classList.remove("is-dragging");
        this.take(event.dataTransfer.files[0]);
    }

    take(file) {
        if (!file)
            return;
        if (!isGroupImage(file)) {
            this.onMessage(`${file.name} is not a picture this takes. Use a PNG, JPEG, GIF, WebP or AVIF.`);
            return;
        }
        if (file.size > maxGroupImageBytes) {
            this.onMessage(`${file.name} is larger than 5 MB.`);
            return;
        }
        this.onFile(file);
    }
}
