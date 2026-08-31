import { attachmentIcon, escapeHtml, formatFileSize, isImageAttachment } from "./attachmentPicker.js";

const gap = 8;
const margin = 8;
const openDelay = 160;
const closeDelay = 140;
const maxTextPreviewBytes = 200 * 1024;
const maxTextPreviewLines = 28;

const inlineTypes = [
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/bmp",
    "application/pdf",
    "application/json",
    "text/plain",
    "text/csv"
];

const kindLabels = [
    { match: /^application\/pdf$/, label: "PDF document" },
    { match: /zip|compressed|tar$/, label: "Archive" },
    { match: /^application\/json$/, label: "JSON file" },
    { match: /^text\/csv$/, label: "Comma separated values" },
    { match: /^audio\//, label: "Sound file" },
    { match: /^video\//, label: "Video file" }
];

export function canOpenInline(contentType) {
    const type = String(contentType ?? "").toLowerCase();
    return /^(audio|video)\//.test(type) || inlineTypes.includes(type);
}

export function inlineUrl(url) {
    return `${url}${url.includes("?") ? "&" : "?"}inline=1`;
}

export function isTextAttachment(contentType) {
    return /^text\/|^application\/(json|xml)$/.test(String(contentType ?? ""));
}

export function attachmentKindLabel(contentType) {
    const entry = kindLabels.find(candidate => candidate.match.test(String(contentType ?? "")));
    if (entry)
        return entry.label;
    return contentType ? String(contentType) : "File";
}

export class AttachmentPreview {
    constructor(root) {
        this.root = root;
        this.card = null;
        this.anchor = null;
        this.openTimer = null;
        this.closeTimer = null;
        this.textCache = new Map();
        this.bind();
    }

    bind() {
        this.root.addEventListener("mouseover", event => this.onPointerEnter(event));
        this.root.addEventListener("mouseout", event => this.onPointerLeave(event));
        this.root.addEventListener("focusin", event => this.onFocusIn(event));
        this.root.addEventListener("focusout", () => this.scheduleClose());
        document.addEventListener("keydown", event => {
            if (event.key === "Escape")
                this.hide();
        });
        window.addEventListener("scroll", () => this.position(), true);
        window.addEventListener("resize", () => this.position());
    }

    onPointerEnter(event) {
        const anchor = event.target.closest("[data-attachment-url]");
        if (!anchor)
            return;
        window.clearTimeout(this.closeTimer);
        if (anchor === this.anchor)
            return;
        window.clearTimeout(this.openTimer);
        this.openTimer = window.setTimeout(() => this.show(anchor), openDelay);
    }

    onPointerLeave(event) {
        if (!event.target.closest("[data-attachment-url]"))
            return;
        window.clearTimeout(this.openTimer);
        this.scheduleClose();
    }

    onFocusIn(event) {
        const anchor = event.target.closest("[data-attachment-url]");
        if (!anchor)
            return;
        window.clearTimeout(this.closeTimer);
        this.show(anchor);
    }

    scheduleClose() {
        window.clearTimeout(this.closeTimer);
        this.closeTimer = window.setTimeout(() => this.hide(), closeDelay);
    }

    show(anchor) {
        this.anchor = anchor;
        if (!this.card)
            this.createCard();
        this.card.innerHTML = this.buildCard(anchor.dataset);
        this.card.hidden = false;
        this.position();
        this.card.querySelectorAll("img, video").forEach(media => media.addEventListener("load", () => this.position(), { once: true }));
        if (this.card.querySelector("[data-preview-text]"))
            this.loadText(anchor.dataset.attachmentUrl);
    }

    createCard() {
        document.body.insertAdjacentHTML("beforeend", `<div class="forum-preview-card" role="dialog" hidden></div>`);
        this.card = document.body.lastElementChild;
        this.card.addEventListener("mouseenter", () => window.clearTimeout(this.closeTimer));
        this.card.addEventListener("mouseleave", () => this.scheduleClose());
    }

    hide() {
        window.clearTimeout(this.openTimer);
        this.anchor = null;
        if (this.card)
            this.card.hidden = true;
    }

    position() {
        if (!this.card || this.card.hidden)
            return;
        if (!this.anchor?.isConnected) {
            this.hide();
            return;
        }
        const anchorRect = this.anchor.getBoundingClientRect();
        const cardRect = this.card.getBoundingClientRect();
        const places = AttachmentPreview.placements(this.anchor.dataset.previewPlacement)
            .map(place => AttachmentPreview.placeAt(place, anchorRect, cardRect));
        const chosen = places.find(place => AttachmentPreview.fits(place, cardRect)) ?? {
            top: AttachmentPreview.clamp(places[0].top, cardRect.height, window.innerHeight),
            left: AttachmentPreview.clamp(places[0].left, cardRect.width, window.innerWidth)
        };
        this.card.style.top = `${chosen.top}px`;
        this.card.style.left = `${chosen.left}px`;
    }

    static placements(placement) {
        return placement === "block"
            ? ["above", "right", "left", "below"]
            : ["right", "left", "above", "below"];
    }

    static placeAt(place, anchorRect, cardRect) {
        const alignedLeft = AttachmentPreview.clamp(anchorRect.left, cardRect.width, window.innerWidth);
        const alignedTop = AttachmentPreview.clamp(anchorRect.top, cardRect.height, window.innerHeight);
        if (place === "above")
            return { top: anchorRect.top - gap - cardRect.height, left: alignedLeft };
        if (place === "below")
            return { top: anchorRect.bottom + gap, left: alignedLeft };
        if (place === "right")
            return { top: alignedTop, left: anchorRect.right + gap };
        return { top: alignedTop, left: anchorRect.left - gap - cardRect.width };
    }

    static fits(place, cardRect) {
        return place.top >= margin
            && place.left >= margin
            && place.top + cardRect.height <= window.innerHeight - margin
            && place.left + cardRect.width <= window.innerWidth - margin;
    }

    static clamp(start, size, available) {
        return Math.max(margin, Math.min(start, available - size - margin));
    }

    buildCard(attachment) {
        return `
            <div class="forum-preview-body">${AttachmentPreview.buildBody(attachment)}</div>
            <div class="forum-preview-footer">
                <span class="forum-preview-name" title="${escapeHtml(attachment.attachmentName)}">${escapeHtml(attachment.attachmentName)}</span>
                <span class="forum-attachment-size">${formatFileSize(Number(attachment.attachmentSize))}</span>
                ${AttachmentPreview.buildOpenButton(attachment)}
                <a class="forum-button forum-button-primary forum-preview-action" href="${escapeHtml(attachment.attachmentUrl)}" download>
                    <i class="fa-light fa-arrow-down-to-line" aria-hidden="true"></i> Download
                </a>
            </div>`;
    }

    static buildOpenButton(attachment) {
        if (!canOpenInline(attachment.attachmentType))
            return "";
        return `
            <a class="forum-button forum-preview-action" href="${escapeHtml(inlineUrl(attachment.attachmentUrl))}" target="_blank" rel="noopener">
                <i class="fa-light fa-arrow-up-right-from-square" aria-hidden="true"></i> Open
            </a>`;
    }

    static buildBody(attachment) {
        const url = escapeHtml(attachment.attachmentUrl);
        const contentType = attachment.attachmentType;
        if (isImageAttachment(contentType))
            return `<img class="forum-preview-media" src="${url}" alt="${escapeHtml(attachment.attachmentName)}" />`;
        if (/^video\//.test(contentType))
            return `<video class="forum-preview-media" src="${url}" controls preload="metadata"></video>`;
        if (/^audio\//.test(contentType))
            return `<audio class="forum-preview-audio" src="${url}" controls preload="metadata"></audio>`;
        if (isTextAttachment(contentType) && Number(attachment.attachmentSize) <= maxTextPreviewBytes)
            return `<pre class="forum-preview-text" data-preview-text>Reading the file…</pre>`;
        return AttachmentPreview.buildFileBody(contentType);
    }

    static buildFileBody(contentType) {
        return `
            <div class="forum-preview-file">
                <i class="${attachmentIcon(contentType)}" aria-hidden="true"></i>
                <span>${escapeHtml(attachmentKindLabel(contentType))}</span>
            </div>`;
    }

    async loadText(url) {
        const target = this.card.querySelector("[data-preview-text]");
        if (this.textCache.has(url)) {
            target.textContent = this.textCache.get(url);
            this.position();
            return;
        }
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(String(response.status));
            const text = (await response.text()).split("\n").slice(0, maxTextPreviewLines).join("\n");
            this.textCache.set(url, text);
            if (this.card.contains(target))
                target.textContent = text;
        } catch {
            if (this.card.contains(target))
                target.textContent = "This file cannot be previewed.";
        }
        this.position();
    }
}
