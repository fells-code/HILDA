import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
export declare class Repository extends Model<InferAttributes<Repository>, InferCreationAttributes<Repository>> {
    id: CreationOptional<string>;
    workspaceId: string;
    provider: "github";
    externalId: string | null;
    name: string;
    defaultBranch: string;
    cloneUrl: string | null;
    status: CreationOptional<"pending" | "queued" | "syncing" | "indexed" | "failed">;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
