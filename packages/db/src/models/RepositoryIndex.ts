import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { getSequelize } from "../sequelize";

export class RepositoryIndex extends Model<
  InferAttributes<RepositoryIndex>,
  InferCreationAttributes<RepositoryIndex>
> {
  declare id: CreationOptional<string>;
  declare repositoryId: string;
  declare commitSha: string | null;
  declare status: "pending" | "queued" | "syncing" | "indexed" | "failed";
  declare summary: string | null;
  declare indexedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

RepositoryIndex.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    repositoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "repository_id",
    },
    commitSha: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "commit_sha",
    },
    status: {
      type: DataTypes.ENUM("pending", "queued", "syncing", "indexed", "failed"),
      allowNull: false,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    indexedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "indexed_at",
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
    tableName: "repository_indexes",
  },
);
