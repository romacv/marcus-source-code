# 02. Техническая архитектура MVP

## Hosting

**Cloudflare Workers Paid plan, $5/mo.** Stack:
- Hono adapter
- `@modelcontextprotocol/sdk` v2
- `@cloudflare/workers-oauth-provider`

Escape hatch на Hetzner CAX11 (€3.79/mo, 2 vCPU / 4 GB / 20 TB egress) с тем же Hono контейнером за Caddy - в репо с дня один.

### Почему Workers выиграли

1. Free egress в GitHub - каждый Markus tool call это "validate token + 1-3 GitHub API hits", egress доминирует bill
2. SSE без duration limit на Workers responses (100s figure online это Cloudflare CDN limit, не Workers)
3. CPU bumped до 5 минут в марте 2025
4. First-mover support в Claude / ChatGPT / Perplexity remote-MCP клиентах
5. `createMcpHandler` + Workers OAuth Provider реализуют MCP OAuth 2.1 issuer side, шифруют upstream GitHub token в Workers KV, **выдают audience-bound bearer Claude чтобы GitHub token никогда не достигал Claude или ChatGPT**

Cost ceiling 1000 active users × ~50 tool calls/day = ~1.5M req/mo ≈ **$5/mo total**.

### Почему другие отвергнуты

- **Vercel**: streamable HTTP function-duration risk под нагрузкой
- **AWS API Gateway**: 30-second hard cap ломает SSE
- **Deno Deploy**: per-request CPU ceiling (50ms free / 200ms paid) слишком тесно для compounding GitHub Trees calls на cold caches
- **Hetzner first**: меняет $4/month savings на SSL renewal, OS patching (январь 2026 Coolify CVE batch с тремя CVSS 10.0), DDoS handling, single-region latency

## GitHub access pattern

**GitHub App, не классический OAuth App.**

Преимущества GitHub App:
- 5000-12500 req/h **per installation** vs 5000/h shared
- Automatic GPG-signed "verified" commits
- Fine-grained Contents read+write на single repo only
- Short-lived expiring installation tokens

Onboarding два экрана: OAuth + install на новый репо.

## Vault provisioning

Шаги при первом sign-in:

1. Юзер OAuth токен создает private repo через `POST /repos/{template_owner}/{template_repo}/generate` с `private: true` против Markus-owned template repository
2. GitHub App автоматически устанавливается на новый репо
3. С этого момента все writes идут через installation tokens

Для multi-file commits (daily-note appends touching note + index + backlinks) использовать GraphQL **`createCommitOnBranch`** mutation в одном вызове вместо 4-5 Git Database round-trips или N separate Contents PUTs.

## Summarization

**Происходит в чат-клиенте юзера, не на Markus сервере.** Это та архитектурная решение которое делает privacy story честной.

Flow:
1. Юзер говорит "сохрани это в second brain"
2. Claude / ChatGPT решает что persist и зовет `markus.create_note(path, content, frontmatter)` с markdown который host AI уже саммаризировал, redacted и frontmatter-tagged
3. Markus валидирует JSON Schema и коммитит в GitHub без интерпретации, summarization, embedding или indexing контента

Два следствия:

**Markus content-blind by construction** - юзер может публично проаудить.

**On-device LLM становится fully supported path** - privacy-extreme юзер может wire Apple Foundation Models на iOS 26+ к тому же Markus MCP серверу, и pipeline становится device -> Markus -> user GitHub без cloud LLM.

## MCP tool surface (9 tools, Zod schemas)

| Tool | Назначение |
|---|---|
| `create_note` | Создать новую заметку с path, content, frontmatter |
| `update_note` | Update с replace/append/prepend modes и `expected_sha` для optimistic concurrency |
| `delete_note` | Soft archive vs hard delete |
| `search_notes` | GitHub code-search + Trees pass для frontmatter filters |
| `get_note` | Получить заметку по path |
| `list_structure` | Получить структуру vault (folders, индекс) |
| `append_to_daily_note` | Добавить запись в today's daily note |
| `link_notes` | Создать связь, со stub-creation если target не существует (`frontmatter.stub: true`) |
| `get_recent_notes` | Получить N последних заметок |

Deferred для v1.1:
- `init_vault` - first-time setup
- `propose_summary` - использует MCP sampling чтобы клиент model писал summary
- `export_vault` - ZIP полного дампа

## Vault file structure

Гибрид PARA + Johnny Decimal + Zettelkasten + Obsidian:

```
markus-vault/
├── 00-daily/              # Daily notes по датам
│   └── 2026/04/2026-04-26.md
├── 10-journal/            # Журналинг записи
├── 20-topics/             # Topic notes
├── 30-people/             # People notes (Maша, Pavel...)
├── 40-projects/           # Active projects
├── 50-resources/          # Reference materials
├── 60-photos/             # Photo descriptions (не сами фото)
├── 90-archive/            # Archived
├── _markus/
│   ├── schema.json        # Schema для будущих миграций
│   └── version.txt
└── index.md               # Map of content
```

Stable conventions:
- Numeric prefixes для sortable folders
- `index.md` map of content
- `_markus/` для forward-migration metadata
- Content-addressed photo storage by SHA
- Wikilinks стандартный Obsidian `[[Title]]` syntax - vault portable в любой markdown reader

## YAML frontmatter

```yaml
---
id: 01HQXYZ...                  # Stable ULID
created: 2026-04-26T14:32:00Z   # ISO 8601 UTC
updated: 2026-04-26T15:45:00Z
tags:
  - travel
  - bali
source: chat                     # chat | photo | voice | calendar | manual
summary: "Встреча с Машей в кафе на пляже Чангу" # ≤280 chars
links:
  - "[[Maша]]"
  - "[[Кафе на Чангу]]"
people:
  - "[[Маша]]"
status: published                # draft | published | archived
schema_version: 1                # Forward migration marker
---
```

## Privacy proof (operational, не aspirational)

Сервер **contentless** (не stateless). Контент заметок никогда не пересекает Markus сервер persistent. Но minimum credentials хранятся encrypted в Workers KV для функционирования OAuth и rate limits.

### Что хранится в Workers KV (encrypted, per-user envelope key + master key в Workers Secrets, rotated quarterly)

- Markus user_id -> GitHub installation_id mapping
- Markus bearer токены (выданные Claude/ChatGPT/Perplexity)
- Rate limit counters (TTL 24h)
- Audit log хеши (sha256 + daily pepper, TTL 30d)

### Что НЕ хранится

- Контент заметок
- Список заметок
- Embeddings / search index
- GitHub long-lived токены (только installation_id, токены generated on-demand на 1h)
- Юзер API keys для Claude/OpenAI/Perplexity (BYOK encrypted client-side)

### Логи содержат только

```json
{
  "ts": "...",
  "request_id": "...",
  "user_hash": "sha256(mcp_user_id || daily_pepper)",
  "tool": "create_note",
  "status": 200,
  "latency_ms": 145,
  "github_status": 201,
  "error_class": null
}
```

**Никогда не логируется:** path, content, frontmatter, repo names, IPs, tokens.

GitHub tokens decrypt в request-scoped variables и dropped в end of `fetch()`.

**Сервер MIT-licensed и open source с дня один.** `/version` endpoint exposes deployed git SHA. SBOM и SLSA L2 provenance attestation в CI. Public `PRIVACY.md`.

Reproducible-builds claims честные:
- Pinned Bun/Node, committed lockfile, Docker images с `--source-date-epoch` дают "git SHA + lockfile equivalence"
- Byte-verify Cloudflare Worker isolate невозможно
- Сказать это явно более credible чем pretend

## Knowledge graph (за пределами MVP, но architecture-aware)

Hybrid retrieval - 2026 industry consensus:
- Atomic notes как markdown + YAML в GitHub
- Graph и embeddings derived на Markus серверах
- Recompute on demand
- Vector + graph + keyword

Open sub-question: где graph store живет
- Neo4j или Memgraph как Markus-side service - лучше recall но менее portable
- JSON file derived в user repo - portable но slower

Решить когда дойдем до v1.1.

## Roadmap

**Q3 2026: MVP web/desktop**
- Cloudflare Workers MCP сервер
- 9 MCP tools
- Claude / ChatGPT / Perplexity custom connectors
- GitHub OAuth + App
- Submission в Anthropic Connectors Directory

**Q4 2026 - Q1 2027: iOS app**
- PhotoKit + Vision framework integration
- Apple Foundation Models on-device summarization
- AutoJournal feature по запросу юзера
- Sign in with Apple parallel option
- Apple 5.1.2(i) compliance с per-provider consent

**2027: Android**
- Только после iOS validation consumer demand curve

PWA-as-fallback на каждом stage.
