class ClipboardPasteController {
    constructor(shell) {
        this.shell = shell;
        this.board = shell.board;
        this.pointerPosition = null;
        this.mediaWidth = 300;
        this.mediaHeight = 200;
        this.embedWidth = 400;
        this.embedHeight = 225;
        this.notionWidth = 560;
        this.notionHeight = 700;
        this.dataTableWidth = 400;
        this.dataTableHeight = 300;
        this.textWidth = 400;
        this.textHeight = 200;
        this.board.svg.addEventListener("pointermove", event => this.onPointerMove(event));
        this.board.svg.addEventListener("pointerleave", () => this.onPointerLeave());
        window.addEventListener("paste", event => this.onPaste(event));
    }

    onPointerMove(event) {
        const point = this.board.getMouseToSvgPoint(event);
        this.pointerPosition = { x: point.x, y: point.y };
    }

    onPointerLeave() {
        this.pointerPosition = null;
    }

    isEditingTarget(target) {
        return target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "MATH-FIELD" || target?.isContentEditable === true;
    }

    getPastePoint() {
        return this.pointerPosition ?? this.board.getClientCenter();
    }

    getPastePosition(width, height) {
        return this.centerPosition(this.getPastePoint(), width, height);
    }

    centerPosition(point, width, height) {
        return { x: point.x - width / 2, y: point.y - height / 2 };
    }

    onPaste(event) {
        if (ImageControl.isDocumentPasteActive())
            return;
        if (this.isEditingTarget(event.target) || this.isEditingTarget(document.activeElement))
            return;
        const clipboardData = event.clipboardData;
        const shapeDocument = ClipboardService.getDataTransferShapeDocument(clipboardData);
        if (shapeDocument) {
            event.preventDefault();
            this.pasteShapeDocument(shapeDocument);
            return;
        }
        const content = { text: clipboardData.getData(ClipboardService.textFormat), files: Array.from(clipboardData.files) };
        event.preventDefault();
        this.pasteClipboardContent(content);
    }

    async pasteClipboardContent(content) {
        const shapeDocument = await ClipboardService.readShapeDocument();
        if (shapeDocument) {
            this.pasteShapeDocument(shapeDocument);
            return;
        }
        this.pasteExternalContent(content);
    }

    pasteExternalContent(content) {
        const text = content.text;
        if (this.pasteShapeText(text))
            return;
        const mediaFile = this.findMediaFile(content.files);
        if (mediaFile) {
            this.pasteMediaFile(mediaFile);
            return;
        }
        const csvFile = this.findCsvFile(content.files);
        if (csvFile) {
            this.pasteCsvFile(csvFile);
            return;
        }
        if (text.trim() === "")
            return;
        if (this.isUrlText(text))
            this.pasteUrl(text.trim());
        else if (this.isCsvText(text))
            this.pasteCsvText(text);
        else
            this.pasteText(text);
    }

    pasteShapeDocument(data) {
        const selectedShape = this.board.selection.selectedShape;
        return BaseShape.pasteShapeData(this.board, selectedShape?.parent ?? null, data);
    }

    pasteShapeText(text) {
        const data = ClipboardService.parseDocument(text);
        if (!ClipboardService.isShapeDocument(data))
            return false;
        return this.pasteShapeDocument(data);
    }

    findMediaFile(files) {
        return files.find(file => this.getMediaKind(file.type) != null) ?? null;
    }

    getMediaKind(contentType) {
        if (contentType.startsWith("image/"))
            return "image";
        if (contentType.startsWith("video/"))
            return "video";
        if (contentType.startsWith("audio/"))
            return "audio";
        return null;
    }

    escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    isUrlText(text) {
        const trimmed = text.trim();
        return /^https?:\/\/\S+$/i.test(trimmed);
    }

    getEmbedUrl(url) {
        return MediaShape.toEmbedUrl(url);
    }

    getUrlKindFromExtension(url) {
        const path = url.split("?")[0].split("#")[0].toLowerCase();
        if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(path))
            return "image";
        if (/\.(mp4|webm|ogv|mov|avi|mkv)$/.test(path))
            return "video";
        if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(path))
            return "audio";
        if (/\.csv$/.test(path))
            return "csv";
        return null;
    }

    async getUrlKindFromContentType(url) {
        let response;
        try { response = await fetch(url, { method: "HEAD" }); } catch (_) { return null; }
        if (!response.ok)
            return null;
        const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
        if (contentType === "text/csv")
            return "csv";
        return this.getMediaKind(contentType);
    }

    findCsvFile(files) {
        return files.find(file => file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) ?? null;
    }

    // A dataset may name what it measured - a species, a country - so a column of names no longer
    // disqualifies the paste. What still tells a table from a sentence carrying commas is the shape:
    // every row the same width, no gaps, and at least one column measured in numbers.
    isCsvText(text) {
        const records = Utils.parseCsvRecords(text);
        if (records.length < 2)
            return false;
        const columnCount = records[0].length;
        if (columnCount < 2)
            return false;
        const isNumericColumn = new Array(columnCount).fill(true);
        for (let index = 1; index < records.length; index++) {
            const cells = records[index];
            if (cells.length !== columnCount)
                return false;
            for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
                const cell = cells[columnIndex].trim();
                if (cell === "")
                    return false;
                if (!Number.isFinite(Number(cell)))
                    isNumericColumn[columnIndex] = false;
            }
        }
        return isNumericColumn.some(isNumeric => isNumeric);
    }

    async pasteMediaFile(file) {
        const point = this.getPastePoint();
        const assetId = crypto.randomUUID();
        const url = await this.board.assetManager.uploadAsset(assetId, file, file.name);
        if (!url)
            return;
        this.addMediaShape(url, this.getMediaKind(file.type), point, assetId);
    }

    async pasteUrl(url) {
        const point = this.getPastePoint();
        const embedUrl = this.getEmbedUrl(url);
        if (embedUrl) {
            this.addMediaShape(embedUrl, "embed", point);
            return;
        }
        const kind = this.getUrlKindFromExtension(url) ?? await this.getUrlKindFromContentType(url);
        if (kind === "csv") {
            this.pasteCsvUrl(url, point);
            return;
        }
        if (kind == null) {
            this.addLinkTextShape(url, point);
            return;
        }
        this.addMediaShape(url, kind, point);
    }

    addLinkTextShape(url, point) {
        const escapedUrl = this.escapeHtml(url);
        this.addTextShape(`<a href="${escapedUrl}">${escapedUrl}</a>`, this.centerPosition(point, this.textWidth, this.textHeight));
    }

    isNotionEmbedUrl(url) {
        return url.includes(".notion.site/ebd/");
    }

    getMediaSize(url, kind) {
        if (kind !== "embed")
            return { width: this.mediaWidth, height: this.mediaHeight };
        if (this.isNotionEmbedUrl(url))
            return { width: this.notionWidth, height: this.notionHeight };
        return { width: this.embedWidth, height: this.embedHeight };
    }

    addMediaShape(url, kind, point, id) {
        const isEmbed = kind === "embed";
        const { width, height } = this.getMediaSize(url, kind);
        const position = this.centerPosition(point, width, height);
        const shape = this.board.createShape("MediaShape", null, id);
        const properties = {
            name: this.shell.commands.uniquifyShapeName("Media"),
            x: position.x,
            y: position.y,
            width: width,
            height: height
        };
        if (isEmbed) {
            properties.embedUrl = url;
            properties.mediaAspectRatio = width / height;
        } else if (kind === "video")
            properties.videoUrl = url;
        else if (kind === "audio")
            properties.audioUrl = url;
        else
            properties.imageUrl = url;
        shape.setProperties(properties);
        this.addPastedShape(shape);
    }

    pasteCsvText(text) {
        this.addDataTableShape(text, this.getPastePosition(this.dataTableWidth, this.dataTableHeight));
    }

    async pasteCsvFile(file) {
        const position = this.getPastePosition(this.dataTableWidth, this.dataTableHeight);
        const text = await file.text();
        this.addDataTableShape(text, position);
    }

    async pasteCsvUrl(url, point) {
        let text;
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(response.status);
            text = await response.text();
        } catch (_) {
            this.addLinkTextShape(url, point);
            return;
        }
        this.addDataTableShape(text, this.centerPosition(point, this.dataTableWidth, this.dataTableHeight));
    }

    addDataTableShape(text, position) {
        const { names, values } = this.shell.parseCsv(text);
        const shape = this.board.createShape("DataTableShape", null);
        shape.setProperties({
            name: this.shell.commands.uniquifyShapeName("Data Analysis"),
            x: position.x,
            y: position.y,
            width: this.dataTableWidth,
            height: this.dataTableHeight
        });
        this.addPastedShape(shape);
        shape.applyImportedExternalData({ names, values });
    }

    pasteText(text) {
        this.addTextShape(text, this.getPastePosition(this.textWidth, this.textHeight));
    }

    addTextShape(text, position) {
        const shape = this.board.createShape("TextShape", null);
        shape.setProperties({
            name: this.shell.commands.uniquifyShapeName("Text"),
            x: position.x,
            y: position.y,
            width: this.textWidth,
            height: this.textHeight,
            text: text
        });
        this.addPastedShape(shape);
    }

    addPastedShape(shape) {
        shape.element.addEventListener("changed", event => this.shell.onShapeChanged(event));
        const command = new AddShapeCommand(this.board, shape);
        this.board.invoker.execute(command);
        shape.draw();
        shape.update();
    }
}
