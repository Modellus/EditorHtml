class MindMapEndMarkers {
    static tipTypes = ["none", "arrow", "closed", "point", "diamond"];

    static getTipTypeIcon(tipType) {
        const icons = {
            none: "fa-light fa-minus",
            arrow: "fa-light fa-arrow-right",
            closed: "fa-light fa-location-arrow",
            point: "fa-solid fa-circle-small",
            diamond: "fa-light fa-diamond"
        };
        return icons[tipType];
    }

    static getMarkerId(shapeId, end, tipType) {
        return `mindmap-marker-${shapeId}-${end}-${tipType}`;
    }

    static buildMarkerMarkup(shapeId, end, tipType, color, lineWidth) {
        if (tipType === "none")
            return "";
        const markerId = MindMapEndMarkers.getMarkerId(shapeId, end, tipType);
        const orient = end === "start" ? "auto-start-reverse" : "auto";
        if (tipType === "point")
            return MindMapEndMarkers.buildPointMarkerMarkup(markerId, orient, color, lineWidth);
        if (tipType === "diamond")
            return MindMapEndMarkers.buildDiamondMarkerMarkup(markerId, orient, color, lineWidth);
        return MindMapEndMarkers.buildArrowMarkerMarkup(markerId, orient, color, lineWidth, tipType === "closed");
    }

    static buildPointMarkerMarkup(markerId, orient, color, lineWidth) {
        const radius = Math.max(3, lineWidth * 1.5);
        const markerSize = radius * 2 + lineWidth;
        const center = markerSize / 2;
        return `<marker id="${markerId}" markerWidth="${markerSize}" markerHeight="${markerSize}" refX="${center}" refY="${center}" orient="${orient}" markerUnits="userSpaceOnUse"><circle cx="${center}" cy="${center}" r="${radius}" fill="${color}"/></marker>`;
    }

    static buildArrowMarkerMarkup(markerId, orient, color, lineWidth, isClosed) {
        const size = Math.max(8, lineWidth * 3);
        const spread = isClosed ? size * 0.5 : size * 0.7;
        const markerWidth = size + lineWidth;
        const markerHeight = spread * 2 + lineWidth;
        const refX = size + lineWidth / 2;
        const refY = spread + lineWidth / 2;
        const offset = lineWidth / 2;
        const points = `${offset} ${offset}, ${size + offset} ${spread + offset}, ${offset} ${markerHeight - offset}`;
        const geometry = isClosed
            ? `<polygon points="${points}" fill="${color}" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/>`
            : `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/>`;
        return `<marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="${orient}" markerUnits="userSpaceOnUse">${geometry}</marker>`;
    }

    static buildDiamondMarkerMarkup(markerId, orient, color, lineWidth) {
        const size = Math.max(10, lineWidth * 4);
        const spread = size * 0.4;
        const markerWidth = size + lineWidth;
        const markerHeight = spread * 2 + lineWidth;
        const refX = size + lineWidth / 2;
        const refY = spread + lineWidth / 2;
        const offset = lineWidth / 2;
        const points = `${offset} ${refY}, ${size / 2 + offset} ${offset}, ${size + offset} ${refY}, ${size / 2 + offset} ${markerHeight - offset}`;
        return `<marker id="${markerId}" markerWidth="${markerWidth}" markerHeight="${markerHeight}" refX="${refX}" refY="${refY}" orient="${orient}" markerUnits="userSpaceOnUse"><polygon points="${points}" fill="${color}" stroke="${color}" stroke-width="${lineWidth}" stroke-linejoin="round"/></marker>`;
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = MindMapEndMarkers;
