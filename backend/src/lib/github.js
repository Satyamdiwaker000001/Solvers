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
  function assertSha(value, label) {
    if (!/^[0-9a-f]{7,64}$/i.test(String(value || ""))) {
      throw new Error(`Invalid ${label}`);
    }
  }

  async function postForm(url, params, timeoutMs = 10_000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === "AbortError") throw new Error(`GitHub token exchange timed out after ${timeoutMs}ms`);
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
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

    async fetchProfile(accessToken, timeoutMs = 10_000) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(`${apiBase}/user`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") throw new Error(`GitHub profile request timed out after ${timeoutMs}ms`);
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
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
        avatarUrl: typeof profile.avatar_url === "string" && profile.avatar_url.startsWith("https://avatars.githubusercontent.com/") ? profile.avatar_url : "",
      };
    },

    async fetchCommit({ repoFullName, sha, token = null, timeoutMs = 10_000 } = {}) {
      if (!repoFullName) throw new Error("Missing repository full name");
      if (!sha) throw new Error("Missing commit sha");

      const url = `${apiBase}/repos/${repoFullName}/commits/${sha}`;
      const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let res;
      try {
        res = await fetchImpl(url, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          const timeoutErr = new Error(`GitHub API request timed out after ${timeoutMs}ms`);
          timeoutErr.status = 504;
          timeoutErr.retryable = true;
          throw timeoutErr;
        }
        err.retryable = true;
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const error = new Error(`GitHub API commit fetch failed (HTTP ${res.status})`);
        error.status = res.status;
        const remaining = res.headers?.get?.("x-ratelimit-remaining");
        if (res.status === 429 || (res.status === 403 && remaining === "0")) {
          error.retryable = true;
          error.rateLimited = true;
        } else if (res.status >= 500) {
          error.retryable = true;
        } else {
          error.retryable = false;
        }
        throw error;
      }

      const data = await res.json();
      if (!data || !data.sha) {
        const parseErr = new Error("Invalid GitHub commit response: missing sha");
        parseErr.retryable = false;
        throw parseErr;
      }

      const additions = Number(data.stats?.additions || 0);
      const deletions = Number(data.stats?.deletions || 0);
      const files = Array.isArray(data.files)
        ? data.files.map((f) => (typeof f === "string" ? f : f?.filename)).filter(Boolean)
        : [];

      return {
        sha: data.sha,
        additions,
        deletions,
        files,
        message: data.commit?.message || "",
        author: data.commit?.author || null,
      };
    },

    async fetchCompare({ repoFullName, before, after, token = null, timeoutMs = 10_000 } = {}) {
      if (!repoFullName) throw new Error("Missing repository full name");
      assertSha(before, "before sha");
      assertSha(after, "after sha");

      const headers = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      let res;
      try {
        res = await fetchImpl(`${apiBase}/repos/${repoFullName}/compare/${before}...${after}`, {
          method: "GET",
          headers,
          signal: controller.signal,
        });
      } catch (err) {
        if (err.name === "AbortError") {
          const timeoutErr = new Error(`GitHub compare request timed out after ${timeoutMs}ms`);
          timeoutErr.status = 504;
          timeoutErr.retryable = true;
          throw timeoutErr;
        }
        err.retryable = true;
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) {
        const error = new Error(`GitHub API compare fetch failed (HTTP ${res.status})`);
        error.status = res.status;
        const remaining = res.headers?.get?.("x-ratelimit-remaining");
        error.retryable = res.status === 429 || (res.status === 403 && remaining === "0") || res.status >= 500;
        error.rateLimited = res.status === 429 || (res.status === 403 && remaining === "0");
        throw error;
      }

      const data = await res.json();
      const commits = Array.isArray(data?.commits)
        ? data.commits.map((commit) => String(commit?.sha || "")).filter((sha) => /^[0-9a-f]{7,64}$/i.test(sha))
        : [];
      return {
        commits,
        totalCommits: Number.isInteger(data?.total_commits) ? data.total_commits : commits.length,
      };
    },
  };
}
