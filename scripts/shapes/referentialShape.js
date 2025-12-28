class ReferentialShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.isReferential = true;
    }

    createTransformer() { 
        return new ReferentialTransformer(this.board, this);
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        items.push(
            {
                colSpan: 1,
                dataField: "scaleX",
                label: { text: "Horizontal Scale" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
            },
            {
                colSpan: 1,
                dataField: "scaleY",
                label: { text: "Vertical Scale" },
                editorType: "dxTextBox",
                editorOptions: {
                    stylingMode: "filled"
                }
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
        this.properties.rotation = 0;
        this.properties.originX = this.properties.width / 2;
        this.properties.originY = this.properties.height / 2;
        this.properties.scaleX = 1;
        this.properties.scaleY = 1;
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
        this.ticksLayer.appendChild(this.tickLabels.horizontal);
        this.ticksLayer.appendChild(this.tickLabels.vertical);
        const defs = this.board.createSvgElement("defs");
        g.appendChild(defs);
        const clipPath = this.board.createSvgElement("clipPath");
        clipPath.setAttribute("id", this.getClipId());
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
        this.container.setAttribute("x", position.x);
        this.container.setAttribute("y", position.y);
        this.container.setAttribute("width", this.properties.width);
        this.container.setAttribute("height", this.properties.height);
        this.container.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + this.properties.width / 2}, 
            ${position.y + this.properties.height / 2})`);
        this.containerClip.setAttribute("x", position.x);
        this.containerClip.setAttribute("y", position.y);
        this.containerClip.setAttribute("width", this.properties.width);
        this.containerClip.setAttribute("height", this.properties.height);
        this.containerClip.setAttribute("transform", `rotate(${this.properties.rotation}, ${position.x + this.properties.width / 2}, 
            ${position.y + this.properties.height / 2})`);
        this.container.setAttribute("fill", this.properties.backgroundColor);
        this.container.setAttribute("stroke", this.properties.foregroundColor);
        const axisColor = this.properties.axisColor ?? this.properties.foregroundColor;
        this.horizontalAxis.setAttribute("x1", position.x);
        this.horizontalAxis.setAttribute("y1", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("x2", position.x + this.properties.width);
        this.horizontalAxis.setAttribute("y2", position.y + this.properties.originY);
        this.horizontalAxis.setAttribute("stroke", axisColor);
        this.verticalAxis.setAttribute("x1", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y1", position.y);
        this.verticalAxis.setAttribute("x2", position.x + this.properties.originX);
        this.verticalAxis.setAttribute("y2", position.y + this.properties.height);
        this.verticalAxis.setAttribute("stroke", axisColor);
    }

    drawTicks() {
        if (this.tickGroups == null)
            return;
        const position = this.getBoardPosition();
        const axisColor = this.properties.axisColor ?? this.properties.foregroundColor;
        const axisX = position.x + this.properties.originX;
        const axisY = position.y + this.properties.originY;
        const scaleX = this.normalizeScale(this.properties.scaleX);
        const scaleY = this.normalizeScale(this.properties.scaleY);
        const horizontalPositions = this.drawAxisTicks({
            groups: this.tickGroups.horizontal,
            start: position.x,
            end: position.x + this.properties.width,
            origin: axisX,
            fixed: axisY,
            orientation: "horizontal",
            color: axisColor
        });
        if (horizontalPositions)
            this.updateTickLabels({
                group: this.tickLabels.horizontal,
                positions: horizontalPositions,
                orientation: "horizontal",
                origin: axisX,
                fixed: axisY,
                color: axisColor,
                scale: scaleX,
                precision: this.board.calculator?.getPrecision?.()
            });
        else
            this.clearLabels(this.tickLabels.horizontal);
        const verticalPositions = this.drawAxisTicks({
            groups: this.tickGroups.vertical,
            start: position.y,
            end: position.y + this.properties.height,
            origin: axisY,
            fixed: axisX,
            orientation: "vertical",
            color: axisColor
        });
        if (verticalPositions)
            this.updateTickLabels({
                group: this.tickLabels.vertical,
                positions: verticalPositions,
                orientation: "vertical",
                origin: axisY,
                fixed: axisX,
                color: axisColor,
                scale: scaleY,
                precision: this.board.calculator?.getPrecision?.()
            });
        else
            this.clearLabels(this.tickLabels.vertical);
    }

    drawAxisTicks({ groups, start, end, origin, fixed, orientation, color }) {
        const length = Math.abs(end - start);
        if (length <= 0 || !Number.isFinite(length)) {
            this.clearTicks(groups.minor);
            this.clearTicks(groups.major);
            return null;
        }
        const majorSpacing = this.getMajorTickSpacing(length);
        const minorSpacing = this.getMinorTickSpacing(majorSpacing);
        const majorPositions = this.calculateTickPositions(start, end, origin, majorSpacing);
        const minorPositions = this.calculateTickPositions(start, end, origin, minorSpacing, majorSpacing);
        this.updateTickLines(groups.major, majorPositions, orientation, fixed, 12, color, 0.5);
        this.updateTickLines(groups.minor, minorPositions, orientation, fixed, 6, color, 0.8);
        return majorPositions;
    }

    calculateTickPositions(start, end, origin, spacing, skipSpacing) {
        if (!(spacing > 0) || !Number.isFinite(spacing))
            return [];
        const epsilon = 0.0001;
        const positions = [];
        if (!skipSpacing)
            positions.push(origin);
        let forward = origin + spacing;
        let iterations = 0;
        const maxIterations = 1000;
        while (forward <= end + epsilon && iterations < maxIterations) {
            if (!skipSpacing || !this.isMultiple(forward - origin, skipSpacing))
                positions.push(forward);
            forward += spacing;
            iterations++;
        }
        let backward = origin - spacing;
        iterations = 0;
        while (backward >= start - epsilon && iterations < maxIterations) {
            if (!skipSpacing || !this.isMultiple(origin - backward, skipSpacing))
                positions.push(backward);
            backward -= spacing;
            iterations++;
        }
        positions.sort((a, b) => a - b);
        return positions;
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

    updateTickLabels({ group, positions, orientation, origin, fixed, color, scale, precision }) {
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
            const labelValue = orientation === "horizontal" ? (value - origin) * scale : (origin - value) * scale;
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

    getMajorTickSpacing(length) {
        const spacing = length / 4;
        return Math.max(spacing, 10);
    }

    getMinorTickSpacing(majorSpacing) {
        return Math.max(majorSpacing / 3, 6);
    }

    isMultiple(value, step) {
        if (!(step > 0))
            return false;
        const ratio = value / step;
        return Math.abs(ratio - Math.round(ratio)) < 0.0001;
    }

    getClipId() {
        return `clip-${this.id}`;
    }
}
