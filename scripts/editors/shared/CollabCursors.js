// Renders remote collaborators' mouse cursors on the board.
//
// Cursor positions travel in SVG/model coordinates (not screen pixels), so each
// cursor lands on the same model location regardless of the viewer's pan/zoom.
// The cursor glyph is counter-scaled by the current zoom to keep a constant
// on-screen size.
class CollabCursors {
    static PALETTE = ["#4C9AFF", "#F5515F", "#36B37E", "#FFAB00", "#8777D9", "#00B8D9", "#FF7452", "#57D9A3"];

    static colorFor(key) {
        const text = String(key ?? "");
        let hash = 0;
        for (let i = 0; i < text.length; i++)
            hash = (hash * 31 + text.charCodeAt(i)) | 0;
        return CollabCursors.PALETTE[Math.abs(hash) % CollabCursors.PALETTE.length];
    }

    constructor(board, options = {}) {
        this.board = board;
        this.svg = board.svg;
        this.getZoom = options.getZoom || (() => 1);
        this.staleMs = options.staleMs || 5000;
        this.cursors = new Map();
        this.layer = board.createSvgElement("g");
        this.layer.setAttribute("class", "collab-cursors-layer");
        this.layer.setAttribute("pointer-events", "none");
        this.svg.appendChild(this.layer);
        this._pruneTimer = setInterval(() => this._pruneStale(), 1000);
        this._onZoom = () => this.rescale();
        this.svg.addEventListener("zoom", this._onZoom);
        this.svg.addEventListener("pan", this._onZoom);
    }

    update(cursor) {
        if (!cursor || !cursor.clientId)
            return;
        if (cursor.gone) {
            this.remove(cursor.clientId);
            return;
        }
        let entry = this.cursors.get(cursor.clientId);
        if (!entry) {
            entry = this._createEntry();
            this.cursors.set(cursor.clientId, entry);
        }
        entry.lastSeen = Date.now();
        const color = cursor.color || CollabCursors.colorFor(cursor.clientId);
        entry.path.setAttribute("fill", color);
        entry.labelBg.setAttribute("fill", color);
        this._applyAvatar(entry, cursor.avatar, cursor.name || "Guest");
        this._applyLabel(entry, cursor.name || "Guest");
        this._position(entry, cursor.x, cursor.y);
        this._ensureOnTop();
    }

    remove(clientId) {
        const entry = this.cursors.get(clientId);
        if (!entry)
            return;
        entry.group.remove();
        this.cursors.delete(clientId);
    }

    reattach() {
        this._ensureOnTop();
    }

    rescale() {
        const scale = 1 / (this.getZoom() || 1);
        this.cursors.forEach(entry => entry.inner.setAttribute("transform", `scale(${scale})`));
    }

    destroy() {
        clearInterval(this._pruneTimer);
        this.svg.removeEventListener("zoom", this._onZoom);
        this.svg.removeEventListener("pan", this._onZoom);
        this.cursors.forEach(entry => entry.group.remove());
        this.cursors.clear();
        this.layer.remove();
    }

    _createEntry() {
        const el = name => this.board.createSvgElement(name);
        const group = el("g");
        group.setAttribute("pointer-events", "none");
        const inner = el("g");

        const path = el("path");
        path.setAttribute("d", "M0,0 L0,17 L4.5,12.5 L7.5,18.5 L9.5,17.5 L6.5,11.5 L12,11.5 Z");
        path.setAttribute("stroke", "#ffffff");
        path.setAttribute("stroke-width", "1");

        const labelBg = el("rect");
        labelBg.setAttribute("x", "14");
        labelBg.setAttribute("y", "13");
        labelBg.setAttribute("rx", "10");
        labelBg.setAttribute("height", "20");

        // Circular avatar: photo when a url arrives, colored initials otherwise.
        const clipId = "collab-avatar-" + Math.random().toString(36).slice(2);
        const clip = el("clipPath");
        clip.setAttribute("id", clipId);
        const clipCircle = el("circle");
        clipCircle.setAttribute("cx", "10");
        clipCircle.setAttribute("cy", "10");
        clipCircle.setAttribute("r", "10");
        clip.appendChild(clipCircle);
        const avatarGroup = el("g");
        avatarGroup.setAttribute("transform", "translate(15 13)");
        const avatar = el("image");
        avatar.setAttribute("width", "20");
        avatar.setAttribute("height", "20");
        avatar.setAttribute("preserveAspectRatio", "xMidYMid slice");
        avatar.setAttribute("clip-path", `url(#${clipId})`);
        const fallbackCircle = el("circle");
        fallbackCircle.setAttribute("cx", "10");
        fallbackCircle.setAttribute("cy", "10");
        fallbackCircle.setAttribute("r", "10");
        const fallbackText = el("text");
        fallbackText.setAttribute("x", "10");
        fallbackText.setAttribute("y", "10");
        fallbackText.setAttribute("text-anchor", "middle");
        fallbackText.setAttribute("dominant-baseline", "central");
        fallbackText.setAttribute("fill", "#ffffff");
        fallbackText.setAttribute("font-size", "8");
        fallbackText.setAttribute("font-weight", "600");
        fallbackText.setAttribute("font-family", "system-ui, sans-serif");
        const avatarRing = el("circle");
        avatarRing.setAttribute("cx", "10");
        avatarRing.setAttribute("cy", "10");
        avatarRing.setAttribute("r", "10");
        avatarRing.setAttribute("fill", "none");
        avatarRing.setAttribute("stroke", "#ffffff");
        avatarRing.setAttribute("stroke-width", "1.5");
        avatarGroup.appendChild(clip);
        avatarGroup.appendChild(fallbackCircle);
        avatarGroup.appendChild(fallbackText);
        avatarGroup.appendChild(avatar);
        avatarGroup.appendChild(avatarRing);

        const text = el("text");
        text.setAttribute("x", "40");
        text.setAttribute("y", "26.5");
        text.setAttribute("fill", "#ffffff");
        text.setAttribute("font-size", "12");
        text.setAttribute("font-family", "system-ui, sans-serif");

        inner.appendChild(path);
        inner.appendChild(labelBg);
        inner.appendChild(avatarGroup);
        inner.appendChild(text);
        group.appendChild(inner);
        this.layer.appendChild(group);
        return { group, inner, path, labelBg, avatarGroup, avatar, fallbackCircle, fallbackText, text, label: null, avatarUrl: null, lastSeen: Date.now() };
    }

    _applyAvatar(entry, url, name) {
        const hasImage = !!url;
        if (entry.avatarUrl !== url) {
            entry.avatarUrl = url;
            if (hasImage) {
                entry.avatar.setAttribute("href", url);
                entry.avatar.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
            }
        }
        entry.avatar.style.display = hasImage ? "" : "none";
        entry.fallbackCircle.style.display = hasImage ? "none" : "";
        entry.fallbackText.style.display = hasImage ? "none" : "";
        if (!hasImage) {
            entry.fallbackCircle.setAttribute("fill", Utils.getAvatarColor(name));
            entry.fallbackText.textContent = Utils.getAvatarInitials(name);
        }
    }

    _applyLabel(entry, label) {
        if (entry.label === label)
            return;
        entry.label = label;
        entry.text.textContent = label;
        const textWidth = label.length * 7;
        entry.labelBg.setAttribute("width", String(32 + textWidth));
    }

    _position(entry, x, y) {
        entry.group.setAttribute("transform", `translate(${x} ${y})`);
        entry.inner.setAttribute("transform", `scale(${1 / (this.getZoom() || 1)})`);
    }

    _ensureOnTop() {
        if (this.svg.lastChild !== this.layer)
            this.svg.appendChild(this.layer);
    }

    _pruneStale() {
        const now = Date.now();
        for (const [id, entry] of this.cursors) {
            if (now - entry.lastSeen > this.staleMs) {
                entry.group.remove();
                this.cursors.delete(id);
            }
        }
    }
}
