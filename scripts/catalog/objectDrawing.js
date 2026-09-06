class ObjectDrawing {
    static compiler = null;
    static previewSize = 240;
    static screenshotSize = 480;

    static getCompiler() {
        if (!ObjectDrawing.compiler)
            ObjectDrawing.compiler = new BlockCompiler(BlockRegistry, new BlockBindings(new Calculator()));
        return ObjectDrawing.compiler;
    }

    static compile(definitionDocument, size) {
        const instance = BlockObjects.createComponentInstance(definitionDocument.type);
        const parameters = Object.assign(
            BlockObjects.getInstancePropertyDefaults(definitionDocument.type, instance.preset),
            definitionDocument.preview?.parameters ?? {}
        );
        const box = BlockObjects.fitDrawingBox(definitionDocument.type, size);
        return ObjectDrawing.getCompiler().compile(instance, { width: box.width, height: box.height, parameters, tokens: new BlockTokens(instance.preset) });
    }

    // Every card is the same square, and the object stands in the middle of it at its own
    // proportions: a ruler drawn as a square is a strip of scale over an acre of blank body.
    static toSvg(definitionDocument, size = ObjectDrawing.previewSize) {
        const box = BlockObjects.fitDrawingBox(definitionDocument.type, size);
        return BlockRenderer.toFittedSvg(ObjectDrawing.compile(definitionDocument, size).nodes, size, box);
    }

    // The screenshot is the drawing itself, so a catalogue card can never show something the object
    // does not draw. Nothing is uploaded by hand.
    static toScreenshotFile(svgMarkup, size = ObjectDrawing.screenshotSize) {
        return new Promise(resolve => {
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = size;
                canvas.height = size;
                canvas.getContext("2d").drawImage(image, 0, 0, size, size);
                canvas.toBlob(blob => resolve(new File([blob], "object.png", { type: "image/png" })), "image/png");
            };
            image.onerror = () => resolve(null);
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
        });
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ObjectDrawing;
