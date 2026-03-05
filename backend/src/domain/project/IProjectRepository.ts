import { Project, ProjectVisibility } from "./Project.js";

export interface IProjectRepository {
  findAll(): Promise<Project[]>;
  findAllPublic(): Promise<Project[]>;
  findByOwner(ownerId: string): Promise<Project[]>;
  findById(id: string): Promise<Project | null>;
  create(data: {
    name: string;
    path: string;
    provider: string;
    visibility: ProjectVisibility;
    ownerId: string;
  }): Promise<Project>;
  updateById(
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "provider" | "visibility">>,
  ): Promise<Project | null>;
  delete(id: string): Promise<void>;
}
