class ClipboardPasteController {
    constructor(shell) {
        this.shell = shell;
        this.board = shell.board;
        this.pointerPosition = null;
        this.mediaWidth = 300;
        this.mediaHeight = 200;
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

    getPastePosition(width, height) {
        const center = this.pointerPosition ?? this.board.getClientCenter();
        return { x: center.x - width / 2, y: center.y - height / 2 };
    }

    onPaste(event) {
        if (ImageControl.isDocumentPasteActive())
            return;
        if (this.isEditingTarget(event.target) || this.isEditingTarget(document.activeElement))
            return;
        const clipboardData = event.clipboardData;
        const text = clipboardData.getData("text/plain");
        if (this.pasteShapeText(text)) {
            event.preventDefault();
            return;
        }
        const mediaFile = this.findMediaFile(clipboardData);
        if (mediaFile) {
            event.preventDefault();
            this.pasteMediaFile(mediaFile);
            return;
        }
        const csvFile = this.findCsvFile(clipboardData);
        if (csvFile) {
            event.preventDefault();
            this.pasteCsvFile(csvFile);
            return;
        }
        if (text.trim() === "")
            return;
        event.preventDefault();
        if (this.isCsvText(text))
            this.pasteCsvText(text);
        else
            this.pasteText(text);
    }

    pasteShapeText(text) {
        let data;
        try { data = JSON.parse(text); } catch (_) { return false; }
        const selectedShape = this.board.selection.selectedShape;
        return BaseShape.pasteShapeData(this.board, selectedShape?.parent ?? null, data);
    }

    findMediaFile(clipboardData) {
        return Array.from(clipboardData.files).find(file => file.type.startsWith("image/") || file.type.startsWith("video/")) ?? null;
    }

    findCsvFile(clipboardData) {
        return Array.from(clipboardData.files).find(file => file.type === "text/csv" || file.name.toLowerCase().endsWith(".csv")) ?? null;
    }

    isCsvText(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length < 2)
            return false;
        const columnCount = lines[0].split(",").length;
        if (columnCount < 2)
            return false;
        for (let index = 1; index < lines.length; index++) {
            const cells = lines[index].split(",");
            if (cells.length !== columnCount)
                return false;
            if (cells.some(cell => cell.trim() === "" || !Number.isFinite(Number(cell.trim()))))
                return false;
        }
        return true;
    }

    async pasteMediaFile(file) {
        const position = this.getPastePosition(this.mediaWidth, this.mediaHeight);
        const assetId = crypto.randomUUID();
        const url = await this.board.assetManager.uploadAsset(assetId, file, file.name);
        if (!url)
            return;
        const shape = this.board.createShape("MediaShape", null, assetId);
        const properties = {
            name: this.shell.commands.uniquifyShapeName("Media"),
            x: position.x,
            y: position.y,
            width: this.mediaWidth,
            height: this.mediaHeight
        };
        if (file.type.startsWith("video/"))
            properties.videoUrl = url;
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
        const position = this.getPastePosition(this.textWidth, this.textHeight);
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
