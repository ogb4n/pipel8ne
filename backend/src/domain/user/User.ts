/**
 * Entité domaine User — interface pure, sans couplage à un ORM.
 * L'identifiant est un string (ObjectId MongoDB sérialisé).
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}
