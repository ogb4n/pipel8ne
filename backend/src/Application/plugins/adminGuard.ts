import fp from "fastify-plugin";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    adminGuard: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Plugin adminGuard — décorateur Fastify qui vérifie que l'utilisateur connecté
 * possède le rôle "admin". Doit être utilisé après app.authenticate.
 */
export default fp(async function adminGuardPlugin(app: FastifyInstance) {
  app.decorate("adminGuard", async function (request: FastifyRequest, reply: FastifyReply) {
    if (request.user?.role !== "admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }
  });
});
