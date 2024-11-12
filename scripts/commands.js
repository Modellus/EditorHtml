class Commands {
    constructor() {
        this.history = [];
        this.redoStack = [];
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
}

const commands = new Commands();