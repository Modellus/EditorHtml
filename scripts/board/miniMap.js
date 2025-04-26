class MiniMap {
    constructor(board, minimapImage, minimapViewPort) {
        this.board = board;
        this.minimapImage = minimapImage;
        this.minimapViewPort = minimapViewPort;
        this.minimapScaleFactor = 3;
        this.board.svg.addEventListener("pan", (e) => this.onPan(e));
        this.board.svg.addEventListener("zoom", (e) => this.onZoom(e));
        this.board.svg.addEventListener("shapeAdded", (e) => this.onShapeAdded(e));
        this.createMinimap();
    }

    onPan(event) {
        //this.updateMinimapViewport();
    }

    onZoom(event) {
        //this.updateMinimapViewport();
    }

    onShapeAdded(event) {
        this.createMinimap();
    }

    updateMinimapViewport() {
        const mainRect = this.board.svg.parentNode.getBoundingClientRect();
        const viewBox = this.board.svg.viewBox.baseVal;
        const viewportWidth = mainRect.width / zoom / this.minimapScaleFactor;
        const viewportHeight = mainRect.height / zoom / this.minimapScaleFactor;
        this.minimapViewport.style.width = viewportWidth + 'px';
        this.minimapViewport.style.height = viewportHeight + 'px';
        this.minimapViewport.style.left = (-pan.x / zoom) / this.minimapScaleFactor + 'px';
        this.minimapViewport.style.top = (-pan.y / zoom) / this.minimapScaleFactor + 'px';
    }

    createMinimap() {
        const svgString = new XMLSerializer().serializeToString(this.board.svg);
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