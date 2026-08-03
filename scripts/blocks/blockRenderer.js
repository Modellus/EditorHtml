class BlockRenderer {
    static escapeAttribute(value) {
        return String(value ?? "").replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character]));
    }

    static buildAttributes(node) {
        const parts = [`data-block-id="${BlockRenderer.escapeAttribute(node.id)}"`];
        if (node.sourceId)
            parts.push(`data-source-id="${BlockRenderer.escapeAttribute(node.sourceId)}"`);
        parts.push(`data-source-type="${BlockRenderer.escapeAttribute(node.sourceType)}"`);
        if (node.sourceComponent)
            parts.push(`data-source-component="${BlockRenderer.escapeAttribute(node.sourceComponent)}"`);
        if (node.sourceComponentId)
            parts.push(`data-source-component-id="${BlockRenderer.escapeAttribute(node.sourceComponentId)}"`);
        for (const [name, value] of Object.entries(node.attributes ?? {})) {
            if (value === null || value === undefined || value === "")
                continue;
            parts.push(`${name}="${BlockRenderer.escapeAttribute(value)}"`);
        }
        if (node.transform)
            parts.push(`transform="${BlockRenderer.escapeAttribute(node.transform)}"`);
        return parts.join(" ");
    }

    static toMarkup(nodes) {
        let markup = "";
        for (const node of nodes ?? []) {
            const attributes = BlockRenderer.buildAttributes(node);
            if (node.kind === "group") {
                markup += `<${node.tag} ${attributes}>${BlockRenderer.toMarkup(node.children)}</${node.tag}>`;
                continue;
            }
            if (node.text !== null && node.text !== undefined) {
                markup += `<${node.tag} ${attributes}>${Utils.escapeXmlText(node.text)}</${node.tag}>`;
                continue;
            }
            markup += `<${node.tag} ${attributes}></${node.tag}>`;
        }
        return markup;
    }

    static flatten(nodes, collected = []) {
        for (const node of nodes ?? []) {
            collected.push(node);
            if (node.children?.length)
                BlockRenderer.flatten(node.children, collected);
        }
        return collected;
    }

    static buildSignature(nodes) {
        const behaviours = BlockRenderer.flatten(nodes)
            .filter(node => node.behaviours?.length)
            .map(node => `${node.id}:${JSON.stringify(node.behaviours)}`)
            .join("|");
        return `${BlockRenderer.toMarkup(nodes)}||${behaviours}`;
    }

    static render(container, nodes, host = null) {
        const signature = BlockRenderer.buildSignature(nodes);
        if (container._blockMarkupSignature === signature)
            return false;
        container._blockMarkupSignature = signature;
        container.innerHTML = BlockRenderer.toMarkup(nodes);
        BlockRenderer.attachBehaviours(container, nodes, host);
        return true;
    }

    static attachBehaviours(container, nodes, host) {
        for (const node of BlockRenderer.flatten(nodes)) {
            if (!node.behaviours?.length)
                continue;
            const element = container.querySelector(`[data-block-id="${CSS.escape(node.id)}"]`);
            if (!element)
                continue;
            for (const behaviour of node.behaviours) {
                const attach = BlockBehaviours.getRuntime(behaviour.type);
                if (typeof attach === "function")
                    attach(host, element, behaviour.input, node);
                else if (host && typeof host.attachBlockBehaviour === "function")
                    host.attachBlockBehaviour(element, behaviour, node);
            }
        }
    }

    static toStandaloneSvg(nodes, width, height, background = "#ffffff") {
        const backgroundMarkup = background === "none" ? "" : `<rect x="0" y="0" width="${width}" height="${height}" fill="${BlockRenderer.escapeAttribute(background)}"></rect>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${backgroundMarkup}${BlockRenderer.toMarkup(nodes)}</svg>`;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = BlockRenderer;
