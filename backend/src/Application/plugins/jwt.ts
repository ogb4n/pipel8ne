import fp from "fastify-plugin";
import fastifyJwt, { FastifyJWT } from "@fastify/jwt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email?: string };
    user: { sub: string; email?: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
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
});
