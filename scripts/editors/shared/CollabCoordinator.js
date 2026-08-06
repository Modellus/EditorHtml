const EPHEMERAL_COLLAB_OP_TYPES = new Set(["cursor", "presence"]);
const INITIAL_SNAPSHOT_WAIT_MS = 2500;

class CollabCoordinator {
    constructor(options) {
        this.apiBase = options.apiBase;
        this.modelId = options.modelId;
        this.getToken = options.getToken;
        this.getSnapshot = options.getSnapshot;
        this.getRemovedShapeIds = options.getRemovedShapeIds;
        this.onRemoteOp = options.onRemoteOp;
        this.onRemoteSnapshot = options.onRemoteSnapshot;
        this.onConnectionStateChange = options.onConnectionStateChange;
        this.clientId = crypto.randomUUID?.() ?? String(Math.random()).slice(2);
        this._snapshotVersion = 0;
        this._applyingRemote = false;
        this._pendingInitialSnapshot = true;
        this._initialSnapshotTimeoutId = null;
        this.channel = null;
    }

    start() {
        this.destroy();
        this._destroyed = false;
        this._pendingInitialSnapshot = true;
        this.channel = new CollabChannel({
            apiBase: this.apiBase,
            modelId: this.modelId,
            getToken: this.getToken,
            onOpen: () => this._handleChannelOpen(),
            onClose: () => this._handleChannelClose(),
            onOp: operation => this._handleRemoteOp(operation),
            onSnapshot: model => this._handleRemoteSnapshot(model)
        });
        this.onConnectionStateChange?.("connecting");
        this.channel.connect();
    }

    _handleChannelOpen() {
        this._pendingInitialSnapshot = true;
        this._clearInitialSnapshotTimeout();
        this._initialSnapshotTimeoutId = setTimeout(() => this._publishSnapshotForEmptyRoom(), INITIAL_SNAPSHOT_WAIT_MS);
        this.onConnectionStateChange?.("live");
    }

    _handleChannelClose() {
        this._clearInitialSnapshotTimeout();
        this.onConnectionStateChange?.("reconnecting");
    }

    _clearInitialSnapshotTimeout() {
        if (this._initialSnapshotTimeoutId == null)
            return;
        clearTimeout(this._initialSnapshotTimeoutId);
        this._initialSnapshotTimeoutId = null;
    }

    _publishSnapshotForEmptyRoom() {
        this._initialSnapshotTimeoutId = null;
        if (!this._pendingInitialSnapshot)
            return;
        this._pendingInitialSnapshot = false;
        this.sendSnapshot(this.getSnapshot?.());
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
        if (!this.channel || this._applyingRemote || !model)
            return;
        this._snapshotVersion += 1;
        const removedShapeIds = this.getRemovedShapeIds?.() ?? [];
        this.channel.sendSnapshot({ ...model, collab: { version: this._snapshotVersion, clientId: this.clientId, removedShapeIds } });
    }

    destroy() {
        this._clearInitialSnapshotTimeout();
        if (this.channel)
            this.channel.destroy();
        this.channel = null;
        this._applyingRemote = false;
        this._pendingInitialSnapshot = true;
        this.onConnectionStateChange?.("stopped");
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
        if (!model)
            return;
        if (this._pendingInitialSnapshot) {
            this._pendingInitialSnapshot = false;
            this._clearInitialSnapshotTimeout();
            this._advanceSnapshotVersion(model.collab);
            this._applyRemoteSnapshot(model);
            this.sendSnapshot(this.getSnapshot?.());
            return;
        }
        if (!model.collab)
            return;
        if (this._isStaleSnapshot(model.collab))
            return;
        this._advanceSnapshotVersion(model.collab);
        this._applyRemoteSnapshot(model);
    }

    _applyRemoteSnapshot(model) {
        this._applyingRemote = true;
        try {
            this.onRemoteSnapshot?.(model);
        } finally {
            this._applyingRemote = false;
        }
    }

    _advanceSnapshotVersion(collab) {
        if (!collab)
            return;
        this._snapshotVersion = Math.max(this._snapshotVersion, collab.version);
    }

    _isStaleSnapshot(collab) {
        if (collab.version !== this._snapshotVersion)
            return collab.version < this._snapshotVersion;
        return collab.clientId <= this.clientId;
    }
}
