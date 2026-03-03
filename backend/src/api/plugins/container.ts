import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { UserRepository } from "../../infrastructure/database/repositories/UserRepository";
import { JwtTokenService } from "../../infrastructure/token/JwtTokenService";
import { UserService } from "../../domain/user/UserService";
import { AuthService } from "../../domain/auth/AuthService";

declare module "fastify" {
  interface FastifyInstance {
    userService: UserService;
    authService: AuthService;
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
  const authService = new AuthService(userRepository, tokenService);

  app.decorate("userService", userService);
  app.decorate("authService", authService);
});
