import {
  IGitPlatformAdapter,
  GitRepository,
  GitUserProfile,
  PipelineFile,
} from "../../domain/gitconnection/IGitPlatformAdapter.js";
import type { GitProvider } from "../../domain/gitconnection/GitConnection.js";

interface AzureDevOpsTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
}

interface AzureDevOpsProfile {
  displayName: string;
  emailAddress: string;
  id: string;
}

interface AzureDevOpsAccount {
  accountId: string;
  accountName: string;
}

interface AzureDevOpsRepo {
  id: string;
  name: string;
  project: { name: string };
  remoteUrl: string;
  webUrl: string;
  defaultBranch?: string;
}

export class AzureDevOpsAdapter implements IGitPlatformAdapter {
  readonly provider: GitProvider = "azure_devops";

  private readonly clientSecret: string | null;
  private readonly redirectUri: string;

  constructor() {
    this.clientSecret = process.env.AZURE_DEVOPS_CLIENT_SECRET ?? null;
    this.redirectUri = process.env.AZURE_DEVOPS_REDIRECT_URI ?? "";
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    if (!this.clientSecret) {
      throw new Error("OAuth non configuré pour Azure DevOps (AZURE_DEVOPS_CLIENT_SECRET manquant)");
    }
    const body = new URLSearchParams({
      client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: this.clientSecret,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: code,
      redirect_uri: this.redirectUri,
    });

    const res = await fetch("https://app.vssps.visualstudio.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Azure DevOps OAuth token exchange failed: ${res.status}`);
    }

    const data = (await res.json()) as AzureDevOpsTokenResponse;
    if (!data.access_token) {
      throw new Error("Azure DevOps OAuth: no access_token in response");
    }
    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<GitUserProfile> {
    const res = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!res.ok) {
      throw new Error(`Azure DevOps API /profile failed: ${res.status}`);
    }

    const data = (await res.json()) as AzureDevOpsProfile;
    return {
      username: data.displayName,
      avatarUrl: null,
    };
  }

  async listRepositories(accessToken: string): Promise<GitRepository[]> {
    // 1. Get user profile to retrieve member ID
    const profileRes = await fetch(
      "https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=7.0",
      { headers: { Authorization: `Basic ${Buffer.from(`:${accessToken}`).toString("base64")}` } },
    );
    if (!profileRes.ok) {
      throw new Error(`Azure DevOps API /profile failed: ${profileRes.status}`);
    }
    const profile = (await profileRes.json()) as AzureDevOpsProfile;

    // 2. List organizations the user belongs to
    const accountsRes = await fetch(
      `https://app.vssps.visualstudio.com/_apis/accounts?memberId=${encodeURIComponent(profile.id)}&api-version=7.0`,
      { headers: { Authorization: `Basic ${Buffer.from(`:${accessToken}`).toString("base64")}` } },
    );
    if (!accountsRes.ok) {
      throw new Error(`Azure DevOps API /accounts failed: ${accountsRes.status}`);
    }
    const accounts = (await accountsRes.json()) as { value: AzureDevOpsAccount[] };

    // 3. For each org, list Git repositories
    const repos: GitRepository[] = [];
    for (const account of accounts.value) {
      const reposRes = await fetch(
        `https://dev.azure.com/${encodeURIComponent(account.accountName)}/_apis/git/repositories?api-version=7.0`,
        { headers: { Authorization: `Basic ${Buffer.from(`:${accessToken}`).toString("base64")}` } },
      );
      if (!reposRes.ok) continue; // Skip orgs we can't access

      const data = (await reposRes.json()) as { value: AzureDevOpsRepo[] };
      repos.push(
        ...data.value.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: `${account.accountName}/${r.project.name}/${r.name}`,
          description: null,
          url: r.webUrl,
          cloneUrl: r.remoteUrl,
          defaultBranch: r.defaultBranch?.replace("refs/heads/", "") ?? "main",
          isPrivate: true,
          updatedAt: new Date().toISOString(),
        })),
      );
    }

    return repos;
  }

  async listPipelineFiles(accessToken: string, fullName: string): Promise<PipelineFile[]> {
    // fullName format: "org/project/repo"
    const parts = fullName.split("/");
    if (parts.length < 3) return [];
    const [org, project, repo] = parts;
    const auth = `Basic ${Buffer.from(`:${accessToken}`).toString("base64")}`;

    const res = await fetch(
      `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?path=azure-pipelines.yml&api-version=7.0`,
      { headers: { Authorization: auth } },
    );
    if (!res.ok) return [];
    const content = await res.text();
    return [{ name: "azure-pipelines", path: "azure-pipelines.yml", content }];
  }
}
