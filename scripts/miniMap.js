class MiniMap {
    constructor(svg, minimapImage, minimapViewPort) {
        this.svg = svg;
        this.minimapImage = minimapImage;
        this.minimapViewPort = minimapViewPort;
        this.minimapScaleFactor = 3;
        this.svg.svg.addEventListener("pan", (e) => this.onPan(e));
        this.svg.svg.addEventListener("zoom", (e) => this.onZoom(e));
        this.svg.svg.addEventListener("addShape", (e) => this.onAddShape(e));
        this.createMinimap();
    }

    onPan(event) {
        //this.updateMinimapViewport();
    }

    onZoom(event) {
        //this.updateMinimapViewport();
    }

    onAddShape(event) {
        this.createMinimap();
    }

    updateMinimapViewport() {
        const mainRect = svgContainer.getBoundingClientRect();
        const viewBox = this.svg.svg.viewBox.baseVal;
        const viewportWidth = mainRect.width / zoom / this.minimapScaleFactor;
        const viewportHeight = mainRect.height / zoom / this.minimapScaleFactor;
        this.minimapViewport.style.width = viewportWidth + 'px';
        this.minimapViewport.style.height = viewportHeight + 'px';
        this.minimapViewport.style.left = (-pan.x / zoom) / this.minimapScaleFactor + 'px';
        this.minimapViewport.style.top = (-pan.y / zoom) / this.minimapScaleFactor + 'px';
    }

    createMinimap() {
        const svgString = new XMLSerializer().serializeToString(this.svg.svg);
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
        const handles = svgDoc.querySelectorAll('.handle');
        handles.forEach(handle => handle.parentNode.removeChild(handle));
        const boundingBoxes = svgDoc.querySelectorAll('.bounding-box');
        boundingBoxes.forEach(boundingBox => boundingBox.parentNode.removeChild(boundingBox));
        const svgStringNoHandles = new XMLSerializer().serializeToString(svgDoc);
        const svgBlob = new Blob([svgStringNoHandles], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        this.minimapImage.src = url;
    }
}