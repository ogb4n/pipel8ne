import fp from "fastify-plugin";
import fastifyJwt, { FastifyJWT } from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email?: string; role?: "admin" | "user" };
    user: { sub: string; email?: string; role?: "admin" | "user" };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateWithApiKey: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async function jwtPlugin(app: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");

  await app.register(fastifyJwt, { secret });

  app.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ message: "Non autorisé" });
    }
  });

  app.decorate(
    "authenticateWithApiKey",
    async function (request: FastifyRequest, reply: FastifyReply) {
      // First try JWT
      try {
        await request.jwtVerify();
        return;
      } catch (_jwtErr) {
        // JWT failed — fall through to API key check
      }

      // Try X-API-Key header
      const rawKey = request.headers["x-api-key"];
      if (typeof rawKey === "string" && rawKey.length > 0) {
        const apiKey = await app.apiKeyService.authenticateByRawKey(rawKey);
        if (apiKey) {
          request.user = { sub: apiKey.userId };
          return;
        }
      }

      reply.status(401).send({ message: "Non autorisé" });
    },
  );
});
