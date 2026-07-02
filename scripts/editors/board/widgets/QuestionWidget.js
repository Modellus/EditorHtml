class QuestionShape extends BaseShape {
    constructor(board, parent, id) {
        super(board, null, id);
        this.answerText = "";
        this.selections = {};
        this.submitted = false;
    }

    isPassthroughDoubleClickSelectionEnabled() {
        return true;
    }

    isClickOutsideEditArea(target) {
        return super.isClickOutsideEditArea(target) && !$(target).closest(".shape-context-toolbar").length;
    }

    setDefaults() {
        super.setDefaults();
        this.properties.name = this.board.translations.get("Question Name") ?? "Question";
        const center = this.board.getClientCenter();
        this.properties.x = center.x - 220;
        this.properties.y = center.y - 160;
        this.properties.width = 440;
        this.properties.height = 320;
        this.properties.questionText = "";
        this.properties.questionNumber = "1";
        this.properties.answersColor = "";
        this.properties.answerMode = "single";
        this.properties.answerItems = [];
        this.properties.correctAnswer = "";
        this.properties.hasScoring = false;
    }

    enterEditMode() {
        this.isInEditMode = true;
        this.board.pointerLocked = true;
        document.addEventListener("mousedown", this._onDocumentMouseDown);
        this.buildQuestionInput();
        this.buildAnswerContent();
        return true;
    }

    exitEditMode() {
        if (this.container.contains(document.activeElement))
            document.activeElement.blur();
        this.isInEditMode = false;
        this.board.pointerLocked = false;
        super.exitEditMode();
        this.buildQuestionInput();
        this.buildAnswerContent();
    }

    scoringButtonIcon() {
        return this.properties.hasScoring
            ? `<span class="fa-stack mdl-scoring-icon"><i class="fa-solid fa-trophy fa-stack-1x"></i></span>`
            : `<span class="fa-stack mdl-scoring-icon"><i class="fa-light fa-trophy fa-stack-1x"></i><i class="fa-light fa-slash fa-stack-1x"></i></span>`;
    }

    createElement() {
        const { group, foreignObject } = this.createForeignObjectGroup();
        const $wrapper = $("<div class='mdl-question-shape'>").appendTo(foreignObject);
        this.container = $wrapper.get(0);
        this.container.addEventListener("pointerdown", e => {
            if (!this.isInEditMode && e.target.closest("input, .dx-checkbox, .dx-textarea"))
                e.preventDefault();
        });
        this.container.addEventListener("click", e => {
            if (!this.isInEditMode) {
                const textareaContainer = e.target.closest(".dx-textarea");
                if (textareaContainer) {
                    const input = textareaContainer.querySelector("textarea");
                    input?.focus();
                }
            }
        });
        $wrapper.css({ width: "100%", height: "100%", display: "flex", "flex-direction": "column", overflow: "hidden" });
        this.$questionSection = $("<div class='mdl-question-section'>").appendTo($wrapper);
        this.$answerSection = $("<div class='mdl-question-answer-section'>").appendTo($wrapper);
        this.buildQuestionInput();
        this.buildAnswerContent();
        return group;
    }

    buildQuestionInput() {
        this.$questionSection.empty();
        const $row = $("<div class='mdl-question-header-row'>").appendTo(this.$questionSection);
        if (this.isInEditMode) {
            const $numberHost = $("<div class='mdl-question-number-host'>").appendTo($row);
            $numberHost.dxTextBox({
                value: this.properties.questionNumber || "",
                width: 44,
                stylingMode: "filled",
                valueChangeEvent: "change",
                onValueChanged: e => {
                    if (e.event)
                        this.setPropertyCommand("questionNumber", e.value);
                }
            });
            this._questionNumberInstance = $numberHost.dxTextBox("instance");
        } else {
            const questionNumber = this.properties.questionNumber || "";
            if (questionNumber)
                $row.append($(`<span class="mdl-question-number-label">${questionNumber}</span>`));
        }
        const $questionHost = $("<div class='mdl-question-input-host'>").appendTo($row);
        $questionHost.dxTextBox({
            placeholder: "Type the question here...",
            stylingMode: "underlined",
            valueChangeEvent: "change",
            value: this.properties.questionText || "",
            onValueChanged: e => {
                if (e.event)
                    this.setPropertyCommand("questionText", e.value);
            }
        });
        this._questionTextBoxInstance = $questionHost.dxTextBox("instance");
    }

    buildAnswerContent() {
        this.$answerSection.empty();
        if (this.properties.answerMode === "freetext")
            this.buildFreetextAnswer();
        else
            this.buildMultipleChoiceAnswer();
    }

    isSingleAnswerMode() {
        return this.properties.answerMode === "single";
    }

    rebuildContent() {
        this.buildAnswerContent();
    }

    buildFreetextAnswer() {
        const $freetextHost = $("<div class='mdl-question-freetext-host'>").appendTo(this.$answerSection);
        $freetextHost.dxTextArea({
            placeholder: "Type your answer...",
            stylingMode: "outlined",
            height: "100%",
            value: this.answerText,
            onValueChanged: e => {
                if (e.event)
                    this.answerText = e.value;
            }
        });
        this._answerTextAreaInstance = $freetextHost.dxTextArea("instance");
    }

    buildMultipleChoiceAnswer() {
        const $listHost = $("<div class='mdl-question-list-host'>").appendTo(this.$answerSection);
        const items = this.properties.answerItems ?? [];
        const listOptions = {
            dataSource: items,
            itemTemplate: (data, index) => this.renderAnswerListItem(data, index),
            noDataText: ""
        };
        if (this.isInEditMode) {
            listOptions.itemDragging = {
                allowReordering: true,
                showDragIcons: false,
                onReorder: e => {
                    const updatedItems = [...(this.properties.answerItems ?? [])];
                    const moved = updatedItems.splice(e.fromIndex, 1)[0];
                    updatedItems.splice(e.toIndex, 0, moved);
                    this.setPropertyCommand("answerItems", updatedItems);
                    this._answerListInstance.option("dataSource", updatedItems);
                }
            };
        }
        $listHost.dxList(listOptions);
        this._answerListInstance = $listHost.dxList("instance");
        if (this.isInEditMode) {
            const $addButton = $(`<div class="mdl-question-add-button"><i class="fa-light fa-plus"></i></div>`);
            $addButton.on("click", () => this.addAnswerItem());
            this.$answerSection.append($addButton);
        }
    }

    renderAnswerListItem(data, index) {
        const $item = $(`<div class="mdl-question-list-item"></div>`);
        if (this.isInEditMode)
            this.renderEditModeItem($item, data, index);
        else
            this.renderViewModeItem($item, data, index);
        return $item;
    }

    renderEditModeItem($item, data, index) {
        const $nameHost = $("<div class='mdl-question-item-name-host'>").appendTo($item);
        $nameHost.dxTextBox({
            value: data.name,
            width: 36,
            stylingMode: "filled",
            valueChangeEvent: "change",
            onValueChanged: e => {
                if (e.event)
                    this.updateAnswerItemField(index, "name", e.value);
            }
        });
        const $textHost = $("<div class='mdl-question-item-text-host'>").appendTo($item);
        $textHost.dxTextBox({
            value: data.text,
            placeholder: "Answer text...",
            stylingMode: "filled",
            valueChangeEvent: "change",
            onValueChanged: e => {
                if (e.event)
                    this.updateAnswerItemField(index, "text", e.value);
            }
        });
        if (this.properties.hasScoring) {
            const $scoreHost = $("<div class='mdl-question-item-score-host'>").appendTo($item);
            $scoreHost.dxNumberBox({
                value: data.score ?? 0,
                width: 56,
                min: 0,
                stylingMode: "filled",
                valueChangeEvent: "change",
                onValueChanged: e => {
                    if (e.event)
                        this.updateAnswerItemField(index, "score", e.value);
                }
            });
        }
        const $correctHost = $("<div class='mdl-question-item-correct-host'>").appendTo($item);
        if (this.isSingleAnswerMode()) {
            const radioName = `question-${this.id}-correct`;
            const $radio = $(`<input type="radio" name="${radioName}" ${data.isCorrect ? "checked" : ""}>`);
            $radio.on("change", () => this.setSingleCorrectAnswer(index));
            $correctHost.append($radio);
        } else {
            $correctHost.dxCheckBox({
                value: data.isCorrect ?? false,
                onValueChanged: e => {
                    if (e.event)
                        this.updateAnswerItemField(index, "isCorrect", e.value);
                }
            });
        }
        const $removeButton = $(`<div class="mdl-question-item-remove"><i class="fa-light fa-trash-can"></i></div>`);
        $removeButton.on("click", () => this.removeAnswerItem(index));
        $item.append($removeButton);
    }

    renderViewModeItem($item, data, index) {
        const isSelected = !!this.selections[index];
        const answersColor = this.properties.answersColor || "";
        const colorStyle = answersColor ? ` style="color: ${answersColor}"` : "";
        const $label = $(`<div class="mdl-question-item-label"${colorStyle}></div>`).appendTo($item);
        $label.html(`<span class="mdl-question-item-name">${data.name}</span><span class="mdl-question-item-text">${data.text || ""}</span>`);
        if (this.properties.hasScoring && isSelected) {
            const score = data.score ?? 0;
            const failedClass = score <= 0 ? " mdl-question-item-failed" : "";
            $item.addClass("mdl-question-item-answered" + failedClass);
            $item.append($(`<span class="mdl-question-item-score-badge${failedClass}"><i class="fa-light fa-award"></i> ${score}</span>`));
        }
        const $checkHost = $("<div class='mdl-question-item-check-host'>").appendTo($item);
        if (this.isSingleAnswerMode()) {
            const radioName = `question-${this.id}-answer`;
            const $radio = $(`<input type="radio" name="${radioName}" ${isSelected ? "checked" : ""}>`);
            $radio.on("change", () => this.onAnswerSelected(index, true));
            $checkHost.append($radio);
        } else {
            $checkHost.dxCheckBox({
                value: isSelected,
                onValueChanged: e => {
                    if (e.event)
                        this.onAnswerSelected(index, e.value);
                }
            });
        }
    }

    onAnswerSelected(index, value) {
        if (this.isSingleAnswerMode()) {
            this.selections = {};
            this.selections[index] = true;
        } else {
            this.selections[index] = value;
        }
        this.buildAnswerContent();
    }

    setSingleCorrectAnswer(index) {
        const updatedItems = JSON.parse(JSON.stringify(this.properties.answerItems ?? []));
        for (let itemIndex = 0; itemIndex < updatedItems.length; itemIndex++)
            updatedItems[itemIndex].isCorrect = itemIndex === index;
        this.setPropertyCommand("answerItems", updatedItems);
        this._answerListInstance.option("dataSource", updatedItems);
    }

    updateAnswerItemField(index, field, value) {
        const updatedItems = JSON.parse(JSON.stringify(this.properties.answerItems ?? []));
        if (updatedItems[index])
            updatedItems[index][field] = value;
        this.setPropertyCommand("answerItems", updatedItems);
    }

    addAnswerItem() {
        const updatedItems = JSON.parse(JSON.stringify(this.properties.answerItems ?? []));
        const nextName = this.generateNextName(updatedItems);
        updatedItems.push({ name: nextName, text: "", score: 0, isCorrect: false });
        this.setPropertyCommand("answerItems", updatedItems);
        this._answerListInstance.option("dataSource", updatedItems);
        setTimeout(() => {
            const listElement = this._answerListInstance.element().get(0);
            listElement.scrollTop = listElement.scrollHeight;
        }, 50);
    }

    generateNextName(items) {
        const questionNumber = this.properties.questionNumber || "";
        if (items.length === 0) {
            if (questionNumber) {
                const isNumeric = /^\d+$/.test(questionNumber);
                return isNumeric ? `${questionNumber}.1` : `${questionNumber}.a`;
            }
            return "A";
        }
        const lastName = items[items.length - 1].name || "";
        const dotIndex = lastName.lastIndexOf(".");
        if (dotIndex >= 0) {
            const prefix = lastName.substring(0, dotIndex + 1);
            const suffix = lastName.substring(dotIndex + 1);
            const letterMatch = suffix.match(/^([A-Za-z])$/);
            if (letterMatch)
                return prefix + String.fromCharCode(letterMatch[1].charCodeAt(0) + 1);
            const numberMatch = suffix.match(/^(\d+)$/);
            if (numberMatch)
                return prefix + String(parseInt(numberMatch[1]) + 1);
        }
        const dotSuffix = lastName.endsWith(".");
        const baseName = dotSuffix ? lastName.slice(0, -1) : lastName;
        const letterMatch = baseName.match(/^([A-Za-z])$/);
        if (letterMatch) {
            const nextChar = String.fromCharCode(letterMatch[1].charCodeAt(0) + 1);
            return dotSuffix ? nextChar + "." : nextChar;
        }
        const numberMatch = baseName.match(/^(\d+)$/);
        if (numberMatch) {
            const nextNumber = String(parseInt(numberMatch[1]) + 1);
            return dotSuffix ? nextNumber + "." : nextNumber;
        }
        return String.fromCharCode(65 + items.length);
    }

    removeAnswerItem(index) {
        const updatedItems = JSON.parse(JSON.stringify(this.properties.answerItems ?? []));
        updatedItems.splice(index, 1);
        this.setPropertyCommand("answerItems", updatedItems);
        this._answerListInstance.option("dataSource", updatedItems);
    }

    setProperties(properties) {
        super.setProperties(properties);
        if (properties.questionText !== undefined)
            this._questionTextBoxInstance?.option("value", properties.questionText);
        if (properties.questionNumber !== undefined)
            this._questionNumberInstance?.option("value", properties.questionNumber);
        if (properties.answerMode !== undefined || properties.answerItems !== undefined || properties.hasScoring !== undefined || properties.answersColor !== undefined)
            this.buildAnswerContent();
    }

    submitAnswer() {
        this.submitted = true;
    }

    resetAnswer() {
        this.submitted = false;
        this.answerText = "";
        this.selections = {};
        this._answerTextAreaInstance?.option("value", "");
        this.buildAnswerContent();
    }

    calculateScore() {
        const items = this.properties.answerItems ?? [];
        let totalScore = 0;
        if (this.properties.answerMode === "single" || this.properties.answerMode === "multiple") {
            for (let index = 0; index < items.length; index++) {
                if (items[index].isCorrect && this.selections[index])
                    totalScore += (items[index].score ?? 0);
            }
        } else {
            const givenText = (this.answerText || "").trim().toLowerCase();
            const correctText = (this.properties.correctAnswer || "").trim().toLowerCase();
            if (givenText === correctText)
                totalScore = items.reduce((sum, item) => sum + (item.score ?? 0), 1);
        }
        return totalScore;
    }

    draw() {
        this.applyForeignObjectLayout();
        super.draw();
        const backgroundColor = this.properties.backgroundColor ?? "transparent";
        this.container.style.backgroundColor = backgroundColor;
        this.container.style.color = this.properties.foregroundColor ?? "#000000";
        const answersColor = this.properties.answersColor || "";
        this.$answerSection.get(0).style.color = answersColor;
        this.applyBorderStyle(this.container, 1);
    }

    populateShapeColorMenuSections(sections) {
        super.populateShapeColorMenuSections(sections);
        this._answersColorPicker = this.createColorPickerEditor("answersColor");
        sections[0].items.push({
            text: "Answers",
            iconHtml: this.menuIconHtml("fa-list", !!this.properties.answersColor),
            buildControl: $panel => $panel.append(this._answersColorPicker)
        });
    }
}

var QuestionWidget = QuestionShape;
