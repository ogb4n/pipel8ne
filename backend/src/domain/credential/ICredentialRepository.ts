import { Credential } from "./Credential.js";

export interface ICredentialRepository {
  findAllByUserId(userId: string): Promise<Credential[]>;
  findById(id: string): Promise<Credential | null>;
  create(data: {
    userId: string;
    provider: string;
    label: string;
    encryptedValue: string;
  }): Promise<Credential>;
  updateById(
    id: string,
    data: Partial<Pick<Credential, "label" | "encryptedValue">>,
  ): Promise<Credential | null>;
  delete(id: string): Promise<void>;
}
