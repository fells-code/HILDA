import { Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
export declare class ApprovalRequest extends Model<InferAttributes<ApprovalRequest>, InferCreationAttributes<ApprovalRequest>> {
    id: CreationOptional<string>;
    taskId: string;
    approvalType: "plan" | "patch" | "validation";
    summary: string;
    payloadJson: Record<string, unknown>;
    status: CreationOptional<"pending" | "approved" | "rejected">;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
