const { app, BrowserWindow } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const appRoot = path.join(__dirname, "..");

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
            if (parsedUrl.protocol !== "file:") return;
            const decodedPath = decodeURIComponent(parsedUrl.pathname);
            const normalizedPath = process.platform === "win32" ? decodedPath.slice(1) : decodedPath;
            const appRootForward = appRoot.replace(/\\/g, "/");
            if (!normalizedPath.startsWith(appRootForward)) {
                event.preventDefault();
                let filename = path.basename(decodedPath);
                if (filename === "editor.html")
                    filename = "editor-offline.html";
                const targetPath = path.join(appRoot, filename);
                const targetUrl = pathToFileURL(targetPath).href;
                const search = parsedUrl.search;
                win.loadURL(search ? targetUrl + search : targetUrl);
            }
        } catch (_) {}
    });
    win.loadFile(path.join(appRoot, "editor-offline.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => app.quit());

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
