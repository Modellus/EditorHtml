import { escapeHtml } from "./attachmentPicker.js";

const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "S", "STRIKE", "DEL", "OL", "UL", "LI", "A", "BLOCKQUOTE", "CODE", "PRE", "H3", "H4", "SPAN", "DIV"]);
const droppedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "SVG"]);
const urlSource = "(?:https?://|www\\.)[^\\s<>\"']*[^\\s<>\"'.,;:!?)\\]}]";

export const maxRichTextLength = 20000;

export const richTextToolbarItems = ["bold", "italic", "underline", "separator", "orderedList", "bulletList"];

export function plainTextToHtml(value) {
    return String(value ?? "").split(/\n{2,}/).filter(block => block.trim() !== "").map(block => `<p>${escapeHtml(block).replace(/\n/g, "<br />")}</p>`).join("");
}

export function sanitizeRichText(value) {
    const markup = String(value ?? "");
    const parsed = new DOMParser().parseFromString(/<[a-z][\s\S]*>/i.test(markup) ? markup : plainTextToHtml(markup), "text/html");
    cleanChildren(parsed.body);
    linkifyTextNodes(parsed.body);
    return parsed.body.innerHTML;
}

export function urlPattern() {
    return new RegExp(urlSource, "gi");
}

export function urlAtStart(token) {
    const match = new RegExp(`^${urlSource}`, "i").exec(token);
    return match ? match[0] : "";
}

export function linkHref(url) {
    return /^www\./i.test(url) ? `https://${url}` : url;
}

export function richTextToPlainText(value) {
    const parsed = new DOMParser().parseFromString(sanitizeRichText(value), "text/html");
    return parsed.body.textContent.replace(/\s+/g, " ").trim();
}

function linkifyTextNodes(root) {
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const linkable = [];
    while (walker.nextNode())
        if (!walker.currentNode.parentElement.closest("a") && urlPattern().test(walker.currentNode.nodeValue))
            linkable.push(walker.currentNode);
    for (const node of linkable)
        node.replaceWith(buildFragment(node, linkifyText(node.nodeValue)));
}

function buildFragment(node, markup) {
    const range = node.ownerDocument.createRange();
    range.selectNode(node);
    return range.createContextualFragment(markup);
}

function linkifyText(text) {
    let markup = "";
    let cursor = 0;
    for (const match of text.matchAll(urlPattern())) {
        markup += `${escapeHtml(text.slice(cursor, match.index))}<a href="${escapeHtml(linkHref(match[0]))}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[0])}</a>`;
        cursor = match.index + match[0].length;
    }
    return markup + escapeHtml(text.slice(cursor));
}

function cleanChildren(parent) {
    for (const child of Array.from(parent.children))
        cleanElement(child);
}

function cleanElement(element) {
    if (droppedTags.has(element.tagName)) {
        element.remove();
        return;
    }
    if (!allowedTags.has(element.tagName)) {
        cleanChildren(element);
        element.replaceWith(...element.childNodes);
        return;
    }
    for (const attribute of Array.from(element.attributes))
        if (!isAllowedAttribute(element, attribute.name, attribute.value))
            element.removeAttribute(attribute.name);
    if (element.tagName === "A")
        applyLinkSafety(element);
    cleanChildren(element);
}

function isAllowedAttribute(element, name, value) {
    if (name === "class")
        return value.split(/\s+/).every(token => token.startsWith("ql-"));
    if (element.tagName !== "A")
        return false;
    return name === "href" || name === "title";
}

function applyLinkSafety(anchor) {
    if (!isSafeUrl(anchor.getAttribute("href") ?? "")) {
        anchor.removeAttribute("href");
        return;
    }
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
}

function isSafeUrl(href) {
    const url = href.trim();
    if (/^(https?:\/\/|mailto:)/i.test(url))
        return true;
    return /^[/#]/.test(url);
}

export class RichTextEditor {
    constructor(container, placeholder) {
        this.isLinking = false;
        this.instance = new DevExpress.ui.dxHtmlEditor(container, {
            valueType: "html",
            placeholder,
            toolbar: { items: richTextToolbarItems },
            onFocusOut: () => this.linkifyAll()
        });
        this.quill = this.instance.getQuillInstance();
        this.quill.on("text-change", (delta, oldContents, source) => this.onTextChange(source));
        this.content = container.querySelector(".dx-htmleditor-content");
        this.content.addEventListener("click", event => RichTextEditor.openClickedLink(event));
    }

    static openClickedLink(event) {
        const anchor = event.target.closest("a[href]");
        if (!anchor)
            return;
        event.preventDefault();
        window.open(anchor.getAttribute("href"), "_blank", "noopener");
    }

    onTextChange(source) {
        if (source !== "user" || this.isLinking)
            return;
        const selection = this.quill.getSelection();
        if (!selection)
            return;
        const typed = this.quill.getText(0, selection.index);
        const boundary = /(\S+)\s+$/.exec(typed);
        if (!boundary)
            return;
        const url = urlAtStart(boundary[1]);
        if (url)
            this.applyLink(boundary.index, url.length, linkHref(url));
    }

    linkifyAll() {
        for (const match of this.quill.getText().matchAll(urlPattern()))
            this.applyLink(match.index, match[0].length, linkHref(match[0]));
    }

    applyLink(index, length, href) {
        if (this.quill.getFormat(index, length).link)
            return;
        this.isLinking = true;
        this.quill.formatText(index, length, "link", href, "api");
        this.isLinking = false;
    }

    getValue() {
        return sanitizeRichText(this.instance.option("value"));
    }

    isEmpty() {
        return richTextToPlainText(this.instance.option("value")) === "";
    }

    focus() {
        this.instance.focus();
    }

    dispose() {
        this.instance.dispose();
    }
}
