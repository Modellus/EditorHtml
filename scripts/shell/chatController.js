class ChatController {
    constructor(shell) {
        this.shell = shell;
        this.popup = null;
        this.instance = null;
        this.adapter = null;
        this.tooltip = null;
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

    _create() {
        $("#chat-popup").dxPopup({
            width: 300,
            height: 500,
            shading: false,
            showTitle: true,
            title: this.shell.board.translations.get("Chat Title"),
            dragEnabled: false,
            hideOnOutsideClick: true,
            animation: null,
            toolbarItems: [{
                toolbar: "top",
                location: "after",
                widget: "dxButton",
                options: {
                    icon: "fa-regular fa-trash-can",
                    stylingMode: "text",
                    onClick: () => this.clear()
                }
            }],
            onDisposing: () => this.disposeAdapter(),
            contentTemplate: () => {
                const firstUser = { id: "1", name: "User" };
                const secondUser = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
                const initialMessages = this.getInitialMessages();
                const $chat = $("<div>").appendTo("#chat-popup");
                const chat = $chat.dxChat({
                    width: "100%",
                    height: "100%",
                    user: firstUser,
                    onMessageEntered: e => this.adapter?.sendMessage(e.message.text),
                    items: initialMessages
                });
                this.instance = chat.dxChat("instance");
                this.createAdapter(this.instance, firstUser, secondUser, initialMessages);
                return $chat;
            },
            target: "#toolbar",
            position: {
                my: "bottom right",
                at: "top right",
                of: "#chat-button",
                offset: "0 -20"
            }
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

    reset() {
        this.clear();
        const popup = $("#chat-popup").dxPopup("instance");
        if (popup)
            popup.hide();
    }

    createAdapter(chat, firstUser, secondUser, initialMessages) {
        this.disposeAdapter();
        this.adapter = this.shell.aiSdk.createChatAdapter({
            chat,
            firstUser,
            secondUser,
            initialMessages,
            chatThreadIdRef: this.threadIdRef,
            onClientToolCall: toolCall => this.agentToolBridge?.handleToolCall(toolCall)
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
