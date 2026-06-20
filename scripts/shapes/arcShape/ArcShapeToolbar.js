var ArcShapeToolbarMixin = {
    createToolbar() {
        const items = resolveShapeToolbarBaseItems(this, ArcShapeToolbarMixin.createToolbar);
        const formAdapter = { updateData: (field, value) => this.setPropertyCommand(field, value) };
        const { xDescriptor, yDescriptor } = this.createTermPairFormControls(formAdapter);
        this._xDescriptor = xDescriptor;
        this._yDescriptor = yDescriptor;
        const radiusDisplayMode = this.getTermDisplayModeProperty("radiusTerm");
        const radiusDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "radiusTerm", "radiusTermCase", true, radiusDisplayMode, true);
        this.termFormControls["radiusTerm"] = { termControl: radiusDescriptor.termControl };
        this._radiusDescriptor = radiusDescriptor;
        const startAngleDisplayMode = this.getTermDisplayModeProperty("startAngleTerm");
        const startAngleDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "startAngleTerm", "startAngleTermCase", true, startAngleDisplayMode, true);
        this.termFormControls["startAngleTerm"] = { termControl: startAngleDescriptor.termControl };
        this._startAngleDescriptor = startAngleDescriptor;
        const endAngleDisplayMode = this.getTermDisplayModeProperty("endAngleTerm");
        const endAngleDescriptor = TermControl.createBaseShapeTermFormControl(this, formAdapter, "endAngleTerm", "endAngleTermCase", true, endAngleDisplayMode, true);
        this.termFormControls["endAngleTerm"] = { termControl: endAngleDescriptor.termControl };
        this._endAngleDescriptor = endAngleDescriptor;
        items.push(
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createShapeColorDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createLineWidthDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createTermsDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            {
                location: "center",
                template: () => {
                    const container = $('<div></div>');
                    this.createMotionDropDownButton(container);
                    return container;
                }
            },
            {
                location: "center",
                template: () => $(`<div class="toolbar-separator">|</div>`)
            },
            this.createRemoveToolbarItem()
        );
        return items;
    },
    createLineWidthDropDownButton(container) {
        this._lineWidthDropdownElement = $('<div class="mdl-line-width-selector">');
        this._lineWidthDropdownElement.dxDropDownButton({
            showArrowIcon: false,
            stylingMode: "text",
            useSelectMode: false,
            onInitialized: e => Utils.createTranslatedTooltip(e, "Line Width Tooltip", this.board.translations, 280),
            template: (data, element) => this.renderLineWidthButtonTemplate(element[0]),
            dropDownOptions: {
                container: document.body,
                wrapperAttr: this.getShapeOverlayWrapperAttr(),
                width: "auto",
                contentTemplate: contentElement => {
                    const listItems = [
                        {
                            text: "Width",
                            buildControl: $container => {
                                $('<div>').dxNumberBox({
                                    value: this.properties.lineWidth,
                                    min: 1,
                                    max: 50,
                                    step: 1,
                                    showSpinButtons: true,
                                    width: 80,
                                    stylingMode: "filled",
                                    onValueChanged: e => this.setPropertyCommand("lineWidth", e.value)
                                }).appendTo($container);
                            }
                        }
                    ];
                    $(contentElement).empty();
                    $('<div>').appendTo(contentElement).dxList({
                        dataSource: listItems,
                        scrollingEnabled: false,
                        itemTemplate: (data, _, el) => {
                            el[0].innerHTML = `<div class="mdl-dropdown-list-item"><span class="mdl-dropdown-list-label">${data.text}</span><span class="mdl-dropdown-list-control"></span></div>`;
                            data.buildControl($(el).find(".mdl-dropdown-list-control"));
                        }
                    });
                }
            }
        });
        this._lineWidthDropdownElement.appendTo(container);
    }
};
if (typeof ArcShape !== "undefined") Object.assign(ArcShape.prototype, ArcShapeToolbarMixin);
