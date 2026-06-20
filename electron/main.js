const { app, BrowserWindow, net } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const appRoot = path.join(__dirname, "..");
const webBase = "https://www.modellus.science";

function loadInitialPage(win) {
    if (net.isOnline())
    win.loadURL(`${webBase}/pages/board/index.html`);
    else
    win.loadFile(path.join(appRoot, "pages", "board", "board-offline.html"));
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.webContents.on("will-navigate", (event, url) => {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol === "file:") {
                const decodedPath = decodeURIComponent(parsedUrl.pathname);
                const filename = path.basename(decodedPath);
                const normalizedPath = process.platform === "win32" ? decodedPath.slice(1) : decodedPath;
                const appRootForward = appRoot.replace(/\\/g, "/");
                if (!normalizedPath.startsWith(appRootForward)) {
                    event.preventDefault();
                    let targetFilename = filename;
                    if (targetFilename === "editor.html" || targetFilename === "board.html")
                        targetFilename = "board-offline.html";
                    const targetPath = targetFilename === "board-offline.html"
                        ? path.join(appRoot, "pages", "board", targetFilename)
                        : path.join(appRoot, targetFilename);
                    const targetUrl = pathToFileURL(targetPath).href;
                    const search = parsedUrl.search;
                    win.loadURL(search ? targetUrl + search : targetUrl);
                }
            }
        } catch (_) {}
    });
    app.on("online", () => win.loadURL(`${webBase}/pages/board/index.html`));
    app.on("offline", () => win.loadFile(path.join(appRoot, "pages", "board", "board-offline.html")));
    loadInitialPage(win);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
