import { IProjectRepository } from "./IProjectRepository.js";
import { Project, ProjectVisibility } from "./Project.js";

export class ProjectService {
  constructor(private readonly projectRepository: IProjectRepository) {}

  getAll(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  getAllPublic(): Promise<Project[]> {
    return this.projectRepository.findAllPublic();
  }

  getByOwner(ownerId: string): Promise<Project[]> {
    return this.projectRepository.findByOwner(ownerId);
  }

  getById(id: string): Promise<Project | null> {
    return this.projectRepository.findById(id);
  }

  create(data: {
    name: string;
    path: string;
    provider: string;
    visibility: ProjectVisibility;
    ownerId: string;
  }): Promise<Project> {
    return this.projectRepository.create(data);
  }

  update(
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "provider" | "visibility">>,
  ): Promise<Project | null> {
    return this.projectRepository.updateById(id, data);
  }

  delete(id: string): Promise<void> {
    return this.projectRepository.delete(id);
  }
}
