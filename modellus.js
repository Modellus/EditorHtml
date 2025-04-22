var modellus = {
    version: "2025.0.1",
    undo: _ => shell.commands.undo(),
    redo: _ => shell.commands.redo(),
    shape: {
        addBody: (name, parentName) => shell.commands.addShape("BodyShape", name, parentName),
        addReferential: name => shell.commands.addShape("ReferentialShape", name),
        addVector: (name, parentName) => shell.commands.addShape("VectorShape", name, parentName),
        addChart: name => shell.commands.addShape("ChartShape", name),
        addText: name => shell.commands.addShape("TextShape", name),
        addImage: name => shell.commands.addShape("ImageShape", name),
        addTable: name => shell.commands.addShape("TableShape", name),
        addExpression: name => shell.commands.addShape("ExpressionShape", name),
        remove: name => shell.commands.removeShape(name),
        select: name => shell.commands.selectShape(name),
        deselect: () => shell.commands.deselectShape(),
        setProperties: (name, properties) => shell.commands.setShapeProperties(name, properties),
        getProperties: name => shell.board.shapes.getByName(name)?.properties
    },
    file: {
        open: () => shell.open(),
        save: () => shell.save(),
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
    }
} 