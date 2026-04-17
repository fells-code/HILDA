import { Sequelize } from "sequelize";

let sequelizeInstance: Sequelize | null = null;

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  return url;
}

export function getSequelize(): Sequelize {
  if (!sequelizeInstance) {
    sequelizeInstance = new Sequelize(getDatabaseUrl(), {
      dialect: "postgres",
      logging: false,
    });
  }

  return sequelizeInstance;
}

export async function connectDatabase(): Promise<void> {
  await getSequelize().authenticate();
}
