const EPHEMERAL_COLLAB_OP_TYPES = new Set(["cursor", "presence"]);
// The operations that change what the model is, as opposed to who is looking at it and where it is
// being played: after one of them the room's snapshot is out of date and is published again.
const MODEL_COLLAB_OP_TYPES = new Set(["addShape", "removeShape", "setShapeProperties", "setModelProperties"]);
const INITIAL_SNAPSHOT_WAIT_MS = 2500;
const SNAPSHOT_PUBLISH_DELAY_MS = 2000;

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
        this._snapshotPublishTimeoutId = null;
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

    // Joining is answered by the room's own snapshot or, when there is nobody to answer, by this
    // client publishing its own; either way one goes out when the handshake closes, so a publication
    // waiting from before it has nothing left to say and would race the answer.
    _handleChannelOpen() {
        this._pendingInitialSnapshot = true;
        this._clearScheduledSnapshot();
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
        if (MODEL_COLLAB_OP_TYPES.has(operation.type))
            this._scheduleSnapshot();
    }

    // An operation reaches whoever is in the room at the time; the snapshot is what the room hands
    // to whoever joins next, including this same person after a reload. A change carried by an
    // operation alone — everything a shape's own properties hold, a recording among them — would be
    // taken back the next time the room is joined, so the snapshot is published again after it. Once
    // for a burst of them: it is the whole model, and a drag commits one operation after another.
    _scheduleSnapshot() {
        if (this._snapshotPublishTimeoutId != null || this._pendingInitialSnapshot)
            return;
        this._snapshotPublishTimeoutId = setTimeout(() => {
            this._snapshotPublishTimeoutId = null;
            this.sendSnapshot(this.getSnapshot?.());
        }, SNAPSHOT_PUBLISH_DELAY_MS);
    }

    _clearScheduledSnapshot() {
        if (this._snapshotPublishTimeoutId == null)
            return;
        clearTimeout(this._snapshotPublishTimeoutId);
        this._snapshotPublishTimeoutId = null;
    }

    sendSnapshot(model) {
        if (!this.channel || this._applyingRemote || !model)
            return;
        this._clearScheduledSnapshot();
        this._snapshotVersion += 1;
        const removedShapeIds = this.getRemovedShapeIds?.() ?? [];
        this.channel.sendSnapshot({ ...model, collab: { version: this._snapshotVersion, clientId: this.clientId, removedShapeIds } });
    }

    // Leaving with a publication still waiting — the tab closed, collaboration turned off — would
    // leave the room holding the state from before the change, so it goes out now instead.
    destroy() {
        this._clearInitialSnapshotTimeout();
        if (this._snapshotPublishTimeoutId != null) {
            this._clearScheduledSnapshot();
            this.sendSnapshot(this.getSnapshot?.());
        }
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
