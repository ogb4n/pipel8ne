import { ProjectModel } from "../models/ProjectModel";
import { Project, ProjectVisibility } from "../../../Domain/project/Project";
import { IProjectRepository } from "../../../Domain/project/IProjectRepository";

/**
 * Implémentation Mongoose du port IProjectRepository.
 * Toute la plomberie MongoDB est confinée ici — le Domain n'y touche pas.
 */
export class ProjectRepository implements IProjectRepository {
  private toProject(doc: InstanceType<typeof ProjectModel>): Project {
    return {
      id: doc._id.toString(),
      name: doc.name,
      path: doc.path,
      provider: doc.provider,
      visibility: doc.visibility as ProjectVisibility,
      ownerId: doc.ownerId,
      lastModified: doc.updatedAt,
    };
  }

  async findAll(): Promise<Project[]> {
    const docs = await ProjectModel.find();
    return docs.map((doc) => this.toProject(doc));
  }

  async findAllPublic(): Promise<Project[]> {
    const docs = await ProjectModel.find({ visibility: "public" });
    return docs.map((doc) => this.toProject(doc));
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    const docs = await ProjectModel.find({ ownerId });
    return docs.map((doc) => this.toProject(doc));
  }

  async findById(id: string): Promise<Project | null> {
    const doc = await ProjectModel.findById(id);
    return doc ? this.toProject(doc) : null;
  }

  async create(data: {
    name: string;
    path: string;
    provider: string;
    visibility: ProjectVisibility;
    ownerId: string;
  }): Promise<Project> {
    const doc = await ProjectModel.create(data);
    return this.toProject(doc);
  }

  async updateById(
    id: string,
    data: Partial<Pick<Project, "name" | "path" | "provider" | "visibility">>,
  ): Promise<Project | null> {
    const doc = await ProjectModel.findByIdAndUpdate(id, data, { new: true });
    return doc ? this.toProject(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await ProjectModel.findByIdAndDelete(id);
  }
}
