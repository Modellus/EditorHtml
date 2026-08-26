class ClipboardService {
    static shapeFormat = "application/x-modellus-shape+json";
    static expressionFormat = "application/x-modellus-expression+json";
    static blockFormat = "application/x-modellus-block+json";
    static mathmlFormat = "application/mathml+xml";
    static textFormat = "text/plain";
    static htmlFormat = "text/html";
    static svgFormat = "image/svg+xml";
    static imageFormat = "image/png";
    static webFormatPrefix = "web ";
    static notebookBlockDocumentType = "notebook-block";
    static standardFormats = [ClipboardService.textFormat, ClipboardService.htmlFormat, ClipboardService.imageFormat, ClipboardService.svgFormat];
    static shapeDocumentFormats = [ClipboardService.shapeFormat, ClipboardService.expressionFormat];
    static expressionDocumentFormats = [ClipboardService.expressionFormat, ClipboardService.shapeFormat];

    static jsonRepresentation(type, document) {
        return { type: type, data: JSON.stringify(document) };
    }

    static shapeRepresentation(document) {
        return ClipboardService.jsonRepresentation(ClipboardService.shapeFormat, document);
    }

    static expressionRepresentation(document) {
        return ClipboardService.jsonRepresentation(ClipboardService.expressionFormat, document);
    }

    static blockRepresentation(block) {
        return ClipboardService.jsonRepresentation(ClipboardService.blockFormat, { type: ClipboardService.notebookBlockDocumentType, block: block });
    }

    static textRepresentation(text) {
        return { type: ClipboardService.textFormat, data: typeof text === "function" ? text : String(text ?? "") };
    }

    static htmlRepresentation(html) {
        return { type: ClipboardService.htmlFormat, data: String(html ?? "") };
    }

    static mathmlRepresentation(mathml) {
        return { type: ClipboardService.mathmlFormat, data: ClipboardService.buildMathmlDocument(mathml) };
    }

    static svgRepresentation(svg) {
        return { type: ClipboardService.svgFormat, data: svg };
    }

    static imageRepresentation(blob) {
        return { type: ClipboardService.imageFormat, data: blob };
    }

    static buildMathmlDocument(mathml) {
        const markup = String(mathml ?? "").trim();
        if (markup.startsWith("<math"))
            return markup;
        return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">${markup}</math>`;
    }

    static getPlatformType(type) {
        if (ClipboardService.standardFormats.includes(type) && ClipboardService.supportsPlatformType(type))
            return type;
        return `${ClipboardService.webFormatPrefix}${type}`;
    }

    static supportsPlatformType(platformType) {
        if (typeof ClipboardItem === "undefined" || typeof ClipboardItem.supports !== "function")
            return true;
        return ClipboardItem.supports(platformType);
    }

    static getLogicalType(platformType) {
        if (platformType.startsWith(ClipboardService.webFormatPrefix))
            return platformType.slice(ClipboardService.webFormatPrefix.length);
        return platformType;
    }

    static toBlob(representation) {
        if (representation.data instanceof Blob)
            return representation.data;
        return new Blob([representation.data], { type: representation.type });
    }

    static async resolveRepresentations(representations) {
        const resolved = [];
        for (const representation of representations ?? []) {
            if (!representation)
                continue;
            let data;
            try { data = await (typeof representation.data === "function" ? representation.data() : representation.data); } catch (_) { continue; }
            if (data == null || data === "")
                continue;
            resolved.push({ type: representation.type, data: data });
        }
        return resolved;
    }

    static async write(representations) {
        const resolved = await ClipboardService.resolveRepresentations(representations);
        if (resolved.length === 0)
            return false;
        if (await ClipboardService.writeItem(resolved))
            return true;
        const supported = resolved.filter(representation => ClipboardService.standardFormats.includes(representation.type) && ClipboardService.supportsPlatformType(representation.type));
        if (supported.length > 0 && supported.length < resolved.length && await ClipboardService.writeItem(supported))
            return true;
        return ClipboardService.writePlainText(resolved);
    }

    static async writeItem(representations) {
        if (typeof ClipboardItem === "undefined")
            return false;
        const payload = {};
        for (const representation of representations)
            payload[ClipboardService.getPlatformType(representation.type)] = ClipboardService.toBlob(representation);
        try {
            await navigator.clipboard.write([new ClipboardItem(payload)]);
            return true;
        } catch (_) {
            return false;
        }
    }

    static async writePlainText(representations) {
        const textRepresentation = representations.find(representation => representation.type === ClipboardService.textFormat);
        if (!textRepresentation)
            return false;
        const text = textRepresentation.data instanceof Blob ? await textRepresentation.data.text() : String(textRepresentation.data);
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {
            return false;
        }
    }

    static async writeText(text) {
        return ClipboardService.write([ClipboardService.textRepresentation(text)]);
    }

    static async read() {
        let clipboardItems;
        try { clipboardItems = await navigator.clipboard.read(); } catch (_) { return {}; }
        const representations = {};
        for (const clipboardItem of clipboardItems)
            for (const platformType of clipboardItem.types) {
                const type = ClipboardService.getLogicalType(platformType);
                if (representations[type] !== undefined)
                    continue;
                try { representations[type] = await clipboardItem.getType(platformType); } catch (_) { }
            }
        return representations;
    }

    static parseDocument(text) {
        if (!text)
            return null;
        try { return JSON.parse(text); } catch (_) { return null; }
    }

    static async readDocument(formats) {
        const representations = await ClipboardService.read();
        for (const format of formats) {
            const blob = representations[format];
            if (!blob)
                continue;
            const document = ClipboardService.parseDocument(await blob.text());
            if (document)
                return document;
        }
        return null;
    }

    static getDataTransferDocument(dataTransfer, formats) {
        for (const format of formats) {
            const text = dataTransfer.getData(format) || dataTransfer.getData(ClipboardService.getPlatformType(format));
            const document = ClipboardService.parseDocument(text);
            if (document)
                return document;
        }
        return null;
    }

    static isShapeDocument(document) {
        return document?.type != null && document?.properties != null;
    }

    static async readShapeDocument() {
        const document = await ClipboardService.readDocument(ClipboardService.shapeDocumentFormats);
        return ClipboardService.isShapeDocument(document) ? document : null;
    }

    static getDataTransferShapeDocument(dataTransfer) {
        const document = ClipboardService.getDataTransferDocument(dataTransfer, ClipboardService.shapeDocumentFormats);
        return ClipboardService.isShapeDocument(document) ? document : null;
    }

    static getDocumentExpressionLatex(document) {
        if (typeof document?.latex === "string")
            return document.latex;
        if (typeof document?.properties?.expression === "string")
            return document.properties.expression;
        return null;
    }

    static async readExpressionLatex() {
        return ClipboardService.getDocumentExpressionLatex(await ClipboardService.readDocument(ClipboardService.expressionDocumentFormats));
    }

    static async readNotebookBlock() {
        const document = await ClipboardService.readDocument([ClipboardService.blockFormat]);
        if (document?.type !== ClipboardService.notebookBlockDocumentType)
            return null;
        return document.block ?? null;
    }

    static async readImageBlob() {
        const representations = await ClipboardService.read();
        const imageTypes = Object.keys(representations).filter(type => type.startsWith("image/"));
        const type = imageTypes.includes(ClipboardService.imageFormat) ? ClipboardService.imageFormat : imageTypes[0];
        if (!type)
            return null;
        return { type: type, blob: representations[type] };
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ClipboardService;
