class ConnectorIndex {
    constructor() {
        this.connectorsByShapeId = new Map();
    }

    clear() {
        this.connectorsByShapeId.clear();
    }

    isEmpty() {
        return this.connectorsByShapeId.size === 0;
    }

    addEntry(shapeId, connector) {
        if (shapeId == null)
            return;
        const connectors = this.connectorsByShapeId.get(shapeId);
        if (connectors) {
            connectors.add(connector);
            return;
        }
        this.connectorsByShapeId.set(shapeId, new Set([connector]));
    }

    unregister(connector) {
        for (const [shapeId, connectors] of this.connectorsByShapeId) {
            connectors.delete(connector);
            if (connectors.size === 0)
                this.connectorsByShapeId.delete(shapeId);
        }
    }

    update(connector) {
        this.unregister(connector);
        this.addEntry(connector.properties.startShapeId, connector);
        this.addEntry(connector.properties.endShapeId, connector);
    }

    getForShapeId(shapeId) {
        return this.connectorsByShapeId.get(shapeId) ?? null;
    }

    collectForSubtree(shape) {
        const collected = new Set();
        this.addSubtreeConnectors(shape, collected);
        return collected;
    }

    addSubtreeConnectors(shape, collected) {
        const connectors = this.connectorsByShapeId.get(shape.id);
        if (connectors)
            connectors.forEach(connector => collected.add(connector));
        shape.children.forEach(child => this.addSubtreeConnectors(child, collected));
    }
}

if (typeof module !== "undefined" && module.exports)
    module.exports = ConnectorIndex;
