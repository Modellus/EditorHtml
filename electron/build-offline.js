const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = path.join(__dirname, "..");
const libDir = path.join(rootDir, "libraries");
const offlineFontsDir = path.join(libDir, "fonts", "offline");
const katexFontsDir = path.join(libDir, "fonts", "katex");
const cssDir = path.join(libDir, "css");
const scriptsDir = path.join(libDir, "scripts");

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function fetchBuffer(fetchUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(fetchUrl);
        const client = parsedUrl.protocol === "https:" ? https : http;
        const request = client.get({
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            }
        }, response => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const location = response.headers.location;
                const redirectUrl = location.startsWith("http") ? location : `${parsedUrl.protocol}//${parsedUrl.host}${location}`;
                fetchBuffer(redirectUrl).then(resolve).catch(reject);
                return;
            }
            const chunks = [];
            response.on("data", chunk => chunks.push(chunk));
            response.on("end", () => resolve(Buffer.concat(chunks)));
            response.on("error", reject);
        });
        request.on("error", reject);
    });
}

async function downloadGoogleFonts() {
    ensureDir(offlineFontsDir);
    const googleFontsUrls = [
        "https://fonts.googleapis.com/css2?family=Assistant:wght@400;600&family=Indie+Flower&display=swap",
        "https://fonts.googleapis.com/css2?family=Atma:wght@400;600;700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&family=Inter:wght@100;200;300;400;500;600;700;800;900&family=Nunito:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
    ];
    let combinedCss = "";
    for (const googleFontsUrl of googleFontsUrls) {
        console.log(`Fetching Google Fonts: ${googleFontsUrl.slice(0, 70)}...`);
        const cssBuffer = await fetchBuffer(googleFontsUrl);
        let css = cssBuffer.toString("utf8");
        const fontUrlPattern = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
        let match;
        const replacements = [];
        while ((match = fontUrlPattern.exec(css)) !== null) {
            const fontUrl = match[1];
            const fontFilename = fontUrl.split("/").pop();
            const fontDestPath = path.join(offlineFontsDir, fontFilename);
            if (!fs.existsSync(fontDestPath)) {
                process.stdout.write(`  Downloading: ${fontFilename}\n`);
                const fontBuffer = await fetchBuffer(fontUrl);
                fs.writeFileSync(fontDestPath, fontBuffer);
            }
            replacements.push({ from: fontUrl, to: `../fonts/offline/${fontFilename}` });
        }
        for (const replacement of replacements)
            css = css.split(replacement.from).join(replacement.to);
        combinedCss += css + "\n";
    }
    fs.writeFileSync(path.join(cssDir, "google-fonts.css"), combinedCss);
    console.log("Generated: libraries/css/google-fonts.css");
}

async function downloadKatex() {
    ensureDir(katexFontsDir);
    const version = "0.16.21";
    const cssUrl = `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.css`;
    const jsUrl = `https://cdn.jsdelivr.net/npm/katex@${version}/dist/katex.min.js`;
    console.log("Fetching KaTeX CSS...");
    const cssBuffer = await fetchBuffer(cssUrl);
    let css = cssBuffer.toString("utf8");
    const fontFilenamePattern = /url\(fonts\/([^)]+)\)/g;
    let match;
    const fontFilenames = new Set();
    while ((match = fontFilenamePattern.exec(css)) !== null)
        fontFilenames.add(match[1]);
    for (const fontFilename of fontFilenames) {
        const fontUrl = `https://cdn.jsdelivr.net/npm/katex@${version}/dist/fonts/${fontFilename}`;
        const fontDestPath = path.join(katexFontsDir, fontFilename);
        if (!fs.existsSync(fontDestPath)) {
            process.stdout.write(`  Downloading KaTeX font: ${fontFilename}\n`);
            const fontBuffer = await fetchBuffer(fontUrl);
            fs.writeFileSync(fontDestPath, fontBuffer);
        }
    }
    css = css.replace(/url\(fonts\//g, "url(../fonts/katex/");
    fs.writeFileSync(path.join(cssDir, "katex.min.css"), css);
    console.log("Generated: libraries/css/katex.min.css");
    console.log("Fetching KaTeX JS...");
    const jsBuffer = await fetchBuffer(jsUrl);
    fs.writeFileSync(path.join(scriptsDir, "katex.min.js"), jsBuffer);
    console.log("Downloaded: libraries/scripts/katex.min.js");
}

function buildOfflineHtml() {
    let html = fs.readFileSync(path.join(rootDir, "editor.html"), "utf8");
    html = html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/, "");
    const removeScriptSrcs = [
        "libraries/scripts/agentChatAdapter.js",
        "libraries/scripts/agentToolBridge.js",
        "sdk/aiSdk.js",
        "scripts/shell/chatController.js",
        "scripts/shell/collabChannel.js"
    ];
    for (const src of removeScriptSrcs)
        html = html.replace(`\n    <script src="${src}"></script>`, "");
    html = html.replace(
        `<script src="scripts/shell.js"></script>`,
        `<script src="electron/offline-stubs.js"></script>\n    <script src="scripts/shell.js"></script>`
    );
    let googleFontsReplaced = false;
    html = html.replace(/<link\s[^>]*href="https:\/\/fonts\.googleapis\.com[^"]*"[^>]*\/?>/g, () => {
        if (googleFontsReplaced)
            return "";
        googleFontsReplaced = true;
        return `<link rel="stylesheet" href="libraries/css/google-fonts.css">`;
    });
    html = html.replace(
        `<link rel="stylesheet" href="https://cdn3.devexpress.com/jslib/25.2.3/css/dx.fluent.blue.light.compact.css">`,
        `<link rel="stylesheet" href="libraries/css/1dx.fluent.blue.light.compact.css">`
    );
    html = html.replace(
        `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css">`,
        `<link rel="stylesheet" href="libraries/css/katex.min.css">`
    );
    html = html.replace(
        `<script src="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js"></script>`,
        `<script src="libraries/scripts/katex.min.js"></script>`
    );
    html = html.replace(
        `<script src="https://cdn3.devexpress.com/jslib/25.2.3/js/dx.all.js"></script>`,
        `<script src="libraries/scripts/dx.all.js"></script>`
    );
    html = html.replace(
        `<script src="editor.js"></script>`,
        `<script src="electron/editor-offline.js"></script>`
    );
    html = html.replace(/\s*<div id="chat-popup"><\/div>/, "");
    fs.writeFileSync(path.join(rootDir, "editor-offline.html"), html);
    console.log("Generated: editor-offline.html");
}

async function main() {
    ensureDir(offlineFontsDir);
    ensureDir(katexFontsDir);
    await downloadGoogleFonts();
    await downloadKatex();
    buildOfflineHtml();
    console.log("\nBuild complete. Run: npx electron .");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
