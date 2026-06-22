class CollabCoordinator {
    constructor(options) {
        this.apiBase = options.apiBase;
        this.modelId = options.modelId;
        this.getToken = options.getToken;
        this.getSnapshot = options.getSnapshot;
        this.onRemoteOp = options.onRemoteOp;
        this.onRemoteSnapshot = options.onRemoteSnapshot;
        this._applyingRemote = false;
        this._pendingInitialSnapshot = true;
        this.channel = null;
    }

    start() {
        this.destroy();
        this._pendingInitialSnapshot = true;
        this.channel = new CollabChannel({
            apiBase: this.apiBase,
            modelId: this.modelId,
            getToken: this.getToken,
            onOp: operation => this._handleRemoteOp(operation),
            onSnapshot: model => this._handleRemoteSnapshot(model)
        });
        this.channel.connect();
    }

    isApplyingRemote() {
        return this._applyingRemote;
    }

    sendOp(operation) {
        if (!this.channel || this._applyingRemote)
            return;
        this.channel.sendOp(operation);
    }

    sendSnapshot(model) {
        if (!this.channel || this._applyingRemote)
            return;
        this.channel.sendSnapshot(model);
    }

    destroy() {
        if (this.channel)
            this.channel.destroy();
        this.channel = null;
        this._applyingRemote = false;
        this._pendingInitialSnapshot = true;
    }

    _handleRemoteOp(operation) {
        this._applyingRemote = true;
        try {
            this.onRemoteOp?.(operation);
        } finally {
            this._applyingRemote = false;
        }
    }

    _handleRemoteSnapshot(model) {
        if (this._pendingInitialSnapshot) {
            this._pendingInitialSnapshot = false;
            this.sendSnapshot(this.getSnapshot?.());
            return;
        }
        this._applyingRemote = true;
        try {
            this.onRemoteSnapshot?.(model);
        } finally {
            this._applyingRemote = false;
        }
    }
}
