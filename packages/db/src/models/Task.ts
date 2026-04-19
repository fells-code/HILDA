import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { getSequelize } from "../sequelize";

export class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
  declare id: CreationOptional<string>;
  declare workspaceId: string;
  declare userId: string;
  declare primaryRepositoryId: string | null;
  declare taskType: "question" | "plan" | "patch" | "review" | "index";
  declare status: CreationOptional<
    "queued" | "running" | "awaiting_approval" | "completed" | "failed"
  >;
  declare input: Record<string, unknown>;
  declare output: Record<string, unknown> | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Task.init(
  {
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
      type: DataTypes.ENUM(
        "queued",
        "running",
        "awaiting_approval",
        "completed",
        "failed",
      ),
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
  },
  {
    sequelize: getSequelize(),
    tableName: "tasks",
  },
);
