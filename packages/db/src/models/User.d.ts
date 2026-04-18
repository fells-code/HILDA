import { Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
export declare class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
    id: CreationOptional<string>;
    email: string;
    name: string | null;
    roles: CreationOptional<string[]>;
    createdAt: CreationOptional<Date>;
    updatedAt: CreationOptional<Date>;
}
