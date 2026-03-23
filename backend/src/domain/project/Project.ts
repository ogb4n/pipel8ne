export type ProjectVisibility = "private" | "public";

/** Optional link to a Git repository selected during project creation. */
export interface ProjectGitRepository {
  cloneUrl: string;
  fullName: string;
  defaultBranch: string;
  provider: string; // github | gitlab | azure_devops
}

export interface Project {
  id: string;
  name: string;
  path: string;
  provider: string;
  visibility: ProjectVisibility;
  ownerId: string; // references User.id
  lastModified: Date; // maps to Mongoose updatedAt
  gitRepository?: ProjectGitRepository;
}
