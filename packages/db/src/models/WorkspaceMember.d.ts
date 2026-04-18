import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
export declare class WorkspaceMember extends Model<InferAttributes<WorkspaceMember>, InferCreationAttributes<WorkspaceMember>> {
    id: CreationOptional<string>;
    workspaceId: string;
    userId: string;
    role: CreationOptional<"owner" | "member">;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
