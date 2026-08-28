// The row a shape's sound is set on: where the audio comes from, and what the value it follows does
// to it. A file on disk and an entry in the catalogue leave the same thing behind — an address the
// shape plays — so the two ways of choosing sit side by side and the shape holds one property for
// both. Beside them stands the choice that says whether the value is heard as the pitch of the clip
// or as its loudness.
class AudioControl {
    static modulationItems = [
        { value: "pitch", icon: "fa-light fa-music", hint: "Pitch" },
        { value: "volume", icon: "fa-light fa-volume-high", hint: "Volume" }
    ];

    constructor(options = {}) {
        this.options = {
            getUrl: () => "",
            setUrl: () => {},
            getModulation: () => "pitch",
            setModulation: () => {},
            uploadFile: null,
            showCatalog: () => {},
            ...options
        };
        this.container = null;
        this.fileInputElement = null;
        this.fileButtonInstance = null;
        this.clearButtonInstance = null;
        this.modulationGroupInstance = null;
    }

    createHost() {
        this.container = $('<div class="mdl-audio-control"></div>');
        this.container[0].innerHTML = `
            <input type="file" accept="audio/*" class="mdl-audio-control-input" style="display:none">
            <div class="mdl-audio-control-file"></div>
            <div class="mdl-audio-control-catalog"></div>
            <div class="mdl-audio-control-clear"></div>
            <div class="mdl-audio-control-modulation"></div>`;
        this.fileInputElement = this.container.find(".mdl-audio-control-input")[0];
        this.fileInputElement.addEventListener("change", event => this.onFileInputChange(event));
        this.container.find(".mdl-audio-control-file").dxButton({
            icon: "fa-light fa-file-music",
            hint: "Audio from a file",
            stylingMode: this.hasAudio() ? "contained" : "text",
            onInitialized: event => { this.fileButtonInstance = event.component; },
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
            hint: "No audio",
            stylingMode: "text",
            disabled: !this.hasAudio(),
            onInitialized: event => { this.clearButtonInstance = event.component; },
            onClick: () => this.setUrl("")
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
        return this.container;
    }

    hasAudio() {
        return String(this.options.getUrl() ?? "") !== "";
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
        this.setUrl(url);
    }

    setUrl(url) {
        this.options.setUrl(url);
        this.refresh();
    }

    refresh() {
        this.fileButtonInstance?.option("stylingMode", this.hasAudio() ? "contained" : "text");
        this.clearButtonInstance?.option("disabled", !this.hasAudio());
        this.modulationGroupInstance?.option("selectedItemKeys", [this.getModulation()]);
    }
}
