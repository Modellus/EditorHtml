class MiniMap {
    constructor(board, minimapImage, minimapViewport) {
        this.board = board;
        this.minimapImage = minimapImage;
        this.minimapViewport = minimapViewport;
        this._rafId = null;
        this._minimapUrl = null;
        this._imageCache = new Map();
        this.minimapImage.style.display = "none";
        this.minimapViewport.style.display = "none";
        this.board.svg.addEventListener("pan", e => this.onPan(e));
        this.board.svg.addEventListener("zoom", e => this.onZoom(e));
        this.board.svg.addEventListener("shapeAdded", e => this.onShapeAdded(e));
        this.board.svg.addEventListener("shapeRemoved", e => this.onShapeRemoved(e));
        this.board.svg.addEventListener("shapeChanged", e => this.onShapeChanged(e));
    }

    onPan(event) {
        this.pan = event.detail.pan;
        this.requestRefresh();
    }

    onZoom(event) {
        this.zoom = event.detail.zoom; 
        this.requestRefresh();
    }

    onShapeAdded(event) {
        this.requestRefresh();
    }

    onShapeRemoved(event) {
        this.requestRefresh();
    }

    onShapeChanged(event) {
        this.requestRefresh();
    }

    requestRefresh() {
        if (this._rafId != null)
            return;
        if (this.minimapImage.style.display === "none")
            return;
        this._rafId = requestAnimationFrame(() => {
            this._rafId = null;
            this.refresh();
        });
    }

    async refresh() {
        this.updateMinimapViewport();
        await this.createMinimap();
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

    async createMinimap() {
        const viewBox = this.board.svg.viewBox.baseVal;
        const boundingBox = this.board.svg.getBBox();
        const x1 = Math.min(boundingBox.x, viewBox.x);
        const y1 = Math.min(boundingBox.y, viewBox.y);
        const x2 = Math.max(boundingBox.x + boundingBox.width, viewBox.x + viewBox.width, viewBox.width);
        const y2 = Math.max(boundingBox.y + boundingBox.height, viewBox.y + viewBox.height, viewBox.height);
        const xml = new XMLSerializer().serializeToString(this.board.svg);
        const document = new DOMParser().parseFromString(xml, "image/svg+xml");
        document.querySelectorAll(".handle, .bounding-box, .hover-outline, .selected-outline")
           .forEach(el => el.remove());
        const canvasFrames = this.captureCanvasFrames();
        document.querySelectorAll("foreignObject").forEach(el => {
            const group = el.parentNode;
            const shapeId = group?.getAttribute("id");
            const dataUrl = shapeId ? canvasFrames.get(shapeId) : null;
            if (dataUrl) {
                const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
                img.setAttribute("href", dataUrl);
                img.setAttribute("x", el.getAttribute("x") || "0");
                img.setAttribute("y", el.getAttribute("y") || "0");
                img.setAttribute("width", el.getAttribute("width") || "0");
                img.setAttribute("height", el.getAttribute("height") || "0");
                img.setAttribute("preserveAspectRatio", "xMidYMid slice");
                el.parentNode.replaceChild(img, el);
                return;
            }
            el.remove();
        });
        await this.inlineExternalImages(document);
        const svg = document.documentElement;
        svg.setAttribute("viewBox", `${x1} ${y1} ${x2 - x1} ${y2 - y1}`);
        svg.setAttribute("width",  x2 - x1);
        svg.setAttribute("height", y2 - y1);
        const finalString = new XMLSerializer().serializeToString(document);
        const blob = new Blob([finalString], { type: "image/svg+xml" });
        if (this._minimapUrl)
            URL.revokeObjectURL(this._minimapUrl);
        const url = URL.createObjectURL(blob);
        this._minimapUrl = url;
        const revokeUrl = () => {
            if (this._minimapUrl === url)
                this._minimapUrl = null;
            URL.revokeObjectURL(url);
            this.minimapImage.onload = null;
            this.minimapImage.onerror = null;
        };
        this.minimapImage.onload = revokeUrl;
        this.minimapImage.onerror = revokeUrl;
        this.minimapImage.src = url;
      }

    async inlineExternalImages(document) {
        const images = [...document.querySelectorAll("image")];
        const promises = images.map(async imageEl => {
            const href = imageEl.getAttribute("href") || imageEl.getAttributeNS("http://www.w3.org/1999/xlink", "href");
            if (!href || href.startsWith("data:"))
                return;
            const dataUrl = await this.fetchAsDataUrl(href);
            if (dataUrl)
                imageEl.setAttribute("href", dataUrl);
            else
                imageEl.remove();
        });
        await Promise.all(promises);
    }

    async fetchAsDataUrl(url) {
        if (this._imageCache.has(url))
            return this._imageCache.get(url);
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            this._imageCache.set(url, dataUrl);
            return dataUrl;
        } catch {
            this._imageCache.set(url, null);
            return null;
        }
    }

    captureCanvasFrames() {
        const frames = new Map();
        for (const shape of this.board.shapes.shapes) {
            if (!shape.canvas || !shape.videoForeignObject)
                continue;
            if (shape.videoForeignObject.getAttribute("display") === "none")
                continue;
            try {
                frames.set(shape.id, shape.canvas.toDataURL("image/png"));
            } catch {
            }
        }
        return frames;
    }

    toggle() {
        const shouldDisplay = this.minimapImage.style.display === "none";
        this.minimapImage.style.display = shouldDisplay ? "block" : "none";
        this.minimapViewport.style.display = shouldDisplay ? "block" : "none";
        if (shouldDisplay)
            this.refresh();
    }
}
