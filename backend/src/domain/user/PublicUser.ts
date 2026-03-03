import { User } from "./User";

/**
 * Représentation publique d'un utilisateur — sans passwordHash.
 * C'est ce type qui traverse la couche HTTP.
 * La sécurité est garantie par le domain, pas par la sérialisation JSON.
 */
export type PublicUser = Omit<User, "passwordHash">;
