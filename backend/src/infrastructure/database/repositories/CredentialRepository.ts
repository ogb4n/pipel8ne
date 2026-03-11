import { Credential } from "../../../Domain/credential/Credential.js";
import { ICredentialRepository } from "../../../Domain/credential/ICredentialRepository.js";
import { CredentialModel } from "../models/CredentialModel.js";

export class CredentialRepository implements ICredentialRepository {
  /** Mappe un document Mongoose vers l'entité domaine Credential. */
  private toCredential(doc: InstanceType<typeof CredentialModel>): Credential {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      provider: doc.provider,
      label: doc.label,
      encryptedValue: doc.encryptedValue,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async findAllByUserId(userId: string): Promise<Credential[]> {
    const docs = await CredentialModel.find({ userId });
    return docs.map((doc) => this.toCredential(doc));
  }

  async findById(id: string): Promise<Credential | null> {
    const doc = await CredentialModel.findById(id);
    return doc ? this.toCredential(doc) : null;
  }

  async create(data: {
    userId: string;
    provider: string;
    label: string;
    encryptedValue: string;
  }): Promise<Credential> {
    const doc = await CredentialModel.create(data);
    return this.toCredential(doc);
  }

  async updateById(
    id: string,
    data: Partial<Pick<Credential, "label" | "encryptedValue">>,
  ): Promise<Credential | null> {
    const doc = await CredentialModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? this.toCredential(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await CredentialModel.findByIdAndDelete(id);
  }
}
