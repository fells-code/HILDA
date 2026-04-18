import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class WorkspaceMember extends Model {
}
WorkspaceMember.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    workspaceId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "workspace_id",
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "user_id",
    },
    role: {
        type: DataTypes.ENUM("owner", "member"),
        allowNull: false,
        defaultValue: "member",
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
    tableName: "workspace_members",
});
