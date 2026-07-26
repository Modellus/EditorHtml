class ChatController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.instance = null;
        this.adapter = null;
        this.tooltip = null;
        this.hostElement = null;
        this.busy = false;
        this.toolCallDepth = 0;
        this.threadIdRef = { value: null };
        this.agentToolBridge = null;
        if (typeof AgentToolBridge === "function")
            this.agentToolBridge = new AgentToolBridge({
                sendToolResult: result => this.adapter?.sendToolResult(
                    result.toolCallId,
                    result.toolName,
                    result.output,
                    result.state,
                    result.errorText
                )
            });
        this._create();
    }

    _saveGeometry() {
        const overlayContent = this.popup.$content()[0].closest(".dx-overlay-content");
        if (!overlayContent)
            return;
        const rect = overlayContent.getBoundingClientRect();
        const geometry = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        localStorage.setItem("mdl.chat.geometry", JSON.stringify(geometry));
    }

    _loadGeometry() {
        try {
            const stored = localStorage.getItem("mdl.chat.geometry");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    getMinimumPopupWidth() {
        return 320;
    }

    getMinimumPopupHeight() {
        return 420;
    }

    handlePopupResize() {
        this.instance?.repaint();
        this.updateMessageBoxState();
    }

    _create() {
        const savedGeometry = this._loadGeometry();
        const minimumPopupWidth = this.getMinimumPopupWidth();
        const minimumPopupHeight = this.getMinimumPopupHeight();
        const popupWidth = Math.max(savedGeometry?.width ?? 300, minimumPopupWidth);
        const popupHeight = Math.max(savedGeometry?.height ?? 500, minimumPopupHeight);
        const popupPosition = savedGeometry
            ? { my: "top left", at: "top left", of: window, offset: `${savedGeometry.left} ${savedGeometry.top}` }
            : { my: "bottom right", at: "top right", of: "#chat-button", offset: "0 -20" };
        $("#chat-popup").dxPopup({
            width: popupWidth,
            height: popupHeight,
            minWidth: minimumPopupWidth,
            minHeight: minimumPopupHeight,
            wrapperAttr: {
                class: "mdl-chat-popup"
            },
            shading: false,
            showTitle: true,
            title: "Chat",
            dragEnabled: true,
            resizeEnabled: true,
            hideOnOutsideClick: true,
            animation: null,
            toolbarItems: [{
                toolbar: "top",
                location: "after",
                widget: "dxButton",
                options: {
                    stylingMode: "text",
                    focusStateEnabled: false,
                    activeStateEnabled: false,
                    tabIndex: -1,
                    template: (_, element) => {
                        element[0].innerHTML = `<span class="mdl-focused-toolbar-button"><i class="fa-light fa-trash-can trash"></i><i class="fa-solid fa-trash-can trash-hover"></i></span>`;
                    },
                    onClick: () => this.clear()
                }
            }],
            onDragEnd: () => this._saveGeometry(),
            onResize: () => this.handlePopupResize(),
            onResizeEnd: () => this._saveGeometry(),
            onDisposing: () => this.disposeAdapter(),
            contentTemplate: contentElement => {
                const firstUser = { id: "1", name: "User" };
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
                const initialMessages = this.getInitialMessages();
                const $host = $("<div class='mdl-chat-host'>").appendTo(contentElement);
                const chat = $("<div>").appendTo($host).dxChat({
                    width: "100%",
                    height: "100%",
                    user: firstUser,
                    onMessageEntered: e => this.adapter?.sendMessage(e.message.text),
                    items: initialMessages
                });
                this.instance = chat.dxChat("instance");
                this.hostElement = $host[0];
                this.createAdapter(this.instance, firstUser, secondUser, initialMessages);
                return $host;
            },
            position: popupPosition
        });
        this.popup = $("#chat-popup").dxPopup("instance");
    }

    isOpen() {
        return this.popup?.option("visible") === true;
    }

    open() {
        this.tooltip?.hide();
        this.adapter?.connect();
        this.popup.show();
    }

    clear() {
        this.threadIdRef.value = this.shell.aiSdk.createId("chat");
        const popup = $("#chat-popup").dxPopup("instance");
        if (!popup)
            return;
        const chatElement = popup.$content().find(".dx-chat");
        if (chatElement.length === 0)
            return;
        const firstUser = { id: "1", name: "User" };
        const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
        const initialMessages = this.getInitialMessages();
        const chat = chatElement.dxChat("instance");
        chat.option("items", initialMessages);
        this.createAdapter(chat, firstUser, secondUser, initialMessages);
    }

    // Model lifecycle actions (new/open) start a fresh conversation, but when the
    // agent is the one performing them we must keep the popup and the live adapter:
    // resetting mid-turn cancels the request and sends the tool result to a new thread.
    reset() {
        if (this.isExecutingToolCall())
            return;
        this.clear();
        const popup = $("#chat-popup").dxPopup("instance");
        if (popup)
            popup.hide();
    }

    isExecutingToolCall() {
        return this.toolCallDepth > 0;
    }

    async executeToolCall(toolCall) {
        this.toolCallDepth++;
        try {
            return await this.agentToolBridge?.handleToolCall(toolCall);
        } finally {
            this.toolCallDepth--;
        }
    }

    // The stop button takes the send button's place in the message box toolbar while the
    // agent is generating. dxChat rebuilds that toolbar on repaint, so it is re-injected
    // whenever the busy state is refreshed instead of only once when the chat is created.
    syncStopButton() {
        const toolbarAfter = this.instance?.$element().find(".dx-chat-textarea-toolbar .dx-toolbar-after").get(0);
        if (!toolbarAfter)
            return;
        const stopItem = toolbarAfter.querySelector(".mdl-chat-stop-item") ?? this.createStopItem(toolbarAfter);
        for (const item of toolbarAfter.querySelectorAll(".dx-toolbar-item"))
            item.style.display = (item === stopItem) === this.busy ? "" : "none";
    }

    createStopItem(toolbarAfter) {
        const stopLabel = this.shell.board.translations.get("Stop Generating");
        const $item = $("<div class='dx-item dx-toolbar-item dx-toolbar-button mdl-chat-stop-item'><div class='dx-item-content dx-toolbar-item-content'></div></div>").appendTo(toolbarAfter);
        $("<div>").appendTo($item.children().first()).dxButton({
            icon: "stopfilled",
            type: "danger",
            stylingMode: "contained",
            focusStateEnabled: false,
            hint: stopLabel,
            elementAttr: { class: "mdl-chat-stop-button", "aria-label": stopLabel },
            onClick: () => this.cancel()
        });
        return $item[0];
    }

    cancel() {
        this.adapter?.cancel();
    }

    setBusy(busy) {
        this.busy = busy;
        this.hostElement?.classList.toggle("mdl-chat-busy", busy);
        this.updateMessageBoxState();
    }

    // Only the input part of the textarea widget is marked disabled: DevExtreme ignores
    // clicks on anything inside a disabled widget, and the toolbar holding the stop button
    // is a child of that widget.
    updateMessageBoxState() {
        const textAreaElement = this.instance?.$element().find(".dx-chat-textarea").get(0);
        textAreaElement?.querySelector(".dx-texteditor-container")?.classList.toggle("dx-state-disabled", this.busy);
        const inputElement = textAreaElement?.querySelector("textarea");
        if (inputElement)
            inputElement.disabled = this.busy;
        this.syncStopButton();
    }

    createAdapter(chat, firstUser, secondUser, initialMessages) {
        this.disposeAdapter();
        this.setBusy(false);
        this.adapter = this.shell.aiSdk.createChatAdapter({
            chat,
            firstUser,
            secondUser,
            initialMessages,
            chatThreadIdRef: this.threadIdRef,
            onClientToolCall: toolCall => this.executeToolCall(toolCall),
            onBusyChange: busy => this.setBusy(busy)
        });
    }

    disposeAdapter() {
        if (!this.adapter)
            return;
        this.adapter.destroy();
        this.adapter = null;
    }

    getThreadId() {
        return this.shell.aiSdk.getChatThreadId(this.threadIdRef);
    }

    getConversationName() {
        return this.shell.aiSdk.getChatConversationName(this.threadIdRef);
    }

    getInitialMessages() {
        return this.shell.aiSdk.getInitialChatMessages();
    }
}
