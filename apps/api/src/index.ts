import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import { getAuthConfig } from "@hilda/auth";
import type { HealthResponse } from "@hilda/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

async function start() {
  const { connectDatabase, initModels } = await import("@hilda/db");
  const { devAuth } = await import("./middleware/devAuth");
  const workspacesRouter = (await import("./routes/workspaces")).default;
  const repositoriesRouter = (await import("./routes/repositories")).default;
  const repositoryIndexesRouter = (await import("./routes/repositoryIndexes")).default;
  const questionsRouter = (await import("./routes/questions")).default;
  const tasksRouter = (await import("./routes/tasks")).default;
  const plansRouter = (await import("./routes/plans")).default;
  const patchesRouter = (await import("./routes/patches")).default;
  const validationsRouter = (await import("./routes/validations")).default;
  const askRouter = (await import("./routes/ask")).default;

  initModels();
  await connectDatabase();

  const app = express();
  const port = Number(process.env.API_PORT || 4000);

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const response: HealthResponse = {
      ok: true,
      service: "api",
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  });

  app.get("/config-check", (_req, res) => {
    const auth = getAuthConfig();

    res.json({
      ok: true,
      dbConfigured: true,
      authConfigured: Boolean(auth.apiUrl && auth.appOrigin),
    });
  });

  app.use("/api", devAuth);
  app.use("/api/workspaces", workspacesRouter);
  app.use("/api", repositoriesRouter);
  app.use("/api", repositoryIndexesRouter);
  app.use("/api", questionsRouter);
  app.use("/api", tasksRouter);
  app.use("/api", plansRouter);
  app.use("/api", patchesRouter);
  app.use("/api", validationsRouter);
  app.use("/api", askRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(error);

      res.status(500).json({
        ok: false,
        error: "Internal server error",
      });
    },
  );

  app.listen(port, () => {
    console.log(`@hilda/api listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("@hilda/api failed to start");
  console.error(error);
  process.exit(1);
});
