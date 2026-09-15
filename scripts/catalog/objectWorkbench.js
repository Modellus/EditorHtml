// The workbench an object is written at.
//
// A definition is a document of formulas, and the catalogue's own preview can only say that one
// compiles: it binds the compiler to a calculator holding no model at all, so every formula falls
// back to zero and a gauge with every radius at 0 draws "successfully". The workbench is what makes
// that a real reading — the object stood on a model, at a size and a preset, with the parameter
// values it would really be handed — and everything in it reports from that one compilation.
//
// It knows nothing about where the definition is kept. Whoever builds it says how to read the text,
// how to write it back and where to put a message, which is why the same workbench serves the block
// shape editor and would serve anything else holding a definition.
class ObjectWorkbench {
    // The three sizes an object is kept on screen at while it is being written. 80 is where a label
    // stops being legible, 180 is the box an object is placed in, and 480 is a drawing filling a
    // board — an object has to read at all three, and a drawing scaled down is not the same thing as
    // a drawing worked out small.
    static stripSizes = [80, 180, 480];

    constructor({ host, barHost = null, getDefinitionText, setDefinitionText, setStatus }) {
        this.host = host;
        this.barHost = barHost;
        this.getDefinitionText = getDefinitionText;
        this.setDefinitionText = setDefinitionText;
        this.report = setStatus ?? (() => {});
        this.inspector = null;
        this._history = { past: [], future: [] };
    }

    // What the whole panel is reporting on: the definition as it is written, stood where the test
    // bed is standing it. The catalogue's popup reads a definition the same way but against no model
    // at all, because what it is previewing is the card and not the object at work.
    inspect(definitionText) {
        let definitionDocument = null;
        try {
            definitionDocument = JSON.parse(definitionText);
        } catch (error) {
            return { document: null, problems: [`The definition is not valid JSON: ${error.message}`] };
        }
        // Nothing is refused here for being an object this release shipped with. Every shape in the
        // catalogue is written in this editor, the bundled ones included — they are bundled because
        // the catalogue says they are, and editing one is how they are maintained.
        const problems = BlockDefinitionLoader.inspect(definitionDocument);
        if (problems.length > 0)
            return { document: definitionDocument, problems };
        try {
            BlockDefinitionLoader.register(definitionDocument);
        } catch (error) {
            return { document: definitionDocument, problems: [error.message] };
        }
        const outcome = ObjectChecks.problems(definitionDocument, this.getTestBed());
        for (const problem of outcome.problems) {
            if (problem.severity !== "warning")
                problems.push(`${problem.path}: ${problem.message}`);
        }
        return { document: definitionDocument, problems, outcome, compilation: outcome.inspection?.compilation ?? null };
    }

    // One reading, painted into every panel. Called on every change to the definition and on every
    // change to the test bed, so nothing on screen is ever a keystroke behind the object.
    refresh() {
        const inspection = this.inspect(this.getDefinitionText());
        this._cardSvg = inspection.problems.length > 0 || !inspection.document ? null : ObjectDrawing.toSvg(inspection.document, ObjectDrawing.previewSize);
        this._cardProblems = inspection.problems;
        this.paintCard();
        this.paintTestBedDrawing(inspection);
        this.paintStrips(inspection);
        this.paintInspection(inspection);
        if (inspection.document?.type)
            this.syncChecksToType(inspection.document.type);
        return inspection;
    }

    // The object posed for its catalogue card: its own preview parameters, no model, fitted to the
    // square every card is. It stands beside the drawing on the model precisely because the two
    // differ, and the difference is the object's wiring showing.
    paintCard() {
        const previewHost = this._cardHost;
        if (!previewHost)
            return;
        if (this._cardSvg) {
            previewHost.innerHTML = `<div class="object-preview-drawing">${this._cardSvg}</div>`;
            return;
        }
        if (this._cardProblems?.length > 0) {
            previewHost.innerHTML = `<div class="object-preview-problems"><ul>${this._cardProblems.map(problem => `<li>${ObjectWorkbench.escapeHtml(problem)}</li>`).join("")}</ul></div>`;
            return;
        }
        previewHost.innerHTML = `<div class="object-preview-empty">The preview is drawn from the definition.</div>`;
    }

    // The markup, built once. Every id is the one the panels look themselves up by, so a page
    // hosting this does not have to know what is in it.
    build() {
        this.host.innerHTML = `
            <div class="object-workbench">
              <div class="object-testbed">
                <label class="object-testbed-field object-testbed-wide"><span>Model</span><input id="object-testbed-model" type="text" spellcheck="false" placeholder="v=t\\cdot16"></label>
                <label class="object-testbed-field object-testbed-wide"><span>Parameters</span><input id="object-testbed-parameters" type="text" spellcheck="false" placeholder='{"valueVariable": "v"}'></label>
                <label class="object-testbed-field"><span>Row</span><input id="object-testbed-iteration" type="number" min="1"></label>
                <label class="object-testbed-field"><span>Width</span><input id="object-testbed-width" type="number" min="8"></label>
                <label class="object-testbed-field"><span>Height</span><input id="object-testbed-height" type="number" min="8"></label>
                <label class="object-testbed-field"><span>Preset</span><select id="object-testbed-preset"></select></label>
              </div>
              <div class="object-workbench-tabs">
                <button type="button" class="object-tab is-active" data-object-tab="drawing">Drawing</button>
                <button type="button" class="object-tab" data-object-tab="inspect">Inspect</button>
                <button type="button" class="object-tab" data-object-tab="checks">Checks<span class="object-tab-score" id="object-checks-score"></span></button>
              </div>
              <div class="object-tab-panel is-active" data-object-panel="drawing">
                <div class="object-drawings">
                  <figure class="object-drawing-figure">
                    <div id="object-testbed-host" class="object-testbed-host"></div>
                    <figcaption>On the model above</figcaption>
                  </figure>
                  <figure class="object-drawing-figure">
                    <div id="object-preview-host" class="object-preview-host"></div>
                    <figcaption>Catalogue card</figcaption>
                  </figure>
                </div>
                <div class="object-strip-title">Sizes</div>
                <div class="object-strip" id="object-size-strip"></div>
                <div class="object-strip-title">Presets</div>
                <div class="object-strip" id="object-preset-strip"></div>
              </div>
              <div class="object-tab-panel" data-object-panel="inspect"><div id="object-inspect-host"></div></div>
              <div class="object-tab-panel" data-object-panel="checks">
                <div class="object-checks-actions">
                  <button type="button" id="object-checks-run">Run all</button>
                  <button type="button" id="object-checks-capture">Add from test bed</button>
                  <button type="button" id="object-checks-copy">Copy</button>
                </div>
                <div class="object-checks-results" id="object-checks-results"></div>
                <textarea id="object-checks-editor" class="object-checks-editor" spellcheck="false" placeholder="The checks for this object, as JSON."></textarea>
              </div>
            </div>`;
        if (this.barHost) {
            this.barHost.innerHTML = `
                <div class="object-definition-bar">
                  <button type="button" id="object-definition-undo" title="Undo the last change made in the panel"><i class="fa-light fa-arrow-rotate-left"></i>Undo</button>
                  <button type="button" id="object-definition-redo" title="Do it again"><i class="fa-light fa-arrow-rotate-right"></i>Redo</button>
                  <span class="object-definition-gap"></span>
                  <button type="button" id="object-definition-copy">Copy</button>
                  <button type="button" id="object-definition-paste">Paste</button>
                  <select id="object-definition-start" title="Start from an object the editor ships with"></select>
                </div>`;
        }
        this._cardHost = this.host.querySelector("#object-preview-host");
        this.buildControls(null);
        return this;
    }

    // ---- the test bed ---------------------------------------------------------------------------
    // The catalogue's card preview binds the compiler to a calculator holding no model at all, so
    // every formula falls back to zero and a gauge with every radius at 0 draws "successfully". The
    // test bed is what fixes that: a model written in the same LaTeX an Expression shape holds, run
    // to the row named beside it, at a size and a preset the author chooses. What is drawn from it is
    // what the object would really be given.
    getTestBed() {
        this._testBed ??= { model: "", iteration: 1, width: 180, height: 180, preset: "standard", parameters: {} };
        return this._testBed;
    }

    setTestBed(patch) {
        Object.assign(this.getTestBed(), patch);
        this.refresh();
    }

    buildTestBedControls() {
        const testBed = this.getTestBed();
        const presetSelect = document.getElementById("object-testbed-preset");
        if (presetSelect) {
            presetSelect.innerHTML = BlockTokens.getPresetNames()
                .map(name => `<option value="${ObjectWorkbench.escapeHtml(name)}"${name === testBed.preset ? " selected" : ""}>${ObjectWorkbench.escapeHtml(name)}</option>`)
                .join("");
            presetSelect.addEventListener("change", event => this.setTestBed({ preset: event.target.value }));
        }
        const bind = (id, key, read) => {
            const element = document.getElementById(id);
            if (!element)
                return;
            element.value = testBed[key];
            element.addEventListener("input", event => this.setTestBed({ [key]: read(event.target.value) }));
        };
        bind("object-testbed-model", "model", value => value);
        const parametersInput = document.getElementById("object-testbed-parameters");
        if (parametersInput) {
            parametersInput.value = Object.keys(testBed.parameters ?? {}).length === 0 ? "" : JSON.stringify(testBed.parameters);
            parametersInput.addEventListener("input", event => {
                const text = event.target.value.trim();
                if (text === "") {
                    parametersInput.classList.remove("object-testbed-invalid");
                    this.setTestBed({ parameters: {} });
                    return;
                }
                try {
                    const parsed = JSON.parse(text);
                    parametersInput.classList.remove("object-testbed-invalid");
                    this.setTestBed({ parameters: parsed && typeof parsed === "object" ? parsed : {} });
                } catch (error) {
                    parametersInput.classList.add("object-testbed-invalid");
                }
            });
        }
        bind("object-testbed-iteration", "iteration", value => Math.max(1, Number(value) || 1));
        bind("object-testbed-width", "width", value => Math.max(8, Number(value) || 180));
        bind("object-testbed-height", "height", value => Math.max(8, Number(value) || 180));
    }

    // The object as the test bed stands it, which is the drawing every panel beside it is reporting
    // on. The catalogue card is drawn separately and stays what it was — posed by the definition's
    // own preview parameters — because that is what gets published.
    paintTestBedDrawing(inspection) {
        const host = document.getElementById("object-testbed-host");
        if (!host)
            return;
        const compilation = inspection.outcome?.inspection?.compilation ?? null;
        // A definition with something wrong in it draws nothing here, even when the compiler managed to
        // produce a husk of a node: a drawing beside a list of problems would be read as the object,
        // and half of one is more misleading than none.
        if (!compilation || compilation.nodes.length === 0 || inspection.problems.length > 0) {
            host.innerHTML = `<div class="object-preview-empty">Nothing is drawn yet.</div>`;
            this.inspector?.setDrawingHost(host);
            return;
        }
        const testBed = this.getTestBed();
        host.innerHTML = BlockRenderer.toStandaloneSvg(compilation.nodes, testBed.width, testBed.height, "none");
        this.inspector?.setDrawingHost(host);
    }

    // ---- sizes and presets, side by side --------------------------------------------------------
    // Labels have to stay legible at 80px, and all five presets have to restyle the whole drawing.
    // Neither is checkable one drawing at a time, so the object is always on screen at three sizes
    // and in all five presets, compiled afresh for each: a drawing scaled down is not the same thing
    // as a drawing worked out small.
    paintStrips(inspection) {
        const sizeStrip = document.getElementById("object-size-strip");
        const presetStrip = document.getElementById("object-preset-strip");
        if (!sizeStrip || !presetStrip)
            return;
        const document_ = inspection.document;
        const usable = inspection.outcome?.inspection && inspection.problems.length === 0;
        if (!usable) {
            sizeStrip.innerHTML = presetStrip.innerHTML = `<div class="object-strip-empty">Drawn once the definition is usable.</div>`;
            return;
        }
        const testBed = this.getTestBed();
        sizeStrip.innerHTML = ObjectWorkbench.stripSizes
            .map(size => this.buildStripCell(document_, Object.assign({}, testBed, { width: size, height: size }), `${size} px`))
            .join("");
        presetStrip.innerHTML = BlockTokens.getPresetNames()
            .map(preset => this.buildStripCell(document_, Object.assign({}, testBed, { preset: preset }), preset))
            .join("");
    }

    buildStripCell(definitionDocument, given, caption) {
        let markup = "";
        try {
            const compiled = ObjectChecks.compile(definitionDocument, given);
            markup = BlockRenderer.toStandaloneSvg(compiled.compilation.nodes, given.width, given.height, "none");
        } catch (error) {
            markup = "";
        }
        return `<figure class="object-strip-cell"><div class="object-strip-drawing">${markup}</div><figcaption>${ObjectWorkbench.escapeHtml(caption)}</figcaption></figure>`;
    }

    // ---- what the object is doing ---------------------------------------------------------------
    paintInspection(inspection) {
        const host = document.getElementById("object-inspect-host");
        if (!host)
            return;
        if (!this.inspector || this.inspector.host !== host) {
            this.inspector = new ObjectInspector(host);
            // What a row hands back is a named edit, and this is the only thing that performs one. The
            // panel never rewrites the document itself, so there is one path from a click to the JSON
            // the object is saved from — the one the undo button walks back along.
            this.inspector.onEdit = edit => this.applyEdit(edit);
            this.inspector.setDrawingHost(document.getElementById("object-testbed-host"));
        }
        if (!inspection.document) {
            this.inspector.clear("The definition is not readable yet.");
            return;
        }
        const outcome = inspection.outcome ?? { problems: inspection.problems.map(message => ({ severity: "error", path: "", message: message })), inspection: null };
        this.inspector.render(inspection.document, outcome);
    }

    // ---- checks ---------------------------------------------------------------------------------
    // A check stands the object somewhere definite and says what has to be true there. They are kept
    // beside the document rather than inside it: a key the definition does not declare is dropped in
    // silence by the loader and by the registry, and the catalogue's own endpoint would refuse it.
    getChecksStorageKey(type) {
        return `mdl.catalog.checks.${type ?? "draft"}`;
    }

    readChecks(type) {
        try {
            const stored = localStorage.getItem(this.getChecksStorageKey(type));
            const parsed = stored ? JSON.parse(stored) : null;
            return Array.isArray(parsed?.checks) ? parsed.checks : [];
        } catch (error) {
            return [];
        }
    }

    writeChecks(type, checks) {
        try {
            localStorage.setItem(this.getChecksStorageKey(type), JSON.stringify({ type: type, checks: checks }, null, 4));
        } catch (error) {
            return;
        }
    }

    // The checks belong to the object's own type, and a new object has no type until its definition
    // names one. So the first readable definition brings back whatever was recorded against that type
    // — but only into an editor nobody has written in, or it would take away what the author is in
    // the middle of typing.
    syncChecksToType(type) {
        if (this._checksType === type)
            return;
        const editor = document.getElementById("object-checks-editor");
        if (!editor)
            return;
        this._checksType = type;
        if (editor.value.trim() !== "")
            return;
        const stored = this.readChecks(type);
        if (stored.length === 0)
            return;
        this.setChecksEditorValue(stored, type);
        this.runChecks(false);
    }

    getChecksFromEditor() {
        const editor = document.getElementById("object-checks-editor");
        if (!editor)
            return { checks: [], error: null };
        const text = editor.value.trim();
        if (text === "")
            return { checks: [], error: null };
        try {
            const parsed = JSON.parse(text);
            const checks = Array.isArray(parsed) ? parsed : parsed.checks;
            return Array.isArray(checks) ? { checks: checks, error: null } : { checks: [], error: "The checks have to be a list." };
        } catch (error) {
            return { checks: [], error: `The checks are not valid JSON: ${error.message}` };
        }
    }

    setChecksEditorValue(checks, type) {
        const editor = document.getElementById("object-checks-editor");
        if (editor)
            editor.value = JSON.stringify({ type: type ?? "", checks: checks }, null, 4);
    }

    runChecks(announce = true) {
        const resultsHost = document.getElementById("object-checks-results");
        const scoreHost = document.getElementById("object-checks-score");
        if (!resultsHost)
            return null;
        const inspection = this.inspect(this.getDefinitionText());
        const edited = this.getChecksFromEditor();
        if (edited.error) {
            resultsHost.innerHTML = `<div class="object-check object-check-failed"><span class="object-check-mark">✗</span><span>${ObjectWorkbench.escapeHtml(edited.error)}</span></div>`;
            return null;
        }
        if (!inspection.document || edited.checks.length === 0) {
            resultsHost.innerHTML = `<div class="object-checks-empty">${edited.checks.length === 0 ? "No checks yet. Stand the object where it matters on the test bed, then add one." : "The definition has to be readable before its checks can run."}</div>`;
            if (scoreHost)
                scoreHost.textContent = "";
            return null;
        }
        const outcome = ObjectChecks.runAll(inspection.document, edited.checks);
        resultsHost.innerHTML = outcome.results.map(result => `
            <div class="object-check ${result.passed ? "object-check-passed" : "object-check-failed"}">
                <span class="object-check-mark">${result.passed ? "✓" : "✗"}</span>
                <span class="object-check-body">${ObjectWorkbench.escapeHtml(result.name)}
                    ${result.failures.map(failure => `<span class="object-check-why">${ObjectWorkbench.escapeHtml(failure.expectation)} — ${ObjectWorkbench.escapeHtml(failure.reason)}</span>`).join("")}
                </span>
            </div>`).join("");
        if (scoreHost)
            scoreHost.textContent = `${outcome.passed}/${outcome.total}`;
        this.writeChecks(inspection.document.type, edited.checks);
        if (announce)
            this.report(outcome.passed === outcome.total ? `All ${outcome.total} checks pass.` : `${outcome.total - outcome.passed} of ${outcome.total} checks fail.`, outcome.passed !== outcome.total);
        return outcome;
    }

    // A check is written from where the object is standing, because that is the moment the author
    // knows what they meant: the model, the row, the size and the preset on the test bed become the
    // check's own, and the drawing it is making right now becomes the snapshot it has to keep making.
    addCheckFromTestBed() {
        const inspection = this.inspect(this.getDefinitionText());
        if (!inspection.document || inspection.problems.length > 0) {
            this.report("The definition has to be usable before a check can be taken from it.", true);
            return;
        }
        const testBed = this.getTestBed();
        // Everything the test bed was holding, the parameter values included: a check that recorded the
        // model but not what the object was pointed at could never draw again what it just saw.
        const given = {
            model: testBed.model,
            iteration: testBed.iteration,
            parameters: Object.assign({}, testBed.parameters),
            width: testBed.width,
            height: testBed.height,
            preset: testBed.preset
        };
        const markup = ObjectChecks.markupHash(inspection.outcome.inspection.compilation.nodes);
        const existing = this.getChecksFromEditor().checks;
        existing.push({
            name: testBed.model.trim() === "" ? `draws at ${testBed.width} × ${testBed.height}` : `draws ${testBed.model.trim()} on row ${testBed.iteration}`,
            given: given,
            expect: [{ validator: "clean" }, { markup: markup }]
        });
        this.setChecksEditorValue(existing, inspection.document.type);
        this.runChecks(false);
    }

    copyChecks() {
        const editor = document.getElementById("object-checks-editor");
        if (!editor)
            return;
        navigator.clipboard?.writeText(editor.value)
            .then(() => this.report("Checks copied. They belong in tests/object-checks/<type>.json."))
            .catch(() => this.report("The checks could not be copied.", true));
    }

    // ---- changing the object --------------------------------------------------------------------
    // The definition text is the object: it is what the drawing is compiled from, what the checks run
    // against and what is sent to the catalogue when it is saved. So an edit made in a row is written
    // back into that same text rather than into a document held somewhere beside it — there is one
    // version of the object at any moment, and the JSON on the left is it.
    // Undo is a history of whole definitions rather than of edits, because an edit is not always
    // reversible on its own: renaming a local rewrites every formula that read it, and removing a
    // node takes its children with it. Typing in the JSON has the text area's own undo; this one is
    // for the edits made in the panel, which had none.
    getHistory() {
        this._history ??= { past: [], future: [] };
        return this._history;
    }

    writeDefinition(text, { remember = true } = {}) {
        const history = this.getHistory();
        if (remember) {
            history.past.push(this.getDefinitionText());
            history.future.length = 0;
        }
        this.setDefinitionText(text);
        // Straight away rather than on the editor's own delay: an edit made in a row should be seen in
        // the drawing in the same moment it is made.
        this.refresh();
        this.refreshHistoryButtons();
    }

    applyEdit(edit) {
        let definitionDocument = null;
        try {
            definitionDocument = JSON.parse(this.getDefinitionText());
        } catch (error) {
            this.report("The definition has to be readable JSON before a row can change it.", true);
            return;
        }
        const outcome = ObjectDocument.apply(definitionDocument, edit);
        if (outcome.problem) {
            // A refused edit changes nothing at all — not the document and not the history — so the row
            // the author was typing in is still the one to go back to.
            this.report(outcome.problem, true);
            this.refresh();
            return;
        }
        this.writeDefinition(ObjectDocument.serialize(outcome.document));
        this.report(ObjectWorkbench.describeEdit(edit));
    }

    static describeEdit(edit) {
        switch (edit.kind) {
            case "local-set": return `${edit.id} is worked out differently now.`;
            case "local-rename": return `${edit.id} is called ${edit.name} now, everywhere that read it.`;
            case "local-add": return `${edit.name} added.`;
            case "local-remove": return `${edit.id} removed.`;
            case "local-move": return `${edit.id} is worked out ${edit.by < 0 ? "earlier" : "later"} now.`;
            case "parameter-default": return `${edit.id} falls back to something else now.`;
            case "node-when": return `#${edit.nodeId} is drawn under a different condition now.`;
            case "node-binding": return `#${edit.nodeId} takes ${edit.key} from somewhere else now.`;
            case "node-property": return `#${edit.nodeId} carries a different ${edit.key} now.`;
            case "node-list": return `#${edit.nodeId} changed.`;
            case "node-remove": return `#${edit.nodeId} removed.`;
            default: return "The object changed.";
        }
    }

    undo() {
        const history = this.getHistory();
        if (history.past.length === 0)
            return;
        history.future.push(this.getDefinitionText());
        this.writeDefinition(history.past.pop(), { remember: false });
        this.report("Undone.");
    }

    redo() {
        const history = this.getHistory();
        if (history.future.length === 0)
            return;
        history.past.push(this.getDefinitionText());
        this.writeDefinition(history.future.pop(), { remember: false });
        this.report("Redone.");
    }

    refreshHistoryButtons() {
        const history = this.getHistory();
        const undo = document.getElementById("object-definition-undo");
        const redo = document.getElementById("object-definition-redo");
        if (undo)
            undo.disabled = history.past.length === 0;
        if (redo)
            redo.disabled = history.future.length === 0;
    }

    copyDefinition() {
        navigator.clipboard?.writeText(this.getDefinitionText())
            .then(() => this.report("The definition is on the clipboard."))
            .catch(() => this.report("The definition could not be copied.", true));
    }

    // Pasting is an edit like any other, so what was in the editor is still one undo away. A
    // definition that is not JSON is refused here rather than replacing the object with something
    // unreadable and reporting it afterwards.
    async pasteDefinition() {
        let text = "";
        try {
            text = await navigator.clipboard.readText();
        } catch (error) {
            this.report("The clipboard could not be read, so paste the definition into the editor instead.", true);
            return;
        }
        this.applyDefinitionText(text, "Pasted.");
    }

    applyDefinitionText(text, message) {
        let definitionDocument = null;
        try {
            definitionDocument = JSON.parse(text);
        } catch (error) {
            this.report(`That is not a definition: ${error.message}`, true);
            return false;
        }
        this.writeDefinition(ObjectDocument.serialize(definitionDocument));
        this.report(message);
        return true;
    }

    // The objects the editor ships with, as somewhere to start. A catalogue object cannot take the
    // type of one of them, so starting from a speedometer is a fork under a name of its own — which
    // is also the only honest way to present it, since what is published afterwards is a new object
    // and not a change to the one the editor ships.
    getForkableObjects() {
        return [...BlockObjectLibrary.bundledTypes]
            .map(type => ({ type: type, document: BlockDefinitionLoader.getDocument(type) }))
            .filter(entry => entry.document)
            .map(entry => ({ type: entry.type, label: entry.document.displayName ?? entry.type }))
            .sort((left, right) => left.label.localeCompare(right.label));
    }

    startFrom(type) {
        const definitionDocument = BlockDefinitionLoader.getDocument(type);
        if (!definitionDocument) {
            this.report(`There is no object called "${type}" to start from.`, true);
            return;
        }
        const taken = new Set([...BlockObjectLibrary.bundledTypes, ...BlockDefinitionLoader.documents.keys()]);
        const forked = ObjectDocument.fork(definitionDocument, taken);
        this.writeDefinition(ObjectDocument.serialize(forked));
        this.report(`Started from ${definitionDocument.displayName ?? type}, as "${forked.type}". Undo puts back what was here.`);
    }

    buildDefinitionBar() {
        const start = document.getElementById("object-definition-start");
        if (start) {
            start.innerHTML = [`<option value="">Start from…</option>`]
                .concat(this.getForkableObjects().map(entry => `<option value="${ObjectWorkbench.escapeHtml(entry.type)}">${ObjectWorkbench.escapeHtml(entry.label)}</option>`))
                .join("");
            start.addEventListener("change", event => {
                const type = event.target.value;
                event.target.value = "";
                if (type)
                    this.startFrom(type);
            });
        }
        document.getElementById("object-definition-undo")?.addEventListener("click", () => this.undo());
        document.getElementById("object-definition-redo")?.addEventListener("click", () => this.redo());
        document.getElementById("object-definition-copy")?.addEventListener("click", () => this.copyDefinition());
        document.getElementById("object-definition-paste")?.addEventListener("click", () => this.pasteDefinition());
        this.refreshHistoryButtons();
    }

    buildControls(definitionDocument) {
        this._history = { past: [], future: [] };
        this.buildDefinitionBar();
        this.buildTestBedControls();
        for (const tab of document.querySelectorAll("[data-object-tab]")) {
            tab.addEventListener("click", () => {
                for (const other of document.querySelectorAll("[data-object-tab]"))
                    other.classList.toggle("is-active", other === tab);
                for (const panel of document.querySelectorAll("[data-object-panel]"))
                    panel.classList.toggle("is-active", panel.getAttribute("data-object-panel") === tab.getAttribute("data-object-tab"));
                // A drawing measured while its panel was hidden has no box, so the mark on a node is laid
                // down again once the panel it lives in is the one on screen.
                this.inspector?.applyHighlight();
            });
        }
        document.getElementById("object-checks-run")?.addEventListener("click", () => this.runChecks());
        document.getElementById("object-checks-capture")?.addEventListener("click", () => this.addCheckFromTestBed());
        document.getElementById("object-checks-copy")?.addEventListener("click", () => this.copyChecks());
        document.getElementById("object-checks-editor")?.addEventListener("input", () => this.runChecks(false));
        this._checksType = null;
        if (definitionDocument?.type)
            this.setChecksEditorValue(this.readChecks(definitionDocument.type), definitionDocument.type);
    }

    static escapeHtml(value) {
        if (value === undefined || value === null)
            return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectWorkbench;
