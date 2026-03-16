import { SystemSettingsModel } from "./database/models/SystemSettingsModel.js";
import { ISystemSettingsService } from "../Domain/settings/ISystemSettingsService.js";

export type SystemSettings = {
  registrationEnabled: boolean;
};

/**
 * Service pour les paramètres système persistés en base.
 * Utilise un document singleton identifié par key === "global".
 */
export class SystemSettingsService implements ISystemSettingsService {
  /**
   * Récupère les paramètres système.
   * Crée le document singleton avec les valeurs par défaut si absent.
   */
  async getSettings(): Promise<SystemSettings> {
    const doc = await SystemSettingsModel.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: { key: "global", registrationEnabled: true } },
      { upsert: true, new: true },
    );
    return { registrationEnabled: doc!.registrationEnabled };
  }

  /**
   * Met à jour les paramètres système et retourne les valeurs mises à jour.
   */
  async updateSettings(data: { registrationEnabled?: boolean }): Promise<SystemSettings> {
    const doc = await SystemSettingsModel.findOneAndUpdate(
      { key: "global" },
      { $set: data },
      { upsert: true, new: true },
    );
    return { registrationEnabled: doc!.registrationEnabled };
  }
}
