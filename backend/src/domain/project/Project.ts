export type ProjectVisibility = "private" | "public";

export interface Project {
  id: string;
  name: string;
  path: string;
  provider: string;
  visibility: ProjectVisibility;
  ownerId: string; // references User.id
  lastModified: Date; // maps to Mongoose updatedAt
}
