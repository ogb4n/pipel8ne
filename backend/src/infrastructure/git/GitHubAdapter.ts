import {
  IGitPlatformAdapter,
  GitRepository,
  GitUserProfile,
} from "../../domain/gitconnection/IGitPlatformAdapter.js";
import type { GitProvider } from "../../domain/gitconnection/GitConnection.js";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  login: string;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  default_branch: string;
  private: boolean;
  updated_at: string;
}

export class GitHubAdapter implements IGitPlatformAdapter {
  readonly provider: GitProvider = "github";

  private readonly clientId: string | null;
  private readonly clientSecret: string | null;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID ?? null;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET ?? null;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("OAuth non configuré pour GitHub (GITHUB_CLIENT_ID/SECRET manquants)");
    }
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
      }),
    });

    if (!res.ok) {
      throw new Error(`GitHub OAuth token exchange failed: ${res.status}`);
    }

    const data = (await res.json()) as GitHubTokenResponse;
    if (!data.access_token) {
      throw new Error("GitHub OAuth: no access_token in response");
    }
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<GitUserProfile> {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub API /user failed: ${res.status}`);
    }

    const data = (await res.json()) as GitHubUser;
    return {
      username: data.login,
      avatarUrl: data.avatar_url ?? null,
    };
  }

  async listRepositories(accessToken: string): Promise<GitRepository[]> {
    const repos: GitRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await fetch(
        `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        },
      );

      if (!res.ok) {
        throw new Error(`GitHub API /user/repos failed: ${res.status}`);
      }

      const data = (await res.json()) as GitHubRepo[];
      if (data.length === 0) break;

      repos.push(
        ...data.map((r) => ({
          id: String(r.id),
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          url: r.html_url,
          cloneUrl: r.clone_url,
          defaultBranch: r.default_branch,
          isPrivate: r.private,
          updatedAt: r.updated_at,
        })),
      );

      if (data.length < perPage) break;
      page++;
    }

    return repos;
  }
}
