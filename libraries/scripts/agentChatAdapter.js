(function(global) {
    const CONTINUATION_TIMEOUT = 20000;

    class AgentChatAdapter {
        constructor(options) {
            this.host = options.host;
            this.agent = options.agent;
            this.name = options.name;
            this.chat = options.chat;
            this.user = options.user;
            this.assistant = options.assistant;
            this.initialItems = Array.isArray(options.initialItems) ? [...options.initialItems] : [];
            this.onError = options.onError;
            this.onClientToolCall = options.onClientToolCall;
            this.onBusyChange = options.onBusyChange;
            this.debugEnabled = options.debugEnabled !== false;
            this.connection = null;
            this.destroyed = false;
            this.modulePromise = null;
            this.connectionPromise = null;
            this.connectionReadyPromise = null;
            this.resolveConnectionReady = null;
            this.rejectConnectionReady = null;
            this.initialMessagesReadyPromise = null;
            this.resolveInitialMessagesReady = null;
            this.initialMessagesLoaded = false;
            this.agentMessages = [];
            this.chatItems = [...this.initialItems];
            this.activeStreams = new Map();
            this.processedToolCallIds = new Set();
            this.pendingRequestIds = new Set();
            this.pendingToolCallIds = new Set();
            this.cancelledRequestIds = new Set();
            this.awaitingContinuation = false;
            this.continuationTimeoutId = null;
            this.sending = false;
            this.cancelRequested = false;
            this.busy = false;
            this.handleOpenBound = this.handleOpen.bind(this);
            this.handleMessageBound = this.handleMessage.bind(this);
            this.handleCloseBound = this.handleClose.bind(this);
            this.handleSocketErrorBound = this.handleSocketError.bind(this);
            this.resetConnectionReadyPromise();
            this.resetInitialMessagesReadyPromise();
            this.debug("constructed", {
                host: this.host,
                agent: this.agent,
                name: this.name
            });
            this.syncChatItems(this.chatItems);
        }

        async loadClientModule() {
            this.debug("loadClientModule:start");
            if (!this.modulePromise)
                this.modulePromise = import("agents/client");
            const clientModule = await this.modulePromise;
            this.debug("loadClientModule:done", {
                exportedKeys: Object.keys(clientModule || {})
            });
            return clientModule;
        }

        async connect() {
            this.debug("connect:start", {
                destroyed: this.destroyed,
                hasConnection: !!this.connection,
                hasPendingConnection: !!this.connectionPromise,
                connectionState: this.getConnectionState()
            });
            if (this.destroyed)
                return;
            if (this.connection)
                return this.connectionReadyPromise;
            if (this.connectionPromise)
                return this.connectionPromise;
            this.connectionPromise = this.createConnection();
            return this.connectionPromise;
        }

        async createConnection() {
            try {
                const clientModule = await this.loadClientModule();
                if (this.destroyed)
                    return;
                const AgentClient = clientModule.AgentClient;
                this.resetConnectionReadyPromise();
                this.connection = new AgentClient({
                    host: this.host,
                    agent: this.agent,
                    name: this.name
                });
                this.debug("createConnection:created", {
                    connectionState: this.getConnectionState()
                });
                this.connection.addEventListener("open", this.handleOpenBound);
                this.connection.addEventListener("message", this.handleMessageBound);
                this.connection.addEventListener("close", this.handleCloseBound);
                this.connection.addEventListener("error", this.handleSocketErrorBound);
                return this.connectionReadyPromise;
            } catch (error) {
                this.debug("createConnection:error", error);
                this.rejectPendingConnection(error);
                this.notifyError(error);
            } finally {
                this.debug("createConnection:finally", {
                    hasConnection: !!this.connection,
                    connectionState: this.getConnectionState()
                });
                this.connectionPromise = null;
            }
        }

        disconnect() {
            if (!this.connection)
                return;
            const connection = this.connection;
            this.removeConnectionListeners(connection);
            this.connection = null;
            this.resetConnectionReadyPromise();
            connection.close();
        }

        destroy() {
            if (this.destroyed)
                return;
            this.cancel();
            this.destroyed = true;
            this.activeStreams.clear();
            this.disconnect();
        }

        isBusy() {
            return this.sending || this.pendingRequestIds.size > 0 || this.pendingToolCallIds.size > 0 || this.awaitingContinuation;
        }

        updateBusyState() {
            const busy = this.isBusy();
            if (busy === this.busy)
                return;
            this.busy = busy;
            this.debug("busyChanged", { busy });
            if (typeof this.onBusyChange === "function")
                this.onBusyChange(busy);
        }

        resetBusyState() {
            this.pendingRequestIds.clear();
            this.pendingToolCallIds.clear();
            this.completeContinuationWait();
            this.updateBusyState();
        }

        cancel() {
            if (!this.isBusy())
                return;
            this.debug("cancel", { pendingRequestIds: [...this.pendingRequestIds] });
            this.cancelRequested = this.sending;
            this.sending = false;
            this.pendingRequestIds.forEach(requestId => {
                this.cancelledRequestIds.add(requestId);
                this.sendRaw({ type: "cf_agent_chat_request_cancel", id: requestId });
            });
            this.activeStreams.clear();
            this.setTypingIndicator(false);
            this.resetBusyState();
        }

        beginContinuationWait() {
            this.clearContinuationWatchdog();
            this.awaitingContinuation = true;
            this.setTypingIndicator(true);
            this.continuationTimeoutId = global.setTimeout(() => {
                this.continuationTimeoutId = null;
                this.awaitingContinuation = false;
                this.setTypingIndicator(false);
                this.updateBusyState();
            }, CONTINUATION_TIMEOUT);
        }

        completeContinuationWait() {
            this.clearContinuationWatchdog();
            this.awaitingContinuation = false;
        }

        clearContinuationWatchdog() {
            if (this.continuationTimeoutId === null)
                return;
            global.clearTimeout(this.continuationTimeoutId);
            this.continuationTimeoutId = null;
        }

        resetLocalMessages(items) {
            this.agentMessages = [];
            this.activeStreams.clear();
            this.processedToolCallIds.clear();
            this.cancelledRequestIds.clear();
            this.resetBusyState();
            this.initialMessagesLoaded = false;
            this.resetInitialMessagesReadyPromise();
            this.chatItems = Array.isArray(items) ? [...items] : [];
            this.syncChatItems(this.chatItems);
        }

        async sendMessage(text) {
            const messageText = this.normalizeText(text);
            this.debug("sendMessage:start", {
                originalText: text,
                normalizedText: messageText,
                hasConnection: !!this.connection,
                connectionState: this.getConnectionState()
            });
            if (!messageText)
                return;
            if (this.busy) {
                this.debug("sendMessage:busy");
                return;
            }
            this.sending = true;
            this.updateBusyState();
            try {
                await this.sendRequest(messageText);
            } finally {
                this.sending = false;
                this.cancelRequested = false;
                this.updateBusyState();
            }
        }

        async sendRequest(messageText) {
            try {
                await this.connect();
            } catch (error) {
                this.debug("sendMessage:connect-error", error);
                this.notifyError(error);
                return;
            }
            this.debug("sendMessage:connected", {
                hasConnection: !!this.connection,
                connectionState: this.getConnectionState()
            });
            await this.waitForInitialMessages(1000);
            this.debug("sendMessage:after-waitForInitialMessages", {
                initialMessagesLoaded: this.initialMessagesLoaded,
                agentMessageCount: this.agentMessages.length
            });
            if (!this.connection || this.cancelRequested)
                return;
            const requestId = this.createId("request");
            const userMessage = this.createUserMessage(messageText);
            this.agentMessages = [...this.agentMessages, userMessage];
            this.appendUserMessageItem(messageText, userMessage.id);
            this.debug("sendMessage:before-sendRaw", {
                requestId,
                agentMessageCount: this.agentMessages.length
            });
            this.setTypingIndicator(true);
            const sent = this.sendRaw({
                type: "cf_agent_use_chat_request",
                id: requestId,
                init: {
                    method: "POST",
                    body: JSON.stringify({
                        trigger: "submit-message",
                        messages: this.agentMessages
                    })
                }
            });
            if (!sent) {
                this.setTypingIndicator(false);
                return;
            }
            this.pendingRequestIds.add(requestId);
            this.completeContinuationWait();
        }

        sendToolResult(toolCallId, toolName, output, state, errorText) {
            if (!this.pendingToolCallIds.delete(toolCallId)) {
                this.debug("sendToolResult:stale", { toolCallId });
                return;
            }
            if (!this.connection) {
                this.updateBusyState();
                return;
            }
            const sent = this.sendRaw({
                type: "cf_agent_tool_result",
                toolCallId,
                toolName,
                output,
                state,
                errorText,
                autoContinue: true
            });
            if (sent)
                this.beginContinuationWait();
            this.updateBusyState();
        }

        sendRaw(payload) {
            if (!this.connection)
                return false;
            try {
                this.debug("sendRaw", {
                    type: payload?.type,
                    connectionState: this.getConnectionState(),
                    payload
                });
                this.connection.send(JSON.stringify(payload));
                return true;
            } catch (error) {
                this.debug("sendRaw:error", error);
                this.notifyError(error);
                return false;
            }
        }

        handleOpen() {
            this.debug("socket:open", {
                connectionState: this.getConnectionState()
            });
            this.resolvePendingConnection();
            this.sendRaw({ type: "cf_agent_stream_resume_request" });
            this.loadInitialMessages();
        }

        handleClose() {
            this.debug("socket:close", {
                connectionState: this.getConnectionState()
            });
            this.setTypingIndicator(false);
            this.activeStreams.clear();
            this.resetBusyState();
            if (this.connection)
                this.removeConnectionListeners(this.connection);
            this.connection = null;
            this.rejectPendingConnection(new Error("Agent connection closed."));
            this.resetConnectionReadyPromise();
        }

        handleSocketError(event) {
            this.debug("socket:error", event);
            this.rejectPendingConnection(new Error("Agent connection failed."));
            this.notifyError(event);
        }

        handleMessage(event) {
            this.debug("socket:message:raw", event.data);
            if (typeof event.data !== "string")
                return;
            let message;
            try {
                message = JSON.parse(event.data);
            } catch (_error) {
                this.debug("socket:message:parse-error", event.data);
                return;
            }
            this.debug("socket:message", {
                type: message.type,
                message
            });
            if (message.type === "cf_agent_stream_resuming") {
                this.handleStreamResumingMessage(message);
                return;
            }
            if (message.type === "cf_agent_chat_messages") {
                this.handleChatMessagesMessage(message);
                return;
            }
            if (message.type === "cf_agent_use_chat_response") {
                this.handleUseChatResponseMessage(message);
                return;
            }
            if (message.type === "cf_agent_message_updated") {
                this.handleMessageUpdatedMessage(message);
                return;
            }
        }

        handleStreamResumingMessage(message) {
            if (typeof message.id !== "string")
                return;
            this.sendRaw({
                type: "cf_agent_stream_resume_ack",
                id: message.id
            });
        }

        handleChatMessagesMessage(message) {
            if (!Array.isArray(message.messages))
                return;
            this.initialMessagesLoaded = true;
            this.resolvePendingInitialMessages();
            this.agentMessages = message.messages;
            this.activeStreams.clear();
            this.processedToolCallIds.clear();
            this.chatItems = this.buildChatItemsFromAgentMessages(this.agentMessages);
            if (!this.chatItems.length && this.initialItems.length)
                this.chatItems = [...this.initialItems];
            this.syncChatItems(this.chatItems);
        }

        handleMessageUpdatedMessage(message) {
            if (!message.message)
                return;
            const updatedMessage = message.message;
            const updatedIndex = this.agentMessages.findIndex(agentMessage => agentMessage.id === updatedMessage.id);
            if (updatedIndex >= 0)
                this.agentMessages[updatedIndex] = updatedMessage;
            else
                this.agentMessages = [...this.agentMessages, updatedMessage];
            this.chatItems = this.buildChatItemsFromAgentMessages(this.agentMessages);
            this.syncChatItems(this.chatItems);
        }

        handleUseChatResponseMessage(message) {
            if (typeof message.id !== "string")
                return;
            if (this.cancelledRequestIds.has(message.id)) {
                if (message.done || message.error)
                    this.cancelledRequestIds.delete(message.id);
                return;
            }
            this.completeContinuationWait();
            if (message.error) {
                this.pendingRequestIds.delete(message.id);
                this.setTypingIndicator(false);
                this.activeStreams.delete(message.id);
                this.updateBusyState();
                this.notifyError(new Error(typeof message.body === "string" && message.body ? message.body : "Agent response failed."));
                return;
            }
            if (!message.done)
                this.pendingRequestIds.add(message.id);
            let streamState = this.activeStreams.get(message.id);
            if (!streamState) {
                streamState = this.startStream(message);
                this.activeStreams.set(message.id, streamState);
            }
            this.applyStreamChunk(message, streamState);
            if (message.done) {
                this.pendingRequestIds.delete(message.id);
                this.setTypingIndicator(false);
                this.activeStreams.delete(message.id);
            }
            this.updateBusyState();
        }

        async loadInitialMessages() {
            this.debug("loadInitialMessages:start", {
                initialMessagesLoaded: this.initialMessagesLoaded
            });
            if (this.initialMessagesLoaded)
                return;
            try {
                const clientModule = await this.loadClientModule();
                if (this.destroyed)
                    return;
                if (typeof clientModule.agentFetch !== "function")
                    return;
                const response = await clientModule.agentFetch({
                    host: this.host,
                    agent: this.agent,
                    name: this.name,
                    path: "get-messages"
                });
                this.debug("loadInitialMessages:response", {
                    ok: response.ok,
                    status: response.status
                });
                if (!response.ok)
                    return;
                const messages = await response.json();
                this.debug("loadInitialMessages:messages", {
                    isArray: Array.isArray(messages),
                    count: Array.isArray(messages) ? messages.length : null
                });
                if (!Array.isArray(messages))
                    return;
                this.initialMessagesLoaded = true;
                this.resolvePendingInitialMessages();
                this.agentMessages = messages;
                this.chatItems = this.buildChatItemsFromAgentMessages(this.agentMessages);
                if (!this.chatItems.length && this.initialItems.length)
                    this.chatItems = [...this.initialItems];
                this.syncChatItems(this.chatItems);
            } catch (error) {
                this.debug("loadInitialMessages:error", error);
                this.notifyError(error);
            }
        }

        startStream(message) {
            const shouldContinue = message.continuation === true;
            const assistantIndex = shouldContinue ? this.getLastAssistantItemIndex() : -1;
            let itemIndex = assistantIndex;
            if (itemIndex === -1) {
                this.chatItems = [...this.chatItems, {
                    messageId: this.createId("assistant"),
                    timestamp: Date.now(),
                    author: this.assistant,
                    text: ""
                }];
                itemIndex = this.chatItems.length - 1;
                this.syncChatItems(this.chatItems);
            }
            return {
                itemIndex,
                lastBody: ""
            };
        }

        applyStreamChunk(message, streamState) {
            if (typeof message.body !== "string")
                return;
            const body = message.body;
            if (!body.trim())
                return;
            if (message.replay === true && body === streamState.lastBody)
                return;
            streamState.lastBody = body;
            let parsedChunk;
            try {
                parsedChunk = JSON.parse(body);
            } catch (_error) {
                return;
            }
            this.handleClientToolChunk(parsedChunk);
            const chunkText = this.extractChunkText(parsedChunk);
            if (!chunkText)
                return;
            const currentItem = this.chatItems[streamState.itemIndex];
            if (!currentItem)
                return;
            this.setTypingIndicator(false);
            currentItem.text = `${this.normalizeText(currentItem.text, true)}${chunkText}`;
            this.syncChatItems(this.chatItems);
        }

        handleClientToolChunk(chunk) {
            if (!chunk || chunk.type !== "tool-input-available")
                return;
            if (typeof chunk.toolCallId !== "string" || typeof chunk.toolName !== "string")
                return;
            if (this.processedToolCallIds.has(chunk.toolCallId))
                return;
            this.processedToolCallIds.add(chunk.toolCallId);
            this.pendingToolCallIds.add(chunk.toolCallId);
            this.updateBusyState();
            if (typeof this.onClientToolCall === "function") {
                this.onClientToolCall({
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    input: chunk.input
                });
                return;
            }
            this.sendToolResult(
                chunk.toolCallId,
                chunk.toolName,
                null,
                "output-error",
                "Client tool is not implemented."
            );
        }

        extractChunkText(chunk) {
            if (!chunk || typeof chunk !== "object")
                return "";
            if (chunk.type === "text-delta" && typeof chunk.delta === "string")
                return chunk.delta;
            if (chunk.type === "text" && typeof chunk.text === "string")
                return chunk.text;
            return "";
        }

        buildChatItemsFromAgentMessages(messages) {
            if (!Array.isArray(messages))
                return [];
            const items = [];
            for (let index = 0; index < messages.length; index++) {
                const message = messages[index];
                const item = this.buildChatItemFromAgentMessage(message, index);
                if (item)
                    items.push(item);
            }
            return items;
        }

        buildChatItemFromAgentMessage(message, index) {
            if (!message || typeof message !== "object")
                return null;
            const author = this.resolveChatAuthor(message.role);
            if (!author)
                return null;
            const timestampValue = this.resolveTimestampValue(message.createdAt, index);
            return {
                messageId: message.id || this.createId("message"),
                timestamp: timestampValue,
                author,
                text: this.extractChatText(message)
            };
        }

        resolveChatAuthor(role) {
            if (role === "user")
                return this.user;
            if (role === "assistant")
                return this.assistant;
            return null;
        }

        resolveTimestampValue(createdAt, index) {
            if (typeof createdAt === "string") {
                const parsedTime = Date.parse(createdAt);
                if (!Number.isNaN(parsedTime))
                    return parsedTime;
            }
            return Date.now() + index;
        }

        extractChatText(message) {
            if (!Array.isArray(message.parts))
                return "";
            let text = "";
            for (let index = 0; index < message.parts.length; index++) {
                const part = message.parts[index];
                if (part?.type === "text" && typeof part.text === "string") {
                    text += part.text;
                    continue;
                }
                if (typeof part?.type === "string" && part.type.startsWith("tool-")) {
                    const toolOutput = this.extractToolOutputText(part);
                    if (toolOutput)
                        text += toolOutput;
                }
            }
            return this.normalizeText(text, true);
        }

        extractToolOutputText(part) {
            // Tool outputs (e.g. the serialized model JSON) are intentionally not
            // rendered into the chat bubble. Only surface genuine tool errors so
            // failures are not silent.
            if (typeof part.errorText === "string" && part.errorText)
                return part.errorText;
            return "";
        }

        appendUserMessageItem(text, messageId) {
            this.chatItems = [...this.chatItems, {
                messageId,
                timestamp: Date.now(),
                author: this.user,
                text
            }];
            this.syncChatItems(this.chatItems);
        }

        createUserMessage(text) {
            return {
                id: this.createId("user"),
                role: "user",
                parts: [{ type: "text", text }]
            };
        }

        getLastAssistantItemIndex() {
            for (let index = this.chatItems.length - 1; index >= 0; index--) {
                if (this.chatItems[index]?.author?.id === this.assistant.id)
                    return index;
            }
            return -1;
        }

        setTypingIndicator(active) {
            if (!this.chat)
                return;
            this.chat.option("typingUsers", active ? [this.assistant] : []);
        }

        syncChatItems(items) {
            if (!this.chat)
                return;
            this.debug("syncChatItems", {
                count: items.length
            });
            this.chat.option("items", [...items]);
        }

        removeConnectionListeners(connection) {
            connection.removeEventListener("open", this.handleOpenBound);
            connection.removeEventListener("message", this.handleMessageBound);
            connection.removeEventListener("close", this.handleCloseBound);
            connection.removeEventListener("error", this.handleSocketErrorBound);
        }

        resetConnectionReadyPromise() {
            this.connectionReadyPromise = new Promise((resolve, reject) => {
                this.resolveConnectionReady = resolve;
                this.rejectConnectionReady = reject;
            });
        }

        resolvePendingConnection() {
            if (typeof this.resolveConnectionReady !== "function")
                return;
            const resolveConnectionReady = this.resolveConnectionReady;
            this.resolveConnectionReady = null;
            this.rejectConnectionReady = null;
            resolveConnectionReady();
        }

        rejectPendingConnection(error) {
            if (typeof this.rejectConnectionReady !== "function")
                return;
            const rejectConnectionReady = this.rejectConnectionReady;
            this.resolveConnectionReady = null;
            this.rejectConnectionReady = null;
            rejectConnectionReady(error);
        }

        resetInitialMessagesReadyPromise() {
            this.initialMessagesReadyPromise = new Promise(resolve => {
                this.resolveInitialMessagesReady = resolve;
            });
        }

        resolvePendingInitialMessages() {
            if (typeof this.resolveInitialMessagesReady !== "function")
                return;
            const resolveInitialMessagesReady = this.resolveInitialMessagesReady;
            this.resolveInitialMessagesReady = null;
            resolveInitialMessagesReady();
        }

        async waitForInitialMessages(timeoutMs) {
            if (this.initialMessagesLoaded || !this.initialMessagesReadyPromise)
                return;
            await Promise.race([
                this.initialMessagesReadyPromise,
                this.wait(timeoutMs)
            ]);
        }

        wait(timeoutMs) {
            return new Promise(resolve => global.setTimeout(resolve, timeoutMs));
        }

        getConnectionState() {
            if (!this.connection)
                return "missing";
            const readyState = this.connection.readyState;
            if (readyState === 0)
                return "connecting";
            if (readyState === 1)
                return "open";
            if (readyState === 2)
                return "closing";
            if (readyState === 3)
                return "closed";
            return `unknown:${readyState}`;
        }

        createId(prefix) {
            if (global.crypto?.randomUUID)
                return `${prefix}-${global.crypto.randomUUID()}`;
            const randomValue = Math.floor(Math.random() * 1000000000);
            return `${prefix}-${Date.now()}-${randomValue}`;
        }

        normalizeText(value, allowWhitespaceOnly) {
            if (typeof value !== "string")
                return "";
            if (allowWhitespaceOnly)
                return value;
            const trimmedValue = value.trim();
            return trimmedValue;
        }

        notifyError(error) {
            this.debug("notifyError", error);
            if (typeof this.onError === "function")
                this.onError(error);
        }

        debug(label, details) {
            if (!this.debugEnabled)
                return;
            if (details === undefined) {
                console.debug("[AgentChatAdapter]", label);
                return;
            }
            console.debug("[AgentChatAdapter]", label, details);
        }
    }

    global.AgentChatAdapter = AgentChatAdapter;
})(window);
