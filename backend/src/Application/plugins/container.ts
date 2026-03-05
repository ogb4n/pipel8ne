import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { UserRepository } from "../../infrastructure/database/repositories/UserRepository";
import { JwtTokenService } from "../../infrastructure/JwtTokenService";
import { UserService } from "../../domain/user/UserService";
import { AuthService } from "../../domain/auth/AuthService";
import { ProjectRepository } from "../../infrastructure/database/repositories/ProjectRepository";
import { GraphRepository } from "../../infrastructure/database/repositories/GraphRepository";
import { ProjectService } from "../../domain/project/ProjectService";
import { GraphService } from "../../domain/graph/GraphService";
import { RefreshTokenRepository } from "../../infrastructure/database/repositories/RefreshTokenRepository";

declare module "fastify" {
  interface FastifyInstance {
    userService: UserService;
    authService: AuthService;
    projectService: ProjectService;
    graphService: GraphService;
  }
}

/**
 * Plugin conteneur — instancie et câble les dépendances.
 * Les routes se contentent de consommer app.userService / app.authService
 * sans jamais connaître l'infrastructure concrète.
 */
export default fp(async function containerPlugin(app: FastifyInstance) {
  const userRepository = new UserRepository();
  const tokenService = new JwtTokenService(app);
  const userService = new UserService(userRepository);
  const refreshTokenRepository = new RefreshTokenRepository();
  const authService = new AuthService(userRepository, tokenService, refreshTokenRepository);

  const projectRepository = new ProjectRepository();
  const graphRepository = new GraphRepository();
  const projectService = new ProjectService(projectRepository);
  const graphService = new GraphService(graphRepository);

  app.decorate("userService", userService);
  app.decorate("authService", authService);
  app.decorate("projectService", projectService);
  app.decorate("graphService", graphService);
});
