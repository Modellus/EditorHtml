class Commands {
    constructor() {
        this.history = [];
        this.redoStack = [];
        this.commandRegistry = {};
    }

    registerCommand(commandName, commandClass) {
        this.commandRegistry[commandName] = commandClass;
    }

    createCommand(data, svg) {
        const CommandClass = this.commandRegistry[data.command];
        if (CommandClass && typeof CommandClass.fromJSON === 'function') {
            return CommandClass.fromJSON(data, svg);
        }
        throw new Error(`Command ${data.command} is not recognized or cannot be created.`);
    }

    execute(command) {
        command.execute();
        this.history.push(command);
        this.redoStack = [];
    }
    
    undo() {
        if (this.history.length > 0) {
            const command = this.history.pop();
            command.undo();
            this.redoStack.push(command);
        }
    }
    
    redo() {
        if (this.redoStack.length > 0) {
            const command = this.redoStack.pop();
            command.execute();
            this.history.push(command);
        }
    }

    save() {
        return JSON.stringify({
            history: this.history.map(cmd => cmd.toJSON()),
            redoStack: this.redoStack.map(cmd => cmd.toJSON())
        });
    }

    load(data, svg) {
        const parsedData = JSON.parse(data);
        this.history = parsedData.history.map(cmdData => this.factory.createCommand(cmdData, svg));
        this.redoStack = parsedData.redoStack.map(cmdData => this.factory.createCommand(cmdData, svg));
    }
}

const commands = new Commands();