class PanAndZoom {
    constructor(board) {
        this.board = board;
        this.svg = board.svg;
        this.viewBox = this.svg.viewBox.baseVal;
        this.viewBox.x = 0;
        this.viewBox.y = 0;
        this.viewBox.width = this.svg.clientWidth;
        this.viewBox.height = this.svg.clientHeight;
        this.previousTouches = [];
        this.isPanning = false;
        this.transformMatrix = this.svg.createSVGMatrix();
        this.bindEvents();
    }

    bindEvents() {
        this.svg.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
        this.svg.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
        this.svg.addEventListener("touchend", (e) => this.onTouchEnd(e));
        this.svg.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    }

    onTouchStart(event) {
        if (event.touches.length === 2) {
            this.previousTouches = [...event.touches];
            this.isPanning = false;
        }
    }

    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 2) {
            const currentTouches = [...event.touches];
            const scaleFactor = this.calculatePinchScale(this.previousTouches, currentTouches);
            this.handleZoom(scaleFactor);
            this.previousTouches = currentTouches;
        }
    }

    onTouchEnd(event) {
        if (event.touches.length < 2) {
            this.previousTouches = [];
            this.isPanning = false;
        }
    }

    calculatePinchScale(prevTouches, currTouches) {
        const prevDistance = Math.hypot(
            prevTouches[0].clientX - prevTouches[1].clientX,
            prevTouches[0].clientY - prevTouches[1].clientY
        );
        const currDistance = Math.hypot(
            currTouches[0].clientX - currTouches[1].clientX,
            currTouches[0].clientY - currTouches[1].clientY
        );
        return currDistance / prevDistance;
    }

    handleZoom(scaleFactor) {
        const { width, height, x, y } = this.viewBox;
        let newWidth = width / scaleFactor;
        let newHeight = height / scaleFactor;
        const minSize = 50;
        const maxSize = this.svg.clientWidth * 3;

        if (newWidth > maxSize || newWidth < minSize) {
            return;
        }

        const centerX = x + width / 2;
        const centerY = y + height / 2;

        this.viewBox.width = newWidth;
        this.viewBox.height = newHeight;
        this.viewBox.x = centerX - newWidth / 2;
        this.viewBox.y = centerY - newHeight / 2;

        this.transformMatrix = this.transformMatrix.scale(scaleFactor, scaleFactor, centerX, centerY);
        this.applyTransform();
    }

    onWheel(event) {
        event.preventDefault();
        let scaleFactor = 1 + event.deltaY * -0.002;
        this.handleZoom(scaleFactor);
    }

    applyTransform() {
        const { a, b, c, d, e, f } = this.transformMatrix;
        this.svg.style.transform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;
    }

    zoomIn(zoomFactor = 1.1) {
        this.handleZoom(zoomFactor);
    }

    zoomOut(zoomFactor = 0.9) {
        this.handleZoom(1 / zoomFactor);
    }
}
