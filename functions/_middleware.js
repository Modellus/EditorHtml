const API_BASE = "https://modellus-api.interactivebook.workers.dev";

function escapeHtmlAttribute(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function buildOgTags(pageUrl, title, description, thumbnail) {
    const escapedTitle = escapeHtmlAttribute(title);
    const escapedDescription = escapeHtmlAttribute(description);
    const escapedUrl = escapeHtmlAttribute(pageUrl);
    const imageTags = thumbnail
        ? `\n    <meta property="og:image" content="${escapeHtmlAttribute(thumbnail)}" />\n    <meta name="twitter:image" content="${escapeHtmlAttribute(thumbnail)}" />`
        : "";
    return `<meta property="og:type" content="website" />
    <meta property="og:url" content="${escapedUrl}" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDescription}" />
    <meta name="twitter:card" content="${thumbnail ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDescription}" />${imageTags}`;
}

export async function onRequest(context) {
    const { request, next } = context;
    const url = new URL(request.url);

    if (url.pathname !== "/editor.html" && url.pathname !== "/editor") return next();

    const modelId = url.searchParams.get("model_id");
    if (!modelId) return next();

    const [pageResponse, model] = await Promise.all([
        next(),
        fetch(`${API_BASE}/models/${encodeURIComponent(modelId)}`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    if (!model) return pageResponse;

    const html = await pageResponse.text();
    const title = model.title || "Modellus";
    const description = model.description || "Interactive mathematical model built with Modellus.";
    const thumbnail = model.thumbnail || model.thumbnail_url || "";
    const pageUrl = `${url.origin}/editor?model_id=${encodeURIComponent(modelId)}`;

    const ogTags = buildOgTags(pageUrl, title, description, thumbnail);
    const modifiedHtml = html.replace(
        /(<head[^>]*>)/i,
        `$1\n    ${ogTags}`
    );

    const headers = new Headers(pageResponse.headers);
    headers.set("Content-Type", "text/html; charset=UTF-8");

    return new Response(modifiedHtml, { status: pageResponse.status, headers });
}
