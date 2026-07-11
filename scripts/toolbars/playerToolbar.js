class ModellusPlayerToolbar {
    static createPlayerTooltipInitializers(createTooltip) {
        return {
            onPlayPauseInitialized: event => createTooltip(event, "Play Pause Tooltip", 280),
            onStopInitialized: event => createTooltip(event, "Stop Tooltip", 280),
            onStepBackwardInitialized: event => createTooltip(event, "Step Backward Tooltip", 280),
            onStepForwardInitialized: event => createTooltip(event, "Step Forward Tooltip", 280),
            onReplayInitialized: event => createTooltip(event, "Replay Tooltip", 280)
        };
    }

    static updateCalculatedProgress(sliderInstance, calculatedIteration) {
        if (!sliderInstance)
            return;
        const element = sliderInstance.element();
        const bar = (element.jquery ? element[0] : element).querySelector(".dx-slider-bar");
        if (!bar)
            return;
        let progressElement = bar.querySelector(".mdl-slider-calculated");
        if (!progressElement) {
            progressElement = document.createElement("div");
            progressElement.className = "mdl-slider-calculated";
            bar.insertBefore(progressElement, bar.firstChild);
        }
        const minimum = sliderInstance.option("min");
        const maximum = sliderInstance.option("max");
        const range = maximum - minimum;
        const ratio = range > 0 ? (calculatedIteration - minimum) / range : 0;
        progressElement.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
    }

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
                    onValueChanged: event => configuration.onSliderValueChanged(event.value, !!event.event)
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
