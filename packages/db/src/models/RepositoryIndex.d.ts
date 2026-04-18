import { Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
export declare class RepositoryIndex extends Model<InferAttributes<RepositoryIndex>, InferCreationAttributes<RepositoryIndex>> {
    id: CreationOptional<string>;
    repositoryId: string;
    commitSha: string | null;
    status: "pending" | "queued" | "syncing" | "indexed" | "failed";
    summary: string | null;
    indexedAt: Date | null;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
