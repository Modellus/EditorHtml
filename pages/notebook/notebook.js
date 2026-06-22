const notebookApiBase = "https://modellus-api.interactivebook.workers.dev";

(async () => {
    try {
        await NotebookBootstrap.startOnline({ apiBase: notebookApiBase });
    } catch (error) {
        console.error("Failed to load notebook:", error);
    }
})();
