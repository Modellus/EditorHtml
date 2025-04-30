class MiniMap {
    constructor(board, minimapImage, minimapViewport) {
        this.board = board;
        this.minimapImage = minimapImage;
        this.minimapViewport = minimapViewport;
        this.board.svg.addEventListener("pan", e => this.onPan(e));
        this.board.svg.addEventListener("zoom", e => this.onZoom(e));
        this.board.svg.addEventListener("shapeAdded", e => this.onShapeAdded(e));
        this.board.svg.addEventListener("shapeRemoved", e => this.onShapeRemoved(e));
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
        this.refresh();
    }

    onPan(event) {
        this.pan = event.detail.pan;
        this.refresh();
    }

    onZoom(event) {
        this.zoom = event.detail.zoom; 
        this.refresh();
    }

    onShapeAdded(event) {
        this.refresh();
    }

    onShapeRemoved(event) {
        this.refresh();
    }

    onShapeChanged(event) {
        this.refresh();
    }

    refresh() {
        this.updateMinimapViewport();
        this.createMinimap();
    }

    updateMinimapViewport() {
        const viewBox = this.board.svg.viewBox.baseVal;
        const boundingBox = this.board.svg.getBBox();
        const x1 = Math.min(boundingBox.x, viewBox.x);
        const y1 = Math.min(boundingBox.y, viewBox.y);
        const x2 = Math.max(boundingBox.x + boundingBox.width, viewBox.x + viewBox.width, viewBox.width);
        const y2 = Math.max(boundingBox.y + boundingBox.height, viewBox.y + viewBox.height, viewBox.height);
        const zoomX = this.minimapImage.offsetWidth / (x2 - x1);
        const zoomY = this.minimapImage.offsetHeight / (y2 - y1);
        const normalizedViewBox = { x: viewBox.x - x1, y: viewBox.y - y1, width: viewBox.width, height: viewBox.height };
        this.minimapViewport.style.width = normalizedViewBox.width * zoomX + "px";
        this.minimapViewport.style.height = normalizedViewBox.height * zoomY + "px";
        this.minimapViewport.style.left = normalizedViewBox.x * zoomX + "px";
        this.minimapViewport.style.top = normalizedViewBox.y * zoomY + "px";
    }

    createMinimap() {
        const viewBox = this.board.svg.viewBox.baseVal;
        const boundingBox = this.board.svg.getBBox();
        const x1 = Math.min(boundingBox.x, viewBox.x);
        const y1 = Math.min(boundingBox.y, viewBox.y);
        const x2 = Math.max(boundingBox.x + boundingBox.width, viewBox.x + viewBox.width, viewBox.width);
        const y2 = Math.max(boundingBox.y + boundingBox.height, viewBox.y + viewBox.height, viewBox.height);
        const fullSpace = { 
            x: Math.min(boundingBox.x, viewBox.x),
            y: Math.min(boundingBox.y, viewBox.y), 
            width: Math.max(boundingBox.width, viewBox.width) - Math.min(boundingBox.x, viewBox.x),
            height: Math.max(boundingBox.height, viewBox.height) - Math.min(boundingBox.y, viewBox.y) 
        };
        const xml = new XMLSerializer().serializeToString(this.board.svg);
        const document = new DOMParser().parseFromString(xml, "image/svg+xml");
        document.querySelectorAll(".handle, .bounding-box")
           .forEach(el => el.remove());
        const svg = document.documentElement;
        svg.setAttribute("viewBox", `${x1} ${y1} ${x2 - x1} ${y2 - y1}`);
        svg.setAttribute("width",  x2 - x1);
        svg.setAttribute("height", y2 - y1);
        const finalString = new XMLSerializer().serializeToString(document);
        const blob = new Blob([finalString], { type: "image/svg+xml" });
        this.minimapImage.src = URL.createObjectURL(blob);
      }

    toggle() {
        const shouldDisplay = this.minimapImage.style.display === "none";
        this.minimapImage.style.display = shouldDisplay ? "block" : "none";
        this.minimapViewport.style.display = shouldDisplay ? "block" : "none";
        if (shouldDisplay)
            this.refresh();
    }
}