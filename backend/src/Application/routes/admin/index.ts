import { FastifyInstance } from "fastify";
import { SystemSettingsService } from "../../../Infrastructure/SystemSettingsService.js";

const systemSettingsService = new SystemSettingsService();

const settingsResponseSchema = {
  type: "object",
  properties: {
    registrationEnabled: { type: "boolean" },
  },
} as const;

const patchSettingsBodySchema = {
  type: "object",
  properties: {
    registrationEnabled: { type: "boolean" },
  },
} as const;

/**
 * Routes d'administration — toutes protégées par authenticate + adminGuard.
 */
export default async function adminRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);
  app.addHook("onRequest", app.adminGuard);

  // GET /api/admin/settings
  app.get(
    "/api/admin/settings",
    {
      schema: {
        tags: ["admin"],
        summary: "Récupère les paramètres système",
        security: [{ bearerAuth: [] }],
        response: { 200: settingsResponseSchema },
      },
    },
    async () => systemSettingsService.getSettings(),
  );

  // PATCH /api/admin/settings
  app.patch<{ Body: { registrationEnabled?: boolean } }>(
    "/api/admin/settings",
    {
      schema: {
        tags: ["admin"],
        summary: "Met à jour les paramètres système",
        security: [{ bearerAuth: [] }],
        body: patchSettingsBodySchema,
        response: { 200: settingsResponseSchema },
      },
    },
    async (request) => systemSettingsService.updateSettings(request.body),
  );
}
