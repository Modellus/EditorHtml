Object.assign(QuestionNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Answer Mode",
            icon: "fa-light fa-circle-dot",
            items: [
                this.createAnswerModeMenuItem("Single Answer", "single"),
                this.createAnswerModeMenuItem("Multiple Answers", "multiple"),
                this.createAnswerModeMenuItem("Free Text", "freetext")
            ]
        });
        items.push({
            text: "Scoring",
            icon: "fa-light fa-trophy",
            items: [
                {
                    text: "Enabled",
                    icon: "fa-light fa-trophy",
                    buildControl: $container => {
                        $("<div>").appendTo($container).dxSwitch({
                            value: this.block.hasScoring === true,
                            onValueChanged: event => {
                                this.block.hasScoring = event.value;
                                this.markChanged();
                            }
                        });
                    }
                }
            ]
        });
        return items;
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
