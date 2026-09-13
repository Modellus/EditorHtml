// The static server the tests are served from. It is http-server with one addition: the
// pages reach for DevExtreme, KaTeX, MathJax, Bootstrap and the Google fonts over a CDN, and
// a suite of ~1100 page loads asks the DevExpress CDN alone for some 5.8 GB a run. The CDN
// throttles long before that, and when it does every worker blocks on the same stalled
// request at the same moment, so whole runs freeze together and whichever tests happen to be
// open are the ones that report a timeout. So each of those links is answered here from the
// copy already vendored in the repo - the same copies electron/build-offline.js downloads for
// the offline build - and a test run never touches the public internet.
//
// The rewrite happens on the way out rather than in the pages themselves, so what ships keeps
// using the CDN and only the tests are pinned to the local copies.

const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const port = Number(process.argv[2]) || 8432;

// Every CDN URL a served page asks for, and the file under the repo that answers it. A pattern
// is matched against the whole tag URL, so the query a Google font sheet carries is covered too.
const localAssets = [
    [/https:\/\/cdn3\.devexpress\.com\/jslib\/[^"']*\/js\/dx\.all\.js/g, "/libraries/scripts/dx.all.js"],
    [/https:\/\/cdn3\.devexpress\.com\/jslib\/[^"']*\/css\/dx\.[^"']*\.css/g, "/libraries/css/1dx.fluent.blue.light.compact.css"],
    [/https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[^"']*\/katex\.min\.js/g, "/libraries/scripts/katex.min.js"],
    [/https:\/\/cdn\.jsdelivr\.net\/npm\/katex@[^"']*\/katex\.min\.css/g, "/libraries/css/katex.min.css"],
    [/https:\/\/cdn\.jsdelivr\.net\/npm\/mathjax@[^"']*\/tex-svg\.js/g, "/libraries/scripts/tex-svg.js"],
    [/https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^"']*\/css\/bootstrap\.min\.css/g, "/libraries/css/bootstrap.min.css"],
    [/https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^"']*\/js\/bootstrap\.bundle\.min\.js/g, "/libraries/scripts/bootstrap.bundle.min.js"],
    [/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/exceljs\/[^"']*\/exceljs\.min\.js/g, "/libraries/scripts/exceljs.min.js"],
    [/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/FileSaver\.js\/[^"']*\/FileSaver\.min\.js/g, "/libraries/scripts/FileSaver.min.js"],
    [/https:\/\/fonts\.googleapis\.com\/css2\?[^"']*/g, "/libraries/css/google-fonts.css"]
];

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".eot": "application/vnd.ms-fontobject",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".wasm": "application/wasm",
    ".csv": "text/csv; charset=utf-8"
};

function rewriteCdnLinks(html) {
    return localAssets.reduce((text, [pattern, local]) => text.replace(pattern, local), html);
}

// A request may only reach files inside the repo, whatever ".." the path is spelled with.
function resolveRequestPath(requestUrl) {
    const pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
    const resolved = path.join(root, path.normalize(pathname));
    if (resolved !== root && !resolved.startsWith(root + path.sep))
        return null;
    return resolved;
}

// A suite of ~1100 page loads asks for some 276,000 files, and the board alone is 8.6 MB of
// them, so the answer to each is held in memory after it is first read. Touching the disk per
// request - worse, asking synchronously whether the file is there - blocks the one thread this
// server has, and a blocked thread stalls every worker at once, which is the freeze the CDN
// was causing before the links were brought local.
const cache = new Map();

function loadFile(filePath) {
    const cached = cache.get(filePath);
    if (cached !== undefined)
        return cached;
    const entry = readFile(filePath);
    cache.set(filePath, entry);
    return entry;
}

function readFile(filePath) {
    let resolved = filePath;
    let stats = null;
    try {
        stats = fs.statSync(resolved);
        if (stats.isDirectory()) {
            resolved = path.join(resolved, "index.html");
            stats = fs.statSync(resolved);
        }
    } catch (error) {
        return null;
    }
    if (!stats.isFile())
        return null;
    const extension = path.extname(resolved).toLowerCase();
    const body = extension === ".html"
        ? Buffer.from(rewriteCdnLinks(fs.readFileSync(resolved, "utf8")))
        : fs.readFileSync(resolved);
    return { body, contentType: contentTypes[extension] || "application/octet-stream" };
}

const server = http.createServer((request, response) => {
    const filePath = resolveRequestPath(request.url);
    const entry = filePath === null ? null : loadFile(filePath);
    if (entry === null) {
        response.writeHead(filePath === null ? 403 : 404).end();
        return;
    }
    response.writeHead(200, {
        "Content-Type": entry.contentType,
        "Content-Length": entry.body.length,
        // The files do not change under a run, so a context that asks twice is told to reuse
        // what it has. Each test gets a fresh context, so this only helps within one.
        "Cache-Control": "public, max-age=31536000"
    }).end(entry.body);
});

// The default 5s idle timeout closes sockets between a worker's page loads, so every load pays
// for new connections; the suite is the only client and it is never idle for long.
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.listen(port, () => console.log(`test server on http://localhost:${port} (CDN links served locally)`));
