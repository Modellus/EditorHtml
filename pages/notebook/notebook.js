const notebookApiBase = ModellusApiConfig.resolveApiBase();

var notebook = null;

(async () => {
    try {
        notebook = await NotebookBootstrap.startOnline({ apiBase: notebookApiBase });
    } catch (error) {
        console.error("Failed to load notebook:", error);
    }
})();
