# Marcus - Second Brain

**Docs →** [docs/MVP-PROTOTYPE-PLAN.md](./docs/MVP-PROTOTYPE-PLAN.md)

## GitHub auth setup

`marcus-mcp-server` now uses two GitHub integrations with the same callback URL:

- GitHub App for installed-repo access after the user authorizes Marcus.
- Classic OAuth App for `/authorize`, token exchange, and auto-creating the user's private `marcus-second-brain-vault` repo with `repo` scope.

Cloudflare secrets for the worker:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `KV_ENCRYPTION_KEY`

The old `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` secrets should stay in place until the new code is deployed and smoke-tested.
