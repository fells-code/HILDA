import { Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
export declare class Task extends Model<InferAttributes<Task>, InferCreationAttributes<Task>> {
    id: CreationOptional<string>;
    workspaceId: string;
    userId: string;
    primaryRepositoryId: string | null;
    taskType: "question" | "plan" | "patch" | "review" | "index";
    status: CreationOptional<"queued" | "running" | "awaiting_approval" | "completed" | "failed">;
    input: Record<string, unknown>;
    output: Record<string, unknown> | null;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
