import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class TaskTrace extends Model {
}
TaskTrace.init({
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
    eventType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "event_type",
    },
    eventDataJson: {
        type: DataTypes.JSONB,
        allowNull: false,
        field: "event_data_json",
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
    tableName: "task_traces",
});
