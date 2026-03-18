class ReferentialShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.isReferential = true;
        this._tickDragState = null;
        this._onTickPointerMove = e => this.onTickPointerMove(e);
        this._onTickPointerUp = e => this.onTickPointerUp(e);
    }

    getHandles() {
        const handleSize = 12;
        var handles = super.getHandles();
        handles.push({
            className: "handle origin",
            getAttributes: () => {
                const position = this.getBoardPosition();
                return {
                    x: position.x + (this.properties.originX ?? this.properties.width / 2) - handleSize / 2,
                    y: position.y + (this.properties.originY ?? this.properties.height / 2) - handleSize / 2,
                    width: handleSize,
                    height: handleSize
                };
            },
            getTransform: e => {
                const position = this.getBoardPosition();
                return {
                    originX: e.x - position.x,
                    originY: e.y - position.y
                };
            }
        });
        return handles;
    }

    transformShape(transform) {
        super.transformShape(transform);
        if (transform.originX && transform.originY) {
            this.properties.originX = transform.originX;
            this.properties.originY = transform.originY;
        }
    }

    initializeElement() {
        super.initializeElement();
        if (this.element)
            this.element.removeAttribute("clip-path");
    }

    setProperty(name, value) {
        if (name == "x" || name == "y" || name == "rotation")
            this._skipNextAutoScale = true;
        super.setProperty(name, value);
    }

    enterEditMode() {
        return false;
    }

    createToolbar() {
        var items = super.createToolbar();
        items.push(
            {
                location: "center",
                widget: "dxButton",
                options: {
                    elementAttr: {
                        id: "body-button-context"
                    },
                    icon: "fa-light fa-circle",
                    hint: this.board.translations.get("Body Name"),
                    onClick: _ => window.shell?.commands?.addShape("BodyShape", "Body")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-arrow-right-long fa-rotate-by",
                    elementAttr: {
                        id: "vector-button-context",
                        style: "--fa-rotate-angle: -45deg;"
                    },
                    hint: this.board.translations.get("Vector Name"),
                    onClick: _ => window.shell?.commands?.addShape("VectorShape", "Vector")
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    elementAttr: {
                        id: "image-button-context"
                    },
                    icon: "fa-light fa-image",
                    hint: this.board.translations.get("Image Name"),
                    onClick: _ => window.shell?.commands?.addShape("ImageShape", "Image")
                }
            }
        );
        return items;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                colSpan: 2,
                dataField: "autoScale",
                label: { text: "Auto scale" },
                editorType: "dxSwitch"
            },
            {
                colSpan: 2,
                itemType: "group",
                colCount: 2,
                items: [
                    {
                        dataField: "scaleX",
                        label: { text: "Horizontal Scale" },
                        editorType: "dxNumberBox",
                        editorOptions: this.getPrecisionNumberEditorOptions({ showSpinButtons: false })
                    },
                    {
                        dataField: "scaleY",
                        label: { text: "Vertical Scale" },
                        editorType: "dxNumberBox",
                        editorOptions: this.getPrecisionNumberEditorOptions({ showSpinButtons: false })
                    }
                ]
            }
        );
        instance.option("items", items);
        return form;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Referential Name");
        var center = this.board.getClientCenter();
        this.properties.x = center.x - 200;
        this.properties.y = center.y - 100;
        this.properties.width = 400;
        this.properties.height = 200;
        this.properties.originX = this.properties.width / 2;
        this.properties.originY = this.properties.height / 2;
        this.properties.scaleX = 1;
        this.properties.scaleY = 1;
        this.properties.autoScale = true;
    }

    createElement() {
        const g = this.board.createSvgElement("g");
        this.container = this.board.createSvgElement("rect");
        this.container.setAttribute("stroke-width", 1);
        g.appendChild(this.container);
        this.horizontalAxis = this.board.createSvgElement("line");
        this.horizontalAxis.setAttribute("stroke-width", 1);
        this.horizontalAxis.setAttribute("class", "referential-axis-line");
        g.appendChild(this.horizontalAxis);
        this.verticalAxis = this.board.createSvgElement("line");
        this.verticalAxis.setAttribute("stroke-width", 1);
        this.verticalAxis.setAttribute("class", "referential-axis-line");
        g.appendChild(this.verticalAxis);
        this.ticksLayer = this.board.createSvgElement("g");
        g.appendChild(this.ticksLayer);
        this.tickGroups = {
            horizontal: {
                minor: this.board.createSvgElement("g"),
                major: this.board.createSvgElement("g")
            },
            vertical: {
                minor: this.board.createSvgElement("g"),
                major: this.board.createSvgElement("g")
            }
        };
        this.tickGroups.horizontal.minor.setAttribute("class", "referential-horizontal-ticks minor");
        this.tickGroups.horizontal.major.setAttribute("class", "referential-horizontal-ticks major");
        this.tickGroups.vertical.minor.setAttribute("class", "referential-vertical-ticks minor");
        this.tickGroups.vertical.major.setAttribute("class", "referential-vertical-ticks major");
        this.ticksLayer.appendChild(this.tickGroups.horizontal.minor);
        this.ticksLayer.appendChild(this.tickGroups.horizontal.major);
        this.ticksLayer.appendChild(this.tickGroups.vertical.minor);
        this.ticksLayer.appendChild(this.tickGroups.vertical.major);
        this.tickLabels = {
            horizontal: this.board.createSvgElement("g"),
            vertical: this.board.createSvgElement("g")
        };
        this.tickLabels.horizontal.setAttribute("class", "referential-horizontal-labels");
        this.tickLabels.vertical.setAttribute("class", "referential-vertical-labels");
        this.tickLabels.horizontal.setAttribute("clip-path", `url(#${this.getClipId()})`);
        this.tickLabels.vertical.setAttribute("clip-path", `url(#${this.getClipId()})`);
        this.ticksLayer.appendChild(this.tickLabels.horizontal);
        this.ticksLayer.appendChild(this.tickLabels.vertical);
        this.tickInteractionLayer = this.board.createSvgElement("g");
        this.tickInteractionLayer.setAttribute("class", "referential-tick-interaction-layer");
        this.ticksLayer.appendChild(this.tickInteractionLayer);
        const defs = this.board.createSvgElement("defs");
        g.appendChild(defs);
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", this.getClipId());
        clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
        defs.appendChild(clipPath);
        this.containerClip = this.board.createSvgElement("rect");
        clipPath.appendChild(this.containerClip);
        return g;
    }    

    update() {
        super.update();
    }

    draw() {
        super.draw();
        this.drawAxis();
        this.drawTicks();
    }

    drawAxis() {
        const position = this.getBoardPosition();
        const rotation = this.getAbsoluteRotation();
        const rotationTransform = `rotate(${rotation}, ${position.x + this.properties.width / 2}, ${position.y + this.properties.height / 2})`;
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", this.properties.width);
        this.container.setAttribute("height", this.properties.height);
        this.container.setAttribute("transform", rotationTransform);
        this.containerClip.setAttribute("x", position.x);
        this.containerClip.setAttribute("y", position.y);
        this.containerClip.setAttribute("width", this.properties.width);
        this.containerClip.setAttribute("height", this.properties.height);
        this.containerClip.setAttribute("transform", rotationTransform);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.applyBorderStroke(this.container, 1);
        const axisColor = this.properties.axisColor ?? this.properties.foregroundColor;
        this.horizontalAxis.setAttribute("x1", position.x);
        this.horizontalAxis.setAttribute("y1", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("x2", position.x + this.properties.width);
        this.horizontalAxis.setAttribute("y2", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("stroke", axisColor);
        this.horizontalAxis.setAttribute("transform", rotationTransform);
        this.verticalAxis.setAttribute("x1", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y1", position.y);
        this.verticalAxis.setAttribute("x2", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y2", position.y + this.properties.height);
        this.verticalAxis.setAttribute("stroke", axisColor);
        this.verticalAxis.setAttribute("transform", rotationTransform);
        if (this.ticksLayer)
            this.ticksLayer.setAttribute("transform", rotationTransform);
    }

    drawTicks() {
        if (this.tickGroups == null)
            return;
        const position = this.getBoardPosition();
        const axisColor = this.properties.axisColor ?? this.properties.foregroundColor;
        const axisX = position.x + this.properties.originX;
        const axisY = position.y + this.properties.originY;
        this.autoAdjustScales({ position, axisX, axisY });
        const scaleX = this.normalizeScale(this.properties.scaleX);
        const scaleY = this.normalizeScale(this.properties.scaleY);
        const horizontalTicks = this.drawAxisTicks({
            groups: this.tickGroups.horizontal,
            start: position.x,
            end: position.x + this.properties.width,
            origin: axisX,
            fixed: axisY,
            orientation: "horizontal",
            color: axisColor,
            scale: scaleX
        });
        if (horizontalTicks)
            this.updateTickLabels({
                group: this.tickLabels.horizontal,
                positions: horizontalTicks.positions,
                values: horizontalTicks.values,
                orientation: "horizontal",
                origin: axisX,
                fixed: axisY,
                color: axisColor,
                scale: scaleX,
                precision: this.board.calculator?.getPrecision?.()
            });
        else
            this.clearLabels(this.tickLabels.horizontal);
        const verticalTicks = this.drawAxisTicks({
            groups: this.tickGroups.vertical,
            start: position.y,
            end: position.y + this.properties.height,
            origin: axisY,
            fixed: axisX,
            orientation: "vertical",
            color: axisColor,
            scale: scaleY
        });
        if (verticalTicks)
            this.updateTickLabels({
                group: this.tickLabels.vertical,
                positions: verticalTicks.positions,
                values: verticalTicks.values,
                orientation: "vertical",
                origin: axisY,
                fixed: axisX,
                color: axisColor,
                scale: scaleY,
                precision: this.board.calculator?.getPrecision?.()
            });
        else
            this.clearLabels(this.tickLabels.vertical);
        this.updateTickInteractionHandles({
            horizontalTicks: horizontalTicks,
            verticalTicks: verticalTicks,
            axisX: axisX,
            axisY: axisY,
            position: position
        });
    }

    updateTickInteractionHandles({ horizontalTicks, verticalTicks, axisX, axisY, position }) {
        const handles = [];
        const horizontalPositions = horizontalTicks?.positions ?? [];
        const horizontalValues = horizontalTicks?.values ?? [];
        const verticalPositions = verticalTicks?.positions ?? [];
        const verticalValues = verticalTicks?.values ?? [];
        for (let index = 0; index < horizontalPositions.length; index++) {
            const x = horizontalPositions[index];
            const tickValue = horizontalValues[index];
            if (!Number.isFinite(tickValue) || Math.abs(tickValue) < 0.0001)
                continue;
            handles.push({ axis: "x", position: x, fixed: axisY, value: tickValue, index: index, total: horizontalValues.length });
        }
        for (let index = 0; index < verticalPositions.length; index++) {
            const y = verticalPositions[index];
            const tickValue = verticalValues[index];
            if (!Number.isFinite(tickValue) || Math.abs(tickValue) < 0.0001)
                continue;
            handles.push({ axis: "y", position: y, fixed: axisX, value: tickValue, index: index, total: verticalValues.length });
        }
        while (this.tickInteractionLayer.children.length > handles.length)
            this.tickInteractionLayer.removeChild(this.tickInteractionLayer.lastChild);
        for (let index = 0; index < handles.length; index++) {
            const handleData = handles[index];
            let hitArea = this.tickInteractionLayer.children[index];
            if (!hitArea) {
                hitArea = this.board.createSvgElement("rect");
                hitArea.setAttribute("fill", "transparent");
                hitArea.setAttribute("pointer-events", "all");
                this.tickInteractionLayer.appendChild(hitArea);
            }
            if (handleData.axis === "x") {
                hitArea.setAttribute("x", `${handleData.position - 12}`);
                hitArea.setAttribute("y", `${axisY - 12}`);
                hitArea.setAttribute("width", "24");
                hitArea.setAttribute("height", "24");
                hitArea.setAttribute("class", "chart-tick-handle chart-tick-handle-x");
            } else {
                hitArea.setAttribute("x", `${axisX - 12}`);
                hitArea.setAttribute("y", `${handleData.position - 12}`);
                hitArea.setAttribute("width", "24");
                hitArea.setAttribute("height", "24");
                hitArea.setAttribute("class", "chart-tick-handle chart-tick-handle-y");
            }
            hitArea.dataset.axis = handleData.axis;
            hitArea.dataset.index = `${handleData.index}`;
            hitArea.dataset.total = `${handleData.total}`;
            hitArea.dataset.value = `${handleData.value}`;
            hitArea.dataset.position = `${handleData.position}`;
            hitArea.onpointerdown = e => this.onTickPointerDown(e, hitArea);
        }
    }

    onTickPointerDown(event, hitArea) {
        event.stopPropagation();
        event.preventDefault();
        const axis = hitArea.dataset.axis;
        const tickValue = Number(hitArea.dataset.value);
        if (!Number.isFinite(tickValue) || Math.abs(tickValue) < 0.0001)
            return;
        const position = this.getBoardPosition();
        const axisX = position.x + this.properties.originX;
        const axisY = position.y + this.properties.originY;
        this._tickDragState = {
            axis: axis,
            tickValue: tickValue,
            axisX: axisX,
            axisY: axisY,
            pointerId: event.pointerId
        };
        window.addEventListener("pointermove", this._onTickPointerMove);
        window.addEventListener("pointerup", this._onTickPointerUp);
        window.addEventListener("pointercancel", this._onTickPointerUp);
    }

    onTickPointerMove(event) {
        const drag = this._tickDragState;
        if (!drag)
            return;
        if (event.pointerId !== drag.pointerId)
            return;
        event.preventDefault();
        const point = this.board.getMouseToSvgPoint(event);
        if (drag.axis === "x") {
            const pixelDistance = point.x - drag.axisX;
            if (Math.abs(pixelDistance) < 0.0001)
                return;
            if (pixelDistance * drag.tickValue <= 0)
                return;
            this.properties.scaleX = Math.abs(drag.tickValue / pixelDistance);
        } else {
            const pixelDistance = drag.axisY - point.y;
            if (Math.abs(pixelDistance) < 0.0001)
                return;
            if (pixelDistance * drag.tickValue <= 0)
                return;
            this.properties.scaleY = Math.abs(drag.tickValue / pixelDistance);
        }
        this.properties.autoScale = false;
        this.tick();
        this.board.markDirty(this);
    }

    onTickPointerUp(event) {
        const drag = this._tickDragState;
        if (!drag)
            return;
        if (event.pointerId !== drag.pointerId)
            return;
        window.removeEventListener("pointermove", this._onTickPointerMove);
        window.removeEventListener("pointerup", this._onTickPointerUp);
        window.removeEventListener("pointercancel", this._onTickPointerUp);
        this._tickDragState = null;
    }

    autoAdjustScales({ position, axisX, axisY }) {
        if (this.properties.autoScale === false)
            return;
        if (this._skipNextAutoScale === true) {
            this._skipNextAutoScale = false;
            return;
        }
        const maxAxisPxX = Math.max(axisX - position.x, position.x + this.properties.width - axisX);
        const maxAxisPxY = Math.max(axisY - position.y, position.y + this.properties.height - axisY);
        if (!maxAxisPxX || !maxAxisPxY)
            return;
        const ranges = this.getChildOffsetRanges(axisX, axisY);
        if (!ranges)
            return;
        const { minOffsetX, maxOffsetX, minOffsetY, maxOffsetY } = ranges;
        const scaleX = this.normalizeScale(this.properties.scaleX);
        const scaleY = this.normalizeScale(this.properties.scaleY);
        const currentMaxValueX = maxAxisPxX * scaleX;
        const currentMaxValueY = maxAxisPxY * scaleY;
        const observedValueX = Math.max(Math.abs(minOffsetX), Math.abs(maxOffsetX)) * scaleX;
        const observedValueY = Math.max(Math.abs(minOffsetY), Math.abs(maxOffsetY)) * scaleY;
        if (observedValueX > currentMaxValueX) {
            const targetValueX = observedValueX * 1.3;
            this.properties.scaleX = targetValueX / maxAxisPxX;
        }
        if (observedValueY > currentMaxValueY) {
            const targetValueY = observedValueY * 1.3;
            this.properties.scaleY = targetValueY / maxAxisPxY;
        }
    }

    getChildOffsetRanges(axisX, axisY) {
        let minOffsetX = Infinity;
        let maxOffsetX = -Infinity;
        let minOffsetY = Infinity;
        let maxOffsetY = -Infinity;
        let hasValues = false;
        const walk = shape => {
            if (!shape || shape === this)
                return;
            const bounds = this.getShapeBounds(shape);
            if (bounds) {
                hasValues = true;
                minOffsetX = Math.min(minOffsetX, bounds.minX - axisX);
                maxOffsetX = Math.max(maxOffsetX, bounds.maxX - axisX);
                minOffsetY = Math.min(minOffsetY, bounds.minY - axisY);
                maxOffsetY = Math.max(maxOffsetY, bounds.maxY - axisY);
            }
            if (shape.children && shape.children.length)
                shape.children.forEach(child => walk(child));
        };
        if (this.children && this.children.length)
            this.children.forEach(child => walk(child));
        if (!hasValues)
            return null;
        return { minOffsetX, maxOffsetX, minOffsetY, maxOffsetY };
    }

    getShapeBounds(shape) {
        const trajectory = shape.trajectory;
        const hasTrajectory = trajectory && Array.isArray(trajectory.values) && trajectory.values.length > 0;
        const position = hasTrajectory
            ? trajectory.values[trajectory.values.length - 1]
            : shape.getBoardPosition?.();
        if (!position)
            return null;
        const props = shape.properties || {};
        const radius = Number.isFinite(props.radius) ? props.radius : null;
        const width = Number.isFinite(props.width) ? props.width : null;
        const height = Number.isFinite(props.height) ? props.height : null;
        if (hasTrajectory || (width == null && height == null && radius == null)) {
            return { minX: position.x, maxX: position.x, minY: position.y, maxY: position.y };
        }
        if (radius != null && (width == null || height == null)) {
            return {
                minX: position.x - radius,
                maxX: position.x + radius,
                minY: position.y - radius,
                maxY: position.y + radius
            };
        }
        return {
            minX: position.x,
            maxX: position.x + (width ?? 0),
            minY: position.y,
            maxY: position.y + (height ?? 0)
        };
    }

    drawAxisTicks({ groups, start, end, origin, fixed, orientation, color, scale }) {
        const length = Math.abs(end - start);
        if (length <= 0 || !Number.isFinite(length) || !Number.isFinite(scale) || scale === 0) {
            this.clearTicks(groups.minor);
            this.clearTicks(groups.major);
            return null;
        }
        const domainMin = orientation === "horizontal"
            ? (start - origin) * scale
            : (origin - end) * scale;
        const domainMax = orientation === "horizontal"
            ? (end - origin) * scale
            : (origin - start) * scale;
        const values = this.buildTicks(domainMin, domainMax, this.getMaxMajorTickCount(length));
        const positions = [];
        for (let index = 0; index < values.length; index++) {
            const value = values[index];
            positions.push(orientation === "horizontal" ? origin + value / scale : origin - value / scale);
        }
        this.clearTicks(groups.minor);
        this.updateTickLines(groups.major, positions, orientation, fixed, 12, color, 0.5);
        return { positions: positions, values: values };
    }

    updateTickLines(groupElement, positions, orientation, fixed, length, color, opacity) {
        if (!groupElement)
            return;
        while (groupElement.children.length > positions.length)
            groupElement.removeChild(groupElement.lastChild);
        for (let index = 0; index < positions.length; index++) {
            const value = positions[index];
            let line = groupElement.children[index];
            if (!line) {
                line = this.board.createSvgElement("line");
                line.setAttribute("stroke-width", 0.5);
                groupElement.appendChild(line);
            }
            line.setAttribute("stroke", color);
            line.setAttribute("opacity", opacity);
            if (orientation === "horizontal") {
                line.setAttribute("x1", value);
                line.setAttribute("x2", value);
                line.setAttribute("y1", fixed - length / 2);
                line.setAttribute("y2", fixed + length / 2);
            } else {
                line.setAttribute("y1", value);
                line.setAttribute("y2", value);
                line.setAttribute("x1", fixed - length / 2);
                line.setAttribute("x2", fixed + length / 2);
            }
        }
    }

    updateTickLabels({ group, positions, values, orientation, origin, fixed, color, scale, precision }) {
        if (!group)
            return;
        if (!(Number.isFinite(scale) && scale !== 0)) {
            this.clearLabels(group);
            return;
        }
        while (group.children.length > positions.length)
            group.removeChild(group.lastChild);
        const labelPrecision = Number.isFinite(precision) ? Math.max(0, Math.floor(precision)) : 0;
        for (let index = 0; index < positions.length; index++) {
            const value = positions[index];
            let text = group.children[index];
            if (!text) {
                text = this.board.createSvgElement("text");
                text.setAttribute("class", "referential-tick-label");
                text.setAttribute("dominant-baseline", orientation === "horizontal" ? "hanging" : "middle");
                group.appendChild(text);
            }
            text.setAttribute("fill", color);
            if (orientation === "horizontal") {
                text.setAttribute("x", value);
                text.setAttribute("y", fixed + 16);
                text.setAttribute("text-anchor", "middle");
            } else {
                text.setAttribute("x", fixed - 12);
                text.setAttribute("y", value);
                text.setAttribute("text-anchor", "end");
                text.setAttribute("dominant-baseline", "middle");
            }
            const labelValue = Number.isFinite(values?.[index])
                ? values[index]
                : (orientation === "horizontal" ? (value - origin) * scale : (origin - value) * scale);
            const formatted = this.formatTickValue(labelValue, labelPrecision);
            text.textContent = formatted;
        }
    }

    clearTicks(groupElement) {
        if (!groupElement)
            return;
        while (groupElement.firstChild)
            groupElement.removeChild(groupElement.firstChild);
    }

    clearLabels(groupElement) {
        if (!groupElement)
            return;
        while (groupElement.firstChild)
            groupElement.removeChild(groupElement.firstChild);
    }

    formatTickValue(value, precision) {
        const rounded = Utils.roundToPrecision(value, precision);
        const normalized = Object.is(rounded, -0) ? 0 : rounded;
        return precision > 0 ? normalized.toFixed(precision) : normalized.toString();
    }

    normalizeScale(value) {
        const parsed = parseFloat(value);
        if (Number.isFinite(parsed) && parsed !== 0)
            return parsed;
        return 1;
    }

    getMaxMajorTickCount(axisLength) {
        if (!Number.isFinite(axisLength) || axisLength <= 0)
            return 11;
        return Math.max(11, Math.floor(axisLength / 35) + 1);
    }

    buildTicks(minValue, maxValue, targetCount = 5) {
        const ticks = [];
        if (!Number.isFinite(minValue) || !Number.isFinite(maxValue) || minValue >= maxValue)
            return ticks;
        const range = maxValue - minValue;
        const rawStep = range / Math.max(1, targetCount - 1);
        const exponent = Math.floor(Math.log10(rawStep));
        const magnitude = Math.pow(10, exponent);
        const normalized = rawStep / magnitude;
        let step;
        if (normalized < 1.5)
            step = magnitude;
        else if (normalized < 3)
            step = 2 * magnitude;
        else if (normalized < 7)
            step = 5 * magnitude;
        else
            step = 10 * magnitude;
        const firstTick = Math.ceil(minValue / step) * step;
        for (let value = firstTick; value <= maxValue + step * 0.001; value += step)
            ticks.push(Math.round(value * 1e10) / 1e10);
        return ticks;
    }

    getClipId() {
        return `clip-${this.id}`;
    }

    collectSvgElements() {
        const elements = [this.element];
        for (const child of this.children)
            elements.push(child.element);
        return elements;
    }

    toSvgString() {
        const position = this.getBoardPosition();
        const padding = 4;
        const x = position.x - padding;
        const y = position.y - padding;
        const width = this.properties.width + padding * 2;
        const height = this.properties.height + padding * 2;
        const clipId = "export-clip";
        let content = "";
        for (const element of this.collectSvgElements()) {
            const clone = element.cloneNode(true);
            clone.removeAttribute("id");
            clone.removeAttribute("clip-path");
            content += clone.outerHTML;
        }
        const styleBlock = BaseShape.embeddedFontStyles ? `<defs><style>${BaseShape.embeddedFontStyles}</style></defs>` : "";
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">
            ${styleBlock}
            <defs><clipPath id="${clipId}"><rect x="${position.x}" y="${position.y}" width="${this.properties.width}" height="${this.properties.height}"/></clipPath></defs>
            <g clip-path="url(#${clipId})">${content}</g>
        </svg>`;
    }
}
