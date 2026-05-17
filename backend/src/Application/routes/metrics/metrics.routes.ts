import { FastifyInstance } from "fastify";
import { collectDefaultMetrics, Registry } from "prom-client";

const registry = new Registry();
collectDefaultMetrics({ register: registry });

export default async function metricsRoutes(app: FastifyInstance) {
  app.get(
    "/metrics",
    {
      logLevel: "silent",
      schema: {
        tags: ["metrics"],
        summary: "Prometheus metrics endpoint",
        response: {
          200: { type: "string" },
        },
      },
    },
    async (_req, reply) => {
      reply.header("Content-Type", registry.contentType);
      return registry.metrics();
    },
  );
}
