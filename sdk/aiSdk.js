class AiSdk {
    constructor(options) {
        this.host = options.host;
        this.agent = options.agent;
        this.getSession = options.getSession;
        this.getUserId = options.getUserId;
    }

    createId(prefix) {
        if (window.crypto?.randomUUID)
            return `${prefix}-${window.crypto.randomUUID()}`;
        const randomValue = Math.floor(Math.random() * 1000000000);
        return `${prefix}-${Date.now()}-${randomValue}`;
    }

    getCurrentUserId() {
        const session = this.getSession?.();
        if (session?.userId)
            return String(session.userId);
        const user = window.modellus?.auth?.getUser?.();
        if (user?.id)
            return String(user.id);
        return "anonymous-user";
    }

    getChatThreadId(chatThreadIdRef) {
        if (chatThreadIdRef.value)
            return chatThreadIdRef.value;
        const urlParams = new URLSearchParams(window.location.search);
        const modelId = urlParams.get("model_id");
        if (modelId) {
            chatThreadIdRef.value = `model-${modelId}`;
            return chatThreadIdRef.value;
        }
        const modelName = urlParams.get("model");
        if (modelName) {
            chatThreadIdRef.value = `template-${modelName}`;
            return chatThreadIdRef.value;
        }
        const storageKey = "modellus.chat.threadId";
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
            chatThreadIdRef.value = stored;
            return chatThreadIdRef.value;
        }
        const generated = this.createId("draft");
        sessionStorage.setItem(storageKey, generated);
        chatThreadIdRef.value = generated;
        return chatThreadIdRef.value;
    }

    getChatConversationName(chatThreadIdRef) {
        const userId = this.getCurrentUserId();
        const threadId = this.getChatThreadId(chatThreadIdRef);
        return `${userId}:${threadId}`;
    }

    getInitialChatMessages() {
        const assistant = { id: "2", name: "Modellus", avatarUrl: "/scripts/themes/modellus bot.svg" };
        return [{
            timestamp: Date.now(),
            author: assistant,
            text: "Hello! I'm here to help you craft your own model. Ask me to create a model."
        }];
    }

    createChatAdapter(options) {
        const { chat, firstUser, secondUser, initialMessages, chatThreadIdRef, onClientToolCall } = options;
        if (typeof AgentChatAdapter !== "function")
            return null;
        const conversationName = this.getChatConversationName(chatThreadIdRef);
        const adapter = new AgentChatAdapter({
            host: this.host,
            agent: this.agent,
            name: conversationName,
            chat,
            user: firstUser,
            assistant: secondUser,
            initialItems: initialMessages,
            debugEnabled: false,
            onClientToolCall
        });
        adapter.connect();
        return adapter;
    }

    async generateDescription(modelJson) {
        const response = await fetch("https://agent-modellus.interactivebook.workers.dev/describe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(modelJson)
        });
        if (!response.ok)
            throw new Error(`AI request failed: ${response.status}`);
        const { description } = await response.json();
        return description;
    }

    async generateHooks(instructions, variableNames) {
        const response = await fetch("https://agent-modellus.interactivebook.workers.dev/generate-hooks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ instructions, variableNames })
        });
        if (!response.ok)
            throw new Error(`AI request failed: ${response.status}`);
        const { hooks } = await response.json();
        return hooks;
    }
}
