export async function onRequest(context) {
    const url = new URL(context.request.url);
    const code = url.searchParams.get("code");

    if (!code)
        return new Response("Missing code parameter", { status: 400 });

    const clientId = context.env.GITHUB_CLIENT_ID;
    const clientSecret = context.env.GITHUB_CLIENT_SECRET;

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code
        })
    });

    const tokenData = await tokenResponse.json();

    const postMessageScript = `
<html><body><script>
(function() {
    function receiveMessage(e) {
        console.log("receiveMessage %o", e);
        window.opener.postMessage(
            'authorization:github:${tokenData.error ? "error" : "success"}:${JSON.stringify(tokenData.error ? { provider: "github", error: tokenData.error_description } : { provider: "github", token: tokenData.access_token })}',
            e.origin
        );
        window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
})();
</script></body></html>`;

    return new Response(postMessageScript, {
        headers: { "Content-Type": "text/html" }
    });
}
