// Registers a component whose body is a JSON node tree instead of a create() function.
// The definitions live in scripts/blocks/definitions/*.json and reach the browser through
// definitions.generated.js, which tests/component-definitions.spec.js keeps in step with them.
class BlockDefinitionLoader {
    static typePattern = /^[a-z][a-z0-9-]{2,48}$/;
    // The document each registered component was built from, so a component can be inspected,
    // edited and registered again without going back to the file it came from.
    static documents = new Map();

    static getDocument(type) {
        return BlockDefinitionLoader.documents.get(type) ?? null;
    }

    static registerAll(documents, registry = BlockRegistry) {
        return (documents ?? []).map(document => BlockDefinitionLoader.register(document, registry));
    }

    static async loadFromUrl(url, registry = BlockRegistry) {
        const response = await fetch(url);
        if (!response.ok)
            throw new Error(`Component definition "${url}" could not be read (${response.status}).`);
        return BlockDefinitionLoader.register(await response.json(), registry);
    }

    static register(document, registry = BlockRegistry) {
        const problems = BlockDefinitionLoader.inspect(document);
        if (problems.length > 0)
            throw new Error(`Component definition is not usable: ${problems.join(" ")}`);
        // Formula inputs are wired up once here, not per draw: the names a formula may read are
        // fixed by the parameter and local declarations, so only the values change between draws.
        const scope = BlockDefinitionLoader.buildScope(document);
        const locals = BlockDefinitionLoader.bindFormulas(BlockMigrations.clone(document.locals ?? []), scope);
        const root = BlockDefinitionLoader.bindFormulas(BlockMigrations.clone(document.root), scope);
        BlockDefinitionLoader.documents.set(document.type, BlockMigrations.clone(document));
        return registry.register({
            type: document.type,
            version: document.version ?? "1.0.0",
            category: "component",
            displayName: document.displayName ?? document.type,
            description: document.description ?? "",
            icon: document.icon,
            tags: document.tags ?? [],
            capabilities: document.capabilities ?? [],
            aliases: document.aliases ?? [],
            parameters: (document.parameters ?? []).map(parameter => BlockDefinitionLoader.normalizeParameter(parameter)),
            agentAccessible: document.agentAccessible !== false,
            create: (parameters, context) => {
                BlockDefinitionLoader.applyLocals(locals, parameters, context);
                return BlockDefinitionLoader.pruneNode(BlockMigrations.clone(root), context);
            }
        });
    }

    // Every name a formula in this document may read, mapped to the binding that supplies it.
    // Nothing is implicit: a formula reads what this document declares, so no name can quietly
    // mean something the author did not write. The drawing size is reached by declaring a local
    // bound to $width or $height, like any other value.
    static buildScope(document) {
        const scope = {};
        for (const parameter of document.parameters ?? [])
            scope[parameter.id] = { parameter: parameter.id, as: "number" };
        for (const local of document.locals ?? [])
            scope[local.id] = { parameter: local.id };
        return scope;
    }

    // The names a formula reads, found lexically: the four functions spelled in plain letters go
    // first, since nothing marks them as functions once the parentheses are gone; then commands,
    // then number literals — but only where a digit starts a number rather than ending a name, so
    // "orbitRadius0" stays whole while "1e5" does not leave an "e5" behind.
    static readNames(latex) {
        const bare = String(latex)
            .replace(Utils.getPlainFunctionCallPattern(), "$1 ")
            .replace(/\\[A-Za-z]+/g, " ")
            .replace(/(?<![A-Za-z0-9])\d+(\.\d+)?([eE][+-]?\d+)?/g, " ");
        return Array.from(new Set(bare.match(/[A-Za-z][A-Za-z0-9]*/g) ?? []));
    }

    static bindFormulas(value, scope) {
        if (Array.isArray(value))
            return value.map(entry => BlockDefinitionLoader.bindFormulas(entry, scope));
        if (!value || typeof value !== "object")
            return value;
        for (const key of Object.keys(value))
            value[key] = BlockDefinitionLoader.bindFormulas(value[key], scope);
        if (typeof value.formula !== "string")
            return value;
        const inputs = {};
        for (const name of BlockDefinitionLoader.readNames(value.formula)) {
            if (scope[name])
                inputs[name] = scope[name];
        }
        value.inputs = Object.assign(inputs, value.inputs ?? {});
        return value;
    }

    // Reports every formula name the document does not supply. Without this an undeclared name
    // silently falls through to a model term of that name, which is how a formula ends up reading
    // something the author never meant.
    static findUnknownNames(value, declared, path, problems) {
        if (Array.isArray(value)) {
            value.forEach((entry, index) => BlockDefinitionLoader.findUnknownNames(entry, declared, `${path}[${index}]`, problems));
            return problems;
        }
        if (!value || typeof value !== "object")
            return problems;
        if (typeof value.formula === "string") {
            const supplied = new Set([...declared, ...Object.keys(value.inputs ?? {})]);
            const unknown = BlockDefinitionLoader.readNames(value.formula).filter(name => !supplied.has(name));
            if (unknown.length > 0)
                problems.push(`Formula at ${path} reads ${unknown.map(name => `"${name}"`).join(", ")}, which the definition does not declare.`);
        }
        for (const key of Object.keys(value)) {
            if (key !== "inputs")
                BlockDefinitionLoader.findUnknownNames(value[key], declared, `${path}.${key}`, problems);
        }
        return problems;
    }

    // Locals are evaluated in order onto the component's own parameter frame, so every child can
    // read a value the definition derives once instead of repeating the formula that builds it.
    static applyLocals(locals, parameters, context) {
        for (const local of locals)
            parameters[local.id] = context.resolve(local.formula === undefined ? local.value : local, local.fallback ?? 0);
    }

    // Children carrying a "when" that resolves false are dropped before compilation, so they cost
    // nothing and do not shift the sibling indices their neighbours are identified by.
    static pruneNode(node, context) {
        if (!node || typeof node !== "object" || !Array.isArray(node.children))
            return node;
        const kept = [];
        for (const child of node.children) {
            if (child?.when !== undefined) {
                if (!BlockBindings.isTruthy(context.resolve(child.when, false)))
                    continue;
                delete child.when;
            }
            kept.push(BlockDefinitionLoader.pruneNode(child, context));
        }
        node.children = kept;
        return node;
    }

    static normalizeParameter(parameter) {
        return Object.assign({
            id: parameter.id,
            label: parameter.label ?? parameter.id,
            valueType: parameter.valueType ?? "number",
            defaultValue: parameter.defaultValue,
            description: "",
            required: false,
            bindable: true,
            agentAccessible: true,
            userEditable: true,
            category: "general"
        }, parameter);
    }

    static inspect(document) {
        const problems = [];
        if (!document || typeof document !== "object")
            return ["The definition is not an object."];
        if (!BlockMigrations.isSupportedVersion(document.schemaVersion))
            problems.push(`Schema version "${document.schemaVersion}" is not supported.`);
        if (!BlockDefinitionLoader.typePattern.test(String(document.type ?? "")))
            problems.push("The type must be lower-case letters, digits and dashes.");
        if (document.category !== "component")
            problems.push("Only components can be defined as JSON.");
        if (!document.root || typeof document.root !== "object")
            problems.push("The definition has no root node.");
        const declared = new Set();
        for (const parameter of document.parameters ?? []) {
            if (typeof parameter?.id !== "string" || parameter.id === "")
                problems.push("Every parameter needs an id.");
            else
                declared.add(parameter.id);
        }
        // Locals are checked against what is declared before them, so a formula reaching forward to
        // a local that has not been worked out yet is reported instead of quietly reading nothing.
        const locals = document.locals ?? [];
        for (let index = 0; index < locals.length; index++) {
            const local = locals[index];
            if (typeof local?.id !== "string" || local.id === "") {
                problems.push("Every local needs an id.");
                continue;
            }
            if (declared.has(local.id))
                problems.push(`Local "${local.id}" collides with a parameter or an earlier local.`);
            BlockDefinitionLoader.findUnknownNames(local, declared, `locals[${index}]`, problems);
            declared.add(local.id);
        }
        if (document.root)
            BlockDefinitionLoader.findUnknownNames(document.root, declared, "root", problems);
        return problems;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockDefinitionLoader;
