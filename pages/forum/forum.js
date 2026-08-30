import { ModelsApiClient } from "../../sdk/modelsApiClient.js";
import { UserSdk } from "../../sdk/userSdk.js";

const apiBase = "https://modellus-api.interactivebook.workers.dev";
const sessionKey = window.modellus?.auth?.sessionKey || "mp.session";
const userKey = window.modellus?.auth?.userKey || "mp.user";
const moderationFeatureFlagKey = "can_moderate_forum";
const pageSize = 20;

const kindLabels = {
    discussion: "Discussion",
    question: "Question",
    bug: "Bug",
    feature: "Feature",
    model: "Model",
    character: "Character",
    video: "Video",
    data: "Data",
    audio: "Sound",
    object: "Object"
};

const kindIcons = {
    discussion: "fa-light fa-comments",
    question: "fa-light fa-circle-question",
    bug: "fa-light fa-bug",
    feature: "fa-light fa-lightbulb",
    model: "fa-light fa-cube",
    character: "fa-light fa-person-running",
    video: "fa-light fa-film",
    data: "fa-light fa-table",
    audio: "fa-light fa-volume-high",
    object: "fa-light fa-shapes"
};

const statusLabels = {
    open: "Open",
    answered: "Answered",
    planned: "Planned",
    in_progress: "In progress",
    accepted: "Accepted",
    declined: "Declined",
    duplicate: "Duplicate",
    closed: "Closed"
};

const resolvedKindLabels = {
    models: "model",
    characters: "character",
    videos: "video",
    data: "data file",
    audios: "sound",
    objects: "object"
};

class ForumPage {
    constructor() {
        this.userSdk = new UserSdk(sessionKey, userKey, "/pages/login/index.html", "modellus_id_token", "/pages/forum/index.html");
        this.state = { session: this.userSdk.readSession(), user: this.userSdk.readUser() };
        this.apiClient = new ModelsApiClient(apiBase, () => this.state.session, () => this.userSdk.getUserId(this.state.session));
        this.filters = { sort: "recent", offset: 0 };
        this.facets = null;
        this.lookups = null;
        this.total = 0;
        this.canModerate = false;
        this.searchTimer = null;
        this.elements = {
            views: document.getElementById("forum-views"),
            kinds: document.getElementById("forum-kinds"),
            statuses: document.getElementById("forum-statuses"),
            sciences: document.getElementById("forum-sciences"),
            education: document.getElementById("forum-education"),
            search: document.getElementById("forum-search-input"),
            sort: document.getElementById("forum-sort"),
            newButton: document.getElementById("forum-new-button"),
            activeFilters: document.getElementById("forum-active-filters"),
            status: document.getElementById("forum-status"),
            topics: document.getElementById("forum-topics"),
            pager: document.getElementById("forum-pager"),
            listView: document.getElementById("forum-list-view"),
            topicView: document.getElementById("forum-topic-view"),
            composeView: document.getElementById("forum-compose-view"),
            breadcrumb: document.getElementById("forum-breadcrumb"),
            sessionAction: document.getElementById("session-action")
        };
    }

    static escape(value) {
        return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    static initials(name) {
        const trimmed = String(name ?? "").trim();
        if (!trimmed)
            return "?";
        const parts = trimmed.split(/\s+/);
        if (parts.length === 1)
            return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    static relativeTime(value) {
        const elapsedSeconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
        if (elapsedSeconds < 60)
            return "just now";
        if (elapsedSeconds < 3600)
            return `${Math.floor(elapsedSeconds / 60)}m ago`;
        if (elapsedSeconds < 86400)
            return `${Math.floor(elapsedSeconds / 3600)}h ago`;
        if (elapsedSeconds < 2592000)
            return `${Math.floor(elapsedSeconds / 86400)}d ago`;
        return new Date(value).toLocaleDateString();
    }

    static fileSize(bytes) {
        if (bytes < 1024)
            return `${bytes} B`;
        if (bytes < 1048576)
            return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    }

    isSignedIn() {
        return this.userSdk.isSessionValid(this.state.session);
    }

    currentUserId() {
        return this.userSdk.getUserId(this.state.session);
    }

    async ensureSignedIn() {
        if (!this.isSignedIn())
            await this.userSdk.refreshSession(apiBase);
        this.userSdk.refreshState(this.state);
        if (!this.isSignedIn()) {
            this.userSdk.clearToken();
            this.userSdk.clearRefreshToken();
            this.userSdk.clearSession();
            this.userSdk.clearUser();
            this.userSdk.redirectToLogin();
            return false;
        }
        this.userSdk.startSessionRefresh(apiBase, () => this.userSdk.redirectToLogin());
        return true;
    }

    async start() {
        if (!await this.ensureSignedIn())
            return;
        this.applySessionAction();
        await this.userSdk.loadFeatureFlags(apiBase, this.state.session);
        this.canModerate = this.userSdk.hasFeatureFlag(moderationFeatureFlagKey);
        this.bindEvents();
        window.addEventListener("hashchange", () => this.route());
        await this.route();
    }

    applySessionAction() {
        if (this.isSignedIn()) {
            this.elements.sessionAction.textContent = "Community";
            this.elements.sessionAction.href = "/pages/catalog/index.html";
            return;
        }
        this.elements.sessionAction.textContent = "Sign In";
        this.elements.sessionAction.href = "/pages/login/index.html";
    }

    bindEvents() {
        this.elements.search.addEventListener("input", () => this.onSearchInput());
        this.elements.sort.addEventListener("change", () => this.onSortChange());
        this.elements.newButton.addEventListener("click", () => this.openCompose());
    }

    onSearchInput() {
        window.clearTimeout(this.searchTimer);
        this.searchTimer = window.setTimeout(() => {
            this.filters.search = this.elements.search.value.trim();
            this.filters.offset = 0;
            this.loadTopics();
        }, 250);
    }

    onSortChange() {
        this.filters.sort = this.elements.sort.value;
        this.filters.offset = 0;
        this.loadTopics();
    }

    openCompose() {
        if (!this.isSignedIn()) {
            this.userSdk.redirectToLogin();
            return;
        }
        window.location.hash = "#/new";
    }

    async route() {
        const hash = window.location.hash;
        if (hash.startsWith("#/topic/")) {
            await this.showTopic(decodeURIComponent(hash.slice("#/topic/".length)));
            return;
        }
        if (hash === "#/new") {
            await this.showCompose();
            return;
        }
        await this.showList();
    }

    showSection(sectionName) {
        this.elements.listView.hidden = sectionName !== "list";
        this.elements.topicView.hidden = sectionName !== "topic";
        this.elements.composeView.hidden = sectionName !== "compose";
    }

    async showList() {
        this.showSection("list");
        this.elements.breadcrumb.textContent = "Forum";
        window.scrollTo(0, 0);
        await this.loadFacets();
        await this.loadTopics();
    }

    async loadFacets() {
        try {
            this.facets = await this.apiClient.fetchForumFacets();
            this.renderSidebar();
        } catch (error) {
            this.setStatus(`Could not load the filters: ${error.message}`, true);
        }
    }

    async loadLookups() {
        if (this.lookups)
            return;
        const [sciencesResult, educationResult] = await Promise.allSettled([
            this.apiClient.fetchScienceLookups(),
            this.apiClient.fetchEducationLevelLookups()
        ]);
        this.lookups = {
            sciences: sciencesResult.status === "fulfilled" ? sciencesResult.value : [],
            education: educationResult.status === "fulfilled" ? educationResult.value : []
        };
    }

    renderSidebar() {
        const unreadBadge = this.facets.unread > 0 ? `<span class="forum-sidebar-badge">${this.facets.unread}</span>` : "";
        const viewRows = [
            { key: "all", icon: "fa-light fa-list", label: "All topics", extra: `<span class="forum-sidebar-count">${this.facets.total}</span>` },
            { key: "unread", icon: "fa-light fa-circle-dot", label: "Unread", extra: unreadBadge },
            { key: "mine", icon: "fa-light fa-user", label: "My topics", extra: "" },
            { key: "unanswered", icon: "fa-light fa-comment-slash", label: "Unanswered", extra: "" }
        ];
        this.elements.views.innerHTML = viewRows.map(row => `
            <li><a href="#" data-view="${row.key}" class="${this.filters.view === row.key || (!this.filters.view && row.key === "all") ? "active" : ""}"><i class="${row.icon}"></i> ${row.label}${row.extra}</a></li>
        `).join("");
        this.elements.kinds.innerHTML = this.facets.kinds.map(kind => `
            <li><a href="#" data-kind="${kind.id}" class="${this.filters.kind === kind.id ? "active" : ""}"><i class="${kindIcons[kind.id]}"></i> ${kindLabels[kind.id]}<span class="forum-sidebar-count">${kind.count}</span></a></li>
        `).join("");
        this.elements.statuses.innerHTML = this.facets.statuses.map(status => `
            <li><a href="#" data-status="${status.id}" class="${this.filters.status === status.id ? "active" : ""}"><i class="fa-light fa-circle"></i> ${statusLabels[status.id]}<span class="forum-sidebar-count">${status.count}</span></a></li>
        `).join("");
        this.elements.sciences.innerHTML = this.facets.sciences.map(science => `
            <li><a href="#" data-science="${ForumPage.escape(science.id ?? "none")}" class="${this.filters.scienceId === (science.id ?? "none") ? "active" : ""}"><i class="fa-light fa-flask"></i> ${ForumPage.escape(science.name)}<span class="forum-sidebar-count">${science.count}</span></a></li>
        `).join("");
        this.elements.education.innerHTML = this.facets.education.map(level => `
            <li><a href="#" data-education="${ForumPage.escape(level.id ?? "none")}" class="${this.filters.educationLevelId === (level.id ?? "none") ? "active" : ""}"><i class="fa-light fa-graduation-cap"></i> ${ForumPage.escape(level.name)}<span class="forum-sidebar-count">${level.count}</span></a></li>
        `).join("");
        this.bindSidebarEvents();
    }

    bindSidebarEvents() {
        this.elements.views.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onViewClick(event, link.dataset.view)));
        this.elements.kinds.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onFacetClick(event, "kind", link.dataset.kind)));
        this.elements.statuses.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onFacetClick(event, "status", link.dataset.status)));
        this.elements.sciences.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onFacetClick(event, "scienceId", link.dataset.science)));
        this.elements.education.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onFacetClick(event, "educationLevelId", link.dataset.education)));
    }

    onViewClick(event, viewKey) {
        event.preventDefault();
        this.filters.view = viewKey;
        this.filters.unread = viewKey === "unread";
        this.filters.createdBy = viewKey === "mine" ? this.currentUserId() : undefined;
        this.filters.answered = viewKey === "unanswered" ? false : undefined;
        this.filters.offset = 0;
        this.goToList();
    }

    onFacetClick(event, filterName, value) {
        event.preventDefault();
        this.filters[filterName] = this.filters[filterName] === value ? undefined : value;
        this.filters.offset = 0;
        this.goToList();
    }

    goToList() {
        if (window.location.hash && window.location.hash !== "#/") {
            window.location.hash = "#/";
            return;
        }
        this.renderSidebar();
        this.loadTopics();
    }

    setStatus(message, isError) {
        this.elements.status.textContent = message;
        this.elements.status.classList.toggle("is-error", isError === true);
    }

    async loadTopics() {
        this.setStatus("Loading topics…");
        this.renderActiveFilters();
        try {
            const page = await this.apiClient.fetchForumTopicsPage({ ...this.filters, limit: pageSize });
            this.total = page.total;
            this.setStatus("");
            this.renderTopics(page.items);
            this.renderPager();
        } catch (error) {
            this.elements.topics.innerHTML = "";
            this.elements.pager.innerHTML = "";
            this.setStatus(`Could not load topics: ${error.message}`, true);
        }
    }

    renderActiveFilters() {
        const chips = [];
        if (this.filters.kind)
            chips.push({ name: "kind", label: kindLabels[this.filters.kind] });
        if (this.filters.status)
            chips.push({ name: "status", label: statusLabels[this.filters.status] });
        if (this.filters.scienceId)
            chips.push({ name: "scienceId", label: this.facets?.sciences.find(science => (science.id ?? "none") === this.filters.scienceId)?.name });
        if (this.filters.educationLevelId)
            chips.push({ name: "educationLevelId", label: this.facets?.education.find(level => (level.id ?? "none") === this.filters.educationLevelId)?.name });
        if (this.filters.tag)
            chips.push({ name: "tag", label: `#${this.filters.tag}` });
        this.elements.activeFilters.innerHTML = chips.map(chip => `
            <span class="forum-filter-chip">${ForumPage.escape(chip.label)}<button type="button" data-clear="${chip.name}" aria-label="Remove filter"><i class="fa-light fa-xmark"></i></button></span>
        `).join("");
        this.elements.activeFilters.querySelectorAll("button").forEach(button => button.addEventListener("click", () => this.clearFilter(button.dataset.clear)));
    }

    clearFilter(filterName) {
        this.filters[filterName] = undefined;
        this.filters.offset = 0;
        this.renderSidebar();
        this.loadTopics();
    }

    renderTopics(topics) {
        if (topics.length === 0) {
            this.elements.topics.innerHTML = `
                <div class="forum-empty">
                    <i class="fa-light fa-comments"></i>
                    <p>No topics match what you are looking for.</p>
                </div>`;
            return;
        }
        this.elements.topics.innerHTML = topics.map(topic => this.buildTopicRow(topic)).join("");
        this.elements.topics.querySelectorAll("[data-vote-topic]").forEach(button => button.addEventListener("click", () => this.toggleTopicVote(button)));
        this.elements.topics.querySelectorAll("[data-tag]").forEach(chip => chip.addEventListener("click", () => this.onFilterByTag(chip.dataset.tag)));
    }

    buildTopicRow(topic) {
        const tagChips = topic.tags.map(tag => `<button type="button" class="forum-chip forum-chip-tag" data-tag="${ForumPage.escape(tag)}">${ForumPage.escape(tag)}</button>`).join(" ");
        const pinMark = topic.is_pinned ? `<i class="fa-solid fa-thumbtack forum-pin" title="Pinned"></i>` : "";
        const lockMark = topic.is_locked ? `<i class="fa-light fa-lock forum-lock" title="Locked"></i>` : "";
        const unreadMark = topic.is_unread ? `<span class="forum-unread-dot" title="New activity"></span>` : "";
        const deletedMark = topic.is_deleted ? `<span class="forum-chip">Removed</span>` : "";
        return `
            <article class="forum-topic-row${topic.is_deleted ? " is-deleted" : ""}">
                <div class="forum-topic-votes">
                    <button type="button" class="forum-vote-button${topic.has_voted ? " is-voted" : ""}" data-vote-topic="${ForumPage.escape(topic.id)}" data-voted="${topic.has_voted === true}" title="Upvote">
                        <i class="fa-light fa-caret-up"></i>
                        <span class="forum-vote-count">${topic.vote_count}</span>
                    </button>
                </div>
                <div class="forum-topic-body">
                    <div class="forum-topic-title-row">
                        ${unreadMark}${pinMark}
                        <a class="forum-topic-title" href="#/topic/${encodeURIComponent(topic.id)}">${ForumPage.escape(topic.title)}</a>
                        ${lockMark}
                        <span class="forum-chip forum-chip-kind"><i class="${kindIcons[topic.kind]}"></i>${kindLabels[topic.kind]}</span>
                        <span class="forum-chip forum-chip-${topic.status}">${statusLabels[topic.status]}</span>
                        ${deletedMark}
                    </div>
                    <div class="forum-topic-excerpt">${ForumPage.escape(topic.body)}</div>
                    <div class="forum-topic-meta">
                        <span class="forum-topic-author">${this.buildAvatar(topic.author_name, topic.author_avatar, "is-small")}${ForumPage.escape(topic.author_name)}</span>
                        <span><i class="fa-light fa-clock"></i>${ForumPage.relativeTime(topic.last_activity_at)}</span>
                        <span><i class="fa-light fa-comment"></i>${topic.reply_count}</span>
                        ${tagChips}
                    </div>
                </div>
            </article>`;
    }

    onFilterByTag(tag) {
        this.filters.tag = tag;
        this.filters.offset = 0;
        this.renderActiveFilters();
        this.loadTopics();
    }

    async toggleTopicVote(button) {
        if (!this.isSignedIn()) {
            this.userSdk.redirectToLogin();
            return;
        }
        const hasVoted = button.dataset.voted === "true";
        const result = await this.apiClient.voteForumTopic(button.dataset.voteTopic, hasVoted);
        button.dataset.voted = String(result.has_voted);
        button.classList.toggle("is-voted", result.has_voted);
        button.querySelector(".forum-vote-count").textContent = result.vote_count;
    }

    renderPager() {
        const firstShown = this.total === 0 ? 0 : this.filters.offset + 1;
        const lastShown = Math.min(this.filters.offset + pageSize, this.total);
        const hasPrevious = this.filters.offset > 0;
        const hasNext = lastShown < this.total;
        if (!hasPrevious && !hasNext) {
            this.elements.pager.innerHTML = "";
            return;
        }
        this.elements.pager.innerHTML = `
            <button type="button" class="forum-button" data-page="previous" ${hasPrevious ? "" : "disabled"}><i class="fa-light fa-chevron-left"></i> Previous</button>
            <span class="forum-pager-label">${firstShown}–${lastShown} of ${this.total}</span>
            <button type="button" class="forum-button" data-page="next" ${hasNext ? "" : "disabled"}>Next <i class="fa-light fa-chevron-right"></i></button>`;
        this.elements.pager.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => this.changePage(button.dataset.page)));
    }

    changePage(direction) {
        this.filters.offset = direction === "next" ? this.filters.offset + pageSize : Math.max(0, this.filters.offset - pageSize);
        this.loadTopics();
        window.scrollTo(0, 0);
    }

    async showTopic(topicId) {
        this.showSection("topic");
        window.scrollTo(0, 0);
        this.elements.topicView.innerHTML = `<div class="forum-status">Loading topic…</div>`;
        try {
            const topic = await this.apiClient.fetchForumTopicById(topicId);
            this.elements.breadcrumb.innerHTML = `<a href="#/">Forum</a> <span class="sep">/</span> ${ForumPage.escape(topic.title)}`;
            this.renderTopic(topic);
            if (this.isSignedIn())
                await this.apiClient.markForumTopicRead(topicId);
        } catch (error) {
            this.elements.topicView.innerHTML = `<div class="forum-status is-error">Could not load this topic: ${ForumPage.escape(error.message)}</div>`;
        }
    }

    renderTopic(topic) {
        const attachments = topic.attachments.filter(attachment => !attachment.reply_id);
        this.elements.topicView.innerHTML = `
            <a class="forum-link-button" href="#/"><i class="fa-light fa-arrow-left"></i> Back to all topics</a>
            <div class="forum-topic-header">
                <h1>${ForumPage.escape(topic.title)}</h1>
                <div class="forum-topic-header-meta">
                    <span class="forum-chip forum-chip-kind"><i class="${kindIcons[topic.kind]}"></i>${kindLabels[topic.kind]}</span>
                    <span class="forum-chip forum-chip-${topic.status}">${statusLabels[topic.status]}</span>
                    ${topic.is_pinned ? `<span class="forum-chip"><i class="fa-solid fa-thumbtack"></i> Pinned</span>` : ""}
                    ${topic.is_locked ? `<span class="forum-chip"><i class="fa-light fa-lock"></i> Locked</span>` : ""}
                    <span><i class="fa-light fa-comment"></i> ${topic.reply_count} replies</span>
                    ${topic.tags.map(tag => `<span class="forum-chip">${ForumPage.escape(tag)}</span>`).join(" ")}
                </div>
            </div>
            ${this.buildResolvedBanner(topic)}
            ${this.buildModerationBar(topic)}
            ${this.buildPost(topic.id, topic, attachments, true)}
            <div id="forum-replies">${topic.replies.map(reply => this.buildPost(topic.id, reply, topic.attachments.filter(attachment => attachment.reply_id === reply.id), false, topic)).join("")}</div>
            ${this.buildReplyForm(topic)}`;
        this.bindTopicEvents(topic);
    }

    buildResolvedBanner(topic) {
        if (!topic.resolved_kind)
            return "";
        return `
            <div class="forum-resolved">
                <i class="fa-light fa-circle-check"></i>
                <div>This suggestion became a ${resolvedKindLabels[topic.resolved_kind]} in the catalogue,
                listed as <code>${ForumPage.escape(topic.resolved_id)}</code>.
                <a href="/pages/catalog/index.html">Browse the Community catalogue</a>.</div>
            </div>`;
    }

    buildModerationBar(topic) {
        if (!this.canModerate)
            return "";
        const statusOptions = Object.keys(statusLabels).map(status => `<option value="${status}" ${topic.status === status ? "selected" : ""}>${statusLabels[status]}</option>`).join("");
        return `
            <div class="forum-moderation">
                <span class="forum-moderation-label">Moderator</span>
                <select id="forum-moderate-status" class="forum-select">${statusOptions}</select>
                <button type="button" class="forum-button" data-moderate="pin">${topic.is_pinned ? "Unpin" : "Pin"}</button>
                <button type="button" class="forum-button" data-moderate="lock">${topic.is_locked ? "Unlock" : "Lock"}</button>
                <button type="button" class="forum-button" data-moderate="promote"><i class="fa-light fa-arrow-up-right-from-square"></i> Promote</button>
                ${topic.is_deleted
                    ? `<button type="button" class="forum-button" data-moderate="restore">Restore</button>`
                    : `<button type="button" class="forum-button forum-button-danger" data-moderate="delete">Remove</button>`}
            </div>`;
    }

    buildAvatar(name, avatarUrl, modifierClass = "") {
        const avatarClass = `forum-avatar${modifierClass ? ` ${modifierClass}` : ""}`;
        if (avatarUrl)
            return `<img class="${avatarClass}" src="${ForumPage.escape(avatarUrl)}" alt="" />`;
        return `<span class="${avatarClass}">${ForumPage.escape(ForumPage.initials(name))}</span>`;
    }

    buildPost(topicId, post, attachments, isTopic, topic) {
        const isRemoved = post.is_deleted === 1 || post.is_deleted === true;
        const isPlaceholder = isRemoved && !this.canModerate;
        const authorName = isPlaceholder ? "Removed" : post.author_name;
        const bodyText = isPlaceholder ? "This post was removed by a moderator." : post.body;
        const nestedClass = !isTopic && post.parent_reply_id ? " is-nested" : "";
        const answerClass = post.is_answer ? " is-answer" : "";
        return `
            <article class="forum-post${nestedClass}${answerClass}${isRemoved ? " is-deleted" : ""}" data-post="${ForumPage.escape(post.id)}">
                <div class="forum-topic-votes">
                    <button type="button" class="forum-vote-button${post.has_voted ? " is-voted" : ""}" data-vote-${isTopic ? "topic" : "reply"}="${ForumPage.escape(post.id)}" data-voted="${post.has_voted === true}" title="Upvote">
                        <i class="fa-light fa-caret-up"></i>
                        <span class="forum-vote-count">${post.vote_count}</span>
                    </button>
                </div>
                <div class="forum-post-body">
                    <div class="forum-post-author">
                        ${this.buildAvatar(authorName, isPlaceholder ? "" : post.author_avatar)}
                        <span class="forum-author-name">${ForumPage.escape(authorName)}</span>
                        <span class="forum-post-time">${ForumPage.relativeTime(post.created_at)}</span>
                        ${post.is_answer ? `<span class="forum-chip forum-chip-answered"><i class="fa-light fa-check"></i> Accepted answer</span>` : ""}
                    </div>
                    <div class="forum-post-text${isPlaceholder ? " is-removed" : ""}">${ForumPage.escape(bodyText)}</div>
                    ${this.buildAttachments(attachments)}
                    ${this.buildPostActions(post, isTopic, isRemoved, topic)}
                </div>
            </article>`;
    }

    buildAttachments(attachments) {
        if (attachments.length === 0)
            return "";
        return `<div class="forum-attachments">${attachments.map(attachment => `
            <a class="forum-attachment" href="${ForumPage.escape(attachment.url)}" download>
                <i class="fa-light fa-paperclip"></i>
                <span>${ForumPage.escape(attachment.filename)}</span>
                <span class="forum-attachment-size">${ForumPage.fileSize(attachment.size_bytes)}</span>
            </a>`).join("")}</div>`;
    }

    buildPostActions(post, isTopic, isRemoved, topic) {
        if (isRemoved)
            return "";
        const actions = [];
        const isOwner = post.created_by === this.currentUserId();
        if (!isTopic && this.isSignedIn() && !topic.is_locked)
            actions.push(`<button type="button" class="forum-link-button" data-reply-to="${ForumPage.escape(post.id)}">Reply</button>`);
        if (!isTopic && (topic.created_by === this.currentUserId() || this.canModerate))
            actions.push(post.is_answer
                ? `<button type="button" class="forum-link-button" data-retract-answer="${ForumPage.escape(post.id)}">Retract answer</button>`
                : `<button type="button" class="forum-link-button" data-accept-answer="${ForumPage.escape(post.id)}">Accept as answer</button>`);
        if (!isTopic && (isOwner || this.canModerate))
            actions.push(`<button type="button" class="forum-link-button is-danger" data-delete-reply="${ForumPage.escape(post.id)}">Delete</button>`);
        if (actions.length === 0)
            return "";
        return `<div class="forum-post-actions">${actions.join("")}</div>`;
    }

    buildReplyForm(topic) {
        if (topic.is_locked)
            return `<div class="forum-signin-notice"><i class="fa-light fa-lock"></i> This topic is locked. No new replies can be added.</div>`;
        if (!this.isSignedIn())
            return `<div class="forum-signin-notice"><a href="/pages/login/index.html">Sign in</a> to reply to this topic.</div>`;
        return `
            <div class="forum-reply-form">
                <h3>Your reply</h3>
                <div class="forum-field">
                    <textarea id="forum-reply-body" class="forum-textarea" placeholder="Share what you know, or add detail to the report."></textarea>
                </div>
                <div class="forum-field">
                    <label for="forum-reply-attachment">Attachment <span class="forum-field-hint">optional, up to 10 MB</span></label>
                    <input id="forum-reply-attachment" class="forum-input" type="file" />
                </div>
                <div class="forum-form-actions">
                    <button type="button" id="forum-reply-submit" class="forum-button forum-button-primary">Post reply</button>
                    <span id="forum-reply-status" class="forum-status"></span>
                </div>
            </div>`;
    }

    bindTopicEvents(topic) {
        this.elements.topicView.querySelectorAll("[data-vote-topic]").forEach(button => button.addEventListener("click", () => this.toggleTopicVote(button)));
        this.elements.topicView.querySelectorAll("[data-vote-reply]").forEach(button => button.addEventListener("click", () => this.toggleReplyVote(button)));
        this.elements.topicView.querySelectorAll("[data-accept-answer]").forEach(button => button.addEventListener("click", () => this.acceptAnswer(topic.id, button.dataset.acceptAnswer)));
        this.elements.topicView.querySelectorAll("[data-retract-answer]").forEach(button => button.addEventListener("click", () => this.retractAnswer(topic.id, button.dataset.retractAnswer)));
        this.elements.topicView.querySelectorAll("[data-delete-reply]").forEach(button => button.addEventListener("click", () => this.deleteReply(topic.id, button.dataset.deleteReply)));
        this.elements.topicView.querySelectorAll("[data-reply-to]").forEach(button => button.addEventListener("click", () => this.startNestedReply(button.dataset.replyTo)));
        this.elements.topicView.querySelectorAll("[data-moderate]").forEach(button => button.addEventListener("click", () => this.runModeration(topic, button.dataset.moderate)));
        const statusSelect = document.getElementById("forum-moderate-status");
        if (statusSelect)
            statusSelect.addEventListener("change", () => this.changeTopicStatus(topic, statusSelect.value));
        const replySubmit = document.getElementById("forum-reply-submit");
        if (replySubmit)
            replySubmit.addEventListener("click", () => this.submitReply(topic.id));
    }

    startNestedReply(parentReplyId) {
        this.pendingParentReplyId = parentReplyId;
        const replyBody = document.getElementById("forum-reply-body");
        replyBody.focus();
        replyBody.scrollIntoView({ behavior: "smooth", block: "center" });
        document.getElementById("forum-reply-status").textContent = "Replying to the selected post.";
    }

    async toggleReplyVote(button) {
        if (!this.isSignedIn()) {
            this.userSdk.redirectToLogin();
            return;
        }
        const hasVoted = button.dataset.voted === "true";
        const result = await this.apiClient.voteForumReply(button.dataset.voteReply, hasVoted);
        button.dataset.voted = String(result.has_voted);
        button.classList.toggle("is-voted", result.has_voted);
        button.querySelector(".forum-vote-count").textContent = result.vote_count;
    }

    async acceptAnswer(topicId, replyId) {
        await this.apiClient.acceptForumAnswer(replyId);
        await this.showTopic(topicId);
    }

    async retractAnswer(topicId, replyId) {
        await this.apiClient.retractForumAnswer(replyId);
        await this.showTopic(topicId);
    }

    async deleteReply(topicId, replyId) {
        if (!window.confirm("Remove this reply?"))
            return;
        await this.apiClient.deleteForumReply(replyId);
        await this.showTopic(topicId);
    }

    async submitReply(topicId) {
        const replyBody = document.getElementById("forum-reply-body");
        const replyStatus = document.getElementById("forum-reply-status");
        const attachmentInput = document.getElementById("forum-reply-attachment");
        const body = replyBody.value.trim();
        if (!body) {
            replyStatus.textContent = "Write something before posting.";
            return;
        }
        replyStatus.textContent = "Posting…";
        try {
            const payload = this.pendingParentReplyId ? { body, parent_reply_id: this.pendingParentReplyId } : { body };
            await this.apiClient.createForumReply(topicId, payload, attachmentInput.files[0]);
            this.pendingParentReplyId = undefined;
            await this.showTopic(topicId);
        } catch (error) {
            replyStatus.textContent = `Could not post the reply: ${error.message}`;
        }
    }

    async changeTopicStatus(topic, status) {
        const duplicateOf = status === "duplicate" ? window.prompt("Which topic id does this duplicate?") : undefined;
        if (status === "duplicate" && !duplicateOf)
            return;
        await this.apiClient.setForumTopicStatus(topic.id, status, duplicateOf);
        await this.showTopic(topic.id);
    }

    async runModeration(topic, action) {
        if (action === "pin")
            await this.apiClient.setForumTopicPinned(topic.id, !topic.is_pinned);
        if (action === "lock")
            await this.apiClient.setForumTopicLocked(topic.id, !topic.is_locked);
        if (action === "restore")
            await this.apiClient.restoreForumTopic(topic.id);
        if (action === "delete")
            await this.removeTopic(topic);
        if (action === "promote")
            await this.promoteTopic(topic);
        await this.showTopic(topic.id);
    }

    async removeTopic(topic) {
        const reason = window.prompt("Reason for removing this topic?");
        if (reason === null)
            return;
        await this.apiClient.deleteForumTopic(topic.id, reason);
    }

    async promoteTopic(topic) {
        const resolvedKind = window.prompt(`Which catalogue did this become? One of: ${Object.keys(resolvedKindLabels).join(", ")}`);
        if (!resolvedKind)
            return;
        const resolvedId = window.prompt("Which row id in that catalogue?");
        if (!resolvedId)
            return;
        await this.apiClient.promoteForumTopic(topic.id, resolvedKind, resolvedId);
    }

    buildLookupOptions(options) {
        return options.filter(option => option.id).map(option => `<option value="${ForumPage.escape(option.id)}">${ForumPage.escape(option.name)}</option>`).join("");
    }

    async showCompose() {
        this.showSection("compose");
        window.scrollTo(0, 0);
        if (!this.facets)
            await this.loadFacets();
        await this.loadLookups();
        this.elements.breadcrumb.innerHTML = `<a href="#/">Forum</a> <span class="sep">/</span> New topic`;
        const kindOptions = Object.keys(kindLabels).map(kind => `<option value="${kind}">${kindLabels[kind]}</option>`).join("");
        const scienceOptions = this.buildLookupOptions(this.lookups.sciences);
        const educationOptions = this.buildLookupOptions(this.lookups.education);
        this.elements.composeView.innerHTML = `
            <a class="forum-link-button" href="#/"><i class="fa-light fa-arrow-left"></i> Back to all topics</a>
            <h1>New topic</h1>
            <p class="page-desc">Suggestions for a model, character, video, data file, sound or object can be promoted into the catalogue once accepted.</p>
            <div class="forum-form">
                <div class="forum-field">
                    <label for="forum-compose-kind">Kind</label>
                    <select id="forum-compose-kind" class="forum-select">${kindOptions}</select>
                </div>
                <div class="forum-field">
                    <label for="forum-compose-title">Title</label>
                    <input id="forum-compose-title" class="forum-input" type="text" maxlength="200" placeholder="Say in one line what this is about" />
                </div>
                <div class="forum-field">
                    <label for="forum-compose-body">Details</label>
                    <textarea id="forum-compose-body" class="forum-textarea" maxlength="20000" placeholder="Describe what you need, what you found, or what you are proposing."></textarea>
                </div>
                <div class="forum-field-row">
                    <div class="forum-field">
                        <label for="forum-compose-science">Science <span class="forum-field-hint">optional</span></label>
                        <select id="forum-compose-science" class="forum-select"><option value="">Not specified</option>${scienceOptions}</select>
                    </div>
                    <div class="forum-field">
                        <label for="forum-compose-education">Education level <span class="forum-field-hint">optional</span></label>
                        <select id="forum-compose-education" class="forum-select"><option value="">Not specified</option>${educationOptions}</select>
                    </div>
                </div>
                <div class="forum-field">
                    <label for="forum-compose-tags">Tags <span class="forum-field-hint">comma separated, optional</span></label>
                    <input id="forum-compose-tags" class="forum-input" type="text" placeholder="waves, sound, mechanics" />
                </div>
                <div class="forum-field">
                    <label for="forum-compose-attachment">Attachment <span class="forum-field-hint">optional, up to 10 MB</span></label>
                    <input id="forum-compose-attachment" class="forum-input" type="file" />
                </div>
                <div class="forum-form-actions">
                    <button type="button" id="forum-compose-submit" class="forum-button forum-button-primary">Post topic</button>
                    <a class="forum-button" href="#/">Cancel</a>
                    <span id="forum-compose-status" class="forum-status"></span>
                </div>
            </div>`;
        document.getElementById("forum-compose-submit").addEventListener("click", () => this.submitTopic());
    }

    async submitTopic() {
        const composeStatus = document.getElementById("forum-compose-status");
        const title = document.getElementById("forum-compose-title").value.trim();
        const body = document.getElementById("forum-compose-body").value.trim();
        if (!title || !body) {
            composeStatus.textContent = "A title and details are both required.";
            return;
        }
        composeStatus.textContent = "Posting…";
        const tagsValue = document.getElementById("forum-compose-tags").value;
        const payload = {
            kind: document.getElementById("forum-compose-kind").value,
            title,
            body,
            tags: tagsValue.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0),
            science_id: document.getElementById("forum-compose-science").value || null,
            education_level_id: document.getElementById("forum-compose-education").value || null
        };
        try {
            const created = await this.apiClient.createForumTopic(payload, document.getElementById("forum-compose-attachment").files[0]);
            window.location.hash = `#/topic/${encodeURIComponent(created.id)}`;
        } catch (error) {
            composeStatus.textContent = `Could not post the topic: ${error.message}`;
        }
    }
}

new ForumPage().start();
