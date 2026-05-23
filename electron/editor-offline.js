var shell = null;

(async () => {
    const storedModel = sessionStorage.getItem("mp.anon.model");
    shell = new Shell(storedModel || null, null);
    shell.saveToApi = () => shell.exportToFile();
    shell.saveAsModel = () => shell.exportToFile();
    shell.duplicateModel = () => {};
})();
