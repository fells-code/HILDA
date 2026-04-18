export interface RepositoryOverviewMetric {
    label: string;
    value: string;
}
export interface RepositoryOverviewSection {
    title: string;
    items: string[];
}
export interface RepositoryOverviewEvidence {
    label: string;
    value: string;
}
export interface RepositoryOverview {
    title: string;
    answer: string;
    metrics: RepositoryOverviewMetric[];
    sections: RepositoryOverviewSection[];
    evidence: RepositoryOverviewEvidence[];
}
export declare function generateRepositoryOverview(repoPath: string): Promise<RepositoryOverview>;
export declare function formatRepositoryOverviewSummary(overview: RepositoryOverview): string;
