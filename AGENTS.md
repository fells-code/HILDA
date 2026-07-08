# AGENTS.md

This file is for coding agents working in the `HILDA` repository.

## Purpose

HILDA is a human-in-the-loop engineering agent for real repositories. It helps
developers understand codebases, generate evidence-backed plans, draft bounded
patches, and run safe validation with full trace visibility. The v0.1.0 goal is
a self-hostable MVP: authenticate with Seamless Auth, connect a repository,
index code and docs, answer repository-aware questions with evidence, generate
plans, draft patches behind approval, and show traces, tool calls, and memory.

The human-in-the-loop and approval boundaries are core product invariants:
changes must not let the agent take unbounded or unapproved actions.

## Working Standards (fells-code baseline)

These rules apply to every repository in the fells-code org. Repo-specific
guidance may extend them but must not contradict them.

### Attribution

- Commit and open PRs solely under the repository owner's identity. Never
  commit under an agent or assistant identity.
- Never attribute work to an AI assistant: no `Co-Authored-By: Claude` (or any
  assistant) trailers, no "Generated with" / "Created with Claude" notes, and no
  assistant branding or emoji anywhere in commit messages, PR or issue titles
  and descriptions, changesets, code comments, or docs.

### Comments

- Comment only when the code genuinely needs explaining: a non-obvious reason, a
  gotcha, or an invariant. Never narrate what the code plainly does.

### TODOs

- Every `TODO`/`FIXME` must reference a ticket, e.g. `// TODO(#123): ...`.
  Do not leave a bare TODO. If no ticket exists, create one first.

### Commits & branches

- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`).
- Descriptive branch names (`feat/...`, `fix/...`); never a `claude/` or other
  tool-generated prefix.

### Public-facing text

- No em dashes in commit messages, code comments, PR or issue text, changesets,
  or docs. Use a comma, parentheses, or a separate sentence.

### Before declaring work done

- All code quality checks must pass before you open a PR or call the work done:
  tests, linting, type checks, and formatting. Run them and report the real
  output; do not open a PR while any check is failing.
- Typical commands: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
  (all run through Turbo). Never claim a change works without running them.
- Match the surrounding code's style, naming, and comment density.

## Runtime Model

- pnpm workspace (`pnpm-workspace.yaml`) orchestrated by Turbo (`turbo.json`);
  TypeScript throughout.
- `docker-compose.yml` provides local supporting services.
- Auth is provided through Seamless Auth (`packages/auth`).

## Architecture Map

```text
apps/
  api/         backend API
  web/         web UI
  worker/      background/agent worker
packages/
  agents/         agent orchestration
  retrieval/      code/doc indexing and retrieval
  tools/          tool implementations the agent can call
  memory/         agent memory
  observability/  traces, tool-call/approval visibility
  auth/           Seamless Auth integration
  db/             data layer
  ui/             shared UI
  shared/         shared types and helpers
```

## Tooling

| Task      | Command          |
| --------- | ---------------- |
| Install   | `pnpm install`   |
| Dev       | `pnpm dev`       |
| Build     | `pnpm build`     |
| Typecheck | `pnpm typecheck` |
| Lint      | `pnpm lint`      |
| Test      | `pnpm test`      |
| Format    | `pnpm format`    |

- Node version is pinned by `.nvmrc` (Node 24). Run `nvm use` and
  `corepack enable` locally to match; pnpm is set via `packageManager`.
- All task commands fan out across the workspace through Turbo.

## Safe Change Workflow

1. Run `nvm use`, `corepack enable`, and `pnpm install`.
2. Keep approval and human-in-the-loop boundaries intact: the agent must not
   take unbounded or unapproved actions.
3. Keep app code in `apps/*` and reusable logic in `packages/*`.
4. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before
   opening a PR.
