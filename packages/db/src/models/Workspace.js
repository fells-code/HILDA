import { DataTypes, Model, } from "sequelize";
import { getSequelize } from "../sequelize";
export class Workspace extends Model {
}
Workspace.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "owner_id",
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
    tableName: "workspaces",
});
