import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
export declare class Workspace extends Model<InferAttributes<Workspace>, InferCreationAttributes<Workspace>> {
    id: CreationOptional<string>;
    name: string;
    ownerId: string;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
