DevExpress.config({ licenseKey: "ewogICJmb3JtYXQiOiAxLAogICJjdXN0b21lcklkIjogImNmOWZhNjAzLTI4ZTAtMTFlMi05NWQwLTAwMjE5YjhiNTA0NyIsCiAgIm1heFZlcnNpb25BbGxvd2VkIjogMjQyCn0=.TTX6Poy2dCPV9Dcrb5Q2r+H+8s1jHV4tvntU/EMPIve2JwJ2KFGoAXzk/R3c4dhEg1nomyae+I97HS6bNVeBcugyjySlHFBedv46LdF3HcdezvM9EdPrli3Tuq/DhyjKrfAi+w=="});
const urlParams = new URLSearchParams(window.location.search);
const modelName = urlParams.get("model");
var shell = null;
if (modelName)
    fetch(`resources/models/${modelName}.json`)
        .then(r => r.text())
        .then(r => shell = new Shell(r));
else
    shell = new Shell();