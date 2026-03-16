import { ApiKey } from "./ApiKey.js";

export interface IApiKeyRepository {
  create(data: { userId: string; name: string; keyHash: string; prefix: string }): Promise<ApiKey>;
  findAllByUserId(userId: string): Promise<ApiKey[]>;
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;
  revoke(id: string, userId: string): Promise<ApiKey | null>;
  delete(id: string, userId: string): Promise<boolean>;
  updateLastUsed(id: string): Promise<void>;
}
