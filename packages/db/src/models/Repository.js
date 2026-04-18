import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class Repository extends Model {
}
Repository.init({
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
        type: DataTypes.ENUM("github"),
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
}, {
    sequelize: getSequelize(),
    tableName: "repositories",
});
