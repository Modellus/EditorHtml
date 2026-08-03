var modellus = {
    version: "2026.0.9",
    undo: _ => shell.commands.undo(),
    redo: _ => shell.commands.redo(),
    shape: {
        addBody: (name, parentName) => shell.commands.addShape("BodyShape", name, parentName),
        addPoint: (name, parentName) => shell.commands.addShape("PointShape", name, parentName),
        addReferential: name => shell.commands.addShape("ReferentialShape", name),
        addVector: (name, parentName) => shell.commands.addShape("VectorShape", name, parentName),
        addArc: (name, parentName) => shell.commands.addShape("ArcShape", name, parentName),
        addChart: name => shell.commands.addShape("ChartShape", name),
        addText: name => shell.commands.addShape("TextShape", name),
        addImage: name => shell.commands.addShape("MediaShape", name),
        addTable: name => shell.commands.addShape("TableShape", name),
        addDataTable: name => shell.commands.addShape("DataTableShape", name),
        addCasesTable: name => shell.commands.addShape("CasesTableShape", name),
        addExpression: name => shell.commands.addShape("ExpressionShape", name),
        remove: name => shell.commands.removeShape(name),
        select: name => shell.commands.selectShape(name),
        deselect: () => shell.board.selection.deselect(),
        setProperties: (name, properties) => shell.commands.setShapeProperties(name, properties),
        getProperties: name => shell.board.shapes.getByName(name)?.properties
    },
    blocks: {
        tools: {},
        execute: (toolName, input) => shell.blockTools.execute(toolName, input),
        getToolDefinitions: () => shell.blockTools.getToolDefinitions(),
        getCatalogue: () => BlockRegistry.toAgentCatalogue(),
        addComponent: (componentType, name) => shell.commands.addComponent(componentType, name),
        inspect: name => shell.board.shapes.getByName(name)?.getInspectionReport() ?? null
    },
    file: {
        open: () => shell.importFromFile(),
        save: () => shell.exportToFile(),
        new: () => shell.clear(),
        openFromPath: filePath => shell.openFromPath(filePath),
        saveToPath: filePath => shell.saveToPath(filePath)
    },
    model: {
        openModel: model => shell.openModel(model),
        getModel: () => shell.getModel(),
        getValues: () => shell.getValues(),
        setProperties: properties => shell.commands.setProperties(properties),
        getProperties: () => shell.properties
    },
    auth: {
        sessionKey: "mp.session",
        userKey: "mp.user",
        getSession: () => {
            try {
                const stored = localStorage.getItem("mp.session");
                return stored ? JSON.parse(stored) : null;
            } catch (error) {
                return null;
            }
        },
        getUser: () => {
            try {
                const stored = localStorage.getItem("mp.user");
                return stored ? JSON.parse(stored) : null;
            } catch (error) {
                return null;
            }
        }
    }
}

if (typeof BlockAgentTools !== "undefined") {
    for (const toolName of BlockAgentTools.toolNames)
        modellus.blocks.tools[toolName] = input => shell.blockTools.execute(toolName, input);
}

