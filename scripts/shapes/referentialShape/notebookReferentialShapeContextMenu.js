Object.assign(ReferentialNotebookShape.prototype, {
    createContextMenuItems() {
        return NotebookShape.prototype.createContextMenuItems.call(this);
    },

    createAddShapeMenuItem(labelText, type) {
        const iconByType = {
            body: "fa-light fa-circle",
            point: "fa-light fa-location-dot",
            vector: "fa-light fa-arrow-up-right",
            line: "fa-light fa-slash-forward",
            arc: "fa-light fa-compass-drafting"
        };
        return {
            text: labelText,
            icon: iconByType[type] || "fa-light fa-shapes",
            buildControl: $container => {
                $("<div>").appendTo($container).dxButton({
                    text: "Add",
                    width: 80,
                    stylingMode: "outlined",
                    onClick: () => {
                        this.notebookEditor.addBlock(type);
                    }
                });
            }
        };
    },

    createDisplayToggleItem(labelText, propertyName) {
        return this.createSwitchSettingItem(labelText, propertyName, true);
    },

    createSwitchSettingItem(labelText, propertyName, defaultValue) {
        const iconByProperty = {
            showHorizontalAxis: "fa-light fa-square-half-stroke-horizontal",
            showVerticalAxis: "fa-light fa-square-half-stroke",
            showTicksWithValues: "fa-light fa-square-ellipsis",
            showHorizontalGrid: "fa-light fa-border-center-h",
            showVerticalGrid: "fa-light fa-border-center-v",
            autoScale: "fa-light fa-up-right-and-down-left-from-center",
            equalAxisScales: "fa-light fa-equals",
            snapToTicks: "fa-light fa-magnet"
        };
        return {
            text: labelText,
            icon: iconByProperty[propertyName] || "fa-light fa-toggle-on",
            buildControl: $container => {
                $("<div>").appendTo($container).dxSwitch({
                    value: this.block[propertyName] ?? defaultValue,
                    onValueChanged: event => {
                        this.block[propertyName] = event.value;
                        this.markChanged();
                    }
                });
            }
        };
    },

    createNumberSettingItem(labelText, propertyName, defaultValue) {
        const iconByProperty = {
            scaleX: "fa-light fa-ruler-horizontal",
            scaleY: "fa-light fa-ruler-vertical",
            xMin: "fa-light fa-arrow-left-long",
            xMax: "fa-light fa-arrow-right-long",
            yMin: "fa-light fa-arrow-down-long",
            yMax: "fa-light fa-arrow-up-long"
        };
        return {
            text: labelText,
            icon: iconByProperty[propertyName] || "fa-light fa-input-numeric",
            buildControl: $container => {
                $("<div>").appendTo($container).dxNumberBox({
                    value: this.block[propertyName] ?? defaultValue,
                    stylingMode: "filled",
                    width: 100,
                    onValueChanged: event => {
                        this.block[propertyName] = event.value;
                        this.markChanged();
                    }
                });
            }
        };
    }
});
