import { Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
export declare class TaskTrace extends Model<InferAttributes<TaskTrace>, InferCreationAttributes<TaskTrace>> {
    id: CreationOptional<string>;
    taskId: string;
    eventType: string;
    eventDataJson: Record<string, unknown>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
