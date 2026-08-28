// A catalogue entry is a title over a still picture until it is played: an audio card says nothing
// about the sound, a video card is one frozen frame, a character card is one pose of a walk, and a
// data card hides every column it holds. Every list of catalogue entries — the catalogue page and
// each picker a shape opens — decorates its cards through here, so the sound, the film, the walk
// and the table are one click away wherever the entry is offered, and only one of them ever plays.
class AssetPreview {
    static activePreview = null;
    static characterFrames = new Map();
    static popupInstances = new Map();
    static frameDuration = 90;
    static previewRowCount = 12;
    static previewColumnCount = 8;
    static videoPopupSize = { width: 800, height: 520, maxHeight: "90vh" };
    static dataPopupSize = { width: 620, height: "auto", maxHeight: "80vh" };

    constructor(wrapElement, kind, options) {
        this.wrapElement = wrapElement;
        this.kind = kind;
        this.options = options;
        this.translations = options.translations;
        this.isPlaying = false;
        this.audioElement = null;
        this.frameUrls = [];
        this.frameIndex = 0;
        this.frameTimer = null;
        this.render();
    }

    static escape(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    static hostOf(contentElement) {
        return contentElement.get ? contentElement.get(0) : contentElement;
    }

    static audio(wrapElement, options) {
        return options.assetUrl ? new AssetPreview(wrapElement, "audio", options) : null;
    }

    static video(wrapElement, options) {
        return options.assetUrl ? new AssetPreview(wrapElement, "video", options) : null;
    }

    static data(wrapElement, options) {
        return options.assetUrl ? new AssetPreview(wrapElement, "data", options) : null;
    }

    static character(wrapElement, options) {
        return options.characterId ? new AssetPreview(wrapElement, "character", options) : null;
    }

    static stopActive() {
        AssetPreview.activePreview?.stop();
    }

    get idleIconClass() {
        return this.kind === "data" ? "fa-solid fa-table-list" : "fa-solid fa-play";
    }

    get playingIconClass() {
        return "fa-solid fa-pause";
    }

    get buttonLabel() {
        if (this.kind === "audio")
            return this.translations.get("Listen to this audio");
        if (this.kind === "video")
            return this.translations.get("Watch this video");
        if (this.kind === "data")
            return this.translations.get("Preview this data");
        return this.translations.get("Play this animation");
    }

    render() {
        const label = AssetPreview.escape(this.buttonLabel);
        const frameMarkup = this.kind === "character" ? `<img class="mdl-asset-preview-frame" alt="">` : "";
        const progressMarkup = this.kind === "audio" ? `<div class="mdl-asset-preview-progress"><div class="mdl-asset-preview-progress-fill"></div></div>` : "";
        this.wrapElement.insertAdjacentHTML("beforeend", `
            <div class="mdl-asset-preview mdl-asset-preview--${this.kind}">
                ${frameMarkup}
                <button class="mdl-asset-preview-button" type="button" title="${label}" aria-label="${label}"><i class="${this.idleIconClass}"></i></button>
                ${progressMarkup}
            </div>`);
        this.previewElement = this.wrapElement.lastElementChild;
        this.buttonElement = this.previewElement.querySelector(".mdl-asset-preview-button");
        this.frameElement = this.previewElement.querySelector(".mdl-asset-preview-frame");
        this.progressFillElement = this.previewElement.querySelector(".mdl-asset-preview-progress-fill");
        this.buttonElement.addEventListener("click", () => this.toggle());
        if (this.kind !== "character")
            return;
        this.wrapElement.addEventListener("mouseenter", () => this.start());
        this.wrapElement.addEventListener("mouseleave", () => this.stop());
    }

    toggle() {
        if (this.kind === "video") {
            this.showVideoPopup();
            return;
        }
        if (this.kind === "data") {
            this.showDataPopup();
            return;
        }
        if (this.isPlaying)
            this.stop();
        else
            this.start();
    }

    // A sound is the one preview that follows the reader around the page, so it is the one held as
    // the active one: starting a second sound stops the first, while a character walking under the
    // pointer leaves a clip playing alone.
    start() {
        if (this.isPlaying)
            return;
        if (this.kind === "audio") {
            AssetPreview.stopActive();
            AssetPreview.activePreview = this;
        }
        this.isPlaying = true;
        this.previewElement.classList.add("is-playing");
        this.buttonElement.innerHTML = `<i class="${this.playingIconClass}"></i>`;
        if (this.kind === "audio")
            this.startAudio();
        else
            this.startCharacter();
    }

    stop() {
        if (!this.isPlaying)
            return;
        this.isPlaying = false;
        if (AssetPreview.activePreview === this)
            AssetPreview.activePreview = null;
        this.previewElement.classList.remove("is-playing");
        this.buttonElement.innerHTML = `<i class="${this.idleIconClass}"></i>`;
        if (this.kind === "audio")
            this.stopAudio();
        else
            this.stopCharacter();
    }

    startAudio() {
        if (!this.audioElement) {
            this.audioElement = new Audio(this.options.assetUrl);
            this.audioElement.addEventListener("timeupdate", () => this.paintProgress());
            this.audioElement.addEventListener("ended", () => this.stop());
        }
        this.audioElement.play().catch(() => this.stop());
    }

    stopAudio() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.paintProgress();
    }

    // A card is a temporary thing: a feed scrolls it away, a picker rebuilds its grid, a branch of
    // the catalogue replaces the lot. The clip stops with the card that offered it rather than
    // playing on out of a page that no longer holds the button that would stop it.
    paintProgress() {
        if (!this.wrapElement.isConnected) {
            this.stop();
            return;
        }
        const duration = this.audioElement.duration;
        const playedRatio = duration > 0 ? this.audioElement.currentTime / duration : 0;
        this.progressFillElement.style.width = `${Math.round(playedRatio * 100)}%`;
    }

    // The frames are read the first time the card is asked to move and kept for the page: a grid of
    // characters is browsed by running the pointer along it, and a request per pass would be one
    // request per card per pass.
    startCharacter() {
        AssetPreview.loadCharacterFrames(this.options.characterId, this.options.apiClient).then(frameUrls => this.playFrames(frameUrls));
    }

    playFrames(frameUrls) {
        if (!this.isPlaying)
            return;
        if (frameUrls.length === 0) {
            this.markUnavailable();
            return;
        }
        this.frameUrls = frameUrls;
        this.frameIndex = 0;
        this.frameElement.classList.add("is-visible");
        this.paintFrame();
        this.frameTimer = setInterval(() => this.paintNextFrame(), AssetPreview.frameDuration);
    }

    paintNextFrame() {
        this.frameIndex = (this.frameIndex + 1) % this.frameUrls.length;
        this.paintFrame();
    }

    paintFrame() {
        this.frameElement.src = this.frameUrls[this.frameIndex];
    }

    stopCharacter() {
        clearInterval(this.frameTimer);
        this.frameTimer = null;
        this.frameElement.classList.remove("is-visible");
    }

    // A character with no frames is a still drawing, and saying so is better than a button that
    // answers a click with nothing.
    markUnavailable() {
        this.stop();
        this.previewElement.classList.add("is-unavailable");
        this.buttonElement.title = this.translations.get("This character has no animation");
    }

    static loadCharacterFrames(characterId, apiClient) {
        if (!AssetPreview.characterFrames.has(characterId))
            AssetPreview.characterFrames.set(characterId, AssetPreview.fetchCharacterFrames(characterId, apiClient));
        return AssetPreview.characterFrames.get(characterId);
    }

    static async fetchCharacterFrames(characterId, apiClient) {
        const definition = await apiClient.fetchCharacterDefinition(characterId).catch(() => null);
        const animation = (definition?.animations ?? []).find(entry => (entry.frames ?? []).length > 0);
        if (!animation)
            return [];
        const orderedFrames = [...animation.frames].sort((first, second) => (first.frame_index ?? 0) - (second.frame_index ?? 0));
        const frameUrls = orderedFrames.map(frame => frame.image_url);
        for (const frameUrl of frameUrls)
            new Image().src = frameUrl;
        return frameUrls;
    }

    showVideoPopup() {
        AssetPreview.stopActive();
        AssetPreview.showPopup(this.options.title, `<video class="mdl-asset-preview-video" src="${AssetPreview.escape(this.options.assetUrl)}" controls autoplay playsinline></video>`, this.options.popupWrapperClass, AssetPreview.videoPopupSize);
    }

    showDataPopup() {
        AssetPreview.stopActive();
        const host = AssetPreview.showPopup(this.options.title, `<div class="mdl-asset-preview-status"><i class="fa-light fa-spinner fa-spin"></i></div>`, this.options.popupWrapperClass, AssetPreview.dataPopupSize);
        this.loadDataPreview(host);
    }

    async loadDataPreview(host) {
        try {
            const response = await fetch(this.options.assetUrl);
            host.innerHTML = AssetPreview.buildDataMarkup(await response.text(), this.translations);
        } catch (error) {
            host.innerHTML = `<div class="mdl-asset-preview-status">${AssetPreview.escape(this.translations.get("Failed to load the preview"))}</div>`;
        }
    }

    // The rows are shown as they are written rather than as numbers: the point of the preview is to
    // recognise the file, and a column of dates or names reads as itself only untouched.
    static buildDataMarkup(text, translations) {
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length === 0)
            return `<div class="mdl-asset-preview-status">${AssetPreview.escape(translations.get("No data available"))}</div>`;
        const names = lines[0].split(",").map(name => name.trim());
        const rows = lines.slice(1).map(line => line.split(",").map(cell => cell.trim()));
        const shownNames = names.slice(0, AssetPreview.previewColumnCount);
        const shownRows = rows.slice(0, AssetPreview.previewRowCount);
        const headerMarkup = shownNames.map(name => `<th>${AssetPreview.escape(name)}</th>`).join("");
        const bodyMarkup = shownRows
            .map(row => `<tr>${row.slice(0, shownNames.length).map(cell => `<td>${AssetPreview.escape(cell)}</td>`).join("")}</tr>`)
            .join("");
        const isTruncated = rows.length > shownRows.length || names.length > shownNames.length;
        return `
            <div class="mdl-asset-preview-data">
                <div class="mdl-asset-preview-data-summary">${rows.length} ${AssetPreview.escape(translations.get("rows"))} · ${names.length} ${AssetPreview.escape(translations.get("columns"))}</div>
                <div class="mdl-asset-preview-data-scroll">
                    <table class="mdl-asset-preview-data-table">
                        <thead><tr>${headerMarkup}</tr></thead>
                        <tbody>${bodyMarkup}</tbody>
                    </table>
                </div>
                ${isTruncated ? `<div class="mdl-asset-preview-data-note">${AssetPreview.escape(translations.get("The preview shows the start of the file"))}</div>` : ""}
            </div>`;
    }

    // One popup per stacking context: the catalogue page opens its own, and a picker a shape opened
    // asks for one that sits above the picker rather than behind it.
    static showPopup(title, contentMarkup, wrapperClass = "", size) {
        const popupInstance = AssetPreview.getPopupInstance(wrapperClass);
        popupInstance.option(Object.assign({ title: title }, size));
        const host = AssetPreview.hostOf(popupInstance.content());
        host.innerHTML = contentMarkup;
        popupInstance.show();
        return host;
    }

    static getPopupInstance(wrapperClass) {
        if (AssetPreview.popupInstances.has(wrapperClass))
            return AssetPreview.popupInstances.get(wrapperClass);
        const popupHost = document.createElement("div");
        document.body.appendChild(popupHost);
        const popupInstance = new DevExpress.ui.dxPopup(popupHost, {
            visible: false,
            deferRendering: false,
            shading: false,
            showTitle: true,
            title: "",
            dragEnabled: true,
            hideOnOutsideClick: true,
            showCloseButton: true,
            wrapperAttr: { class: wrapperClass ? `mdl-asset-preview-popup ${wrapperClass}` : "mdl-asset-preview-popup" },
            onHidden: event => AssetPreview.clearPopup(event.component)
        });
        AssetPreview.popupInstances.set(wrapperClass, popupInstance);
        return popupInstance;
    }

    static clearPopup(popupInstance) {
        const host = AssetPreview.hostOf(popupInstance.content());
        host.querySelector("video")?.pause();
        host.innerHTML = "";
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = AssetPreview;
