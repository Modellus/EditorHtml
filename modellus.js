var modellus = {
    version: "2025.0.1",
    undo: () => shell.commands.undo(),
    redo: () => shell.commands.redo(),
    addBody: (name) => shell.commands.addShape("BodyShape", name),
    addReferential: (name) => shell.commands.addShape("ReferentialShape", name),
    addVector: (name) => shell.commands.addShape("VectorShape", name),
    addChart: (name) => shell.commands.addShape("ChartShape", name),
    addText: (name) => shell.commands.addShape("TextShape", name),
    addImage: (name) => shell.commands.addShape("ImageShape", name),
    addTable: (name) => shell.commands.addShape("TableShape", name),
    addExpression: (name) => shell.commands.addShape("ExpressionShape", name),
    remove: (name) => shell.commands.removeShape(name),
    select: (name) => shell.commands.selectShape(name),
    setProperties: (name, properties) => shell.commands.setShapeProperties(name, properties)
} 