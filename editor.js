DevExpress.config({ licenseKey: "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjQxCn0=.RwzuszxP0EZpb1mjikhmz6G0g5QUrgDILiiRTePC1SeHd3o9co5aGr7mMPuysN6kKb16+UZ0uwtnUXeiOwJcvFTd9wDPT8UqhPXr3uBXmEonDisUwgOBZrfrbZc1satfHazSYg=="});
const urlParams = new URLSearchParams(window.location.search);
const modelName = urlParams.get("model");
var shell = null;
if (modelName)
    fetch(`resources/models/${modelName}.json`)
        .then(r => r.text())
        .then(r => shell = new Shell(r));
else
    shell = new Shell();