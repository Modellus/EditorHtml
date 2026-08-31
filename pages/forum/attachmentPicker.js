export const maxAttachmentBytes = 10 * 1024 * 1024;
export const maxAttachmentCount = 10;

const attachmentIcons = [
    { match: /^image\//, icon: "fa-light fa-image" },
    { match: /^video\//, icon: "fa-light fa-film" },
    { match: /^audio\//, icon: "fa-light fa-volume-high" },
    { match: /^application\/pdf$/, icon: "fa-light fa-file-pdf" },
    { match: /^text\/csv$|^application\/json$|^text\/tab-separated-values$/, icon: "fa-light fa-table" },
    { match: /zip|compressed|tar$/, icon: "fa-light fa-file-zipper" },
    { match: /^text\//, icon: "fa-light fa-file-lines" }
];

export function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1048576)
        return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function attachmentIcon(contentType) {
    const entry = attachmentIcons.find(candidate => candidate.match.test(String(contentType ?? "")));
    return entry ? entry.icon : "fa-light fa-paperclip";
}

export function isImageAttachment(contentType) {
    return /^image\/(png|jpeg|gif|webp|avif|bmp|svg\+xml)$/.test(String(contentType ?? ""));
}

export class AttachmentPicker {
    constructor(container, surface) {
        this.container = container;
        this.surface = surface ?? container;
        this.files = [];
        this.previews = new Map();
        this.message = "";
        this.dragDepth = 0;
        this.render();
        this.bind();
    }

    render() {
        this.container.innerHTML = `
            <div class="forum-dropzone-shell">
                <button type="button" class="forum-dropzone" data-dropzone>
                    <i class="fa-light fa-cloud-arrow-up" aria-hidden="true"></i>
                    <span class="forum-dropzone-title">Drag files here or click to choose</span>
                    <span class="forum-dropzone-hint">Up to ${maxAttachmentCount} files, ${formatFileSize(maxAttachmentBytes)} each</span>
                </button>
                <input class="forum-dropzone-input" type="file" multiple hidden />
                <div class="forum-dropzone-message" data-dropzone-message></div>
                <div class="forum-dropzone-files" data-dropzone-files></div>
            </div>`;
        this.zone = this.container.querySelector("[data-dropzone]");
        this.input = this.container.querySelector(".forum-dropzone-input");
        this.messageElement = this.container.querySelector("[data-dropzone-message]");
        this.list = this.container.querySelector("[data-dropzone-files]");
    }

    bind() {
        this.zone.addEventListener("click", () => this.input.click());
        this.input.addEventListener("change", () => {
            this.addFiles(Array.from(this.input.files));
            this.input.value = "";
        });
        this.onDragEnter = event => this.handleDragEnter(event);
        this.onDragOver = event => this.handleDragOver(event);
        this.onDragLeave = event => this.handleDragLeave(event);
        this.onDrop = event => this.handleDrop(event);
        this.surface.addEventListener("dragenter", this.onDragEnter);
        this.surface.addEventListener("dragover", this.onDragOver);
        this.surface.addEventListener("dragleave", this.onDragLeave);
        this.surface.addEventListener("drop", this.onDrop);
        this.list.addEventListener("click", event => {
            const button = event.target.closest("[data-remove]");
            if (button)
                this.removeFile(Number(button.dataset.remove));
        });
    }

    static carriesFiles(event) {
        return Array.from(event.dataTransfer?.types ?? []).includes("Files");
    }

    handleDragEnter(event) {
        if (!AttachmentPicker.carriesFiles(event))
            return;
        event.preventDefault();
        this.dragDepth += 1;
        this.zone.classList.add("is-dragging");
    }

    handleDragOver(event) {
        if (!AttachmentPicker.carriesFiles(event))
            return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        this.zone.classList.add("is-dragging");
        this.zone.classList.toggle("is-over", this.zone.contains(event.target));
    }

    handleDragLeave(event) {
        if (!AttachmentPicker.carriesFiles(event))
            return;
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        if (this.dragDepth === 0)
            this.zone.classList.remove("is-dragging", "is-over");
    }

    handleDrop(event) {
        if (!AttachmentPicker.carriesFiles(event))
            return;
        event.preventDefault();
        this.dragDepth = 0;
        this.zone.classList.remove("is-dragging", "is-over");
        this.addFiles(Array.from(event.dataTransfer.files));
    }

    addFiles(incoming) {
        const rejected = [];
        for (const file of incoming) {
            if (file.size > maxAttachmentBytes) {
                rejected.push(`${file.name} is larger than ${formatFileSize(maxAttachmentBytes)}`);
                continue;
            }
            if (this.files.some(existing => existing.name === file.name && existing.size === file.size))
                continue;
            if (this.files.length >= maxAttachmentCount) {
                rejected.push(`only ${maxAttachmentCount} files can be attached at a time`);
                break;
            }
            this.files.push(file);
        }
        this.message = rejected.length > 0 ? `Not attached: ${rejected.join("; ")}.` : "";
        this.renderFiles();
    }

    removeFile(index) {
        const [removed] = this.files.splice(index, 1);
        this.releasePreview(removed);
        this.message = "";
        this.renderFiles();
    }

    previewUrl(file) {
        if (!isImageAttachment(file.type))
            return "";
        if (!this.previews.has(file))
            this.previews.set(file, URL.createObjectURL(file));
        return this.previews.get(file);
    }

    releasePreview(file) {
        if (!this.previews.has(file))
            return;
        URL.revokeObjectURL(this.previews.get(file));
        this.previews.delete(file);
    }

    buildThumbnail(file) {
        const url = this.previewUrl(file);
        if (url)
            return `<img class="forum-attachment-thumb" src="${url}" alt="${escapeHtml(file.name)}" />`;
        return `<span class="forum-attachment-thumb is-icon"><i class="${attachmentIcon(file.type)}" aria-hidden="true"></i></span>`;
    }

    renderFiles() {
        this.messageElement.textContent = this.message;
        this.messageElement.classList.toggle("is-visible", this.message !== "");
        this.list.innerHTML = this.files.map((file, index) => `
            <div class="forum-attachment-card" data-attachment-card>
                ${this.buildThumbnail(file)}
                <span class="forum-attachment-card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
                <span class="forum-attachment-size">${formatFileSize(file.size)}</span>
                <button type="button" class="forum-attachment-remove" data-remove="${index}" title="Remove ${escapeHtml(file.name)}" aria-label="Remove ${escapeHtml(file.name)}">
                    <i class="fa-light fa-xmark" aria-hidden="true"></i>
                </button>
            </div>`).join("");
    }

    getFiles() {
        return this.files.slice();
    }

    dispose() {
        this.surface.removeEventListener("dragenter", this.onDragEnter);
        this.surface.removeEventListener("dragover", this.onDragOver);
        this.surface.removeEventListener("dragleave", this.onDragLeave);
        this.surface.removeEventListener("drop", this.onDrop);
        for (const url of this.previews.values())
            URL.revokeObjectURL(url);
        this.previews.clear();
        this.files = [];
    }
}
