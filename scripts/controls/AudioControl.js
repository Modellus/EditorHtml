// The row a shape's sound is set on: where the audio comes from, and what the value it follows does
// to it. A file on disk and an entry in the catalogue leave the same thing behind — an address the
// shape plays and the name it was chosen under — so the two ways of choosing sit side by side while
// there is nothing to play. Once a sound is chosen the row says which one it is and offers the only
// thing left to do with it: take it back, and the two ways of choosing come round again. Beside them
// stands the choice that says whether the value is heard as the pitch of the clip or as its loudness.
class AudioControl {
    static modulationItems = [
        { value: "pitch", icon: "fa-light fa-music", hint: "Pitch" },
        { value: "volume", icon: "fa-light fa-volume-high", hint: "Volume" }
    ];

    constructor(options = {}) {
        this.options = {
            getUrl: () => "",
            getName: () => "",
            setAudio: () => {},
            getModulation: () => "pitch",
            setModulation: () => {},
            uploadFile: null,
            showCatalog: () => {},
            ...options
        };
        this.container = null;
        this.fileInputElement = null;
        this.nameElement = null;
        this.modulationGroupInstance = null;
    }

    createHost() {
        this.container = $('<div class="mdl-audio-control"></div>');
        this.container[0].innerHTML = `
            <input type="file" accept="audio/*" class="mdl-audio-control-input" style="display:none">
            <div class="mdl-audio-control-file"></div>
            <div class="mdl-audio-control-catalog"></div>
            <span class="mdl-audio-control-name"></span>
            <div class="mdl-audio-control-clear"></div>
            <div class="mdl-audio-control-modulation"></div>`;
        this.fileInputElement = this.container.find(".mdl-audio-control-input")[0];
        this.fileInputElement.addEventListener("change", event => this.onFileInputChange(event));
        this.nameElement = this.container.find(".mdl-audio-control-name")[0];
        this.container.find(".mdl-audio-control-file").dxButton({
            icon: "fa-light fa-file-music",
            hint: "Audio from a file",
            stylingMode: "text",
            onClick: () => this.fileInputElement.click()
        });
        this.container.find(".mdl-audio-control-catalog").dxButton({
            icon: "fa-light fa-waveform-lines",
            hint: "Audio from the catalog",
            stylingMode: "text",
            onClick: () => this.options.showCatalog()
        });
        this.container.find(".mdl-audio-control-clear").dxButton({
            icon: "fa-light fa-trash-can",
            hint: "Remove the audio",
            stylingMode: "text",
            onClick: () => this.setAudio("", "")
        });
        this.container.find(".mdl-audio-control-modulation").dxButtonGroup({
            items: AudioControl.modulationItems,
            keyExpr: "value",
            selectionMode: "single",
            selectedItemKeys: [this.getModulation()],
            stylingMode: "outlined",
            elementAttr: { class: "mdl-pill-group mdl-small-icon" },
            buttonTemplate: (data, buttonContainer) => {
                buttonContainer[0].innerHTML = `<i class="dx-icon ${data.icon}"></i>`;
            },
            onInitialized: event => { this.modulationGroupInstance = event.component; },
            onContentReady: event => Utils.initPillButtonGroup(event.element[0]),
            onItemClick: event => this.options.setModulation(event.itemData.value)
        });
        this.refresh();
        return this.container;
    }

    hasAudio() {
        return String(this.options.getUrl() ?? "") !== "";
    }

    // Whatever the sound was chosen as: the file it was taken from, or the title it stands under in
    // the catalogue. A model saved before the name was kept has only the address, so the last part
    // of the address stands in for it until the sound is chosen again.
    getName() {
        const name = String(this.options.getName() ?? "").trim();
        if (name !== "")
            return name;
        return AudioControl.getNameFromUrl(this.options.getUrl());
    }

    static getNameFromUrl(url) {
        const address = String(url ?? "").split(/[?#]/)[0];
        const lastPart = address.split("/").filter(part => part !== "").pop() ?? "";
        try {
            return decodeURIComponent(lastPart);
        } catch (error) {
            return lastPart;
        }
    }

    getModulation() {
        const modulation = String(this.options.getModulation() ?? "");
        return AudioControl.modulationItems.some(item => item.value === modulation) ? modulation : "pitch";
    }

    // The picked file is uploaded as the shape's own asset and the address it lands at is what the
    // shape keeps, which is the same address a catalogue entry hands over. Picking the very same
    // file twice in a row is a real choice, so the input is emptied and the change fires again.
    async onFileInputChange(event) {
        const file = event.target.files[0];
        event.target.value = "";
        if (!file)
            return;
        const url = await this.options.uploadFile(file);
        if (!url)
            return;
        this.setAudio(url, file.name);
    }

    setAudio(url, name) {
        this.options.setAudio(url, name);
        this.refresh();
    }

    // The row shows one thing at a time: the choosing while there is nothing chosen, and the sound
    // itself once there is.
    refresh() {
        if (!this.container)
            return;
        const hasAudio = this.hasAudio();
        this.container.find(".mdl-audio-control-file").toggle(!hasAudio);
        this.container.find(".mdl-audio-control-catalog").toggle(!hasAudio);
        this.container.find(".mdl-audio-control-clear").toggle(hasAudio);
        const name = hasAudio ? this.getName() : "";
        this.nameElement.textContent = name;
        this.nameElement.title = name;
        $(this.nameElement).toggle(hasAudio);
        this.modulationGroupInstance?.option("selectedItemKeys", [this.getModulation()]);
    }
}
