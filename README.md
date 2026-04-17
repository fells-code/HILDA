# HILDA

HILDA is a human-in-the-loop engineering agent for real repositories. It helps developers understand codebases, generate evidence-backed plans, draft bounded patches, and run safe validation with full trace visibility.

## v0.1.0 Goal

Ship a self-hostable MVP that can:

- authenticate with Seamless Auth
- create workspaces
- connect one repository
- index code and docs
- answer repository-aware questions with evidence
- generate change plans
- draft safe patches behind approval
- run bounded validation
- show traces, tool calls, approvals, and memory

## Monorepo Layout

- `apps/web`: React frontend
- `apps/api`: application API
- `apps/worker`: async jobs for indexing, retrieval prep, and validation
- `packages/*`: shared domain packages

## Local Setup

1. Copy `.env.example` to `.env`
2. Start dependencies with Docker Compose
3. Install dependencies with pnpm
4. Run the workspace in dev mode

## Status

Initial scaffold in progress.
