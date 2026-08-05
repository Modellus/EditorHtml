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
        return ObjectDrawing.getCompiler().compile(instance, { width: size, height: size, parameters, tokens: new BlockTokens(instance.preset) });
    }

    static toSvg(definitionDocument, size = ObjectDrawing.previewSize) {
        return BlockRenderer.toStandaloneSvg(ObjectDrawing.compile(definitionDocument, size).nodes, size, size, "none");
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
