class SVG {
    constructor(svgElement) {
        this.svg = svgElement;
        this.isPanning = false;
        this.startX = 0;
        this.startY = 0;
        this.viewBox = this.svg.viewBox.baseVal;
        this.viewBox.x = this.viewBox.x || 0;
        this.viewBox.y = this.viewBox.y || 0;
        this.viewBox.width = this.viewBox.width || this.svg.clientWidth;
        this.viewBox.height = this.viewBox.height || this.svg.clientHeight;
        this.svg.addEventListener("mousedown", this.onMouseDown.bind(this));
        this.svg.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.svg.addEventListener("mouseup", this.onMouseUp.bind(this));
        this.svg.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        this.svg.addEventListener("wheel", this.onWheel.bind(this));
        this.svg.addEventListener("mouseover", this.onMouseOver.bind(this));
        this.svg.addEventListener("mouseout", this.onMouseOut.bind(this));
    }

    dispatchPanEvent() {
        const panEvent = new CustomEvent("pan", {
            detail: {
                x: this.viewBox.x,
                y: this.viewBox.y,
                width: this.viewBox.width,
                height: this.viewBox.height
            }
        });
        this.svg.dispatchEvent(panEvent);
    }

    dispatchZoomEvent() {
        const zoomEvent = new CustomEvent("zoom", {
            detail: {
                x: this.viewBox.x,
                y: this.viewBox.y,
                width: this.viewBox.width,
                height: this.viewBox.height
            }
        });
        this.svg.dispatchEvent(zoomEvent);
    }

    onMouseDown(event) {
        if (event.target === this.svg) {
            this.isPanning = true;
            this.startX = event.clientX;
            this.startY = event.clientY;
            this.svg.classList.add("pan-available");
        }
    }

    onMouseMove(event) {
        if (!this.isPanning) 
            return;
        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        const scaleX = this.viewBox.width / this.svg.clientWidth;
        const scaleY = this.viewBox.height / this.svg.clientHeight;
        this.viewBox.x -= dx * scaleX;
        this.viewBox.y -= dy * scaleY;        
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        this.dispatchPanEvent();
    }

    onMouseUp() {
        this.isPanning = false;
        this.svg.classList.remove("pan-available");
    }

    onMouseLeave() {
        this.isPanning = false;
        this.svg.classList.remove("pan-available");
    }

    onWheel(event) {
        event.preventDefault();
        const zoomScale = 1.05;
        const direction = event.deltaY < 0 ? 1 : -1;
        const zoomFactor = direction > 0 ? 1 / zoomScale : zoomScale;
        const mouseX = event.clientX - this.svg.getBoundingClientRect().left;
        const mouseY = event.clientY - this.svg.getBoundingClientRect().top;
        const svgWidth = this.svg.clientWidth;
        const svgHeight = this.svg.clientHeight;
        const scaleX = mouseX / svgWidth;
        const scaleY = mouseY / svgHeight;
        this.viewBox.x += (this.viewBox.width * (1 - zoomFactor)) * scaleX;
        this.viewBox.y += (this.viewBox.height * (1 - zoomFactor)) * scaleY;
        this.viewBox.width *= zoomFactor;
        this.viewBox.height *= zoomFactor;
        this.svg.setAttribute("viewBox", `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
        this.dispatchZoomEvent();
    }

    onMouseOver(event) {
        if (event.target === this.svg)
            this.svg.classList.add("pan-available");
    }

    onMouseOut(event) {
        if (event.target === this.svg)
            this.svg.classList.remove("pan-available");
    }

    getPan() {
    }
}