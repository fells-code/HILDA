import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class PatchArtifact extends Model {
}
PatchArtifact.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    taskId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "task_id",
    },
    repositoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "repository_id",
    },
    artifactType: {
        type: DataTypes.ENUM("patch", "validation_report"),
        allowNull: false,
        field: "artifact_type",
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    metadataJson: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
        field: "metadata_json",
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
    tableName: "patch_artifacts",
});
