class CollabChannel {
    constructor(options) {
        this.apiBase = options.apiBase;
        this.modelId = options.modelId;
        this.getToken = options.getToken;
        this.onOp = options.onOp;
        this.onSnapshot = options.onSnapshot;
        this.ws = null;
        this._applyingRemote = false;
        this._destroyed = false;
        this._reconnectTimeoutId = null;
    }

    connect() {
        if (!this.modelId || this._destroyed)
            return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING))
            return;
        const token = this.getToken();
        if (!token)
            return;
        const wsBase = this.apiBase.replace(/^https:/, "wss:").replace(/^http:/, "ws:");
        const url = `${wsBase}/collab/${encodeURIComponent(this.modelId)}?token=${encodeURIComponent(token)}`;
        this.ws = new WebSocket(url);
        this.ws.addEventListener("open", () => this._onOpen());
        this.ws.addEventListener("message", event => this._onMessage(event));
        this.ws.addEventListener("close", () => this._onClose());
        this.ws.addEventListener("error", () => {});
    }

    _onOpen() {
    }

    _onMessage(event) {
        if (typeof event.data !== "string")
            return;
        let message;
        try {
            message = JSON.parse(event.data);
        } catch (_) {
            return;
        }
        if (message.type === "snapshot") {
            this.onSnapshot?.(message.model);
            return;
        }
        if (message.type === "op")
            this.onOp?.(message.op);
    }

    _onClose() {
        this.ws = null;
        if (this._destroyed)
            return;
        this._reconnectTimeoutId = setTimeout(() => this.connect(), 3000);
    }

    sendOp(op) {
        this._send({ type: "op", op });
    }

    sendSnapshot(model) {
        this._send({ type: "snapshot", model });
    }

    _send(payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN)
            return;
        try {
            this.ws.send(JSON.stringify(payload));
        } catch (_) {}
    }

    destroy() {
        this._destroyed = true;
        if (this._reconnectTimeoutId != null) {
            clearTimeout(this._reconnectTimeoutId);
            this._reconnectTimeoutId = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
