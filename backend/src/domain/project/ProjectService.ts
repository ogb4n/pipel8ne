import { IProjectRepository } from "./IProjectRepository.js";
import { Project, ProjectVisibility } from "./Project.js";
import { NotFoundError, ForbiddenError } from "../errors.js";

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

  async update(
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "provider" | "visibility">>,
    requesterId: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    const updated = await this.projectRepository.updateById(id, data);
    if (!updated) throw new NotFoundError("Project not found");
    return updated;
  }

  async delete(id: string, requesterId: string): Promise<void> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project not found");
    if (project.ownerId !== requesterId) throw new ForbiddenError("Forbidden");
    await this.projectRepository.delete(id);
  }
}
