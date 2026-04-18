import { ApprovalRequest } from "./ApprovalRequest";
import { PatchArtifact } from "./PatchArtifact";
import { Repository } from "./Repository";
import { RepositoryIndex } from "./RepositoryIndex";
import { Task } from "./Task";
import { TaskTrace } from "./TaskTrace";
import { User } from "./User";
import { Workspace } from "./Workspace";
import { WorkspaceMember } from "./WorkspaceMember";
let initialized = false;
export function initModels() {
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
    Workspace.hasMany(Task, {
        foreignKey: "workspaceId",
        as: "tasks",
    });
    Task.belongsTo(Workspace, {
        foreignKey: "workspaceId",
        as: "workspace",
    });
    User.hasMany(Task, {
        foreignKey: "userId",
        as: "tasks",
    });
    Task.belongsTo(User, {
        foreignKey: "userId",
        as: "user",
    });
    Repository.hasMany(Task, {
        foreignKey: "primaryRepositoryId",
        as: "tasks",
    });
    Task.belongsTo(Repository, {
        foreignKey: "primaryRepositoryId",
        as: "primaryRepository",
    });
    Task.hasMany(TaskTrace, {
        foreignKey: "taskId",
        as: "traces",
    });
    TaskTrace.belongsTo(Task, {
        foreignKey: "taskId",
        as: "task",
    });
    Task.hasMany(ApprovalRequest, {
        foreignKey: "taskId",
        as: "approvals",
    });
    ApprovalRequest.belongsTo(Task, {
        foreignKey: "taskId",
        as: "task",
    });
    Task.hasMany(PatchArtifact, {
        foreignKey: "taskId",
        as: "artifacts",
    });
    PatchArtifact.belongsTo(Task, {
        foreignKey: "taskId",
        as: "task",
    });
    Repository.hasMany(PatchArtifact, {
        foreignKey: "repositoryId",
        as: "artifacts",
    });
    PatchArtifact.belongsTo(Repository, {
        foreignKey: "repositoryId",
        as: "repository",
    });
    initialized = true;
}
