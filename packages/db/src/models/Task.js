import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class Task extends Model {
}
Task.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    workspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "workspace_id",
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
    },
    primaryRepositoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: "primary_repository_id",
    },
    taskType: {
        type: DataTypes.ENUM("question", "plan", "patch", "review", "index"),
        allowNull: false,
        field: "task_type",
    },
    status: {
        type: DataTypes.ENUM("queued", "running", "awaiting_approval", "completed", "failed"),
        allowNull: false,
        defaultValue: "queued",
    },
    input: {
        type: DataTypes.JSONB,
        allowNull: false,
    },
    output: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
    },
}, {
    sequelize: getSequelize(),
    tableName: "tasks",
});
