import { GitConnection, GitProvider } from "./GitConnection.js";

export interface IGitConnectionRepository {
  findAllByUserId(userId: string): Promise<GitConnection[]>;
  findById(id: string): Promise<GitConnection | null>;
  findByUserAndProvider(userId: string, provider: GitProvider): Promise<GitConnection | null>;
  create(data: {
    userId: string;
    provider: GitProvider;
    providerUsername: string;
    avatarUrl: string | null;
    encryptedAccessToken: string;
  }): Promise<GitConnection>;
  updateById(
    id: string,
    data: Partial<Pick<GitConnection, "providerUsername" | "avatarUrl" | "encryptedAccessToken">>,
  ): Promise<GitConnection | null>;
  delete(id: string): Promise<void>;
}
