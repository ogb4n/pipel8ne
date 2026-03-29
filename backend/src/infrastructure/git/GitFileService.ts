/**
 * GitFileService
 *
 * Pushes a single file to a git provider repository via its REST API.
 * No local git clone required — uses provider APIs directly.
 *
 * Supported providers: github, gitlab, azure_devops
 */
import type { GitProvider } from "../../domain/gitconnection/GitConnection.js";

export interface PushFileResult {
  /** Provider-side commit/object SHA */
  sha: string;
  /** URL to view the file on the provider (e.g. GitHub blob URL) */
  fileUrl: string;
}

export class GitFileService {
  /**
   * Create or update a file in a git repository.
   *
   * @param token     Decrypted access token for the provider
   * @param provider  Git provider identifier
   * @param fullName  Repository full name (e.g. "owner/repo" or "org/project/repo" for Azure)
   * @param filePath  Path inside the repo (e.g. ".github/workflows/deploy.yml")
   * @param content   Raw file content (will be base64-encoded)
   * @param branch    Target branch name
   * @param message   Commit message
   */
  async pushFile(
    token: string,
    provider: GitProvider,
    fullName: string,
    filePath: string,
    content: string,
    branch: string,
    message: string,
  ): Promise<PushFileResult> {
    switch (provider) {
      case "github":
        return this.pushToGitHub(token, fullName, filePath, content, branch, message);
      case "gitlab":
        return this.pushToGitLab(token, fullName, filePath, content, branch, message);
      case "azure_devops":
        return this.pushToAzureDevOps(token, fullName, filePath, content, branch, message);
    }
  }

  // ── GitHub ──────────────────────────────────────────────────────────────────

  private async pushToGitHub(
    token: string,
    fullName: string,
    filePath: string,
    content: string,
    branch: string,
    message: string,
  ): Promise<PushFileResult> {
    const base64Content = Buffer.from(content).toString("base64");
    const apiUrl = `https://api.github.com/repos/${fullName}/contents/${filePath}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "pipel8ne",
    };

    // Check if the file already exists to get its SHA (required for updates)
    let existingSha: string | undefined;
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (getRes.ok) {
      const existing = (await getRes.json()) as { sha: string };
      existingSha = existing.sha;
    }

    const body: Record<string, string> = {
      message,
      content: base64Content,
      branch,
    };
    if (existingSha) body["sha"] = existingSha;

    const res = await fetch(apiUrl, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`GitHub API error ${res.status}: ${err.message ?? res.statusText}`);
    }

    const data = (await res.json()) as {
      content: { sha: string; html_url: string };
    };

    return {
      sha: data.content.sha,
      fileUrl: data.content.html_url,
    };
  }

  // ── GitLab ──────────────────────────────────────────────────────────────────

  private async pushToGitLab(
    token: string,
    fullName: string,
    filePath: string,
    content: string,
    branch: string,
    message: string,
  ): Promise<PushFileResult> {
    const base64Content = Buffer.from(content).toString("base64");
    const encodedProject = encodeURIComponent(fullName);
    const encodedPath = encodeURIComponent(filePath);
    const baseUrl = `https://gitlab.com/api/v4/projects/${encodedProject}/repository/files/${encodedPath}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const body = JSON.stringify({
      branch,
      content: base64Content,
      encoding: "base64",
      commit_message: message,
    });

    // Try create first, then update if the file already exists
    let res = await fetch(baseUrl, { method: "POST", headers, body });

    if (res.status === 400) {
      // File already exists — try PUT (update)
      res = await fetch(baseUrl, { method: "PUT", headers, body });
    }

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(`GitLab API error ${res.status}: ${err.message ?? res.statusText}`);
    }

    const data = (await res.json()) as { file_path: string; branch: string };
    const fileUrl = `https://gitlab.com/${fullName}/-/blob/${branch}/${data.file_path}`;

    return {
      sha: branch, // GitLab file create/update doesn't return a blob SHA directly
      fileUrl,
    };
  }

  // ── Azure DevOps ─────────────────────────────────────────────────────────────

  private async pushToAzureDevOps(
    token: string,
    fullName: string,
    filePath: string,
    content: string,
    branch: string,
    message: string,
  ): Promise<PushFileResult> {
    // fullName format for Azure: "org/project/repo"
    const parts = fullName.split("/");
    if (parts.length < 3) {
      throw new Error(`Azure DevOps fullName must be "org/project/repo", got: ${fullName}`);
    }
    const [org, project, ...repoParts] = parts;
    const repoName = repoParts.join("/");

    // Token may be stored as "orgName:pat" — extract just the PAT
    const colonIdx = token.indexOf(":");
    const pat = colonIdx > 0 ? token.slice(colonIdx + 1) : token;
    const b64Token = Buffer.from(`:${pat}`).toString("base64");
    const headers = {
      Authorization: `Basic ${b64Token}`,
      "Content-Type": "application/json",
    };

    // Get the latest commit SHA of the branch to use as oldObjectId
    const refsUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repoName}/refs?filter=heads/${branch}&api-version=7.1`;
    const refsRes = await fetch(refsUrl, { headers });
    if (!refsRes.ok) {
      throw new Error(`Azure DevOps refs API error ${refsRes.status}: ${refsRes.statusText}`);
    }
    const refsData = (await refsRes.json()) as { value: Array<{ objectId: string }> };
    const oldObjectId = refsData.value[0]?.objectId;
    if (!oldObjectId) {
      throw new Error(`Branch "${branch}" not found in Azure DevOps repo "${repoName}"`);
    }

    const base64Content = Buffer.from(content).toString("base64");
    const pushUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repoName}/pushes?api-version=7.1`;

    const pushBody = JSON.stringify({
      refUpdates: [{ name: `refs/heads/${branch}`, oldObjectId }],
      commits: [
        {
          comment: message,
          changes: [
            {
              changeType: "add",
              item: { path: `/${filePath}` },
              newContent: { content: base64Content, contentType: "base64Encoded" },
            },
          ],
        },
      ],
    });

    let pushRes = await fetch(pushUrl, { method: "POST", headers, body: pushBody });

    if (!pushRes.ok) {
      // File may already exist — try edit instead of add
      const editBody = JSON.stringify({
        refUpdates: [{ name: `refs/heads/${branch}`, oldObjectId }],
        commits: [
          {
            comment: message,
            changes: [
              {
                changeType: "edit",
                item: { path: `/${filePath}` },
                newContent: { content: base64Content, contentType: "base64Encoded" },
              },
            ],
          },
        ],
      });
      pushRes = await fetch(pushUrl, { method: "POST", headers, body: editBody });
    }

    if (!pushRes.ok) {
      const err = (await pushRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(`Azure DevOps push API error ${pushRes.status}: ${err.message ?? pushRes.statusText}`);
    }

    const data = (await pushRes.json()) as { pushId: number };
    const fileUrl = `https://dev.azure.com/${org}/${project}/_git/${repoName}?path=/${filePath}&version=GB${branch}`;

    return {
      sha: String(data.pushId),
      fileUrl,
    };
  }
}
