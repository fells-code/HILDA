export interface GitHubRepositoryRef {
  owner: string;
  repo: string;
}

export function parseGitHubRepositoryRef(
  cloneUrl: string,
): GitHubRepositoryRef | null {
  const sshMatch = cloneUrl.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);

  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  try {
    const url = new URL(cloneUrl);

    if (url.hostname !== "github.com") {
      return null;
    }

    const parts = url.pathname.replace(/^\/+/, "").split("/");

    if (parts.length < 2) {
      return null;
    }

    return {
      owner: parts[0],
      repo: parts[1].replace(/\.git$/i, ""),
    };
  } catch {
    return null;
  }
}

export async function fetchGitHubOpenIssuesCount(
  repositoryRef: GitHubRepositoryRef,
): Promise<number | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "HILDA",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repositoryRef.owner}/${repositoryRef.repo}`,
      { headers },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      open_issues_count?: number;
    };

    return typeof data.open_issues_count === "number"
      ? data.open_issues_count
      : null;
  } catch {
    return null;
  }
}
