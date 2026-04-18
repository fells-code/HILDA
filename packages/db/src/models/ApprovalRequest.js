import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class ApprovalRequest extends Model {
}
ApprovalRequest.init({
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
    approvalType: {
        type: DataTypes.ENUM("plan", "patch", "validation"),
        allowNull: false,
        field: "approval_type",
    },
    summary: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    payloadJson: {
        type: DataTypes.JSONB,
        allowNull: false,
        field: "payload_json",
    },
    status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
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
    tableName: "approval_requests",
});
