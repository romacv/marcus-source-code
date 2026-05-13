# Marcus Second Brain — Publish Checklist

Distribution channels for the MCP server / app. Work top-to-bottom; each section is independent.

---

## 0. Prerequisites (do once, reused everywhere)

- [ ] Stable public name + slug: `marcus-second-brain`
- [ ] One-line description (≤120 chars)
- [ ] Long description / README with: what it does, install, config, example prompts, privacy
- [ ] Logo / icon: 512×512 PNG (transparent), 1024×1024 master, square + rounded variants
- [ ] Screenshots: 3–6 PNG, 1280×800 or 1920×1080, real product UI (no placeholders)
- [ ] Demo video (optional but boosts approval): 30–60s, 1080p, no audio narration required
- [ ] Public website / landing page URL
- [ ] Privacy policy URL (required by every store)
- [ ] Terms of service URL
- [ ] Support email + support URL
- [ ] OAuth / auth flow documented (if applicable)
- [ ] Versioned release: tagged GitHub release, semver, CHANGELOG.md
- [ ] License chosen (MIT/Apache-2.0 recommended for distribution)
- [ ] Test account credentials for reviewers (where applicable)

---

## 1. GitHub Marketplace

URL: https://github.com/marketplace/<your-app-slug>/edit (account-specific; visible only to the listing owner)

GitHub Marketplace requires the listing to be a **GitHub App** or **GitHub Action**. Confirm which one applies.

- [ ] Repo is public
- [ ] App is owned by an org (recommended) or verified user
- [ ] Listing fields:
  - [ ] Name, tagline, description (Markdown)
  - [ ] Logo (200×200+, transparent PNG)
  - [ ] Feature card (1280×640) — banner shown on listing
  - [ ] Categories (max 2) + primary category
  - [ ] Pricing plan (Free, Flat, Per-unit, Free-trial)
  - [ ] Screenshots (≥1, recommended 4)
  - [ ] YouTube intro video (optional)
- [ ] Webhooks reachable over HTTPS with valid TLS
- [ ] App must be installed on ≥100 accounts before paid plans (GitHub policy — verify current threshold)
- [ ] Submit for verification → GitHub Marketplace review (typically 5–10 business days)
- [ ] Review feedback addressed; resubmit if needed
- [ ] After approval: announce, monitor installs, respond to issues

Docs: https://docs.github.com/en/apps/publishing-apps-to-github-marketplace

---

## 2. OpenAI Apps SDK (ChatGPT apps)

Console: https://platform.openai.com/apps-manage
Submission docs: https://developers.openai.com/apps-sdk/deploy/submission
Current draft: visible only to the OpenAI account that owns the app; access via https://platform.openai.com/apps-manage

- [ ] App Info section
  - [ ] Name, tagline, full description
  - [ ] Categories
  - [ ] Logo (1024×1024 PNG)
  - [ ] Screenshots (3–6, 16:9)
  - [ ] Demo video URL
- [ ] Endpoint
  - [ ] Production MCP endpoint (HTTPS) reachable from OpenAI
  - [ ] Auth: OAuth 2.0 (PKCE) or API key flow configured
  - [ ] Tool manifest validated (names, schemas, descriptions)
  - [ ] Latency budget under OpenAI limits (typically <30s per tool call)
- [ ] Compliance
  - [ ] Privacy policy URL
  - [ ] Data handling statement (what data leaves the user, retention, sharing)
  - [ ] Age gating / content rating
  - [ ] No prohibited categories (see OpenAI usage policies)
- [ ] Test instructions for reviewers (account, sample prompts, expected outputs)
- [ ] Submit for review (queue: typically 1–3 weeks)
- [ ] Address review feedback
- [ ] Post-approval: enable for ChatGPT users, monitor logs, version bumps go through review

See `docs/SUBMISSION-OPENAI.md` for the paste-ready submission guide.

Docs: https://developers.openai.com/apps-sdk/deploy/submission

---

## 3. Anthropic Connector Directory

Anthropic's MCP Connector Directory for claude.ai integrations.

Form: https://clau.de/mcp-directory-submission

- [ ] MCP server reachable at `https://marcus-second-brain.com/mcp` (Streamable HTTP)
- [ ] OAuth endpoints verified: authorize, token, register
- [ ] All 14 tools documented with names and descriptions
- [ ] Icon at 512×512 PNG and screenshots (5, 1280-wide) uploaded to public URLs
- [ ] Demo video recorded and URL ready
- [ ] Privacy policy and Terms of Service URLs live
- [ ] Public help-center article or blog post live before go-live date (Anthropic requirement)
- [ ] Submit via the form above
- [ ] Address review feedback
- [ ] Post-approval: monitor connector usage, keep OAuth endpoints healthy

See `docs/SUBMISSION-ANTHROPIC.md` for the paste-ready submission guide.

---

## 4. MCP-specific registries (high leverage, low effort)

Marcus is an MCP server — list it everywhere MCP clients discover servers.

- [ ] **Official MCP servers list** — PR to https://github.com/modelcontextprotocol/servers (community-maintained directory)
- [ ] **Smithery** — https://smithery.ai — add server, link GitHub, configure auth
- [ ] **mcp.so** — https://mcp.so — community MCP registry
- [ ] **PulseMCP** — https://www.pulsemcp.com — server directory + popularity tracking
- [ ] **Glama MCP** — https://glama.ai/mcp/servers — directory + scoring
- [ ] **Cline / Cursor / Windsurf marketplaces** — submit via each IDE's MCP catalog flow (Cursor: https://cursor.directory; Cline: PR to extension repo)
- [ ] **Awesome-MCP lists** — PR to https://github.com/punkpeye/awesome-mcp-servers and similar curated lists

---

## 5. Distribution channels (binaries / packages)

- [ ] **npm** — publish `marcus-second-brain` package with `bin` entry for `npx marcus-second-brain`
  - [ ] `npm login`, `npm publish --access public`
  - [ ] README with install + config snippet for Claude Desktop / Cursor
- [ ] **Docker Hub / GHCR** — multi-arch image (linux/amd64, linux/arm64)
- [ ] **Homebrew tap** (optional) — formula in your tap repo
- [ ] **Cloudflare Workers** — already used (`marcus-mcp-server/.wrangler`); confirm production deployment + custom domain + Wrangler `wrangler deploy` in CI

---

## 6. Discoverability / launch

- [ ] **Product Hunt** launch (Tuesday–Thursday; queue assets in advance)
- [ ] **Hacker News** Show HN post (technical framing, link to repo)
- [ ] **r/ClaudeAI**, **r/ChatGPTPro**, **r/LocalLLaMA**, **r/mcp** posts
- [ ] **X / Twitter** thread with demo video
- [ ] **LinkedIn** post for professional reach
- [ ] **YouTube** demo (3–5 min walkthrough)
- [ ] **dev.to / Medium** technical write-up
- [ ] Submit to **AI tool directories**: theresanaiforthat.com, futurepedia.io, aitools.fyi
- [ ] Add **Open Graph** + **Twitter Card** meta to landing page

---

## 7. Operational readiness (do before any public submission)

- [ ] Error monitoring (Sentry / Cloudflare Workers analytics)
- [ ] Usage metrics (server-side, privacy-respecting)
- [ ] Rate limiting on public endpoints
- [ ] Status page or `/health` endpoint
- [ ] Secrets in Wrangler / GitHub Secrets — never in repo
- [ ] CI: lint, test, deploy on tag
- [ ] Backup / restore plan for any persisted state
- [ ] Incident response contact

---

## Submission status tracker

| Channel | Draft | Submitted | Approved | Live | Notes |
|---|---|---|---|---|---|
| GitHub Marketplace | ☐ | ☐ | ☐ | ☐ | edit URL on file |
| OpenAI Apps SDK | ☑ | ☑ | ☐ | ☐ | submitted 2026-05-13; see SUBMISSION-OPENAI.md |
| Anthropic Connector Directory | ☑ | ☑ | ☐ | ☐ | submitted 2026-05-13; awaiting review |
| MCP servers list (PR) | ☐ | ☐ | n/a | ☐ | |
| Smithery | ☐ | ☐ | ☐ | ☐ | |
| mcp.so | ☐ | ☐ | ☐ | ☐ | |
| PulseMCP | ☐ | ☐ | ☐ | ☐ | |
| Glama | ☐ | ☐ | ☐ | ☐ | |
| Cursor directory | ☐ | ☐ | ☐ | ☐ | |
| npm | ☐ | n/a | n/a | ☐ | |
| Docker Hub / GHCR | ☐ | n/a | n/a | ☐ | |
| Product Hunt | ☐ | ☐ | n/a | ☐ | |
