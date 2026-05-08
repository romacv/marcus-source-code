# 07. Roadmap и зафиксированные решения

## Решения зафиксированы

### Продукт

- [x] Целевой юзер - **массовый рынок** (не developers и не power users)
- [x] Privacy model - **end-to-end, contentless server**
- [x] Storage - **GitHub приватный репо юзера** в MVP
- [x] Storage v2 - iCloud Drive / Google Drive как **описания файлов** (не embed)
- [x] CRUD - **полный** с управлением структурой
- [x] Stack - **TypeScript на Cloudflare Workers** (не Swift)
- [x] Hosting - **Cloudflare Workers Paid $5/mo**, escape hatch на Hetzner CAX11
- [x] Server posture - **contentless** (контент юзера не хранится, minimum credentials encrypted в Workers KV)
- [x] GTM - **сарафан + социальные сети** без paid ads

### Brand и legal

- [x] Название - **Marcus** (filed как stylized или compound)
- [x] Title/tagline - **"Marcus - Second Brain"**
- [x] Trademark scope - Classes 9 + 42, US first
- [x] Никогда не использовать "Building a Second Brain" anywhere
- [x] Никогда не делать "Second Brain" legal product name

### Pricing

- [x] Free $0: 50 MCP calls/day, 100 notes max, BYOK only
- [x] Pro $10/mo ($96/year): 1000 calls/day, unlimited notes, hybrid AI
- [x] Pro Plus $15/mo ($144/year): 5000 calls/day, voice, multi-device
- [x] Founders Lifetime $99 one-time
- [x] Family $15/mo для 5 seats

### Feature scope

- [x] AutoJournal - **после MVP**, в v2 (iOS app)
- [x] AutoJournal trigger - **по запросу юзера**, не по расписанию
- [x] AutoJournal fallback - **локальное push уведомление** вечером
- [x] Что коммитится - **только текстовые описания**
- [x] Photos / GPS - остаются в iCloud, репо хранит asset IDs

## Roadmap

### P0 — Admin (эта неделя)

Детали и acceptance criteria → [MVP-PROTOTYPE-PLAN.md](./MVP-PROTOTYPE-PLAN.md) (фаза P0).

### Q3 2026: MVP

**Deliverable:** работающий remote MCP коннектор для Claude / ChatGPT / Perplexity

Components:
- Cloudflare Workers + Hono + `@modelcontextprotocol/sdk` v2
- `@cloudflare/workers-oauth-provider` для OAuth 2.1 issuer
- GitHub App с Contents read+write на single repo
- 9 MCP tools (create_note, update_note, delete_note, search_notes, get_note, list_structure, append_to_daily_note, link_notes, get_recent_notes)
- Vault template repo с initial structure (00-daily, 10-journal, 20-topics, 30-people, 40-projects, 50-resources, 60-photos, 90-archive)
- Landing page marcus.app с onboarding flow
- Privacy policy и Terms готовы для submission

**Submission в Anthropic Connectors Directory и ChatGPT Apps Directory** в конце Q3 - после стабилизации в production 2-3 недели на early users.

**Pricing tiers live в Stripe** с дня MVP launch.

### Q4 2026: post-launch hardening

- Анализ usage patterns, MCP call distribution
- Knowledge graph derivation engine (vector + graph + keyword hybrid)
- Backup и export tools
- Public dashboard статуса (uptime, calls/sec, latency)
- Open-source release фронтенда onboarding

### Q4 2026 - Q1 2027: iOS app v2

**Killer feature: AutoJournal**

Components:
- SwiftUI app с GitHub OAuth + Sign in with Apple parallel
- PhotoKit + Vision framework для on-device photo recognition
- Apple Foundation Models (iOS 26+) для on-device summarization
- CoreLocation, EventKit, Speech (все opt-in с per-feature consent)
- 3 новых MCP tools: generate_daily_draft, get_daily_draft, confirm_daily_draft
- Lockscreen widget "Today's draft"
- Siri integration "Эй Сири, собери мой день"
- Apple 5.1.2(i) compliance: per-AI-provider consent, privacy nutrition label
- StoreKit 2 для subscriptions (или external Stripe link для US после Epic-ruling)

### Q2 2027 onwards

- Android app (Kotlin / KMP) - только после iOS validation
- Voice-first capture
- Calendar deep integration (auto-tag events с people / topics)
- Optional knowledge graph visualization (web)
- Plugin SDK для community-built MCP tools

## Open questions для founder

Ranked by downstream consequence:

1. **BYOK vs proxy vs hybrid финал** - решено hybrid, нужно подтвердить unit economics на 1000 users projected
2. **Single-vendor "Claude memory" vs multi-vendor pitch** - решено multi-vendor, lead Claude в маркетинге
3. **Как агрессивно скрывать GitHub** - решено hide by default + Geek Mode
4. **Knowledge organization** - hybrid retrieval, выбор между Neo4j managed service vs JSON-derived в репо отложен до v1.1
5. **PWA-only vs native iOS** - native iOS первый (founder background), PWA параллельно
6. **Bootstrap vs raise** - открыто, recommendation bootstrap или small seed <$1.5M
7. **Free-tier shape** - решено MCP call cap 50/day
8. **Open-source posture** - решено OSS server + sync engine, closed knowledge-graph compute

## GTM план (organic)

**Tier 1 launch channels:**

- r/ClaudeAI (Claude paid subs удвоились в 2026)
- r/ObsidianMD (privacy/local-first/markdown ethos, 280-320k members)
- r/LocalLLaMA (694k members, ценят MCP-as-open-standard и BYOK)
- Hacker News Show HN (5-6M monthly, audience любит privacy angle)
- r/ChatGPT (10M+ members)

**Tier 2:**

- r/selfhosted (BYOK и self-host story)
- r/PKMS
- X/Twitter PKM creators (@fortelabs, @nickmilo, @kepano, @AndyMatuschak, @maggieappleton, @simonw, @swyx, @karpathy, @levelsio)
- YouTube creators (Keep Productive, Nicole van der Hoeven, Nick Milo)
- Product Hunt week 4-6 с 1000+ pre-built waitlist
- Indie Hackers transparent metrics posts

**Tier 3:**

- TikTok / YouTube Shorts notion-tok и productivity-tok
- Bluesky privacy/open-protocol crowd
- Discord servers (Anthropic, Obsidian ~150k, Tana, MCP community)

**Content angles ranked:**

1. "Why I store my second brain in a private GitHub repo (and why you should too)" - Show HN flagship
2. "Stop renting your memory" - manifesto
3. "Claude with memory - that you own - here's how MCP makes it possible in 2026"
4. "Mem.ai vs Reflect vs Marcus: which AI second brain owns your data?" - high-intent vs SEO
5. "How to give Claude long-term memory without giving Anthropic your data"
6. "What happens to your Mem.ai/Heyday data when the startup dies?" - leverages Heyday shutdown
7. "GitHub as a personal database" - HN bait
8. "Why I deleted Notion AI: the case against renting your second brain"
9. "BYOK or BYOB? Use Claude/ChatGPT/Perplexity with one shared memory"
10. "The MCP standard explained for non-developers"

**Referral mechanics (privacy-aligned):**

- Cosmetic-only referral codes (Marcus tracks только что код XYZ123 used, не кто)
- Give-a-month-get-a-month
- Public-good donation matching: 10% of paid subscriptions to EFF / Internet Archive / Signal
- Open-source fork/star count как visible marketing метрика
- Public starter-prompt и MOC template gallery (только структуру, без data sharing)
- Anonymous testimonial badges с hash-verified streaks

## Anthropic Connectors Directory submission

**Когда:** Конец Q3 2026, после 2-3 недель production стабильности

**Что нужно:**
- Privacy policy - HTTPS URL с описанием data handling
- OAuth 2.0 mandatory (не client credentials)
- Tool hints `readOnlyHint` или `destructiveHint` на каждом tool
- Logo, favicon, screenshots
- Test account для reviewer
- Documentation setup и usage

**Expected timeline:** 1-6 недель review

**Expected impact:** 5-15% signups через directory, остальное - direct marketing к платным Claude / ChatGPT / Perplexity юзерам через "Add custom connector"

## Risk register active

| Risk | Severity | Mitigation status |
|---|---|---|
| GitHub UX hurdle | High | Hide by default + Geek Mode toggle (designed) |
| Anthropic platform risk | Medium | Multi-vendor + GitHub-as-storage means data survives shutdown |
| Apple 5.1.2(i) compliance | High | Per-provider consent в design (v2 iOS) |
| GitHub API rate limits | Low | GitHub App per-installation limits, batch via createCommitOnBranch |
| Auto-organization | Medium | Hybrid retrieval, deferred to v1.1 |
| Trademark Marcus | Medium | Stylized/compound filing, attorney engaged |
| Domain costs | Low | Secondary domains lockable now |
