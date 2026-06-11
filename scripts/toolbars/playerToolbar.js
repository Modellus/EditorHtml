class ModellusPlayerToolbar {
    static createPlayerItems(configuration) {
        const itemsBeforeSlider = configuration.itemsBeforeSlider || [];
        const itemsAfterSlider = configuration.itemsAfterSlider || [];
        return [
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-play",
                    elementAttr: { id: configuration.playPauseButtonId || "playPauseButton" },
                    onClick: () => configuration.onPlayPause(),
                    onInitialized: event => configuration.onPlayPauseInitialized?.(event)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-stop",
                    elementAttr: { id: configuration.stopButtonId || "stopButton" },
                    onClick: () => configuration.onStop(),
                    onInitialized: event => configuration.onStopInitialized?.(event)
                }
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-backward-step",
                    elementAttr: { id: configuration.stepBackwardButtonId || "stepBackwardButton" },
                    onClick: () => configuration.onStepBackward(),
                    onInitialized: event => configuration.onStepBackwardInitialized?.(event)
                }
            },
            ...itemsBeforeSlider,
            {
                location: "center",
                widget: "dxSlider",
                cssClass: "slider",
                options: {
                    min: configuration.sliderMinimum,
                    max: configuration.sliderMaximum,
                    value: configuration.sliderValue,
                    width: configuration.sliderWidth,
                    elementAttr: { id: configuration.sliderId || "playHeadSlider" },
                    tooltip: {
                        enabled: true,
                        format: value => configuration.sliderTooltipFormatter(value),
                        showMode: "always",
                        position: "top"
                    },
                    onValueChanged: event => configuration.onSliderValueChanged(event.value)
                }
            },
            ...itemsAfterSlider,
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-forward-step",
                    elementAttr: { id: configuration.stepForwardButtonId || "stepForwardButton" },
                    onClick: () => configuration.onStepForward(),
                    onInitialized: event => configuration.onStepForwardInitialized?.(event)
                }
            },
            {
                location: "center",
                template: () => $("<div class='toolbar-separator'>|</div>")
            },
            {
                location: "center",
                widget: "dxButton",
                options: {
                    icon: "fa-light fa-repeat",
                    elementAttr: { id: configuration.replayButtonId || "replayButton" },
                    onClick: () => configuration.onReplay(),
                    onInitialized: event => configuration.onReplayInitialized?.(event)
                }
            }
        ];
    }
}
