import "dotenv/config";
import Fastify from "fastify";
import { connectDatabase, disconnectDatabase } from "./Infrastructure/database/client";
import swaggerPlugin from "./Application/plugins/swagger";
import staticPlugin from "./Application/plugins/static";
import jwtPlugin from "./Application/plugins/jwt";
import containerPlugin from "./Application/plugins/container";
import registerRoutes from "./Application/routes";

const isDev = process.env.NODE_ENV === "development";

const app = Fastify({
  logger: isDev ? { transport: { target: "pino-pretty", options: { colorize: true } } } : true,
});

const start = async () => {
  try {
    // 1. Connexion MongoDB
    await connectDatabase();
    app.log.info("Base de données connectée");

    // 2. Swagger (dev uniquement — doit être enregistré avant les routes)
    await app.register(swaggerPlugin);

    // 3. JWT plugin (doit être enregistré avant les routes pour que app.authenticate soit disponible)
    await app.register(jwtPlugin);

    // 4. Conteneur DI (services et repositories)
    await app.register(containerPlugin);

    // 5. Routes API
    await registerRoutes(app);

    // 6. Fichiers statiques + SPA fallback (doit être en dernier)
    await app.register(staticPlugin);

    await app.listen({ port: 3000, host: "0.0.0.0" });

    if (isDev) {
      app.log.info("Swagger UI disponible sur http://localhost:3000/docs");
    }
  } catch (err) {
    app.log.error(err);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Déconnexion propre de la BDD à l'arrêt du process
process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});

start();
