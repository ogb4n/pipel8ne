import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { UserRepository } from "../../infrastructure/database/repositories/UserRepository";
import { JwtTokenService } from "../../infrastructure/JwtTokenService";
import { UserService } from "../../domain/user/UserService";
import { AuthService } from "../../domain/auth/AuthService";
import { ProjectRepository } from "../../infrastructure/database/repositories/ProjectRepository";
import { GraphRepository } from "../../infrastructure/database/repositories/GraphRepository";
import { AesSecretsService } from "../../infrastructure/SecretsService";
import { ProjectService } from "../../domain/project/ProjectService";
import { GraphService } from "../../domain/graph/GraphService";
import { RefreshTokenRepository } from "../../infrastructure/database/repositories/RefreshTokenRepository";
import { CredentialRepository } from "../../infrastructure/database/repositories/CredentialRepository";
import { CredentialService } from "../../domain/credential/CredentialService";
import { ApiKeyRepository } from "../../infrastructure/database/repositories/ApiKeyRepository";
import { ApiKeyService } from "../../domain/apikey/ApiKeyService";
import { SystemSettingsService } from "../../infrastructure/SystemSettingsService";
import { GitConnectionRepository } from "../../infrastructure/database/repositories/GitConnectionRepository";
import { GitConnectionService } from "../../domain/gitconnection/GitConnectionService";
import { IGitPlatformAdapter } from "../../domain/gitconnection/IGitPlatformAdapter";

declare module "fastify" {
  interface FastifyInstance {
    userService: UserService;
    authService: AuthService;
    projectService: ProjectService;
    graphService: GraphService;
    credentialService: CredentialService;
    apiKeyService: ApiKeyService;
    gitConnectionService: GitConnectionService;
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
  const systemSettingsService = new SystemSettingsService();
  const authService = new AuthService(
    userService,
    tokenService,
    refreshTokenRepository,
    systemSettingsService,
  );

  const projectRepository = new ProjectRepository();
  const secretsService = new AesSecretsService();
  const graphRepository = new GraphRepository(secretsService);
  const projectService = new ProjectService(projectRepository);
  const graphService = new GraphService(graphRepository, projectRepository);
  const credentialRepository = new CredentialRepository();
  const credentialService = new CredentialService(credentialRepository, secretsService);
  const apiKeyRepository = new ApiKeyRepository();
  const apiKeyService = new ApiKeyService(apiKeyRepository);

  // Git platform adapters — conditionally loaded based on env vars
  const gitAdapters: IGitPlatformAdapter[] = [];
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const { GitHubAdapter } = await import("../../infrastructure/git/GitHubAdapter.js");
    gitAdapters.push(new GitHubAdapter());
  }
  if (process.env.GITLAB_CLIENT_ID && process.env.GITLAB_CLIENT_SECRET) {
    const { GitLabAdapter } = await import("../../infrastructure/git/GitLabAdapter.js");
    gitAdapters.push(new GitLabAdapter());
  }
  const gitConnectionRepository = new GitConnectionRepository();
  const gitConnectionService = new GitConnectionService(
    gitConnectionRepository,
    secretsService,
    gitAdapters,
  );

  app.decorate("userService", userService);
  app.decorate("authService", authService);
  app.decorate("projectService", projectService);
  app.decorate("graphService", graphService);
  app.decorate("credentialService", credentialService);
  app.decorate("apiKeyService", apiKeyService);
  app.decorate("gitConnectionService", gitConnectionService);
});
