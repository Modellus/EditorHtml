class BodyShape extends BaseShape {
    static characters;
    static loadCharactersPromise;

    static setup() {
        super.setup();
        this.loadCharacters();
    }

    static loadCharacters() {
        if (this.loadCharactersPromise)
            return this.loadCharactersPromise;
        this.loadCharactersPromise = fetch("resources/characters/characters.json")
            .then(file => file.json())
            .then(directories => Promise.all(directories.map(directory => this.loadCharacter(directory))))
            .then(results => {
                this.characters = results;
                return results;
            });
        return this.loadCharactersPromise;
    }

    static loadCharacter(directory) {
        return fetch(`resources/characters/${directory}/character.json`)
            .then(file => file.json())
            .then(data => {
                data.folder = directory;
                return data;
            });
    }

    static getCharacters() {
        if (!this.characters)
            throw new Error("Characters not loaded. Call setup first.");
        return this.characters;
    }

    static getCharacterByKey(characterKey) {
        return this.getCharacters().find(character => character.folder === characterKey);
    }

    constructor(board, parent, id) {
        super(board, parent, id);
        this.ensureMotionTermMappings();
    }

    ensureMotionTermMappings() {
        if (!this.termsMapping.some(mapping => mapping.termProperty === "xTerm")) {
            this.termsMapping.push({
                termProperty: "xTerm",
                termValue: 0,
                property: "x",
                isInverted: false,
                scaleProperty: "x",
                caseProperty: "xTermCase"
            });
        }
        if (!this.termsMapping.some(mapping => mapping.termProperty === "yTerm")) {
            this.termsMapping.push({
                termProperty: "yTerm",
                termValue: 0,
                property: "y",
                isInverted: true,
                scaleProperty: "y",
                caseProperty: "yTermCase"
            });
        }
    }

    setProperties(properties) {
        super.setProperties(properties);
        this.character = this.getSelectedCharacter();
        this.synchronizeIdleAnimationTicker();
    }

    setProperty(name, value) {
        if (name === "characterKey")
            this.character = BodyShape.getCharacterByKey(value);
        super.setProperty(name, value);
        if (name === "characterKey")
            this.synchronizeIdleAnimationTicker();
    }

    getHandles() {
        const handleSize = 12;
        return [
            {
                className: "handle move",
                getAttributes: () => {
                    const position = this.getBoardPosition();
                    const radius = this.properties.radius ?? 0;
                    return { x: position.x - radius, y: position.y - radius, width: radius * 2, height: radius * 2 };
                },
                getTransform: e => ({
                    x: this.delta("x", e.dx),
                    y: this.delta("y", e.dy)
                })
            },
            {
                className: "handle top-left",
                getAttributes: () => this.getCornerHandleAttributes("top-left", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle top-right",
                getAttributes: () => this.getCornerHandleAttributes("top-right", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle bottom-left",
                getAttributes: () => this.getCornerHandleAttributes("bottom-left", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            },
            {
                className: "handle bottom-right",
                getAttributes: () => this.getCornerHandleAttributes("bottom-right", handleSize),
                getTransform: e => this.getCornerResizeTransform(e)
            }
        ];
    }

    getCornerHandleAttributes(corner, handleSize) {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 0;
        if (corner === "top-left")
            return { x: position.x - radius - handleSize / 2, y: position.y - radius - handleSize / 2, width: handleSize, height: handleSize };
        if (corner === "top-right")
            return { x: position.x + radius - handleSize / 2, y: position.y - radius - handleSize / 2, width: handleSize, height: handleSize };
        if (corner === "bottom-left")
            return { x: position.x - radius - handleSize / 2, y: position.y + radius - handleSize / 2, width: handleSize, height: handleSize };
        return { x: position.x + radius - handleSize / 2, y: position.y + radius - handleSize / 2, width: handleSize, height: handleSize };
    }

    getCornerResizeTransform(eventPoint) {
        const position = this.getBoardPosition();
        const horizontalRadius = Math.abs(eventPoint.x - position.x);
        const verticalRadius = Math.abs(eventPoint.y - position.y);
        const radius = Math.max(5, Math.max(horizontalRadius, verticalRadius));
        return {
            radius: radius,
            width: radius * 2,
            height: radius * 2
        };
    }

    getHandleRotationCenter() {
        const position = this.getBoardPosition();
        return { x: position.x, y: position.y };
    }

    enterEditMode() {
        return false;
    }

    createForm() {
        var form = super.createForm();
        var instance = form.dxForm("instance");
        var items = instance.option("items");
        const colorGroup = items.find(item => item.itemType === "group" && item.colCount === 3);
        if (colorGroup) {
            colorGroup.colCount = 2;
            colorGroup.items = colorGroup.items.filter(item => item.dataField !== "backgroundColor");
        }
        instance.option("items", items);
        this.ensureMotionTermMappings();
        this.addTermToForm("xTerm", "Horizontal", true, 1);
        this.addTermToForm("yTerm", "Vertical", true, 1);
        items = instance.option("items");
        const characters = BodyShape.getCharacters();
        const buttonItems = characters.map(character => ({
            key: character.folder,
            name: character.name,
            description: character.description,
            icon: `resources/characters/${character.folder}/${character.image}`
        }));
        items.push(
            {
                colSpan: 2,
                itemType: "group",
                colCount: 2,
                items: [
                    this.createColorPickerFormItem("trajectoryColor", "Trajectory color", 1),
                    this.createColorPickerFormItem("stroboscopyColor", "Stroboscopy color", 1)
                ]
            },
            {
                colSpan: 2,
                itemType: "group",
                colCount: 2,
                items: [
                    {
                        colSpan: 1,
                        dataField: "stroboscopyInterval",
                        label: { text: "Interval" },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            showSpinButtons: true,
                            stylingMode: "filled"
                        }
                    },
                    {
                        colSpan: 1,
                        dataField: "stroboscopyOpacity",
                        label: { text: "Opacity" },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            showSpinButtons: true,
                            step: 0.1,
                            stylingMode: "filled"
                        }
                    }
                ]
            },
            {
                colSpan: 2,
                label: { text: "File" },
                template: _ => this.createImageDropZoneEditor()
            },
            {
                colSpan: 2,
                dataField: "characterKey",
                label: { text: "Character" },
                editorType: "dxButtonGroup",
                editorOptions: {
                    stylingMode: "text",
                    items: buttonItems,
                    keyExpr: "key",
                    selectionMode: "single",
                    selectedItemKeys: this.properties.characterKey ? [this.properties.characterKey] : [],
                    elementAttr: {
                        class: "character-shape-picker",
                        style: "height: auto; width: auto;"
                    },
                    itemTemplate: (itemData, itemIndex, itemElement) => {
                        itemElement[0].innerHTML = `<div style="width:50px;height:50px;display:flex;align-items:center;justify-content:center;"><img src="${itemData.icon}" alt="${itemData.name}" style="width:100%;height:100%;object-fit:contain;" /></div>`;
                        this.configureCharacterTooltip(itemData, itemElement[0]);
                    },
                    onItemClick: e => {
                        const formInstance = $("#shape-form").dxForm("instance");
                        formInstance.updateData("characterKey", e.itemData.key);
                        this.setProperty("characterKey", e.itemData.key);
                    }
                }
            }
        );
        instance.option("items", items);
        return form;
    }

    configureCharacterTooltip(itemData, itemElement) {
        if (itemElement.dataset.tooltipInitialized === "true")
            return;
        itemElement.dataset.tooltipInitialized = "true";
        const name = this.escapeCharacterTooltipText(itemData.name ?? "");
        const description = this.escapeCharacterTooltipText(itemData.description ?? "");
        const tooltipHtml = `<div class="tooltip"><strong>${name}</strong><div>${description}</div></div>`;
        $("<div>")
            .appendTo("body")
            .dxTooltip({
                target: itemElement,
                contentTemplate: contentElement => contentElement.append($("<div class='tooltip'/>").html(tooltipHtml)),
                showEvent: {
                    delay: 300,
                    name: "mouseenter"
                },
                hideEvent: "mouseleave",
                position: "top",
                width: 220
            });
    }

    escapeCharacterTooltipText(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    createImageDropZoneEditor() {
        this.imageDropZoneControl = new ImageControl({
            imageSource: this.getImageSource(),
            onUploadFile: file => this.board.assetManager.uploadAsset(this.id, file),
            onImageChanged: imageSource => this.onImageControlChanged(imageSource),
            onImageCleared: () => this.onImageControlCleared()
        });
        return this.imageDropZoneControl.createHost();
    }

    onImageControlChanged(imageSource) {
        this.properties.imageBase64 = "";
        this.setProperty("imageUrl", imageSource);
    }

    onImageControlCleared() {
        this.properties.imageBase64 = "";
        this.setProperty("imageUrl", "");
    }

    getImageSource() {
        const imageUrl = this.properties.imageUrl;
        if (typeof imageUrl === "string" && imageUrl.trim() !== "")
            return imageUrl;
        const imageBase64 = this.properties.imageBase64;
        if (typeof imageBase64 === "string" && imageBase64.trim() !== "")
            return `data:image/png;base64,${imageBase64}`;
        return "";
    }

    createElement() {
        const element = this.board.createSvgElement("g");
        this.hitArea = this.board.createSvgElement("rect");
        this.hitArea.setAttribute("fill", "transparent");
        this.hitArea.setAttribute("stroke", "none");
        this.hitArea.setAttribute("pointer-events", "all");
        element.appendChild(this.hitArea);
        this.circle = this.board.createSvgElement("circle");
        this.circle.setAttribute("pointer-events", "all");
        element.appendChild(this.circle);
        this.image = this.board.createSvgElement("image");
        this.image.setAttribute("pointer-events", "none");
        element.appendChild(this.image);
        this.trajectory = { element: this.board.createSvgElement("polyline"), values: [], pointsString: "", lastCount: 0 };
        this.trajectory.element.setAttribute("fill", "none");
        this.trajectory.element.setAttribute("pointer-events", "none");
        element.appendChild(this.trajectory.element);
        this.stroboscopy = this.board.createSvgElement("g");
        this.stroboscopy.setAttribute("pointer-events", "none");
        element.appendChild(this.stroboscopy);
        this._stroboscopyPositions = [];
        return element;
    }    

    setDefaults() {
        super.setDefaults();
        this.properties.xTerm = "0";
        this.properties.yTerm = "0";
        this.properties.name = this.board.translations.get("Body Name");
        this.properties.x = 0;
        this.properties.y = 0;
        this.properties.angle = 0;
        this.properties.width = 10;
        this.properties.height = 10;
        this.properties.radius = (this.properties.width ** 2 + this.properties.height ** 2) ** 0.5;
        this.properties.foregroundColor = this.board.theme.getStrokeColors()[3].color;
        this.properties.borderColor = this.properties.foregroundColor;
        this.properties.trajectoryColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyColor = this.board.theme.getBackgroundColors()[0].color;
        this.properties.stroboscopyInterval = 10;
        this.properties.stroboscopyOpacity = 0.5;
        this.properties.imageUrl = "";
        this.properties.imageBase64 = "";
        this.properties.characterKey = "";
        this.character = null;
        this.lastBoardHorizontalPosition = null;
        this.flipImageHorizontally = false;
        this.idleAnimationIntervalId = null;
        this.idleAnimationIntervalMs = null;
    }

    clearIdleAnimationTicker() {
        if (this.idleAnimationIntervalId == null)
            return;
        clearInterval(this.idleAnimationIntervalId);
        this.idleAnimationIntervalId = null;
        this.idleAnimationIntervalMs = null;
    }

    synchronizeIdleAnimationTicker() {
        const character = this.getSelectedCharacter();
        if (!character) {
            this.clearIdleAnimationTicker();
            return;
        }
        const idleAnimation = this.getCharacterIdleAnimation(character);
        if (!idleAnimation) {
            this.clearIdleAnimationTicker();
            return;
        }
        const frameCount = idleAnimation.frames;
        if (!Number.isFinite(frameCount) || frameCount <= 0) {
            this.clearIdleAnimationTicker();
            return;
        }
        const intervalMs = 1000 / frameCount;
        if (this.idleAnimationIntervalId != null && this.idleAnimationIntervalMs === intervalMs)
            return;
        this.clearIdleAnimationTicker();
        this.idleAnimationIntervalMs = intervalMs;
        this.idleAnimationIntervalId = setInterval(() => {
            if (this.isSimulationPlaying())
                return;
            if (!this.getSelectedCharacter())
                return;
            this.board.markDirty(this);
        }, intervalMs);
    }

    update() {
        super.update();
        this.synchronizeIdleAnimationTicker();
        const character = this.getSelectedCharacter();
        if (character) {
            if (this.imageDropZoneControl)
                this.imageDropZoneControl.setImageSource(this.getImageSource());
            return;
        }
        const imageSource = this.getImageSource();
        if (imageSource != "")
            this.image.setAttribute("href", imageSource);
        else
            this.image.removeAttribute("href");
        if (this.imageDropZoneControl)
            this.imageDropZoneControl.setImageSource(imageSource);
    }

    draw() {
        super.draw();
        this.drawShape();
        this.drawTrajectory();
        this.drawStroboscopy();
    }

    drawShape() {
        const position = this.getBoardPosition();
        const radius = this.properties.radius ?? 0;
        const diameter = radius * 2;
        this.hitArea.setAttribute("x", position.x - radius);
        this.hitArea.setAttribute("y", position.y - radius);
        this.hitArea.setAttribute("width", diameter);
        this.hitArea.setAttribute("height", diameter);
        const character = this.getSelectedCharacter();
        if (character) {
            this.drawCharacter(position, radius, diameter, character);
            this.applyImageFlipTransform(position, true);
            return;
        }
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", this.properties.foregroundColor);
        this.applyBorderStroke(this.circle, 1);
        this.image.setAttribute("x", position.x - radius);
        this.image.setAttribute("y", position.y - radius);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        this.applyImageFlipTransform(position, this.image.hasAttribute("href"));
    }

    applyImageFlipTransform(position, hasImage) {
        if (!hasImage || !this.flipImageHorizontally) {
            this.image.removeAttribute("transform");
            return;
        }
        this.image.setAttribute("transform", `translate(${position.x * 2} 0) scale(-1 1)`);
    }

    getSelectedCharacter() {
        if (!this.properties.characterKey)
            return null;
        return BodyShape.getCharacterByKey(this.properties.characterKey);
    }

    drawCharacter(position, radius, diameter, character) {
        this.synchronizeIdleAnimationTicker();
        this.circle.setAttribute("cx", position.x);
        this.circle.setAttribute("cy", position.y);
        this.circle.setAttribute("r", radius);
        this.circle.setAttribute("fill", "transparent");
        this.circle.setAttribute("stroke", "transparent");
        this.image.setAttribute("x", position.x - radius);
        this.image.setAttribute("y", position.y - radius);
        this.image.setAttribute("width", diameter);
        this.image.setAttribute("height", diameter);
        this.image.setAttribute("preserveAspectRatio", "xMidYMid meet");
        const iteration = this.board.calculator.getIteration();
        const animation = this.getCharacterAnimation(character);
        const frameCount = animation.frames;
        const animationFolder = animation.folder;
        const startIndex = animation.startIndex ?? 0;
        const rawFrameIndex = this.getAnimationFrameIndex(animation, frameCount, iteration, startIndex);
        const padLength = animation.padLength ?? 0;
        const frameIndex = padLength > 0 ? String(rawFrameIndex).padStart(padLength, "0") : String(rawFrameIndex);
        const filePrefix = animation.filePrefix ?? `${character.name} ${animation.name} `;
        const frameName = `${filePrefix}${frameIndex}.png`;
        this.image.setAttribute("href", `resources/characters/${character.folder}/${animationFolder}/${frameName}`);
        this._lastFrameName = frameName;
        this._lastAnimationFolder = animationFolder;
        this._lastCharacterFolder = character.folder;
    }

    getAnimationFrameIndex(animation, frameCount, iteration, startIndex) {
        if (!this.isSimulationPlaying() && animation.name === "Idle") {
            const frameIntervalMs = 1000 / frameCount;
            const elapsedFrames = Math.floor(Date.now() / frameIntervalMs) % frameCount;
            return elapsedFrames + startIndex;
        }
        return (iteration % frameCount) + startIndex;
    }

    getCharacterAnimation(character) {
        const animations = character.animations ?? [];
        if (animations.length === 0)
            return { name: "Idle", folder: "", frames: 1 };
        const idleAnimation = this.getCharacterIdleAnimation(character);
        if (!this.isSimulationPlaying() && idleAnimation)
            return idleAnimation;
        const movingAnimation = this.getCharacterMovingAnimation(character);
        return movingAnimation ?? idleAnimation ?? animations[0];
    }

    isSimulationPlaying() {
        const playingStatus = typeof STATUS !== "undefined" ? STATUS.PLAYING : 0;
        return this.board.calculator.status === playingStatus;
    }

    getCharacterIdleAnimation(character) {
        return character.animations.find(animation => animation.name === "Idle") ?? null;
    }

    getCharacterMovingAnimation(character) {
        const walkAnimation = character.animations.find(animation => animation.name === "Walk");
        if (walkAnimation)
            return walkAnimation;
        const nonIdleAnimation = character.animations.find(animation => animation.name !== "Idle");
        if (nonIdleAnimation)
            return nonIdleAnimation;
        return character.animations[0] ?? null;
    }

    tick() {
        super.tick();
        this.tickShape();
        this.tickTrajectory();
        this.tickStroboscopy();
        this.board.markDirty(this);
    }

    tickShape() {
        const scale = this.getScale();
        const xCase = this.properties.xTermCase ?? 1;
        const yCase = this.properties.yTermCase ?? 1;
        const x = this.resolveTermNumeric(this.properties.xTerm, xCase);
        this.properties.x = scale.x !== 0 ? x / scale.x : 0;
        const y = -this.resolveTermNumeric(this.properties.yTerm, yCase);
        this.properties.y = scale.y !== 0 ? y / scale.y : 0;
        const boardPosition = this.getBoardPosition();
        if (this.lastBoardHorizontalPosition === boardPosition.x)
            return;
        this.flipImageHorizontally = this.lastBoardHorizontalPosition !== null && this.lastBoardHorizontalPosition > boardPosition.x;
        this.lastBoardHorizontalPosition = boardPosition.x;
    }

    tickTrajectory() {
        const lastIteration = this.board.calculator.getLastIteration();
        this.trajectory.values = this.trajectory.values.slice(0, lastIteration);
        if (this.trajectory.values.length <= lastIteration) {
            const position = this.getBoardPosition();
            this.trajectory.values.push({ x: position.x, y: position.y });
        }
        const currentCount = this.trajectory.values.length;
        if (currentCount !== this.trajectory.lastCount) {
            this.trajectory.pointsString = this.trajectory.values.map(v => `${v.x},${v.y}`).join(" ");
            this.trajectory.lastCount = currentCount;
        }
    }

    tickStroboscopy() {
        const defaultStrobeColor = this.board.theme.getBackgroundColors()[0].color;
        if (this.properties.stroboscopyColor === defaultStrobeColor) {
            this._stroboscopyPositions = [];
            return;
        }
        const lastIteration = this.board.calculator.getLastIteration();
        if (lastIteration === 0)
            this._stroboscopyPositions = [];
        const interval = Math.max(1, this.properties.stroboscopyInterval);
        const desired = Math.floor(lastIteration / interval);
        const positions = [];
        for (let i = 0; i < desired; i++) {
            const idx = i * interval;
            const pos = this.trajectory.values[idx] ?? this.getBoardPosition();
            positions.push(pos);
        }
        this._stroboscopyPositions = positions;
    }

    drawTrajectory() {
        if (this.properties.trajectoryColor != this.board.theme.getBackgroundColors()[0].color) {
            this.trajectory.element.setAttribute("points", this.trajectory.pointsString);
            this.trajectory.element.setAttribute("stroke", this.properties.trajectoryColor);
            this.trajectory.element.setAttribute("stroke-width", 1);
        } else
            this.trajectory.element.removeAttribute("points");
    }

    drawStroboscopy() {
        const defaultStrobeColor = this.board.theme.getBackgroundColors()[0].color;
        if (this.properties.stroboscopyColor === defaultStrobeColor) {
            while (this.stroboscopy.firstChild)
                this.stroboscopy.removeChild(this.stroboscopy.firstChild);
            return;
        }
        const positions = this._stroboscopyPositions ?? [];
        const desiredLength = positions.length;
        while (this.stroboscopy.children.length > desiredLength)
            this.stroboscopy.removeChild(this.stroboscopy.lastChild);
        for (let i = 0; i < desiredLength; i++) {
            const pos = positions[i];
            let circle = this.stroboscopy.children[i];
            if (!circle) {
                circle = this.board.createSvgElement("circle");
                this.stroboscopy.appendChild(circle);
            }
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", this.properties.radius);
            circle.setAttribute("fill", this.properties.stroboscopyColor);
            circle.setAttribute("opacity", this.properties.stroboscopyOpacity);
        }
    }
}
