import crypto from "crypto";
import { ISecretsService } from "../Domain/graph/ISecretsService.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Implémentation AES-256-GCM du port ISecretsService.
 * La clé est lue depuis l'environnement au démarrage (fail-fast).
 */
export class AesSecretsService implements ISecretsService {
  private readonly key: Buffer;

  constructor() {
    const hex = process.env.SECRETS_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
      throw new Error("SECRETS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
    }
    this.key = Buffer.from(hex, "hex");
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}
