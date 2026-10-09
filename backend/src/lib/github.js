/**
 * Minimal GitHub OAuth + profile client. The HTTP layer is injectable so
 * tests can simulate success/failure without network access; production
 * passes the global fetch.
 */

export function buildAuthorizeUrl({ oauthBase, clientId, callbackUrl, scope, state }) {
  const url = new URL("/login/oauth/authorize", oauthBase);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  return url.toString();
}

export function createGithubClient({ fetchImpl = fetch, oauthBase, apiBase, clientId, clientSecret, callbackUrl }) {
  async function postForm(url, params) {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error(`GitHub token exchange failed (HTTP ${res.status})`);
    }
    return res.json();
  }

  return {
    async exchangeCode(code) {
      const data = await postForm(`${oauthBase}/login/oauth/access_token`, {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      });
      if (!data || !data.access_token) {
        throw new Error("GitHub did not return an access token (bad code or revoked grant)");
      }
      return data.access_token;
    },

    async fetchProfile(accessToken) {
      const res = await fetchImpl(`${apiBase}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (!res.ok) {
        throw new Error(`GitHub profile fetch failed (HTTP ${res.status})`);
      }
      const profile = await res.json();
      if (!profile || profile.id === undefined || profile.id === null) {
        throw new Error("GitHub profile is missing the numeric user id");
      }
      return {
        githubUserId: String(profile.id),
        githubLogin: String(profile.login || ""),
        displayName: String(profile.name || profile.login || ""),
      };
    },
  };
}
