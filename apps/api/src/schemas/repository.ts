import path from "node:path";
import { z } from "zod";

export const createRepositorySchema = z
  .object({
    workspaceId: z.string().uuid(),
    provider: z.enum(["github", "local"]),
    name: z.string().trim().min(1).max(255),
    defaultBranch: z.string().trim().min(1).max(255).default("main"),
    cloneUrl: z.string().trim().min(1).nullable().optional(),
    localPath: z.string().trim().min(1).nullable().optional(),
    externalId: z.string().trim().max(255).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.provider === "github") {
      if (!value.cloneUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cloneUrl"],
          message: "cloneUrl is required for GitHub repositories",
        });
        return;
      }

      const parsed = z.string().url().safeParse(value.cloneUrl);

      if (!parsed.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["cloneUrl"],
          message: "cloneUrl must be a valid URL for GitHub repositories",
        });
      }
    }

    if (value.provider === "local") {
      if (!value.localPath) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["localPath"],
          message: "localPath is required for local repositories",
        });
        return;
      }

      if (!path.isAbsolute(value.localPath)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["localPath"],
          message: "localPath must be an absolute filesystem path",
        });
      }
    }
  });
