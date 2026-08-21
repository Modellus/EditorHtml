class SetPropertiesCommand extends Command {
    constructor(shell, properties) {
        super();
        this.shell = shell;
        this.properties = properties;
    }

    execute() {
        this.previousProperties = Utils.cloneProperties(this.shell.properties);
        this.shell.setPropertiesAndReset(this.properties);
    }
    
    undo() {
        this.shell.setPropertiesAndReset(this.previousProperties);
    }
}