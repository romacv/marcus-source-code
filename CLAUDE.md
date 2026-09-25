# Project rules

These rules apply to this repository only and override the owner's global "no merging" rule here.

- Work directly on `main` is allowed: commit and push to `main` without a feature branch.
- Merging pull requests into `main` is allowed.
- A push to `main` deploys to production (`.github/workflows/ci.yml`). Before every push to `main`, run in `marcus-mcp-server/`: `npm run type-check` and `npm test`. Push only when both pass.

# Third-party credentials

- Never store, cache, persist or log a user's credentials for another service (API tokens, bot tokens, passwords, cookies) anywhere under the owner's Cloudflare account: KV, D1, R2, Durable Objects, Secrets Store, logs. Encryption does not make it acceptable.
- Allowed patterns only, in this order: the service's own connector with the user's OAuth; a GitHub Actions secret in the user's own vault repository, used by a workflow there, never by the worker. The token must never enter the worker. Details: `docs/third-party-credentials.md`.
- Owner-level secrets in `wrangler secret` (GitHub App, OAuth client, `KV_ENCRYPTION_KEY`) are the only exception.
