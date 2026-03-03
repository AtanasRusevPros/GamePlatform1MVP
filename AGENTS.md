# AGENTS.md

Project-local instructions for Codex and similar coding agents.

## Purpose
- Use this repository as a safe demo workspace for Codex configuration.
- Prefer small, reviewable changes.
- Explain tradeoffs briefly before larger edits.

## Working Style
- Read existing files before editing them.
- Prefer `rg` for search and `rg --files` for file discovery.
- Use `apply_patch` for manual file edits when possible.
- Keep code and config ASCII unless the file already uses Unicode.

## Project Boundary
- Only operate on files inside `/home/luke/git/CodexTestApp` unless the user explicitly approves otherwise.
- Keep all commands directly related to this project only.
- Do not read, write, mount, inspect, modify, or delete files, directories, containers, volumes, sockets, or services outside this repository unless the user explicitly approves otherwise.
- Use `/home/luke/git/CodexTestApp` as the working directory for project commands unless a different path is explicitly approved.

## Allowed Commands
- `pwd`
- `ls`
- `find`
- `rg`
- `cat`
- `sed`
- `git status`
- `git diff`
- `git log --oneline -n 10`
- `npm test`
- `npm run lint`
- `npm run build`
- `npm run typecheck`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:web`
- `npm run test:e2e`
- `npm run test:full`
- `npm install`
- `npm run db:migrate`
- `npm run db:rollback`
- `npm run db:seed`
- `npm run db:reset`
- `npm run *` for scripts defined by this repository
- local project setup scripts inside this repository
- `podman` for local services defined by this repository only
- `podman-compose` for local services defined by this repository only
- `psql` for the local project database only

## Ask Before Running
- `pnpm install`
- `yarn install`
- `docker *`
- `kubectl *`
- `gh *`
- `git push`
- `git commit`
- browser launch commands
- any command that accesses files, directories, services, containers, volumes, sockets, or databases outside `/home/luke/git/CodexTestApp`
- any command that targets non-local or non-project infrastructure

## Never Run Without Explicit Request
- `git reset --hard`
- `git checkout -- .`
- `rm -rf`
- destructive database commands
- destructive Podman commands outside the local project stack
- secret-reading commands against local keychains or credential stores

## Editing Rules
- Do not overwrite user changes you did not make.
- Do not reformat unrelated files.
- Add comments only when they clarify non-obvious logic.
- Keep filenames and structure predictable.

## Testing
- Run the smallest relevant test command first.
- If no tests exist, say so clearly.
- If a command cannot be run, explain why and what is missing.

## Response Format
- Be concise.
- Reference files with exact paths when useful.
- Summarize what changed and any remaining risk.
