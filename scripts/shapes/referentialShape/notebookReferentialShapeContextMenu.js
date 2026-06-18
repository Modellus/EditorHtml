Object.assign(ReferentialNotebookShape.prototype, {
    createContextMenuItems() {
        const items = NotebookShape.prototype.createContextMenuItems.call(this);
        items.push({
            text: "Add Shape",
            icon: "fa-light fa-plus",
            items: [
                this.createAddShapeMenuItem("Body", "body"),
                this.createAddShapeMenuItem("Point", "point"),
                this.createAddShapeMenuItem("Vector", "vector"),
                this.createAddShapeMenuItem("Line", "line"),
                this.createAddShapeMenuItem("Arc", "arc")
            ]
        });
        items.push({
            text: "Settings",
            icon: "fa-light fa-ruler-combined",
            items: [
                this.createDisplayToggleItem("Show horizontal axis", "showHorizontalAxis"),
                this.createDisplayToggleItem("Show vertical axis", "showVerticalAxis"),
                this.createDisplayToggleItem("Show ticks with values", "showTicksWithValues"),
                this.createDisplayToggleItem("Show horizontal grid lines", "showHorizontalGrid"),
                this.createDisplayToggleItem("Show vertical grid lines", "showVerticalGrid"),
                this.createSwitchSettingItem("Auto Scale", "autoScale", true),
                this.createNumberSettingItem("Horizontal Scale", "scaleX", 1),
                this.createNumberSettingItem("Vertical Scale", "scaleY", 1),
                this.createSwitchSettingItem("Equal Scales", "equalAxisScales", false),
                this.createNumberSettingItem("Horizontal Min", "xMin", null),
                this.createNumberSettingItem("Horizontal Max", "xMax", null),
                this.createNumberSettingItem("Vertical Min", "yMin", null),
                this.createNumberSettingItem("Vertical Max", "yMax", null),
                this.createSwitchSettingItem("Snap to Ticks", "snapToTicks", false)
            ]
        });
        return items;
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
