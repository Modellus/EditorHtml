(function(global) {
    class AgentToolBridge {
        constructor(options) {
            this.sendToolResult = options.sendToolResult;
        }

        async handleToolCall(toolCall) {
            const toolCallId = toolCall?.toolCallId;
            const toolName = toolCall?.toolName;
            const toolInput = toolCall?.input;
            if (typeof toolCallId !== "string" || typeof toolName !== "string")
                return;
            try {
                const toolOutput = await this.executeToolByName(toolName, toolInput);
                this.emitToolResult({
                    toolCallId,
                    toolName,
                    output: toolOutput,
                    state: "output-available"
                });
            } catch (error) {
                this.emitToolResult({
                    toolCallId,
                    toolName,
                    output: null,
                    state: "output-error",
                    errorText: this.normalizeError(error)
                });
            }
        }

        async executeToolByName(toolName, toolInput) {
            const normalizedToolName = this.normalizeToolName(toolName);
            const sdkFunction = this.resolveSdkFunction(normalizedToolName);
            const toolArguments = this.createToolArguments(normalizedToolName, toolInput);
            const executionResult = sdkFunction(...toolArguments);
            if (executionResult && typeof executionResult.then === "function")
                return executionResult;
            return executionResult ?? null;
        }

        normalizeToolName(toolName) {
            const aliases = this.getToolNameAliases();
            return aliases[toolName] || toolName;
        }

        getToolNameAliases() {
            return {
                modellus_undo: "modellus.undo",
                modellus_redo: "modellus.redo",
                modellus_shape_addBody: "modellus.shape.addBody",
                modellus_shape_addReferential: "modellus.shape.addReferential",
                modellus_shape_addVector: "modellus.shape.addVector",
                modellus_shape_addChart: "modellus.shape.addChart",
                modellus_shape_addText: "modellus.shape.addText",
                modellus_shape_addImage: "modellus.shape.addImage",
                modellus_shape_addTable: "modellus.shape.addTable",
                modellus_shape_addExpression: "modellus.shape.addExpression",
                modellus_shape_remove: "modellus.shape.remove",
                modellus_shape_select: "modellus.shape.select",
                modellus_shape_deselect: "modellus.shape.deselect",
                modellus_shape_setProperties: "modellus.shape.setProperties",
                modellus_shape_getProperties: "modellus.shape.getProperties",
                modellus_file_open: "modellus.file.open",
                modellus_file_save: "modellus.file.save",
                modellus_file_new: "modellus.file.new",
                modellus_file_openFromPath: "modellus.file.openFromPath",
                modellus_file_saveToPath: "modellus.file.saveToPath",
                modellus_model_openModel: "modellus.model.openModel",
                modellus_model_getModel: "modellus.model.getModel",
                modellus_model_getValues: "modellus.model.getValues",
                modellus_model_setProperties: "modellus.model.setProperties",
                modellus_model_getProperties: "modellus.model.getProperties"
            };
        }

        resolveSdkFunction(toolName) {
            if (!toolName.startsWith("modellus."))
                throw new Error(`Unsupported tool: ${toolName}`);
            const pathSegments = toolName.split(".");
            let parentValue = global;
            let currentValue = global;
            for (let segmentIndex = 0; segmentIndex < pathSegments.length; segmentIndex++) {
                parentValue = currentValue;
                currentValue = currentValue?.[pathSegments[segmentIndex]];
                if (currentValue === undefined || currentValue === null)
                    throw new Error(`Unknown tool: ${toolName}`);
            }
            if (typeof currentValue !== "function")
                throw new Error(`Tool is not callable: ${toolName}`);
            return currentValue.bind(parentValue);
        }

        createToolArguments(toolName, toolInput) {
            if (toolName === "modellus.undo")
                return [];
            if (toolName === "modellus.redo")
                return [];
            if (toolName === "modellus.shape.addBody")
                return [toolInput?.name, toolInput?.parentName];
            if (toolName === "modellus.shape.addReferential")
                return [toolInput?.name];
            if (toolName === "modellus.shape.addVector")
                return [toolInput?.name, toolInput?.parentName];
            if (toolName === "modellus.shape.addChart")
                return [toolInput?.name];
            if (toolName === "modellus.shape.addText")
                return [toolInput?.name];
            if (toolName === "modellus.shape.addImage")
                return [toolInput?.name];
            if (toolName === "modellus.shape.addTable")
                return [toolInput?.name];
            if (toolName === "modellus.shape.addExpression")
                return [toolInput?.name];
            if (toolName === "modellus.shape.remove")
                return [toolInput?.name];
            if (toolName === "modellus.shape.select")
                return [toolInput?.name];
            if (toolName === "modellus.shape.deselect")
                return [];
            if (toolName === "modellus.shape.setProperties")
                return [toolInput?.name, toolInput?.properties];
            if (toolName === "modellus.shape.getProperties")
                return [toolInput?.name];
            if (toolName === "modellus.file.open")
                return [];
            if (toolName === "modellus.file.save")
                return [];
            if (toolName === "modellus.file.new")
                return [];
            if (toolName === "modellus.file.openFromPath")
                return [toolInput?.filePath];
            if (toolName === "modellus.file.saveToPath")
                return [toolInput?.filePath];
            if (toolName === "modellus.model.openModel")
                return [toolInput?.model];
            if (toolName === "modellus.model.getModel")
                return [];
            if (toolName === "modellus.model.getValues")
                return [];
            if (toolName === "modellus.model.setProperties")
                return [toolInput?.properties];
            if (toolName === "modellus.model.getProperties")
                return [];
            return this.createDefaultToolArguments(toolInput);
        }

        createDefaultToolArguments(toolInput) {
            if (toolInput === undefined)
                return [];
            if (Array.isArray(toolInput))
                return toolInput;
            return [toolInput];
        }

        emitToolResult(result) {
            if (typeof this.sendToolResult !== "function")
                return;
            this.sendToolResult(result);
        }

        normalizeError(error) {
            if (error instanceof Error)
                return error.message;
            return String(error);
        }
    }

    global.AgentToolBridge = AgentToolBridge;
})(window);
