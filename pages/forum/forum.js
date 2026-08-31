import { ModelsApiClient } from "../../sdk/modelsApiClient.js";
import { UserSdk } from "../../sdk/userSdk.js";
import { AttachmentPicker, attachmentIcon, escapeHtml, formatFileSize, isImageAttachment } from "./attachmentPicker.js";
import { AttachmentPreview } from "./attachmentPreview.js";
import { ImageDropTarget } from "./imageDropTarget.js";

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

const groupRoleLabels = {
    owner: "Owner",
    moderator: "Moderator",
    member: "Member"
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
        this.myGroups = null;
        this.activeGroup = null;
        this.pendingGroupId = undefined;
        this.groupSearchTimer = null;
        this.total = 0;
        this.canModerate = false;
        this.searchTimer = null;
        this.elements = {
            views: document.getElementById("forum-views"),
            groups: document.getElementById("forum-groups"),
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
            listHeading: document.getElementById("forum-list-heading"),
            groupBanner: document.getElementById("forum-group-banner"),
            topicView: document.getElementById("forum-topic-view"),
            composeView: document.getElementById("forum-compose-view"),
            groupsView: document.getElementById("forum-groups-view"),
            breadcrumb: document.getElementById("forum-breadcrumb"),
            sessionAction: document.getElementById("session-action")
        };
        this.attachmentPreview = new AttachmentPreview(this.elements.topicView);
    }

    static escape(value) {
        return escapeHtml(value);
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
        this.pendingGroupId = this.activeGroup?.id;
        window.location.hash = "#/new";
    }

    async route() {
        const hash = window.location.hash;
        if (hash.startsWith("#/topic/")) {
            await this.showTopic(decodeURIComponent(hash.slice("#/topic/".length)));
            return;
        }
        if (hash.startsWith("#/group/")) {
            await this.showGroup(decodeURIComponent(hash.slice("#/group/".length)));
            return;
        }
        if (hash === "#/groups") {
            await this.showGroupDirectory();
            return;
        }
        if (hash === "#/new") {
            await this.showCompose();
            return;
        }
        await this.showList();
    }

    leaveActiveGroup() {
        if (this.filters.groupId === this.activeGroup?.id)
            this.filters.groupId = undefined;
        this.activeGroup = null;
    }

    showSection(sectionName) {
        this.elements.listView.hidden = sectionName !== "list";
        this.elements.topicView.hidden = sectionName !== "topic";
        this.elements.composeView.hidden = sectionName !== "compose";
        this.elements.groupsView.hidden = sectionName !== "groups";
    }

    async showList() {
        this.showSection("list");
        this.leaveActiveGroup();
        this.elements.groupBanner.hidden = true;
        this.elements.listHeading.hidden = false;
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
        this.elements.groups.innerHTML = this.facets.groups.map(group => `
            <li><a href="${group.slug ? `#/group/${encodeURIComponent(group.slug)}` : "#"}" data-group="${ForumPage.escape(group.id ?? "none")}" class="${this.filters.groupId === (group.id ?? "none") ? "active" : ""}">${ForumPage.buildGroupAvatar(group, "is-small")} ${ForumPage.escape(group.name)}<span class="forum-sidebar-count">${group.count}</span></a></li>
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
        this.elements.groups.querySelectorAll("a").forEach(link => link.addEventListener("click", event => this.onGroupFacetClick(event, link.dataset.group)));
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

    onGroupFacetClick(event, groupId) {
        if (groupId === "none")
            this.onFacetClick(event, "groupId", groupId);
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
        if (this.filters.groupId && !this.activeGroup)
            chips.push({ name: "groupId", label: this.facets?.groups.find(group => (group.id ?? "none") === this.filters.groupId)?.name });
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
                        ${ForumPage.buildGroupChip(topic)}
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
        this.attachmentPreview.hide();
        const attachments = topic.attachments.filter(attachment => !attachment.reply_id);
        this.elements.topicView.innerHTML = `
            <a class="forum-link-button" href="#/"><i class="fa-light fa-arrow-left"></i> Back to all topics</a>
            <div class="forum-topic-header">
                <h1>${ForumPage.escape(topic.title)}</h1>
                <div class="forum-topic-header-meta">
                    <span class="forum-chip forum-chip-kind"><i class="${kindIcons[topic.kind]}"></i>${kindLabels[topic.kind]}</span>
                    <span class="forum-chip forum-chip-${topic.status}">${statusLabels[topic.status]}</span>
                    ${ForumPage.buildGroupChip(topic)}
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

    static buildGroupChip(topic) {
        if (!topic.group_id)
            return "";
        return `<a class="forum-chip forum-chip-group" href="#/group/${encodeURIComponent(topic.group_slug)}"><i class="fa-light fa-users"></i>${ForumPage.escape(topic.group_name)}</a>`;
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

    createAttachmentPicker(previous, containerId, surfaceSelector) {
        if (previous)
            previous.dispose();
        const container = document.getElementById(containerId);
        if (!container)
            return null;
        return new AttachmentPicker(container, container.closest(surfaceSelector));
    }

    static buildAttachmentLink(attachment) {
        return `href="${ForumPage.escape(attachment.url)}" download data-attachment-url="${ForumPage.escape(attachment.url)}" data-attachment-name="${ForumPage.escape(attachment.filename)}" data-attachment-type="${ForumPage.escape(attachment.content_type)}" data-attachment-size="${attachment.size_bytes}"`;
    }

    buildAttachments(attachments) {
        if (attachments.length === 0)
            return "";
        const images = attachments.filter(attachment => isImageAttachment(attachment.content_type));
        const files = attachments.filter(attachment => !isImageAttachment(attachment.content_type));
        const gallery = images.length === 0 ? "" : `<div class="forum-attachment-gallery">${images.map(attachment => `
            <a class="forum-attachment-image" data-preview-placement="block" ${ForumPage.buildAttachmentLink(attachment)}>
                <img src="${ForumPage.escape(attachment.url)}" alt="${ForumPage.escape(attachment.filename)}" loading="lazy" />
                <span class="forum-attachment-image-name">${ForumPage.escape(attachment.filename)}</span>
                <span class="forum-attachment-size">${formatFileSize(attachment.size_bytes)}</span>
            </a>`).join("")}</div>`;
        return `<div class="forum-attachments">${gallery}${files.map(attachment => `
            <a class="forum-attachment" ${ForumPage.buildAttachmentLink(attachment)}>
                <i class="${attachmentIcon(attachment.content_type)}"></i>
                <span>${ForumPage.escape(attachment.filename)}</span>
                <span class="forum-attachment-size">${formatFileSize(attachment.size_bytes)}</span>
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
                    <label>Attachments <span class="forum-field-hint">optional</span></label>
                    <div id="forum-reply-attachments"></div>
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
        this.replyAttachments = this.createAttachmentPicker(this.replyAttachments, "forum-reply-attachments", ".forum-reply-form");
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
        const body = replyBody.value.trim();
        if (!body) {
            replyStatus.textContent = "Write something before posting.";
            return;
        }
        replyStatus.textContent = "Posting…";
        try {
            const payload = this.pendingParentReplyId ? { body, parent_reply_id: this.pendingParentReplyId } : { body };
            await this.apiClient.createForumReply(topicId, payload, this.replyAttachments.getFiles());
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

    async loadMyGroups() {
        if (this.myGroups)
            return;
        this.myGroups = await this.apiClient.fetchForumGroups({ mine: true });
    }

    async showGroup(groupIdOrSlug) {
        this.showSection("list");
        window.scrollTo(0, 0);
        this.elements.listHeading.hidden = true;
        this.elements.groupBanner.hidden = false;
        this.elements.groupBanner.innerHTML = `<div class="forum-status">Loading group…</div>`;
        try {
            this.activeGroup = await this.apiClient.fetchForumGroupById(groupIdOrSlug);
        } catch (error) {
            this.elements.groupBanner.innerHTML = `<div class="forum-status is-error">Could not load this group: ${ForumPage.escape(error.message)}</div>`;
            return;
        }
        this.elements.breadcrumb.innerHTML = `<a href="#/">Forum</a> <span class="sep">/</span> <a href="#/groups">Groups</a> <span class="sep">/</span> ${ForumPage.escape(this.activeGroup.name)}`;
        this.filters.groupId = this.activeGroup.id;
        this.filters.offset = 0;
        await this.loadFacets();
        this.renderGroupBanner();
        await this.loadTopics();
        await this.loadGroupMembers();
    }

    renderGroupBanner() {
        const group = this.activeGroup;
        const taxonomyChips = [
            group.science_name ? `<span class="forum-chip"><i class="fa-light fa-flask"></i>${ForumPage.escape(group.science_name)}</span>` : "",
            group.education_level_name ? `<span class="forum-chip"><i class="fa-light fa-graduation-cap"></i>${ForumPage.escape(group.education_level_name)}</span>` : ""
        ].join("");
        this.elements.groupBanner.innerHTML = `
            <a class="forum-link-button" href="#/groups"><i class="fa-light fa-arrow-left"></i> All groups</a>
            ${this.buildGroupBannerImage(group)}
            <div class="forum-group-header">
                ${this.buildGroupIcon(group)}
                <div class="forum-group-heading">
                    <h1>${ForumPage.escape(group.name)}</h1>
                    <p class="page-desc">${ForumPage.escape(group.description ?? "")}</p>
                    <div class="forum-group-meta">
                        <span><i class="fa-light fa-user-group"></i> ${group.member_count} members</span>
                        <span><i class="fa-light fa-comments"></i> ${group.topic_count} topics</span>
                        ${taxonomyChips}
                    </div>
                </div>
                <div class="forum-group-actions">
                    ${this.buildMembershipButton(group)}
                    ${ForumPage.canManageGroup(group) || this.canModerate ? `<button type="button" class="forum-button" data-edit-group><i class="fa-light fa-pen"></i> Edit</button>` : ""}
                </div>
            </div>
            <div id="forum-group-members" class="forum-group-members"></div>
            <div id="forum-group-status" class="forum-status"></div>`;
        this.bindGroupBannerEvents();
    }

    static groupColorStyle(group) {
        return group.color ? `style="background:${ForumPage.escape(group.color)}"` : "";
    }

    static groupIconClass(group) {
        return ForumPage.escape(group.icon || "fa-light fa-users");
    }

    static buildGroupAvatar(group, modifierClass = "") {
        const avatarClass = `forum-group-avatar${modifierClass ? ` ${modifierClass}` : ""}`;
        if (group.icon_url)
            return `<img class="${avatarClass}" src="${ForumPage.escape(group.icon_url)}" alt="" />`;
        return `<span class="${avatarClass}" ${ForumPage.groupColorStyle(group)}><i class="${ForumPage.groupIconClass(group)}"></i></span>`;
    }

    canDressGroup(group) {
        return this.isSignedIn() && (ForumPage.canManageGroup(group) || this.canModerate);
    }

    buildGroupBannerImage(group) {
        const canDress = this.canDressGroup(group);
        if (!group.banner_url && !canDress)
            return "";
        const clear = group.banner_url && canDress
            ? `<button type="button" class="forum-image-clear" data-clear-image="banner" title="Remove the banner"><i class="fa-light fa-xmark"></i></button>`
            : "";
        const prompt = group.banner_url
            ? ""
            : `<span class="forum-image-prompt"><i class="fa-light fa-image"></i> Drop a banner here, or click to choose one</span>`;
        const picture = group.banner_url ? `<img src="${ForumPage.escape(group.banner_url)}" alt="" />` : "";
        return `<div class="forum-group-banner-image${canDress ? " is-droppable" : ""}${group.banner_url ? " has-image" : ""}" ${canDress ? `data-image-drop="banner"` : ""}>${picture}${prompt}${clear}</div>`;
    }

    buildGroupIcon(group) {
        const canDress = this.canDressGroup(group);
        const clear = group.icon_url && canDress
            ? `<button type="button" class="forum-image-clear" data-clear-image="icon" title="Remove the icon"><i class="fa-light fa-xmark"></i></button>`
            : "";
        const prompt = canDress && !group.icon_url
            ? `<span class="forum-image-prompt"><i class="fa-light fa-image"></i></span>`
            : "";
        return `<div class="forum-group-icon-slot${canDress ? " is-droppable" : ""}" ${canDress ? `data-image-drop="icon"` : ""}>${ForumPage.buildGroupAvatar(group)}${prompt}${clear}</div>`;
    }

    static canManageGroup(group) {
        return group.viewer_role === "owner" || group.viewer_role === "moderator";
    }

    buildMembershipButton(group) {
        if (!this.isSignedIn())
            return `<a class="forum-button forum-button-primary" href="/pages/login/index.html">Sign in to join</a>`;
        if (group.is_member)
            return `<button type="button" class="forum-button" data-leave-group="${ForumPage.escape(group.id)}"><i class="fa-light fa-arrow-right-from-bracket"></i> Leave</button>`;
        return `<button type="button" class="forum-button forum-button-primary" data-join-group="${ForumPage.escape(group.id)}"><i class="fa-light fa-user-plus"></i> Join</button>`;
    }

    bindGroupBannerEvents() {
        this.elements.groupBanner.querySelectorAll("[data-join-group]").forEach(button => button.addEventListener("click", () => this.joinGroup(button.dataset.joinGroup)));
        this.elements.groupBanner.querySelectorAll("[data-leave-group]").forEach(button => button.addEventListener("click", () => this.leaveGroup(button.dataset.leaveGroup)));
        this.elements.groupBanner.querySelectorAll("[data-edit-group]").forEach(button => button.addEventListener("click", () => this.editGroup()));
        this.elements.groupBanner.querySelectorAll("[data-clear-image]").forEach(button => button.addEventListener("click", () => this.clearGroupImage(button.dataset.clearImage)));
        this.imageDropTargets = Array.from(this.elements.groupBanner.querySelectorAll(".is-droppable[data-image-drop]"))
            .map(element => new ImageDropTarget(element, file => this.setGroupImage(element.dataset.imageDrop, file), message => this.setGroupImageStatus(message)));
    }

    setGroupImageStatus(message, isError = true) {
        const status = document.getElementById("forum-group-status");
        status.textContent = message;
        status.classList.toggle("is-error", isError && message !== "");
    }

    async setGroupImage(slot, file) {
        this.setGroupImageStatus(`Uploading the ${slot}…`, false);
        try {
            await this.apiClient.setForumGroupImage(this.activeGroup.id, slot, file);
            await this.showGroup(this.activeGroup.id);
        } catch (error) {
            this.setGroupImageStatus(`Could not set the ${slot}: ${error.message}`);
        }
    }

    async clearGroupImage(slot) {
        try {
            await this.apiClient.clearForumGroupImage(this.activeGroup.id, slot);
            await this.showGroup(this.activeGroup.id);
        } catch (error) {
            this.setGroupImageStatus(`Could not remove the ${slot}: ${error.message}`);
        }
    }

    async loadGroupMembers() {
        const container = document.getElementById("forum-group-members");
        let members;
        try {
            members = await this.apiClient.fetchForumGroupMembers(this.activeGroup.id);
        } catch (error) {
            document.getElementById("forum-group-status").textContent = `Could not load the members: ${error.message}`;
            return;
        }
        container.innerHTML = members.map(member => `
            <span class="forum-group-member" title="${ForumPage.escape(member.user_name)} — ${groupRoleLabels[member.role]}">
                ${this.buildAvatar(member.user_name, member.user_avatar, "is-small")}
                <span class="forum-group-member-name">${ForumPage.escape(member.user_name)}</span>
                ${member.role === "member" ? "" : `<span class="forum-chip forum-chip-role">${groupRoleLabels[member.role]}</span>`}
            </span>`).join("");
    }

    async joinGroup(groupId) {
        if (!this.isSignedIn()) {
            this.userSdk.redirectToLogin();
            return;
        }
        await this.apiClient.joinForumGroup(groupId);
        this.myGroups = null;
        await this.refreshAfterMembershipChange(groupId);
    }

    async leaveGroup(groupId) {
        await this.apiClient.leaveForumGroup(groupId, this.currentUserId());
        this.myGroups = null;
        await this.refreshAfterMembershipChange(groupId);
    }

    async refreshAfterMembershipChange(groupId) {
        if (this.activeGroup?.id === groupId) {
            await this.showGroup(groupId);
            return;
        }
        await this.loadGroupDirectory();
    }

    async editGroup() {
        const group = this.activeGroup;
        const name = window.prompt("Group name", group.name);
        if (name === null)
            return;
        const description = window.prompt("What is this community about?", group.description ?? "");
        if (description === null)
            return;
        const status = document.getElementById("forum-group-status");
        try {
            await this.apiClient.updateForumGroup(group.id, { name, description });
            await this.showGroup(group.id);
        } catch (error) {
            status.textContent = `Could not save the group: ${error.message}`;
        }
    }

    async showGroupDirectory() {
        this.showSection("groups");
        window.scrollTo(0, 0);
        this.leaveActiveGroup();
        if (!this.facets)
            await this.loadFacets();
        this.elements.breadcrumb.innerHTML = `<a href="#/">Forum</a> <span class="sep">/</span> Groups`;
        this.elements.groupsView.innerHTML = `
            <a class="forum-link-button" href="#/"><i class="fa-light fa-arrow-left"></i> Back to all topics</a>
            <h1>Groups</h1>
            <p class="page-desc">Communities gather the people who care about a corner of the board and the topics that corner collects. Anyone can read one; join to post into it.</p>
            <div class="forum-toolbar">
                <div class="forum-search">
                    <i class="fa-light fa-magnifying-glass" aria-hidden="true"></i>
                    <input id="forum-group-search" type="search" placeholder="Search groups" autocomplete="off" />
                </div>
                <select id="forum-group-sort" class="forum-select" aria-label="Sort groups">
                    <option value="name">Name</option>
                    <option value="members">Most members</option>
                    <option value="topics">Most topics</option>
                    <option value="new">Newest</option>
                </select>
                <label class="forum-toggle"><input id="forum-group-mine" type="checkbox" /> My groups</label>
                <button id="forum-group-new-button" class="forum-button forum-button-primary" type="button">
                    <i class="fa-light fa-plus" aria-hidden="true"></i> New group
                </button>
            </div>
            <div id="forum-group-form"></div>
            <div id="forum-groups-status" class="forum-status"></div>
            <div id="forum-group-cards" class="forum-group-cards"></div>`;
        document.getElementById("forum-group-search").addEventListener("input", () => this.onGroupSearchInput());
        document.getElementById("forum-group-sort").addEventListener("change", () => this.loadGroupDirectory());
        document.getElementById("forum-group-mine").addEventListener("change", () => this.loadGroupDirectory());
        document.getElementById("forum-group-new-button").addEventListener("click", () => this.openGroupForm());
        await this.loadGroupDirectory();
    }

    onGroupSearchInput() {
        window.clearTimeout(this.groupSearchTimer);
        this.groupSearchTimer = window.setTimeout(() => this.loadGroupDirectory(), 250);
    }

    async loadGroupDirectory() {
        const status = document.getElementById("forum-groups-status");
        status.textContent = "Loading groups…";
        status.classList.remove("is-error");
        try {
            const page = await this.apiClient.fetchForumGroupsPage({
                search: document.getElementById("forum-group-search").value.trim(),
                sort: document.getElementById("forum-group-sort").value,
                mine: document.getElementById("forum-group-mine").checked,
                limit: 48
            });
            status.textContent = "";
            this.renderGroupCards(page.items);
        } catch (error) {
            document.getElementById("forum-group-cards").innerHTML = "";
            status.textContent = `Could not load the groups: ${error.message}`;
            status.classList.add("is-error");
        }
    }

    renderGroupCards(groups) {
        const container = document.getElementById("forum-group-cards");
        if (groups.length === 0) {
            container.innerHTML = `
                <div class="forum-empty">
                    <i class="fa-light fa-users"></i>
                    <p>No groups match what you are looking for.</p>
                </div>`;
            return;
        }
        container.innerHTML = groups.map(group => `
            <article class="forum-group-card">
                <a class="forum-group-card-head" href="#/group/${encodeURIComponent(group.slug)}">
                    ${ForumPage.buildGroupAvatar(group)}
                    <span class="forum-group-card-name">${ForumPage.escape(group.name)}</span>
                </a>
                <p class="forum-group-card-description">${ForumPage.escape(group.description ?? "")}</p>
                <div class="forum-group-meta">
                    <span><i class="fa-light fa-user-group"></i> ${group.member_count}</span>
                    <span><i class="fa-light fa-comments"></i> ${group.topic_count}</span>
                    ${group.science_name ? `<span class="forum-chip"><i class="fa-light fa-flask"></i>${ForumPage.escape(group.science_name)}</span>` : ""}
                </div>
                <div class="forum-group-actions">${this.buildMembershipButton(group)}</div>
            </article>`).join("");
        container.querySelectorAll("[data-join-group]").forEach(button => button.addEventListener("click", () => this.joinGroup(button.dataset.joinGroup)));
        container.querySelectorAll("[data-leave-group]").forEach(button => button.addEventListener("click", () => this.leaveGroup(button.dataset.leaveGroup)));
    }

    async openGroupForm() {
        if (!this.isSignedIn()) {
            this.userSdk.redirectToLogin();
            return;
        }
        await this.loadLookups();
        const scienceOptions = this.buildLookupOptions(this.lookups.sciences);
        const educationOptions = this.buildLookupOptions(this.lookups.education);
        document.getElementById("forum-group-form").innerHTML = `
            <div class="forum-form">
                <h3>New group</h3>
                <div class="forum-field">
                    <label for="forum-group-name">Name</label>
                    <input id="forum-group-name" class="forum-input" type="text" maxlength="80" placeholder="Wave Optics" />
                </div>
                <div class="forum-field">
                    <label for="forum-group-description">What is this community about? <span class="forum-field-hint">optional</span></label>
                    <textarea id="forum-group-description" class="forum-textarea" maxlength="2000" placeholder="Interference, diffraction and everything that needs a wavefront to explain."></textarea>
                </div>
                <div class="forum-field-row">
                    <div class="forum-field">
                        <label for="forum-group-science">Science <span class="forum-field-hint">optional</span></label>
                        <select id="forum-group-science" class="forum-select"><option value="">Not specified</option>${scienceOptions}</select>
                    </div>
                    <div class="forum-field">
                        <label for="forum-group-education">Education level <span class="forum-field-hint">optional</span></label>
                        <select id="forum-group-education" class="forum-select"><option value="">Not specified</option>${educationOptions}</select>
                    </div>
                </div>
                <div class="forum-form-actions">
                    <button type="button" id="forum-group-submit" class="forum-button forum-button-primary">Create group</button>
                    <button type="button" id="forum-group-cancel" class="forum-button">Cancel</button>
                    <span id="forum-group-form-status" class="forum-status"></span>
                </div>
            </div>`;
        document.getElementById("forum-group-submit").addEventListener("click", () => this.submitGroup());
        document.getElementById("forum-group-cancel").addEventListener("click", () => this.closeGroupForm());
        document.getElementById("forum-group-name").focus();
    }

    closeGroupForm() {
        document.getElementById("forum-group-form").innerHTML = "";
    }

    async submitGroup() {
        const formStatus = document.getElementById("forum-group-form-status");
        const name = document.getElementById("forum-group-name").value.trim();
        if (!name) {
            formStatus.textContent = "A name is required.";
            return;
        }
        formStatus.textContent = "Creating…";
        const payload = {
            name,
            description: document.getElementById("forum-group-description").value.trim() || null,
            science_id: document.getElementById("forum-group-science").value || null,
            education_level_id: document.getElementById("forum-group-education").value || null
        };
        try {
            const created = await this.apiClient.createForumGroup(payload);
            this.myGroups = null;
            window.location.hash = `#/group/${encodeURIComponent(created.slug)}`;
        } catch (error) {
            formStatus.textContent = `Could not create the group: ${error.message}`;
        }
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
        await this.loadMyGroups();
        this.elements.breadcrumb.innerHTML = `<a href="#/">Forum</a> <span class="sep">/</span> New topic`;
        const kindOptions = Object.keys(kindLabels).map(kind => `<option value="${kind}">${kindLabels[kind]}</option>`).join("");
        const groupOptions = this.myGroups.map(group => `<option value="${ForumPage.escape(group.id)}" ${this.pendingGroupId === group.id ? "selected" : ""}>${ForumPage.escape(group.name)}</option>`).join("");
        this.pendingGroupId = undefined;
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
                    <label for="forum-compose-group">Group ${this.myGroups.length === 0 ? `<span class="forum-field-hint">join a group to post into one</span>` : `<span class="forum-field-hint">optional</span>`}</label>
                    <select id="forum-compose-group" class="forum-select"><option value="">No group — the general board</option>${groupOptions}</select>
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
                    <label>Attachments <span class="forum-field-hint">optional</span></label>
                    <div id="forum-compose-attachments"></div>
                </div>
                <div class="forum-form-actions">
                    <button type="button" id="forum-compose-submit" class="forum-button forum-button-primary">Post topic</button>
                    <a class="forum-button" href="#/">Cancel</a>
                    <span id="forum-compose-status" class="forum-status"></span>
                </div>
            </div>`;
        this.composeAttachments = this.createAttachmentPicker(this.composeAttachments, "forum-compose-attachments", ".forum-form");
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
            education_level_id: document.getElementById("forum-compose-education").value || null,
            group_id: document.getElementById("forum-compose-group").value || null
        };
        try {
            const created = await this.apiClient.createForumTopic(payload, this.composeAttachments.getFiles());
            window.location.hash = `#/topic/${encodeURIComponent(created.id)}`;
        } catch (error) {
            composeStatus.textContent = `Could not post the topic: ${error.message}`;
        }
    }
}

new ForumPage().start();
