import { Sequelize } from "sequelize";
let sequelizeInstance = null;
export function getDatabaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL is required");
    }
    return url;
}
export function getSequelize() {
    if (!sequelizeInstance) {
        sequelizeInstance = new Sequelize(getDatabaseUrl(), {
            dialect: "postgres",
            logging: false,
        });
    }
    return sequelizeInstance;
}
export async function connectDatabase() {
    await getSequelize().authenticate();
}
