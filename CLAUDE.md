# Project rules

These rules apply to this repository only and override the owner's global "no merging" rule here.

- Work directly on `main` is allowed: commit and push to `main` without a feature branch.
- Merging pull requests into `main` is allowed.
- A push to `main` deploys to production (`.github/workflows/ci.yml`). Before every push to `main`, run in `marcus-mcp-server/`: `npm run type-check` and `npm test`. Push only when both pass.
