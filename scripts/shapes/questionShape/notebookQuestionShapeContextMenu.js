Object.assign(QuestionNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    },

    createAnswerModeMenuItem(labelText, modeValue) {
        const iconByMode = {
            single: "fa-light fa-circle-dot",
            multiple: "fa-light fa-list-check",
            freetext: "fa-light fa-keyboard"
        };
        return {
            text: labelText,
            icon: iconByMode[modeValue] || "fa-light fa-circle-dot",
            buildControl: $container => {
                $("<div>").appendTo($container).dxButton({
                    text: this.block.answerMode === modeValue ? "Selected" : "Select",
                    width: 90,
                    stylingMode: this.block.answerMode === modeValue ? "contained" : "outlined",
                    onClick: () => {
                        this.block.answerMode = modeValue;
                        this.markChanged();
                        this.notebookEditor._reloadBlockList();
                    }
                });
            }
        };
    }
});
