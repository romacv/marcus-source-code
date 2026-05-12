# Marcus — Second Brain

> Your AI memory. Stored in **your** GitHub repo. Read by Claude, ChatGPT, and Perplexity through the [Model Context Protocol](https://modelcontextprotocol.io).

**Hosted at:** [marcus-second-brain.com](https://marcus-second-brain.com)

Marcus is a remote MCP server. You connect it to your AI assistant once, and from then on the assistant can save, search, and recall your notes — but the notes themselves live in a private GitHub repository under **your** account. Marcus never stores your content on our servers.

---

## Why this repository is public

**Marcus is published as open source so anyone can verify what we do with their data.**

If Marcus is going to read and write your private notes, you should be able to confirm — by reading the actual source code — that:

- Your notes are stored only in your own GitHub vault, not on our servers.
- Marcus never copies, sells, mirrors, or analyzes your content.
- The OAuth scopes we request are the minimum required.
- Logs are anonymized; we cannot reconstruct your identity from them.

You don't need to trust us. You can read the code.

## What you can and cannot do with this code — plain English

Marcus is licensed under the **Business Source License 1.1** (BUSL-1.1). See [`LICENSE`](./LICENSE) for the full legal text. Quick summary:

| ✅ Allowed | ❌ Not allowed (until 2030-05-12) |
|---|---|
| Read, audit, learn from the code | Host Marcus as a commercial service to other people |
| Run your own personal copy | Sell hosted Marcus access (paid SaaS) |
| Run a copy for an org of up to 5 users | Resell Marcus as part of another paid product |
| Modify it for your own use | Offer a Marcus-compatible MCP endpoint to third parties for a fee |
| Contribute changes back here | |

**On 2030-05-12, the license automatically converts to Apache 2.0 — fully open source. All commercial restrictions disappear.**

In short: **look, learn, audit, contribute — but don't take Marcus and run it as a paid service to others.** If you want a commercial license before 2030, email `r@resrom.com`.

---

## Using Marcus

You almost certainly want the **hosted version** at [marcus-second-brain.com](https://marcus-second-brain.com). Sign in with GitHub, and you're done in under a minute.

Connector instructions for Claude / ChatGPT / Perplexity: see [`marcus-mcp-server/static/README.md`](./marcus-mcp-server/static/README.md).

## Architecture

| Component | Where |
|---|---|
| MCP server (Cloudflare Worker) | [`marcus-mcp-server/`](./marcus-mcp-server/) |
| OAuth flow + vault provisioning | [`docs/03-mcp-oauth-flow.md`](./docs/03-mcp-oauth-flow.md) |
| Technical architecture | [`docs/02-architecture.md`](./docs/02-architecture.md) |
| Product vision | [`docs/00-vision.md`](./docs/00-vision.md) |

## Self-hosting

Self-hosting Marcus for personal use is allowed under the license. It's not currently a supported workflow — you'll need:

- A Cloudflare account with Workers Paid plan ($5/mo recommended)
- A registered GitHub App + OAuth App with redirect to your domain
- 3 Cloudflare KV namespaces
- Six Wrangler secrets (see [`marcus-mcp-server/wrangler.jsonc`](./marcus-mcp-server/wrangler.jsonc))

A step-by-step guide is in [`docs/MVP-PROTOTYPE-PLAN.md`](./docs/MVP-PROTOTYPE-PLAN.md). PRs improving this story are welcome.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). TL;DR: small, focused PRs; tests must stay green; sign your commits if you can.

## Security

Found a vulnerability? Don't open a public issue. See [`SECURITY.md`](./SECURITY.md).

## License

[Business Source License 1.1](./LICENSE) · © 2026 Roman Resenchuk · Converts to Apache 2.0 on 2030-05-12
