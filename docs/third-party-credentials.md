# Third-party credentials

Marcus runs on the owner's Cloudflare account. Whatever the worker stores, the owner is
responsible for. So the worker never holds other people's credentials for other services.

## Rule

The worker does not store, cache, persist or log a user's credential for any third-party
service: API tokens (Apify, OpenAI), bot tokens (Telegram), passwords, session cookies.
This covers KV, D1, R2, Durable Objects, Secrets Store, Analytics Engine and logs.
Encrypting it does not change the rule, because the ciphertext and the key sit on the same
account.

Allowed exceptions: owner-level secrets set with `wrangler secret put` (GitHub App keys,
OAuth client secret, `KV_ENCRYPTION_KEY`) and short-lived GitHub tokens that Marcus itself
needs to write to the user's vault.

## How a feature gets a user's credential

Use the first option that works.

1. **The service's own connector.** The user connects the official MCP connector of the
   service (for example `https://mcp.apify.com`) with their own OAuth in their AI client.
   The client calls that connector and passes only the result (a URL, a text) to Marcus.
   Marcus never sees the token.
2. **Secret in the user's own GitHub repository.** The user adds the token as a GitHub
   Actions secret in their own vault repository (Settings > Secrets and variables > Actions).
   GitHub secrets are write-only: nobody, Marcus included, can read the value back through the
   API. Marcus only triggers a workflow in that repository (`workflow_dispatch`); the job runs
   on GitHub with the secret and commits the result into the vault. The token never reaches
   the worker. Needs the GitHub App permission `actions: write` and a workflow file in the
   vault. Not implemented yet; this is the pattern for services without their own connector
   (for example a Telegram bot token).
3. **Nothing on our side.** If neither works, the feature is not built as a hosted feature.
   A self-hosted deployment where the user is the owner of the Cloudflare account can set its
   own secrets.

Not allowed: settings pages that save a token, "one-time links" that end with a stored
token, tokens in request headers or tool arguments that the worker reads, tokens in plain
files in the user's vault.

## Checklist for a new integration (Telegram, Apify, ...)

- [ ] Which of options 1 or 2 is used, and why not 1.
- [ ] `grep -rn "kv.put\|\.put(" src` shows no key with a credential.
- [ ] The credential does not appear in `console.*`, error messages, tool output, audit logs.
- [ ] The token never enters the worker at all (options 1 or 2).
- [ ] The privacy page (`src/utils.ts`) still says Marcus stores no third-party credentials.

## History

- 2026-09-25: stored Apify tokens (`scraper_token:*`) removed, `connect_reel_scraper` and
  `/settings/reels` retired.
