import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

/**
 * Plugin Swagger — activé uniquement en mode développement.
 * Accessible sur : http://localhost:3000/docs
 */
export default fp(async (app: FastifyInstance) => {
  if (process.env.NODE_ENV !== "development") return;

  await app.register(fastifySwagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Pipel8ne API",
        description: "Documentation de l'API — mode développement",
        version: "1.0.0",
      },
      tags: [
        { name: "health", description: "Santé du serveur" },
        { name: "auth", description: "Authentification (register / login / refresh / logout)" },
        { name: "users", description: "Gestion des utilisateurs (protégé par JWT)" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
});
