# Contributing to Marcus

Thanks for your interest. Marcus is a small, focused project; contributions are welcome.

## Before you start

- Open or comment on an issue before writing significant code. We want to make sure your effort is on the same page as where Marcus is heading.
- Read [`docs/02-architecture.md`](./docs/02-architecture.md) for the high-level design and [`docs/07-roadmap-and-decisions.md`](./docs/07-roadmap-and-decisions.md) for what's in or out of scope.
- Note the license: contributions are accepted under the same terms as the project ([BUSL-1.1](./LICENSE)). By submitting a pull request, you agree your contribution is licensed under those terms.

## Development

```bash
cd marcus-mcp-server
npm install
npm run type-check     # must pass before pushing
npm test               # must pass before pushing
npm run dev            # local dev (uses wrangler dev)
```

## Pull request checklist

- [ ] One PR = one logical change. Split large changes.
- [ ] `npm run type-check` is green.
- [ ] `npm test` is green; new behavior is covered by a test where reasonable.
- [ ] No new dependencies without discussion (Cloudflare Workers cold-start budget is tight).
- [ ] No secrets, tokens, personal paths, or user identifiers in code or tests.
- [ ] Commit messages follow conventional-commit style: `type(scope): subject` (e.g. `fix(oauth): retry once on 502`).

## Code style

- TypeScript strict mode. Treat the type-checker as a teammate.
- Prefer small modules over large ones.
- No drive-by reformatting. If you must reformat a region you're touching, mention it in the PR description.

## What we won't merge (without strong justification)

- Features that require storing user content on Marcus's server. The contentless server posture is a hard constraint.
- Direct dependencies on a specific AI provider (Claude/ChatGPT/Perplexity) — Marcus stays vendor-neutral.
- Telemetry that can identify a user.
- Background tasks on the free tier that materially increase Workers cost.

## Questions

Open a [Discussion](https://github.com/romacv/marcus-source-code/discussions) before opening an issue if it's a question rather than a bug.
