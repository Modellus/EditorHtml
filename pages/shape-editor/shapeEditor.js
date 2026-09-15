// The block shape editor: an object written on a page of its own.
//
// The catalogue's popup is where an object is *published* — its title, its description, the JSON
// and the card it will be shown as. This is where one is *built*: the same definition, stood on a
// model at a size and a preset, with every local, parameter and node readable and editable beside
// the drawing it makes. The popup is a form; this is a workbench, and a workbench needs a page.
//
// It is part of maintenance. An object goes into a catalogue everyone draws from, so who may write
// one is the same question as who may write a sample or a system template, and it is answered the
// same way — by the maintenance flag, checked here and not merely hidden behind a button.
import { ModelsApiClient } from "../../sdk/modelsApiClient.js";
import { UserSdk } from "../../sdk/userSdk.js";

const apiBase = window.ModellusApiConfig.resolveApiBase();
const sessionKey = window.modellus?.auth?.sessionKey || "mp.session";
const userKey = window.modellus?.auth?.userKey || "mp.user";
const maintenanceAccessFeatureFlagKey = "can_access_maintenance";
// What the catalogue's popup leaves behind when it sends someone here, so that pressing the button
// never costs the definition they were in the middle of typing.
const handoverKey = "mdl.shapeEditor.handover";
const catalogueUrl = "/pages/catalog/index.html";

class ShapeEditorApp {
    constructor() {
        this.userSdk = new UserSdk(sessionKey, userKey, "/pages/login/index.html");
        this.state = { session: this.userSdk.readSession(), user: this.userSdk.readUser() };
        this.apiClient = new ModelsApiClient(apiBase, () => this.state.session, () => this.userSdk.getUserId(this.state.session));
        this.host = document.getElementById("shape-editor");
        this.statusElement = document.getElementById("status");
        this.titleElement = document.getElementById("shape-editor-title");
        this.saveButton = document.getElementById("shape-editor-save");
        this.objectId = new URL(window.location.href).searchParams.get("object_id");
        this.objectData = null;
        this.workbench = null;
    }

    async start() {
        if (!this.userSdk.ensureAuthenticated(this.state))
            return;
        await this.userSdk.loadFeatureFlags(apiBase, this.state.session);
        if (!this.userSdk.hasFeatureFlag(maintenanceAccessFeatureFlagKey)) {
            this.refuse();
            return;
        }
        this.build();
        await this.load();
    }

    // Refused rather than hidden. A page is a URL, and a URL is something anyone can be sent; the
    // button that leads here is only shown to maintenance, and this is what makes that true.
    refuse() {
        document.querySelector(".shape-editor-bar")?.remove();
        this.host.innerHTML = `<div class="shape-editor-refused">
            <p>The block shape editor is part of maintenance, and this account is not.</p>
            <p><a class="shape-editor-button" href="${catalogueUrl}">Back to the catalogue</a></p>
        </div>`;
    }

    setStatus(message, isError = false) {
        this.statusElement.textContent = message || "";
        this.statusElement.classList.toggle("error", Boolean(isError));
    }

    build() {
        this.host.innerHTML = `
            <div class="shape-editor-definition">
              <div id="shape-editor-bar-host"></div>
              <textarea id="object-definition-editor" spellcheck="false" placeholder="The object definition, as JSON. Or start from one the editor ships with."></textarea>
            </div>
            <div id="shape-editor-workbench"></div>`;
        this.definitionElement = document.getElementById("object-definition-editor");
        this.workbench = new ObjectWorkbench({
            host: document.getElementById("shape-editor-workbench"),
            barHost: document.getElementById("shape-editor-bar-host"),
            getDefinitionText: () => this.definitionElement.value,
            setDefinitionText: text => { this.definitionElement.value = text; },
            setStatus: (message, isError) => this.setStatus(message, isError)
        }).build();
        // Typing in the JSON is followed on a delay, because every keystroke otherwise recompiles the
        // object and redraws seven of it; an edit made in a row is followed immediately, because the
        // author has finished making it.
        this.definitionElement.addEventListener("input", () => {
            clearTimeout(this._definitionTimer);
            this._definitionTimer = setTimeout(() => this.workbench.refresh(), 400);
        });
        this.saveButton.addEventListener("click", () => this.save());
        this.workbench.refresh();
    }

    readHandover() {
        try {
            const stored = sessionStorage.getItem(handoverKey);
            sessionStorage.removeItem(handoverKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    async load() {
        // What was being typed in the popup is put in first and wins over what the catalogue holds:
        // it is the newer of the two, and carrying it here is the whole reason the button does.
        const handover = this.readHandover();
        if (handover?.title)
            this.titleElement.value = handover.title;
        if (handover?.definition)
            this.setDefinition(handover.definition);
        if (!this.objectId) {
            this.saveButton.textContent = "Publish";
            return;
        }
        this.setStatus("Loading the object…");
        try {
            this.objectData = await this.apiClient.fetchObjectById(this.objectId);
            const definitionDocument = await this.apiClient.fetchObjectDefinition(this.objectId);
            // Two round trips have gone by, and what arrives never lands on top of someone who
            // started writing while they were in flight.
            if (this.titleElement.value.trim() === "")
                this.titleElement.value = this.objectData?.title || "";
            if (this.definitionElement.value.trim() === "")
                this.setDefinition(JSON.stringify(definitionDocument, null, 4));
            this.setStatus("");
        } catch (error) {
            this.setStatus(error?.message || "The object could not be loaded.", true);
        }
    }

    setDefinition(text) {
        this.definitionElement.value = text;
        this.workbench.refresh();
    }

    // The same gate the popup has: an object cannot reach the catalogue until there is nothing
    // wrong with it. Here it is the workbench's own reading that decides, which is the one made
    // against the model the object is standing on rather than against no model at all.
    async save() {
        const title = this.titleElement.value.trim();
        if (title === "") {
            this.setStatus("The object needs a title before it can be saved.", true);
            this.titleElement.focus();
            return;
        }
        const inspection = this.workbench.refresh();
        if (!inspection.document || inspection.problems.length > 0) {
            this.setStatus("The definition has to be usable before the object can be saved.", true);
            return;
        }
        const screenshot = await ObjectDrawing.toScreenshotFile(ObjectDrawing.toSvg(inspection.document, ObjectDrawing.previewSize));
        this.setStatus(this.objectId ? "Saving the object…" : "Publishing the object…");
        this.saveButton.disabled = true;
        try {
            if (this.objectId) {
                await this.apiClient.patchObject(this.objectId, {
                    title: title,
                    description: this.objectData?.description ?? null,
                    definition: inspection.document
                });
                if (screenshot)
                    await this.apiClient.uploadObjectThumbnail(this.objectId, screenshot);
                this.setStatus("Object saved.");
            } else {
                const created = await this.apiClient.createObject({ title: title, description: null, definition: inspection.document }, screenshot);
                // From here on this page is editing that object rather than making another one, so
                // the address says so and a second save updates instead of publishing a twin.
                if (created?.id) {
                    this.objectId = created.id;
                    this.objectData = created;
                    this.saveButton.textContent = "Save";
                    const url = new URL(window.location.href);
                    url.searchParams.set("object_id", created.id);
                    window.history.replaceState({}, "", url.toString());
                }
                this.setStatus("Object published.");
            }
        } catch (error) {
            this.setStatus(error?.message || "The object could not be saved.", true);
        } finally {
            this.saveButton.disabled = false;
        }
    }
}

window.shapeEditorApp = new ShapeEditorApp();
window.shapeEditorApp.start();
