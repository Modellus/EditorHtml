// Changing an object, rather than retyping it.
//
// A definition is a document, and until now the only way to change one was to edit its JSON by
// hand: find the local among thirty, count the brackets, keep the commas. The panel beside the
// drawing already knows where everything is — which local holds which formula, which node carries
// which binding — so an edit made there is a small, named change to the document rather than a
// text edit that happens to be valid.
//
// This is the whole of that: the document surgery, with no screen in it. Every operation takes the
// document and an edit and gives back a new document, so the caller can hold what it had and put it
// back. Nothing here decides whether the result is usable — that is what the loader, the compiler
// and the validator are for, and they are asked immediately afterwards.
class ObjectDocument {
    static identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
    static numberPattern = /^-?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

    static clone(document) {
        return JSON.parse(JSON.stringify(document));
    }

    static serialize(document) {
        return JSON.stringify(document, null, 4);
    }

    // What a row hands the author to edit. It is the value exactly as the document writes it, not
    // the friendly reading shown at rest: a binding described as "valueVariable" is really
    // `{"parameter": "valueVariable", "as": "number"}`, and an author who edited the reading would
    // silently throw the rest of it away.
    static sourceText(value) {
        if (value === undefined)
            return "";
        if (typeof value === "string")
            return value;
        if (typeof value === "number" || typeof value === "boolean")
            return String(value);
        return JSON.stringify(value);
    }

    static localSourceText(local) {
        return local?.formula !== undefined ? String(local.formula) : ObjectDocument.sourceText(local?.value);
    }

    // A binding says where a value comes from, so the shorthands are the ones an author would write
    // by hand: a bare name is the parameter or local of that name, a number or true/false is the
    // constant itself, anything in braces is the binding written out, and everything else is read
    // as the mathematics it looks like.
    static readBinding(text) {
        const trimmed = String(text).trim();
        if (trimmed === "")
            return { value: undefined };
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            try {
                return { value: JSON.parse(trimmed) };
            } catch (error) {
                return { problem: `That is not valid JSON: ${error.message}` };
            }
        }
        if (trimmed === "true" || trimmed === "false")
            return { value: trimmed === "true" };
        if (ObjectDocument.numberPattern.test(trimmed))
            return { value: Number(trimmed) };
        if (ObjectDocument.identifierPattern.test(trimmed))
            return { value: { parameter: trimmed } };
        return { value: { formula: trimmed } };
    }

    // A property is a literal the primitive is drawn with — a colour, a number, a word like "none"
    // — and never a binding, so a bare name stays the word it is rather than becoming a reference.
    static readLiteral(text) {
        const trimmed = String(text).trim();
        if (trimmed === "")
            return { value: undefined };
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("\"")) {
            try {
                return { value: JSON.parse(trimmed) };
            } catch (error) {
                return { problem: `That is not valid JSON: ${error.message}` };
            }
        }
        if (trimmed === "true" || trimmed === "false")
            return { value: trimmed === "true" };
        if (trimmed === "null")
            return { value: null };
        if (ObjectDocument.numberPattern.test(trimmed))
            return { value: Number(trimmed) };
        return { value: trimmed };
    }

    static findNode(node, id) {
        if (!node || typeof node !== "object")
            return null;
        if (node.id === id)
            return node;
        for (const child of node.children ?? []) {
            const found = ObjectDocument.findNode(child, id);
            if (found)
                return found;
        }
        return null;
    }

    static findParent(node, id) {
        for (const child of node?.children ?? []) {
            if (child.id === id)
                return node;
            const found = ObjectDocument.findParent(child, id);
            if (found)
                return found;
        }
        return null;
    }

    static collectNodeIds(node, ids = new Set()) {
        if (!node || typeof node !== "object")
            return ids;
        if (typeof node.id === "string")
            ids.add(node.id);
        for (const child of node.children ?? [])
            ObjectDocument.collectNodeIds(child, ids);
        return ids;
    }

    // Where a node writes the values it is drawn from: a primitive binds them, a component instance
    // passes them as its parameters. Both are the same thing to an author, so a row does not ask
    // which it is looking at.
    static bindingKey(node) {
        if (node.parameters && !node.bindings)
            return "parameters";
        return "bindings";
    }

    static declaredNames(document) {
        const names = new Set();
        for (const parameter of document.parameters ?? [])
            names.add(parameter.id);
        for (const local of document.locals ?? [])
            names.add(local.id);
        return names;
    }

    static uniqueName(taken, stem) {
        if (!taken.has(stem))
            return stem;
        for (let index = 2; ; index++) {
            const candidate = `${stem}${index}`;
            if (!taken.has(candidate))
                return candidate;
        }
    }

    // A name is rewritten lexically, the way the loader reads names out of a formula: commands are
    // matched whole first, so renaming a local called "max" can never reach into `\max`.
    static renameInFormula(latex, from, to) {
        return String(latex).replace(/\\[A-Za-z]+|[A-Za-z][A-Za-z0-9]*/g, token => (token === from ? to : token));
    }

    static renameReferences(value, from, to) {
        if (Array.isArray(value))
            return value.map(entry => ObjectDocument.renameReferences(entry, from, to));
        if (!value || typeof value !== "object")
            return value;
        for (const key of Object.keys(value)) {
            if (key === "formula" && typeof value[key] === "string")
                value[key] = ObjectDocument.renameInFormula(value[key], from, to);
            else if ((key === "parameter" || key === "variable") && value[key] === from)
                value[key] = to;
            else
                value[key] = ObjectDocument.renameReferences(value[key], from, to);
        }
        return value;
    }

    // Every edit the panel can make, in one place. The document handed in is never touched: what
    // comes back is a new one, so the caller keeps the old text to undo to.
    static apply(document, edit) {
        const next = ObjectDocument.clone(document);
        const problem = ObjectDocument.mutate(next, edit);
        return problem ? { document: document, problem: problem } : { document: next, problem: null };
    }

    static mutate(document, edit) {
        switch (edit.kind) {
            case "local-set": return ObjectDocument.setLocal(document, edit);
            case "local-rename": return ObjectDocument.renameLocal(document, edit);
            case "local-add": return ObjectDocument.addLocal(document, edit);
            case "local-remove": return ObjectDocument.removeLocal(document, edit);
            case "local-move": return ObjectDocument.moveLocal(document, edit);
            case "parameter-default": return ObjectDocument.setParameterDefault(document, edit);
            case "node-when": return ObjectDocument.setNodeWhen(document, edit);
            case "node-binding": return ObjectDocument.setNodeBinding(document, edit);
            case "node-property": return ObjectDocument.setNodeProperty(document, edit);
            case "node-list": return ObjectDocument.setNodeListEntry(document, edit);
            case "node-remove": return ObjectDocument.removeNode(document, edit);
            default: return `There is no edit called "${edit.kind}".`;
        }
    }

    // ---- locals ---------------------------------------------------------------------------------
    // A local is either a formula or a binding, and which one it is follows from what the author
    // typed rather than from what it was: writing mathematics over a binding makes it a formula,
    // and writing a binding over mathematics makes it a binding. That is the "binding kind" an
    // author could only change before by rewriting the object of two keys by hand.
    static setLocal(document, edit) {
        const locals = document.locals ?? [];
        const index = locals.findIndex(local => local.id === edit.id);
        if (index < 0)
            return `There is no local called "${edit.id}".`;
        const read = ObjectDocument.readBinding(edit.text);
        if (read.problem)
            return read.problem;
        if (read.value === undefined)
            return "A local has to say what it is worked out from.";
        const replacement = { id: edit.id };
        if (read.value && typeof read.value === "object" && read.value.formula !== undefined && Object.keys(read.value).length === 1)
            replacement.formula = read.value.formula;
        else
            replacement.value = read.value;
        if (locals[index].fallback !== undefined)
            replacement.fallback = locals[index].fallback;
        locals[index] = replacement;
        return null;
    }

    static renameLocal(document, edit) {
        const locals = document.locals ?? [];
        const index = locals.findIndex(local => local.id === edit.id);
        if (index < 0)
            return `There is no local called "${edit.id}".`;
        const name = String(edit.name ?? "").trim();
        if (!ObjectDocument.identifierPattern.test(name) || name.startsWith("$"))
            return "A name is letters and digits, starting with a letter.";
        if (name === edit.id)
            return null;
        if (ObjectDocument.declaredNames(document).has(name))
            return `"${name}" is already the name of a parameter or a local.`;
        locals[index] = Object.assign({}, locals[index], { id: name });
        // Everything that read the old name is rewritten with it, or the rename would leave the
        // object reading a term of that name in the model instead — which is precisely the silent
        // failure the loader's unknown-name check exists to prevent.
        for (const local of locals)
            ObjectDocument.renameReferences(local, edit.id, name);
        ObjectDocument.renameReferences(document.root, edit.id, name);
        for (const key of ["indexedSource", "valueSource", "axisFit"]) {
            if (document[key])
                ObjectDocument.renameReferences(document[key], edit.id, name);
        }
        for (const parameter of document.parameters ?? []) {
            for (const field of ["writesLocal", "writesWhen"]) {
                if (parameter[field] === edit.id)
                    parameter[field] = name;
            }
        }
        return null;
    }

    // A new local goes in beside the one it was added from, because the order is the working: each
    // local may read the ones above it, so a new one appended to the end could not be read by
    // anything already written.
    static addLocal(document, edit) {
        const name = String(edit.name ?? "").trim();
        if (!ObjectDocument.identifierPattern.test(name) || name.startsWith("$"))
            return "A name is letters and digits, starting with a letter.";
        if (ObjectDocument.declaredNames(document).has(name))
            return `"${name}" is already the name of a parameter or a local.`;
        const read = ObjectDocument.readBinding(edit.text === undefined || String(edit.text).trim() === "" ? "0" : edit.text);
        if (read.problem)
            return read.problem;
        const local = { id: name };
        if (read.value && typeof read.value === "object" && read.value.formula !== undefined && Object.keys(read.value).length === 1)
            local.formula = read.value.formula;
        else
            local.value = read.value;
        document.locals ??= [];
        const after = edit.after ? document.locals.findIndex(entry => entry.id === edit.after) : -1;
        document.locals.splice(after < 0 ? document.locals.length : after + 1, 0, local);
        return null;
    }

    static removeLocal(document, edit) {
        const locals = document.locals ?? [];
        const index = locals.findIndex(local => local.id === edit.id);
        if (index < 0)
            return `There is no local called "${edit.id}".`;
        locals.splice(index, 1);
        return null;
    }

    static moveLocal(document, edit) {
        const locals = document.locals ?? [];
        const index = locals.findIndex(local => local.id === edit.id);
        if (index < 0)
            return `There is no local called "${edit.id}".`;
        const target = index + Number(edit.by ?? 0);
        if (target < 0 || target >= locals.length)
            return null;
        const [moved] = locals.splice(index, 1);
        locals.splice(target, 0, moved);
        return null;
    }

    // ---- parameters -----------------------------------------------------------------------------
    // Only the value a parameter falls back to, not the declaration around it: what a parameter is
    // called, where its control lands and when it is offered are the toolbar's business, and are
    // edited where the toolbar is composed.
    static setParameterDefault(document, edit) {
        const parameter = (document.parameters ?? []).find(entry => entry.id === edit.id);
        if (!parameter)
            return `There is no parameter called "${edit.id}".`;
        const read = ObjectDocument.readLiteral(edit.text);
        if (read.problem)
            return read.problem;
        parameter.defaultValue = read.value === undefined ? "" : read.value;
        return null;
    }

    // ---- nodes ----------------------------------------------------------------------------------
    static setNodeWhen(document, edit) {
        const node = ObjectDocument.findNode(document.root, edit.nodeId);
        if (!node)
            return `There is no node called "${edit.nodeId}".`;
        if (node === document.root)
            return "The root is always drawn, so it carries no condition.";
        const read = ObjectDocument.readBinding(edit.text);
        if (read.problem)
            return read.problem;
        if (read.value === undefined)
            delete node.when;
        else
            node.when = read.value;
        return null;
    }

    static setNodeBinding(document, edit) {
        const node = ObjectDocument.findNode(document.root, edit.nodeId);
        if (!node)
            return `There is no node called "${edit.nodeId}".`;
        const key = String(edit.key ?? "").trim();
        if (key === "")
            return "A binding needs the name of what it sets.";
        const read = ObjectDocument.readBinding(edit.text);
        if (read.problem)
            return read.problem;
        const holder = ObjectDocument.bindingKey(node);
        node[holder] ??= {};
        if (read.value === undefined)
            delete node[holder][key];
        else
            node[holder][key] = read.value;
        return null;
    }

    static setNodeProperty(document, edit) {
        const node = ObjectDocument.findNode(document.root, edit.nodeId);
        if (!node)
            return `There is no node called "${edit.nodeId}".`;
        const key = String(edit.key ?? "").trim();
        if (key === "")
            return "A property needs the name of what it sets.";
        const read = ObjectDocument.readLiteral(edit.text);
        if (read.problem)
            return read.problem;
        node.properties ??= {};
        if (read.value === undefined)
            delete node.properties[key];
        else
            node.properties[key] = read.value;
        return null;
    }

    // A modifier turns, moves or repeats what a node draws; a behaviour is what the node does when
    // it is dragged or pressed. Both are written out, because both are whole objects rather than a
    // value: what a rotate turns around is as much of the modifier as the angle it turns by.
    static setNodeListEntry(document, edit) {
        const node = ObjectDocument.findNode(document.root, edit.nodeId);
        if (!node)
            return `There is no node called "${edit.nodeId}".`;
        const list = edit.list === "behaviours" ? "behaviours" : "modifiers";
        const trimmed = String(edit.text ?? "").trim();
        const index = Number(edit.index);
        if (trimmed === "") {
            if (Number.isInteger(index) && index >= 0 && index < (node[list]?.length ?? 0)) {
                node[list].splice(index, 1);
                if (node[list].length === 0)
                    delete node[list];
            }
            return null;
        }
        let parsed = null;
        try {
            parsed = JSON.parse(trimmed);
        } catch (error) {
            return `That is not valid JSON: ${error.message}`;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            return `A ${list === "behaviours" ? "behaviour" : "modifier"} is written as an object with a type.`;
        if (typeof parsed.type !== "string" || parsed.type === "")
            return `A ${list === "behaviours" ? "behaviour" : "modifier"} needs a type.`;
        node[list] ??= [];
        if (Number.isInteger(index) && index >= 0 && index < node[list].length)
            node[list][index] = parsed;
        else
            node[list].push(parsed);
        return null;
    }

    static removeNode(document, edit) {
        if (document.root?.id === edit.nodeId)
            return "The root node is the object itself, so it cannot be removed.";
        const parent = ObjectDocument.findParent(document.root, edit.nodeId);
        if (!parent)
            return `There is no node called "${edit.nodeId}".`;
        parent.children = parent.children.filter(child => child.id !== edit.nodeId);
        return null;
    }

    // ---- starting from something that already works ---------------------------------------------
    // A catalogue object cannot take the type of one the editor ships, so starting from a shipped
    // object is a fork: the same drawing under a name of its own, which the author then changes.
    // Doing it any other way means pasting fifteen kilobytes of JSON out of the repository.
    static fork(definitionDocument, takenTypes = new Set()) {
        const forked = ObjectDocument.clone(definitionDocument);
        const stem = `my-${definitionDocument.type}`;
        let type = stem;
        for (let index = 2; takenTypes.has(type); index++)
            type = `${stem}-${index}`;
        forked.type = type;
        forked.displayName = `${definitionDocument.displayName ?? definitionDocument.type} (copy)`;
        return forked;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectDocument;
