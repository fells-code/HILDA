import { z } from "zod";

export const createRepositorySchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.literal("github"),
  name: z.string().trim().min(1).max(255),
  defaultBranch: z.string().trim().min(1).max(255).default("main"),
  cloneUrl: z.string().trim().url().nullable().optional(),
  externalId: z.string().trim().max(255).nullable().optional(),
});
