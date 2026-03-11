export interface ISystemSettingsService {
  getSettings(): Promise<{ registrationEnabled: boolean }>;
}
