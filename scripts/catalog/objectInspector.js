// What an object is doing, read — and changed — beside the drawing it is doing it in.
//
// A definition is a document of formulas: what is drawn is worked out from locals that read the
// object's own parameters and the model's terms, and the only way to see any of that was to read
// the JSON and do the arithmetic by hand. The compiler already holds the answer — every local is
// written onto the component's own parameter frame, which the compilation keeps as
// `componentFrame` — so this panel is a reading of what is already there rather than an evaluation
// of its own. The numbers it shows are the ones the drawing beside it was made from.
//
// The names and expressions behind those numbers come from the document, because the frame holds
// values and not where they came from: an object composed in JSON can say that `ratio` is
// `\frac{value-minimum}{maximum-minimum}` and not merely that it is 0.4. An object whose body is a
// `create()` function has no document to ask, and says so rather than showing an empty table.
//
// Every one of those rows is also where the object is changed. A row knows exactly which local,
// which binding, which property it is showing, so clicking it hands the text of that one thing to
// the author instead of sending them to count brackets in the JSON beside it. What a row hands back
// is a named edit — never a rewritten document — and `ObjectDocument` is what performs it.
class ObjectInspector {
    constructor(hostElement) {
        this.host = hostElement;
        this.drawingHost = null;
        this.highlightedNodeId = null;
        this.selectedDocumentId = null;
        this.definition = null;
        // Set by whoever owns the document. Without it every row is still readable, which is what a
        // panel looking at an object it cannot change should do.
        this.onEdit = null;
        // Delegated once, on the host rather than on anything inside it: the panel rebuilds its
        // own markup on every keystroke of the definition, and a listener bound in there would be
        // added again each time.
        this.host.addEventListener("click", event => this.handleClick(event));
        this.build();
    }

    build() {
        this.host.innerHTML = `
            <div class="object-inspect">
                <div class="object-inspect-summary" data-summary></div>
                <div class="object-inspect-hint" data-hint></div>
                <div class="object-inspect-problems" data-problems></div>
                <div class="object-inspect-section">
                    <div class="object-inspect-title">Locals<span class="object-inspect-count" data-locals-count></span>
                        <button type="button" class="object-inspect-add" data-new="local" title="Add a local">+</button>
                    </div>
                    <table class="object-inspect-table object-inspect-locals"><tbody data-locals></tbody></table>
                </div>
                <div class="object-inspect-section">
                    <div class="object-inspect-title">Parameters<span class="object-inspect-count" data-parameters-count></span></div>
                    <table class="object-inspect-table"><tbody data-parameters></tbody></table>
                </div>
                <div class="object-inspect-section">
                    <div class="object-inspect-title">Nodes<span class="object-inspect-count" data-nodes-count></span></div>
                    <div class="object-inspect-nodes" data-nodes></div>
                    <div class="object-node-detail" data-detail></div>
                </div>
            </div>`;
        this.elements = {
            summary: this.host.querySelector("[data-summary]"),
            problems: this.host.querySelector("[data-problems]"),
            locals: this.host.querySelector("[data-locals]"),
            localsCount: this.host.querySelector("[data-locals-count]"),
            parameters: this.host.querySelector("[data-parameters]"),
            parametersCount: this.host.querySelector("[data-parameters-count]"),
            nodes: this.host.querySelector("[data-nodes]"),
            nodesCount: this.host.querySelector("[data-nodes-count]"),
            hint: this.host.querySelector("[data-hint]"),
            detail: this.host.querySelector("[data-detail]")
        };
    }

    // The drawing the node rows point into. It is handed over rather than looked up, because the
    // preview is rebuilt whenever the definition is retyped and a reference kept here would go
    // stale between one keystroke and the next.
    setDrawingHost(element) {
        this.drawingHost = element;
        this.applyHighlight();
    }

    clear(message) {
        this.host.innerHTML = `<div class="object-inspect-empty">${Utils.escapeXmlText(message)}</div>`;
        this.elements = null;
        this.highlightedNodeId = null;
    }

    render(definitionDocument, outcome) {
        if (!this.elements)
            this.build();
        this.definition = definitionDocument;
        const inspection = outcome.inspection;
        this.renderProblems(outcome.problems);
        if (!inspection) {
            this.renderEmptySections();
            return;
        }
        this.renderSummary(definitionDocument, inspection);
        // Rows carry no box and no pencil at rest — thirty formulas drawn as input fields stop
        // being readable, which is what the panel is for — so one line says they can be typed in.
        this.elements.hint.textContent = this.onEdit ? "Click a formula, a default or a binding to change it. Click a node to see what it is drawn from." : "";
        this.renderRows("locals", this.getLocalRows(definitionDocument, inspection));
        this.renderRows("parameters", this.getParameterRows(definitionDocument, inspection));
        this.renderNodes(inspection);
        this.renderNodeDetail();
        this.applyHighlight();
    }

    renderEmptySections() {
        for (const section of ["locals", "parameters"]) {
            this.elements[section].innerHTML = `<tr class="object-inspect-note"><td colspan="4">Nothing to read until the definition is usable.</td></tr>`;
            this.elements[`${section}Count`].textContent = "";
        }
        this.elements.nodes.innerHTML = "";
        this.elements.detail.innerHTML = "";
        this.elements.nodesCount.textContent = "";
        this.elements.summary.innerHTML = "";
    }

    renderSummary(definitionDocument, inspection) {
        this.elements.summary.innerHTML = [
            `<span class="object-inspect-type">${Utils.escapeXmlText(definitionDocument.type ?? "")}</span>`,
            `<span>schema ${Utils.escapeXmlText(definitionDocument.schemaVersion ?? "—")}</span>`,
            `<span>${Utils.escapeXmlText(inspection.given.preset)}</span>`,
            `<span>${inspection.given.width} × ${inspection.given.height}</span>`,
            `<span>${inspection.compilation.stats.nodeCount} nodes</span>`
        ].join("");
    }

    renderProblems(problems) {
        if (problems.length === 0) {
            this.elements.problems.innerHTML = `<div class="object-inspect-clean"><i class="fa-light fa-check"></i>Nothing wrong with this object.</div>`;
            return;
        }
        this.elements.problems.innerHTML = problems.map(problem => `
            <div class="object-inspect-problem object-inspect-${problem.severity}">
                <i class="fa-light ${problem.severity === "warning" ? "fa-triangle-exclamation" : "fa-circle-exclamation"}"></i>
                <span><b>${Utils.escapeXmlText(problem.path ?? "")}</b>${problem.path ? " — " : ""}${Utils.escapeXmlText(problem.message)}</span>
            </div>`).join("");
    }

    // The locals stand above the parameters they are worked out from, because they are the reason
    // the panel exists: the parameters are written in the document a column away, and the
    // arithmetic between them and the drawing was nowhere at all. Within the list the declared
    // order is kept — each local may read the ones above it, so reading down the column is reading
    // the object's own working, and moving one up or down is moving it in that working.
    getLocalRows(definitionDocument, inspection) {
        const frame = inspection.compilation.componentFrame ?? {};
        const locals = definitionDocument.locals ?? [];
        if (locals.length === 0)
            return [{ note: "This object declares no locals." }];
        return locals.map(local => ({
            key: local.id,
            source: ObjectInspector.describeSource(local),
            latex: local.formula,
            value: frame[local.id],
            editKey: "local-source",
            nameEditKey: "local-rename",
            actions: ["up", "down", "remove"]
        }));
    }

    getParameterRows(definitionDocument, inspection) {
        const frame = inspection.compilation.componentFrame ?? {};
        const parameters = definitionDocument.parameters ?? [];
        if (parameters.length === 0)
            return [{ note: "This object declares no parameters." }];
        return parameters.map(parameter => ({
            key: parameter.id,
            source: parameter.valueType ?? "",
            value: Object.prototype.hasOwnProperty.call(frame, parameter.id) ? frame[parameter.id] : parameter.defaultValue,
            // What is edited here is the value the parameter falls back to, not the reading the
            // test bed is standing it at: the reading belongs to this run, the default to the
            // object. The row shows the reading, so it says which it is on the way in.
            valueEditKey: "parameter-default"
        }));
    }

    renderRows(section, rows) {
        const columns = section === "locals" ? 4 : 3;
        this.elements[section].innerHTML = rows.map(row => {
            if (row.note)
                return `<tr class="object-inspect-note"><td colspan="${columns}">${Utils.escapeXmlText(row.note)}</td></tr>`;
            const name = this.editable(row.nameEditKey)
                ? `<td class="object-inspect-key object-inspect-editable" data-edit="${row.nameEditKey}" data-id="${ObjectInspector.escapeAttribute(row.key)}">${Utils.escapeXmlText(row.key)}</td>`
                : `<td class="object-inspect-key">${Utils.escapeXmlText(row.key)}</td>`;
            const sourceContent = row.latex ? ObjectInspector.renderLatex(row.latex) : Utils.escapeXmlText(row.source);
            const source = this.editable(row.editKey)
                ? `<td class="object-inspect-source object-inspect-editable" data-edit="${row.editKey}" data-id="${ObjectInspector.escapeAttribute(row.key)}" title="${ObjectInspector.escapeAttribute(row.source)}">${sourceContent}</td>`
                : `<td class="object-inspect-source" title="${ObjectInspector.escapeAttribute(row.source)}">${sourceContent}</td>`;
            const valueText = Utils.escapeXmlText(ObjectChecks.formatValue(row.value));
            const value = this.editable(row.valueEditKey)
                ? `<td class="object-inspect-value object-inspect-editable" data-edit="${row.valueEditKey}" data-id="${ObjectInspector.escapeAttribute(row.key)}" title="Its default value">${valueText}</td>`
                : `<td class="object-inspect-value">${valueText}</td>`;
            const actions = row.actions && this.onEdit
                ? `<td class="object-inspect-actions">${row.actions.map(action => ObjectInspector.actionButton(action, { id: row.key })).join("")}</td>`
                : (columns === 4 ? "<td></td>" : "");
            return `<tr>${name}${source}${value}${actions}</tr>`;
        }).join("");
        this.elements[`${section}Count`].textContent = String(rows.filter(row => row.key).length);
    }

    renderNodes(inspection) {
        const documentIds = this.definition?.root ? ObjectDocument.collectNodeIds(this.definition.root) : new Set();
        const markup = [];
        const walk = (nodes, depth, inheritedDocumentId) => {
            for (const node of nodes ?? []) {
                // A part built by a component carries two names: the id inside the component that
                // built it, and the id the document gave the instance. The second is the one the
                // author wrote and the one they will look for.
                const name = node.sourceComponentId ?? node.sourceId;
                // Which node in the document this part came from. A part a component drew has none
                // of its own — the document only names the instance — so it answers for the nearest
                // one above it, which is the node an author can actually change.
                const documentId = documentIds.has(name) ? name : inheritedDocumentId;
                const component = node.sourceComponent ? `<span class="object-inspect-chip">${Utils.escapeXmlText(node.sourceComponent)}</span>` : "";
                const behaviours = (node.behaviours ?? [])
                    .map(behaviour => `<span class="object-inspect-chip object-inspect-chip-behaviour">${Utils.escapeXmlText(behaviour.type)}</span>`)
                    .join("");
                markup.push(`<div class="object-inspect-node" data-node-id="${ObjectInspector.escapeAttribute(node.id)}"${documentId ? ` data-document-id="${ObjectInspector.escapeAttribute(documentId)}"` : ""} style="padding-left:${6 + depth * 12}px">
                    <span class="object-inspect-tag">${Utils.escapeXmlText(node.sourceType ?? node.tag)}</span>
                    <span class="object-inspect-id">${name ? "#" + Utils.escapeXmlText(name) : ""}</span>${component}${behaviours}
                </div>`);
                walk(node.children, depth + 1, documentId);
            }
        };
        walk(inspection.compilation.nodes, 0, null);
        this.elements.nodes.innerHTML = markup.join("");
        this.elements.nodesCount.textContent = String(inspection.compilation.stats.nodeCount);
        for (const row of this.elements.nodes.querySelectorAll("[data-node-id]"))
            row.classList.toggle("object-inspect-selected", row.getAttribute("data-node-id") === this.highlightedNodeId);
    }

    // ---- the selected node, written out -------------------------------------------------------
    // What the document says about the part the author clicked: when it is drawn at all, the values
    // it is drawn from, the literals it carries, and what turns it or lets it be dragged. A part a
    // component built has no entry of its own, so the instance that built it is what is offered —
    // the only node the author can change without opening the component.
    renderNodeDetail() {
        const host = this.elements.detail;
        if (!host)
            return;
        const node = this.selectedDocumentId && this.definition?.root
            ? ObjectDocument.findNode(this.definition.root, this.selectedDocumentId)
            : null;
        if (!node) {
            host.innerHTML = this.highlightedNodeId
                ? `<div class="object-inspect-empty">This part was drawn from inside a component, so the document has nothing to change about it on its own.</div>`
                : "";
            return;
        }
        const holder = ObjectDocument.bindingKey(node);
        const isRoot = node === this.definition.root;
        const bindings = Object.keys(node[holder] ?? {})
            .map(key => this.detailRow(key, ObjectDocument.sourceText(node[holder][key]), { edit: "node-binding", nodeId: node.id, key: key }));
        const properties = Object.keys(node.properties ?? {})
            .map(key => this.detailRow(key, ObjectDocument.sourceText(node.properties[key]), { edit: "node-property", nodeId: node.id, key: key }));
        const listRows = list => (node[list] ?? []).map((entry, index) =>
            this.detailRow(entry.type ?? String(index), JSON.stringify(entry), { edit: "node-list", nodeId: node.id, list: list, index: index }));
        host.innerHTML = `
            <div class="object-node-detail-head">
                <span class="object-inspect-id">#${Utils.escapeXmlText(node.id ?? "")}</span>
                <span class="object-inspect-tag">${Utils.escapeXmlText(node.type ?? "")}</span>
                ${this.onEdit && !isRoot ? `<button type="button" class="object-node-remove" data-act="node-remove" data-node-id="${ObjectInspector.escapeAttribute(node.id)}">Remove</button>` : ""}
            </div>
            <table class="object-inspect-table">${isRoot ? "" : this.detailRow("Drawn when", ObjectDocument.sourceText(node.when) || "always", { edit: "node-when", nodeId: node.id })}</table>
            ${this.detailSection(holder === "parameters" ? "Parameters" : "Bindings", bindings, { new: "node-binding", nodeId: node.id })}
            ${this.detailSection("Properties", properties, { new: "node-property", nodeId: node.id })}
            ${this.detailSection("Modifiers", listRows("modifiers"), { new: "node-modifier", nodeId: node.id })}
            ${this.detailSection("Behaviours", listRows("behaviours"), { new: "node-behaviour", nodeId: node.id })}`;
    }

    detailSection(title, rows, add) {
        const button = this.onEdit
            ? `<button type="button" class="object-inspect-add" data-new="${add.new}" data-node-id="${ObjectInspector.escapeAttribute(add.nodeId)}" title="Add">+</button>`
            : "";
        return `<div class="object-node-detail-section">
            <div class="object-inspect-title">${Utils.escapeXmlText(title)}${button}</div>
            <table class="object-inspect-table"><tbody>${rows.join("") || `<tr class="object-inspect-note"><td colspan="2">None.</td></tr>`}</tbody></table>
        </div>`;
    }

    detailRow(label, text, target) {
        const attributes = [
            target.edit ? `data-edit="${target.edit}"` : "",
            `data-node-id="${ObjectInspector.escapeAttribute(target.nodeId)}"`,
            target.key !== undefined ? `data-key="${ObjectInspector.escapeAttribute(target.key)}"` : "",
            target.list !== undefined ? `data-list="${target.list}"` : "",
            target.index !== undefined ? `data-index="${target.index}"` : ""
        ].filter(Boolean).join(" ");
        const editable = target.edit && this.onEdit ? " object-inspect-editable" : "";
        return `<tr>
            <td class="object-inspect-key">${Utils.escapeXmlText(label)}</td>
            <td class="object-node-detail-value${editable}" ${attributes} title="${ObjectInspector.escapeAttribute(text)}">${Utils.escapeXmlText(text)}</td>
        </tr>`;
    }

    // ---- editing ------------------------------------------------------------------------------
    editable(editKey) {
        return Boolean(editKey && this.onEdit);
    }

    handleClick(event) {
        const node = event.target.closest("[data-node-id].object-inspect-node");
        if (node) {
            this.selectNode(node.getAttribute("data-node-id"), node.getAttribute("data-document-id"));
            return;
        }
        const action = event.target.closest("[data-act]");
        if (action) {
            this.runAction(action);
            return;
        }
        const adder = event.target.closest("[data-new]");
        if (adder) {
            this.openNewRow(adder);
            return;
        }
        const cell = event.target.closest("[data-edit]");
        if (cell && this.onEdit)
            this.openEditor(cell);
    }

    runAction(element) {
        const action = element.getAttribute("data-act");
        const id = element.getAttribute("data-id");
        if (action === "up" || action === "down")
            this.commit({ kind: "local-move", id: id, by: action === "up" ? -1 : 1 });
        else if (action === "remove")
            this.commit({ kind: "local-remove", id: id });
        else if (action === "node-remove")
            this.commit({ kind: "node-remove", nodeId: element.getAttribute("data-node-id") });
    }

    // A cell hands over the text the document really holds, not the reading shown at rest: a
    // binding described as "valueVariable" is `{"parameter": "valueVariable", "as": "number"}`, and
    // an author editing the reading would throw the rest of it away without being told.
    sourceTextFor(cell) {
        const kind = cell.getAttribute("data-edit");
        const id = cell.getAttribute("data-id");
        const document_ = this.definition ?? {};
        if (kind === "local-source")
            return ObjectDocument.localSourceText((document_.locals ?? []).find(local => local.id === id));
        if (kind === "local-rename")
            return id;
        if (kind === "parameter-default")
            return ObjectDocument.sourceText((document_.parameters ?? []).find(parameter => parameter.id === id)?.defaultValue);
        const node = ObjectDocument.findNode(document_.root, cell.getAttribute("data-node-id"));
        if (!node)
            return "";
        if (kind === "node-when")
            return ObjectDocument.sourceText(node.when);
        if (kind === "node-binding")
            return ObjectDocument.sourceText((node[ObjectDocument.bindingKey(node)] ?? {})[cell.getAttribute("data-key")]);
        if (kind === "node-property")
            return ObjectDocument.sourceText((node.properties ?? {})[cell.getAttribute("data-key")]);
        if (kind === "node-list")
            return JSON.stringify((node[cell.getAttribute("data-list")] ?? [])[Number(cell.getAttribute("data-index"))] ?? {});
        return "";
    }

    openEditor(cell) {
        const original = this.sourceTextFor(cell);
        const input = document.createElement("input");
        input.type = "text";
        input.className = "object-inspect-input";
        input.spellcheck = false;
        input.value = original;
        cell.innerHTML = "";
        cell.appendChild(input);
        input.focus();
        input.select();
        let closed = false;
        const close = commit => {
            if (closed)
                return;
            closed = true;
            // A row that was opened and left alone is put back untouched. Committing it anyway
            // would rewrite a formula as whatever the reader happens to normalise it to, and fill
            // the undo history with edits nobody made.
            if (commit && input.value !== original)
                this.commit(this.buildEdit(cell, input.value));
            else
                this.restore(cell);
        };
        input.addEventListener("keydown", event => {
            if (event.key === "Enter")
                close(true);
            else if (event.key === "Escape")
                close(false);
            event.stopPropagation();
        });
        input.addEventListener("blur", () => close(true));
    }

    buildEdit(cell, text) {
        const kind = cell.getAttribute("data-edit");
        const id = cell.getAttribute("data-id");
        if (kind === "local-source")
            return { kind: "local-set", id: id, text: text };
        if (kind === "local-rename")
            return { kind: "local-rename", id: id, name: text };
        if (kind === "parameter-default")
            return { kind: "parameter-default", id: id, text: text };
        const nodeId = cell.getAttribute("data-node-id");
        if (kind === "node-when")
            return { kind: "node-when", nodeId: nodeId, text: text };
        if (kind === "node-binding")
            return { kind: "node-binding", nodeId: nodeId, key: cell.getAttribute("data-key"), text: text };
        if (kind === "node-property")
            return { kind: "node-property", nodeId: nodeId, key: cell.getAttribute("data-key"), text: text };
        return { kind: "node-list", nodeId: nodeId, list: cell.getAttribute("data-list"), index: Number(cell.getAttribute("data-index")), text: text };
    }

    // Adding needs a name as well as a value, so it is asked for in the row it will become rather
    // than in a dialogue over the drawing.
    openNewRow(button) {
        const kind = button.getAttribute("data-new");
        const table = button.closest(".object-inspect-section, .object-node-detail-section").querySelector("tbody");
        const wantsName = kind === "local" || kind === "node-binding" || kind === "node-property";
        const columns = kind === "local" ? 4 : 2;
        const row = document.createElement("tr");
        row.className = "object-inspect-new";
        row.innerHTML = wantsName
            ? `<td><input class="object-inspect-input" data-new-name placeholder="name" spellcheck="false"></td>
               <td colspan="${columns - 1}"><input class="object-inspect-input" data-new-value placeholder="${kind === "local" ? "a formula, or a binding in braces" : "value"}" spellcheck="false"></td>`
            : `<td colspan="${columns}"><input class="object-inspect-input" data-new-value placeholder='{"type": "…"}' spellcheck="false"></td>`;
        table.appendChild(row);
        const nameInput = row.querySelector("[data-new-name]");
        const valueInput = row.querySelector("[data-new-value]");
        (nameInput ?? valueInput).focus();
        const nodeId = button.getAttribute("data-node-id");
        const commit = () => {
            const name = nameInput?.value.trim() ?? "";
            const text = valueInput.value;
            if (wantsName && name === "") {
                row.remove();
                return;
            }
            if (!wantsName && text.trim() === "") {
                row.remove();
                return;
            }
            if (kind === "local")
                this.commit({ kind: "local-add", name: name, text: text, after: this.definition?.locals?.at(-1)?.id });
            else if (kind === "node-binding")
                this.commit({ kind: "node-binding", nodeId: nodeId, key: name, text: text });
            else if (kind === "node-property")
                this.commit({ kind: "node-property", nodeId: nodeId, key: name, text: text });
            else
                this.commit({ kind: "node-list", nodeId: nodeId, list: kind === "node-behaviour" ? "behaviours" : "modifiers", text: text });
        };
        for (const input of row.querySelectorAll("input")) {
            input.addEventListener("keydown", event => {
                if (event.key === "Enter")
                    commit();
                else if (event.key === "Escape")
                    row.remove();
                event.stopPropagation();
            });
        }
    }

    commit(edit) {
        this.onEdit?.(edit);
    }

    // An editor closed without an edit leaves the row as it was. The panel is redrawn from the
    // document whenever one lands, so this only has to matter for the row that did not change.
    restore(cell) {
        const kind = cell.getAttribute("data-edit");
        const text = this.sourceTextFor(cell);
        if (kind === "local-source") {
            const local = (this.definition?.locals ?? []).find(entry => entry.id === cell.getAttribute("data-id"));
            cell.innerHTML = local?.formula !== undefined ? ObjectInspector.renderLatex(local.formula) : Utils.escapeXmlText(ObjectInspector.describeSource(local ?? {}));
            return;
        }
        cell.innerHTML = Utils.escapeXmlText(text);
    }

    selectNode(nodeId, documentId) {
        const wasSelected = this.highlightedNodeId === nodeId;
        this.highlightedNodeId = wasSelected ? null : nodeId;
        this.selectedDocumentId = wasSelected ? null : (documentId || null);
        for (const row of this.elements.nodes.querySelectorAll("[data-node-id]"))
            row.classList.toggle("object-inspect-selected", row.getAttribute("data-node-id") === this.highlightedNodeId);
        this.renderNodeDetail();
        this.applyHighlight();
    }

    toggleHighlight(nodeId) {
        this.selectNode(nodeId, this.elements?.nodes.querySelector(`[data-node-id="${CSS.escape(nodeId)}"]`)?.getAttribute("data-document-id"));
    }

    // The mark is drawn into the preview rather than painted onto the part, because the part is the
    // drawing and an author looking at it should be shown where a node is without being shown a
    // colour the object does not really have.
    applyHighlight() {
        const svg = this.drawingHost?.querySelector("svg");
        svg?.querySelector("[data-inspect-highlight]")?.remove();
        if (!svg || !this.highlightedNodeId)
            return;
        const target = svg.querySelector(`[data-block-id="${CSS.escape(this.highlightedNodeId)}"]`);
        const matrix = svg.getScreenCTM();
        if (!target || !matrix)
            return;
        const box = target.getBoundingClientRect();
        const inverse = matrix.inverse();
        const toLocal = (x, y) => {
            const point = svg.createSVGPoint();
            point.x = x;
            point.y = y;
            return point.matrixTransform(inverse);
        };
        const topLeft = toLocal(box.left, box.top);
        const bottomRight = toLocal(box.right, box.bottom);
        const rectangle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rectangle.setAttribute("data-inspect-highlight", this.highlightedNodeId);
        rectangle.setAttribute("x", Math.min(topLeft.x, bottomRight.x) - 2);
        rectangle.setAttribute("y", Math.min(topLeft.y, bottomRight.y) - 2);
        rectangle.setAttribute("width", Math.abs(bottomRight.x - topLeft.x) + 4);
        rectangle.setAttribute("height", Math.abs(bottomRight.y - topLeft.y) + 4);
        rectangle.setAttribute("fill", "none");
        rectangle.setAttribute("stroke", "#0f6cbd");
        rectangle.setAttribute("stroke-width", "1.5");
        rectangle.setAttribute("stroke-dasharray", "4 3");
        rectangle.setAttribute("pointer-events", "none");
        svg.appendChild(rectangle);
    }

    static actionButton(action, target) {
        const marks = { up: "↑", down: "↓", remove: "✕" };
        const titles = { up: "Work this out earlier", down: "Work this out later", remove: "Remove this local" };
        return `<button type="button" class="object-inspect-action" data-act="${action}" data-id="${ObjectInspector.escapeAttribute(target.id)}" title="${titles[action]}">${marks[action]}</button>`;
    }

    static escapeAttribute(value) {
        return Utils.escapeXmlText(value).replace(/"/g, "&quot;");
    }

    // A local is either a formula, which is shown as the mathematics it is, or a binding, which is
    // named by the one thing it reads. Naming the kind is what tells a reader whether a value came
    // from the object, the model, the tokens or the drawing's own size.
    static describeSource(local) {
        if (local.formula !== undefined)
            return String(local.formula);
        return ObjectInspector.describeBinding(local.value);
    }

    static describeBinding(binding) {
        if (binding === null || binding === undefined)
            return "";
        if (typeof binding !== "object")
            return String(binding);
        if (binding.parameter !== undefined)
            return String(binding.parameter);
        if (binding.formula !== undefined)
            return String(binding.formula);
        if (binding.variable !== undefined)
            return `variable ${binding.variable}`;
        if (binding.token !== undefined)
            return `token ${binding.token}`;
        if (binding.constant !== undefined)
            return String(binding.constant);
        if (binding.expression !== undefined)
            return String(binding.expression);
        if (binding.format !== undefined)
            return `format ${ObjectInspector.describeBinding(binding.format)}`;
        if (binding.choose !== undefined)
            return `choose ${ObjectInspector.describeBinding(binding.choose)}`;
        if (binding.concat !== undefined)
            return "concat";
        if (binding.termUnit !== undefined)
            return `unit of ${ObjectInspector.describeBinding(binding.termUnit)}`;
        if (binding.memory !== undefined)
            return `memory ${binding.memory}`;
        return "binding";
    }

    static renderLatex(latex) {
        if (typeof window !== "undefined" && window.katex) {
            try {
                return window.katex.renderToString(String(latex), { throwOnError: false, displayMode: false });
            } catch {
                return Utils.escapeXmlText(String(latex));
            }
        }
        return Utils.escapeXmlText(String(latex));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectInspector;
