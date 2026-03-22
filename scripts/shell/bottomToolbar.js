class BottomToolbar {
    constructor(shell) {
        this.shell = shell;
        this.instance = null;
        this.zoom = null;
        this.playPause = null;
        this.stop = null;
        this.replay = null;
        this.playHead = null;
        this.stepBackward = null;
        this.stepForward = null;
        this.$playHeadMin = null;
        this.$playHeadMax = null;
        this._create();
    }

    _create() {
        $("#bottom-toolbar").dxToolbar({
            items: [
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-minus",
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom Out Tooltip", 280)
                    },
                    location: "before",
                    onClick: e => this.shell.panAndZoom.setZoom(this.shell.panAndZoom.getZoom() - 0.1)
                },
                {
                    widget: "dxButton",
                    options: {
                        elementAttr: {
                            id: "zoomButton"
                        },
                        stylingMode: "text",
                        text: "100 %",
                        onClick: e => this.shell.panAndZoom.setZoom(1),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom Reset Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-circle-plus",
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Zoom In Tooltip", 280)
                    },
                    location: "before",
                    onClick: e => this.shell.panAndZoom.setZoom(this.shell.panAndZoom.getZoom() + 0.1)
                },
                {
                    location: "before",
                    template() {
                        return $("<div class='toolbar-separator'>|</div>");
                    }
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-left",
                        onClick: _ => this.shell.undoPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Undo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-rotate-right",
                        onClick: _ => this.shell.redoPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Redo Tooltip", 280)
                    },
                    location: "before"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-play",
                        elementAttr: {
                            id: "playPauseButton"
                        },
                        onClick: _ => this.shell.playPausePressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Play Pause Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-stop",
                        elementAttr: {
                            id: "stopButton"
                        },
                        onClick: _ => this.shell.stopPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Stop Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template: _ => $("<div id='playHeadMinLabel'></div>")
                },
                {
                    widget: "dxSlider",
                    cssClass: "slider",
                    options: {
                        min: 1,
                        max: 1,
                        value: 1,
                        width: 400,
                        elementAttr: {
                            id: "playHeadSlider"
                        },
                        tooltip: {
                            enabled: true,
                            format: v => {
                                const precision = Utils.getPrecision(this.shell.calculator.properties.independent.step);
                                return this.shell.calculator.getIndependentValue(v).toFixed(precision);
                            },
                            showMode: "always",
                            position: "top",
                        },
                        onValueChanged: e => this.shell.iterationChanged(e.value)
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template: _ => $("<div id='playHeadMaxLabel'></div>")
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-backward-step",
                        elementAttr: {
                            id: "stepBackwardButton"
                        },
                        onClick: _ => this.shell.stepBackwardPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Step Backward Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-forward-step",
                        elementAttr: {
                            id: "stepForwardButton"
                        },
                        onClick: _ => this.shell.stepForwardPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Step Forward Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    location: "center",
                    template() {
                        return $("<div id='representation-tools-separator' class='toolbar-separator'>|</div>");
                    }
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-repeat",
                        elementAttr: {
                            id: "replayButton"
                        },
                        onClick: _ => this.shell.replayPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Replay Tooltip", 280)
                    },
                    location: "center"
                },
                {
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-map",
                        elementAttr: {
                            id: "minimap-button"
                        },
                        onClick: () => this.shell.miniMapPressed(),
                        onInitialized: e => this.shell.createTranslatedTooltip(e, "Mini Map Tooltip", 280)
                    },
                    location: "after"
                },
                {
                    location: "after",
                    widget: "dxButton",
                    options: {
                        icon: "fa-light fa-robot",
                        elementAttr: {
                            id: "chat-button"
                        },
                        onClick: _ => this.shell.chatPressed(),
                        onInitialized: e => {
                            this.shell.chatController.tooltip = this.shell.createTranslatedTooltip(e, "Chat Tooltip", 280, () => !this.shell.chatController.isOpen());
                        }
                    }
                }
            ]
        });
        this.instance = $("#bottom-toolbar").dxToolbar("instance");
        this.zoom = $("#zoomButton").dxButton("instance");
        this.playPause = $("#playPauseButton").dxButton("instance");
        this.stop = $("#stopButton").dxButton("instance");
        this.replay = $("#replayButton").dxButton("instance");
        this.playHead = $("#playHeadSlider").dxSlider("instance");
        this.stepBackward = $("#stepBackwardButton").dxButton("instance");
        this.stepForward = $("#stepForwardButton").dxButton("instance");
        this.$playHeadMin = $("#playHeadMinLabel");
        this.$playHeadMax = $("#playHeadMaxLabel");
    }

    updatePlayer() {
        const lastIteration = this.shell.calculator.getLastIteration();
        const finalIteration = this.shell.calculator.getFinalIteration();
        const iteration = this.shell.calculator.getIteration();
        const icon = this.playPause.option("icon");
        const isRunning = this.shell.calculator.status == STATUS.PLAYING || this.shell.calculator.status == STATUS.REPLAYING;
        if (isRunning && icon != "fa-light fa-pause" || !isRunning && icon != "fa-light fa-play") {
            this.playPause.option("icon", isRunning ? "fa-light fa-pause" : "fa-light fa-play");
            this.playPause.repaint();
        }
        this.stop.option("disabled", isRunning);
        this.replay.option("disabled", isRunning);
        this.stepBackward.option("disabled", isRunning || iteration == 1);
        this.stepForward.option("disabled", isRunning || iteration >= lastIteration);
        this.playHead.option("max", finalIteration);
        this.playHead.option("value", iteration);
        this.$playHeadMin.text(this.shell.calculator.getStart().toFixed(Utils.getPrecision(this.shell.calculator.properties.independent.step)));
        if (this.shell.calculator.properties.independent.noLimit)
            this.$playHeadMax.html('<i class="fa-light fa-infinity" style="font-size:14px; font-weight:400; padding-top:3px"></i>');
        else
            this.$playHeadMax.text(this.shell.calculator.getEnd().toFixed(Utils.getPrecision(this.shell.calculator.properties.independent.step)));
    }

}
