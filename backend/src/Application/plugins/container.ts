import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { UserRepository } from "../../Infrastructure/database/repositories/UserRepository";
import { JwtTokenService } from "../../Infrastructure/JwtTokenService";
import { UserService } from "../../Domain/user/UserService";
import { AuthService } from "../../Domain/auth/AuthService";
import { ProjectRepository } from "../../Infrastructure/database/repositories/ProjectRepository";
import { GraphRepository } from "../../Infrastructure/database/repositories/GraphRepository";
import { AesSecretsService } from "../../Infrastructure/SecretsService";
import { ProjectService } from "../../Domain/project/ProjectService";
import { GraphService } from "../../Domain/graph/GraphService";
import { RefreshTokenRepository } from "../../Infrastructure/database/repositories/RefreshTokenRepository";

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
  const tokenService = new JwtTokenService(app.jwt);
  const userService = new UserService(userRepository);
  const refreshTokenRepository = new RefreshTokenRepository();
  const authService = new AuthService(userService, tokenService, refreshTokenRepository);

  const projectRepository = new ProjectRepository();
  const secretsService = new AesSecretsService();
  const graphRepository = new GraphRepository(secretsService);
  const projectService = new ProjectService(projectRepository);
  const graphService = new GraphService(graphRepository, projectRepository);

  app.decorate("userService", userService);
  app.decorate("authService", authService);
  app.decorate("projectService", projectService);
  app.decorate("graphService", graphService);
});
