import { Sequelize } from "sequelize";
export declare function getDatabaseUrl(): string;
export declare function getSequelize(): Sequelize;
export declare function connectDatabase(): Promise<void>;
