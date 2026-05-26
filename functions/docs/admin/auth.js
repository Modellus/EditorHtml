export async function onRequest(context) {
    const url = new URL(context.request.url);
    const provider = url.searchParams.get("provider") || "github";

    if (provider !== "github")
        return new Response("Unsupported provider", { status: 400 });

    const clientId = context.env.GITHUB_CLIENT_ID;
    const scope = "repo,user";
    const redirectUri = `${url.origin}/docs/admin/callback`;

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return Response.redirect(authUrl, 301);
}
