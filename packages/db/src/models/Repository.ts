import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
} from "sequelize";
import { getSequelize } from "../sequelize";

export class Repository extends Model<
  InferAttributes<Repository>,
  InferCreationAttributes<Repository>
> {
  declare id: CreationOptional<string>;
  declare workspaceId: string;
  declare provider: "github" | "local";
  declare externalId: string | null;
  declare name: string;
  declare defaultBranch: string;
  declare cloneUrl: string | null;
  declare localPath: string | null;
  declare status: CreationOptional<
    "pending" | "queued" | "syncing" | "indexed" | "failed"
  >;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Repository.init(
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
    provider: {
      type: DataTypes.ENUM("github", "local"),
      allowNull: false,
    },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "external_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    defaultBranch: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "default_branch",
    },
    cloneUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "clone_url",
    },
    localPath: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "local_path",
    },
    status: {
      type: DataTypes.ENUM("pending", "queued", "syncing", "indexed", "failed"),
      allowNull: false,
      defaultValue: "pending",
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
    tableName: "repositories",
  },
);
