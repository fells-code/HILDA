export type RepositoryForm = {
  provider: "github" | "local";
  name: string;
  defaultBranch: string;
  cloneUrl: string;
  localPath: string;
};
