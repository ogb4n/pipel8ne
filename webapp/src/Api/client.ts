import type {
  AuthTokens,
  Project,
  ProjectVisibility,
  Graph,
  Job,
  GraphEdge,
  Viewport,
  Credential,
  ApiKey,
  CreateApiKeyResponse,
  User,
} from "./types";

const BASE = "";

type QueueEntry = { resolve: () => void; reject: (err: Error) => void };

let isRefreshing = false;
let failedQueue: QueueEntry[] = [];

function processQueue(err: Error | null) {
  failedQueue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve()));
  failedQueue = [];
}

function getTokens() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
  };
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

export function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

async function request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const { accessToken } = getTokens();
  const headers: Record<string, string> = {
    ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(init.headers as Record<string, string>),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 401 && !retried) {
    if (isRefreshing) {
      // Queue until ongoing refresh settles, then retry once
      await new Promise<void>((resolve, reject) => failedQueue.push({ resolve, reject }));
      return request<T>(path, init, true);
    }

    isRefreshing = true;
    const { refreshToken } = getTokens();

    if (!refreshToken) {
      isRefreshing = false;
      const err = new Error("Session expirée");
      processQueue(err);
      clearTokens();
      window.location.href = "/login";
      throw err;
    }

    try {
      const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!refreshRes.ok) {
        clearTokens();
        const err = new Error("Session expirée");
        processQueue(err);
        window.location.href = "/login";
        throw err;
      }
      const data = (await refreshRes.json()) as { accessToken: string; refreshToken: string };
      setTokens(data.accessToken, data.refreshToken);
      processQueue(null);
      return request<T>(path, init, true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Session expirée");
      processQueue(err);
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as { message?: string };
  if (!res.ok) throw new Error(body?.message ?? `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  setTokens,
  auth: {
    login: (email: string, password: string) =>
      request<AuthTokens>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, name?: string) =>
      request<AuthTokens>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken: string) =>
      request<{ message: string }>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    registrationStatus: () =>
      request<{ registrationEnabled: boolean }>("/api/auth/registration-status"),
  },
  projects: {
    getAll: () => request<Project[]>("/api/projects"),
    getAllPublic: () => request<Project[]>("/api/projects/public"),
    getMine: () => request<Project[]>("/api/projects/mine"),
    getById: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (data: {
      name: string;
      path: string;
      provider: string;
      visibility?: ProjectVisibility;
    }) => request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (
      id: string,
      data: Partial<{
        name: string;
        path: string;
        provider: string;
        visibility: ProjectVisibility;
      }>,
    ) => request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),
  },
  pipelines: {
    listByProject: (projectId: string) => request<Graph[]>(`/api/projects/${projectId}/pipelines`),
    create: (projectId: string, name: string) =>
      request<Graph>(`/api/projects/${projectId}/pipelines`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    getById: (projectId: string, pipelineId: string) =>
      request<Graph>(`/api/projects/${projectId}/pipelines/${pipelineId}`),
    update: (
      projectId: string,
      pipelineId: string,
      data: { viewport: Viewport; jobs: Job[]; jobEdges: GraphEdge[] },
    ) =>
      request<Graph>(`/api/projects/${projectId}/pipelines/${pipelineId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (projectId: string, pipelineId: string) =>
      request<void>(`/api/projects/${projectId}/pipelines/${pipelineId}`, { method: "DELETE" }),
  },
  credentials: {
    list: () => request<Credential[]>("/api/credentials"),
    create: (data: { provider: string; label: string; value: string }) =>
      request<Credential>("/api/credentials", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { label?: string; value?: string }) =>
      request<Credential>(`/api/credentials/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/credentials/${id}`, { method: "DELETE" }),
  },
  apiKeys: {
    list: () => request<ApiKey[]>("/api/api-keys"),
    create: (name: string) =>
      request<CreateApiKeyResponse>("/api/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    revoke: (id: string) => request<ApiKey>(`/api/api-keys/${id}/revoke`, { method: "POST" }),
    deleteKey: (id: string) => request<void>(`/api/api-keys/${id}`, { method: "DELETE" }),
  },
  users: {
    me: () => request<User>("/api/users/me"),
    list: () => request<User[]>("/api/users"),
    create: (data: { email: string; password: string; name?: string; role?: "admin" | "user" }) =>
      request<User>("/api/users", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: { role: "admin" | "user" }) =>
      request<User>(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/api/users/${id}`, { method: "DELETE" }),
  },
  admin: {
    getSettings: () => request<{ registrationEnabled: boolean }>("/api/admin/settings"),
    updateSettings: (data: { registrationEnabled: boolean }) =>
      request<{ registrationEnabled: boolean }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },
};
