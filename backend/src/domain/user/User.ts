/**
 * Entité domaine User — interface pure, sans couplage à un ORM.
 * L'identifiant est un string (ObjectId MongoDB sérialisé).
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}
