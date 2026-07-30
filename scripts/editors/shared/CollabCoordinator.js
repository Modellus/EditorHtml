const EPHEMERAL_COLLAB_OP_TYPES = new Set(["cursor", "presence"]);

class CollabCoordinator {
    constructor(options) {
        this.apiBase = options.apiBase;
        this.modelId = options.modelId;
        this.getToken = options.getToken;
        this.getSnapshot = options.getSnapshot;
        this.onRemoteOp = options.onRemoteOp;
        this.onRemoteSnapshot = options.onRemoteSnapshot;
        this.clientId = crypto.randomUUID?.() ?? String(Math.random()).slice(2);
        this._snapshotVersion = 0;
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
            onOpen: () => this._handleChannelOpen(),
            onOp: operation => this._handleRemoteOp(operation),
            onSnapshot: model => this._handleRemoteSnapshot(model)
        });
        this.channel.connect();
    }

    _handleChannelOpen() {
        this._pendingInitialSnapshot = true;
    }

    isApplyingRemote() {
        return this._applyingRemote;
    }

    sendOp(operation) {
        if (!this.channel || this._applyingRemote)
            return;
        if (!EPHEMERAL_COLLAB_OP_TYPES.has(operation.type))
            this._snapshotVersion += 1;
        this.channel.sendOp(operation);
    }

    sendSnapshot(model) {
        if (!this.channel || this._applyingRemote)
            return;
        this._snapshotVersion += 1;
        this.channel.sendSnapshot({ ...model, collab: { version: this._snapshotVersion, clientId: this.clientId } });
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
        if (!model?.collab)
            return;
        if (this._isStaleSnapshot(model.collab))
            return;
        this._snapshotVersion = model.collab.version;
        this._applyingRemote = true;
        try {
            this.onRemoteSnapshot?.(model);
        } finally {
            this._applyingRemote = false;
        }
    }

    _isStaleSnapshot(collab) {
        if (collab.version !== this._snapshotVersion)
            return collab.version < this._snapshotVersion;
        return collab.clientId <= this.clientId;
    }
}
