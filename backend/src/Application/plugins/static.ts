import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import path from "path";

/**
 * Plugin fichiers statiques — sert le build Vite du frontend.
 * SPA fallback : toute route inconnue renvoie index.html
 */
export default fp(async (app: FastifyInstance) => {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, "../../../../webapp/dist"),
    prefix: "/",
  });

  app.setNotFoundHandler(async (_request, reply) => {
    return reply.sendFile("index.html");
  });
});
