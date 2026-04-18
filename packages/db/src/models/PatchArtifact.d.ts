import { Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
export declare class PatchArtifact extends Model<InferAttributes<PatchArtifact>, InferCreationAttributes<PatchArtifact>> {
    id: CreationOptional<string>;
    taskId: string;
    repositoryId: string;
    artifactType: "patch" | "validation_report";
    title: string;
    content: string;
    metadataJson: Record<string, unknown>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
