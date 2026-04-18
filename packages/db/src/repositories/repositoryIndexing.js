import { Repository } from "../models/Repository";
import { RepositoryIndex } from "../models/RepositoryIndex";
export async function findNextQueuedRepository() {
    return Repository.findOne({
        where: { status: "queued" },
        order: [["createdAt", "ASC"]],
    });
}
export async function markRepositorySyncing(repositoryId) {
    await Repository.update({ status: "syncing" }, { where: { id: repositoryId } });
    await RepositoryIndex.create({
        repositoryId,
        commitSha: null,
        status: "syncing",
        summary: null,
        indexedAt: null,
    });
}
export async function markRepositoryIndexed(repositoryId, summary, commitSha) {
    await Repository.update({ status: "indexed" }, { where: { id: repositoryId } });
    const latestIndex = await RepositoryIndex.findOne({
        where: { repositoryId },
        order: [["createdAt", "DESC"]],
    });
    if (latestIndex) {
        await latestIndex.update({
            status: "indexed",
            summary,
            commitSha,
            indexedAt: new Date(),
        });
    }
}
export async function markRepositoryFailed(repositoryId, summary) {
    await Repository.update({ status: "failed" }, { where: { id: repositoryId } });
    const latestIndex = await RepositoryIndex.findOne({
        where: { repositoryId },
        order: [["createdAt", "DESC"]],
    });
    if (latestIndex) {
        await latestIndex.update({
            status: "failed",
            summary,
            indexedAt: new Date(),
        });
    }
    else {
        await RepositoryIndex.create({
            repositoryId,
            commitSha: null,
            status: "failed",
            summary,
            indexedAt: new Date(),
        });
    }
}
