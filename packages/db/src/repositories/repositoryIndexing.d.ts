import { Repository } from "../models/Repository";
export declare function findNextQueuedRepository(): Promise<Repository | null>;
export declare function markRepositorySyncing(repositoryId: string): Promise<void>;
export declare function markRepositoryIndexed(repositoryId: string, summary: string, commitSha: string | null): Promise<void>;
export declare function markRepositoryFailed(repositoryId: string, summary: string): Promise<void>;
