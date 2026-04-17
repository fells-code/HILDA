import { Repository } from "./Repository";
import { RepositoryIndex } from "./RepositoryIndex";
import { User } from "./User";
import { Workspace } from "./Workspace";
import { WorkspaceMember } from "./WorkspaceMember";

let initialized = false;

export function initModels(): void {
  if (initialized) {
    return;
  }

  Workspace.belongsTo(User, {
    foreignKey: "ownerId",
    as: "owner",
  });

  User.hasMany(Workspace, {
    foreignKey: "ownerId",
    as: "ownedWorkspaces",
  });

  Workspace.hasMany(WorkspaceMember, {
    foreignKey: "workspaceId",
    as: "members",
  });

  WorkspaceMember.belongsTo(Workspace, {
    foreignKey: "workspaceId",
    as: "workspace",
  });

  WorkspaceMember.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  Workspace.hasMany(Repository, {
    foreignKey: "workspaceId",
    as: "repositories",
  });

  Repository.belongsTo(Workspace, {
    foreignKey: "workspaceId",
    as: "workspace",
  });

  Repository.hasMany(RepositoryIndex, {
    foreignKey: "repositoryId",
    as: "indexes",
  });

  RepositoryIndex.belongsTo(Repository, {
    foreignKey: "repositoryId",
    as: "repository",
  });

  initialized = true;
}
