import {
  IGitPlatformAdapter,
  GitRepository,
  GitUserProfile,
} from "../../domain/gitconnection/IGitPlatformAdapter.js";
import type { GitProvider } from "../../domain/gitconnection/GitConnection.js";

interface GitLabTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  scope: string;
}

interface GitLabUser {
  username: string;
  avatar_url: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  description: string | null;
  web_url: string;
  http_url_to_repo: string;
  default_branch: string;
  visibility: string;
  last_activity_at: string;
}

export class GitLabAdapter implements IGitPlatformAdapter {
  readonly provider: GitProvider = "gitlab";

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly redirectUri: string;

  constructor() {
    const clientId = process.env.GITLAB_CLIENT_ID;
    const clientSecret = process.env.GITLAB_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET must be set");
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = process.env.GITLAB_BASE_URL ?? "https://gitlab.com";
    this.redirectUri = process.env.GITLAB_REDIRECT_URI ?? "";
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.redirectUri,
      }),
    });

    if (!res.ok) {
      throw new Error(`GitLab OAuth token exchange failed: ${res.status}`);
    }

    const data = (await res.json()) as GitLabTokenResponse;
    if (!data.access_token) {
      throw new Error("GitLab OAuth: no access_token in response");
    }
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<GitUserProfile> {
    const res = await fetch(`${this.baseUrl}/api/v4/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`GitLab API /user failed: ${res.status}`);
    }

    const data = (await res.json()) as GitLabUser;
    return {
      username: data.username,
      avatarUrl: data.avatar_url ?? null,
    };
  }

  async listRepositories(accessToken: string): Promise<GitRepository[]> {
    const repos: GitRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const res = await fetch(
        `${this.baseUrl}/api/v4/projects?membership=true&per_page=${perPage}&page=${page}&order_by=updated_at&sort=desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) {
        throw new Error(`GitLab API /projects failed: ${res.status}`);
      }

      const data = (await res.json()) as GitLabProject[];
      if (data.length === 0) break;

      repos.push(
        ...data.map((p) => ({
          id: String(p.id),
          name: p.name,
          fullName: p.path_with_namespace,
          description: p.description,
          url: p.web_url,
          cloneUrl: p.http_url_to_repo,
          defaultBranch: p.default_branch ?? "main",
          isPrivate: p.visibility === "private",
          updatedAt: p.last_activity_at,
        })),
      );

      if (data.length < perPage) break;
      page++;
    }

    return repos;
  }
}
