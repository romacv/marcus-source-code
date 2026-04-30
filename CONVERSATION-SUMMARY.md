# Marcus project - саммари переписки для нового чата

> Контекст для продолжения работы над проектом Marcus в новом чате с Claude.

## Кто я

Senior iOS Software Developer, 14+ лет опыта (Swift, SwiftUI, UIKit, Apple frameworks). Сейчас работаю в Paste (pasteapp.io). Базируюсь в Ubud, Bali. Запускаю side project Marcus.

Использую TypeScript на Cloudflare Workers для backend (не Swift). Знаком с MCP протоколом, Anthropic Connectors Directory, GitHub API.

## Что такое Marcus

**Marcus - Auto Second Brain**

Приватная AI-powered база знаний жизни. Юзер записывает все (заметки, дневник, фото-саммари), хранится в его собственном приватном GitHub репозитории как связанные .md файлы.

**Killer feature:** remote MCP коннектор для Claude / ChatGPT / Perplexity. Юзер общается с AI как обычно, чат автоматически саммаризируется в репо, на любой вопрос ассистент находит контекст из прошлого через MCP search.

## Зафиксированные решения (не пересматриваем)

### Продукт
- Целевой юзер - **массовый рынок** (не developers, не power users)
- Privacy - **end-to-end** (chat -> connector -> user GitHub)
- Storage MVP - **GitHub приватный репо юзера**
- Storage v2 - iCloud Drive / Google Drive как **описания файлов** (markdown описывает контент, не embed файлы)
- CRUD - **полный** с управлением структурой

### Stack
- Backend - **TypeScript на Cloudflare Workers** (категорически не Swift)
- Hosting - Cloudflare Workers Paid $5/mo, escape hatch на Hetzner CAX11
- Server posture - **contentless** (не stateless как изначально писал, а именно contentless: контент юзера не хранится, но minimum credentials хранятся encrypted в Workers KV)

### GTM
- **Сарафан + социальные сети**, без paid ads
- Tier 1: r/ClaudeAI, r/ObsidianMD, r/LocalLLaMA, Show HN, r/ChatGPT
- Submission в Anthropic Connectors Directory и ChatGPT Apps Directory в конце Q3 2026

### Pricing
- Free $0: 50 MCP calls/day, 100 notes max, BYOK only
- Pro $10/mo ($96/year): 1000 calls/day, unlimited notes, hybrid AI
- Pro Plus $15/mo ($144/year): 5000 calls/day, voice, multi-device
- Founders Lifetime $99 one-time
- Family $15/mo для 5 seats
- BYOK + proxy hybrid (proxy default)

### Brand
- Название - **Marcus** (filed как stylized или compound, не bare word)
- Title/tagline - **"Marcus - Auto Second Brain"**
- Trademark scope - Classes 9 + 42, US first, нужен attorney
- **Никогда** не использовать "Building a Second Brain" anywhere (Forte Labs trademark)
- **Никогда** не делать "Second Brain" legal product name

### AutoJournal feature (v2 после MVP)
- Создание - **после MVP**, в iOS app
- Триггер - **по запросу юзера**, не по расписанию
- Fallback - локальное push уведомление вечером
- В репо коммитятся **только текстовые описания**, не фото и не GPS
- AI processing - **on-device через Apple Foundation Models** (iOS 26+)

## Архитектура MVP

```
Claude / ChatGPT / Perplexity
         |
         | MCP протокол (HTTPS + OAuth 2.1)
         v
   Cloudflare Worker (Marcus MCP сервер)
         |
         | GitHub App (installation token, 1h TTL)
         v
   user/marcus-vault (private repo)
```

**9 MCP tools:**
1. `create_note`
2. `update_note` (replace/append/prepend modes + expected_sha)
3. `delete_note` (soft archive vs hard)
4. `search_notes` (GitHub code-search + Trees pass)
5. `get_note`
6. `list_structure`
7. `append_to_daily_note`
8. `link_notes` (с stub creation)
9. `get_recent_notes`

**Vault structure** (PARA + Johnny Decimal + Zettelkasten):
```
00-daily/
10-journal/
20-topics/
30-people/
40-projects/
50-resources/
60-photos/
90-archive/
_marcus/
index.md
```

Wikilinks стандартный Obsidian `[[Title]]` синтаксис для портативности.

## OAuth flow для юзера

1. Юзер вставляет URL `https://mcp.marcus.app/sse` в claude.ai/settings/connectors
2. Claude автоматически делает Dynamic Client Registration через MCP OAuth 2.1 spec
3. Открывается popup с GitHub OAuth
4. Юзер authorize Marcus и install Marcus App на репо `marcus-vault`
5. Marcus коммитит автосозданный private repo из template
6. Готово, 30-45 секунд

**Marcus = OAuth issuer для Claude + OAuth client для GitHub.** Claude никогда не видит GitHub токен, только Marcus bearer.

## Что хранится на сервере (честно)

**Хранится в Workers KV (encrypted, per-user envelope key + master key в Workers Secrets):**
- Marcus user_id -> GitHub installation_id mapping
- Marcus bearer токены (выданные Claude)
- Rate limit counters (TTL 24h)
- Audit log хеши (sha256 + daily pepper, TTL 30d)

**НЕ хранится:**
- Контент заметок
- Список заметок
- Embeddings / search index
- GitHub long-lived токены (только installation_id, токены generated on-demand на 1h)
- Юзер API keys для Claude/OpenAI/Perplexity (BYOK encrypted client-side)

## Главные риски

1. **GitHub UX hurdle для mass market** - спрятать "GitHub" под "your private vault"
2. **Anthropic / OpenAI / Perplexity platform risk** - митигация: multi-vendor + GitHub-as-storage means data survives shutdown
3. **Apple App Store Guideline 5.1.2(i)** (ноябрь 2025) - per-AI-provider consent для v2 iOS app
4. **Trademark Marcus** - filing stylized/compound, attorney engaged

## Конкуренты ключевые

- **Mem 2.0** ($14.99/mo) - cloud, $29.1M raised, нет MCP
- **Reflect** ($10/mo) - E2E encrypted, нет MCP
- **Capacities** ($11.99/mo) - **есть MCP с апреля 2026** (один из двух)
- **Recall** - **есть MCP** (другой из двух)
- **Day One** - добавил Daily Chat AI в 2026.7, нет MCP
- **Rosebud** ($12.99/mo) - best AI journaling, $6M seed, нет MCP
- **Foam** - GitHub storage, но developer-only VS Code extension, нет AI
- **Obsidian** - 1.5M+ users, free for commercial, plugin assembly для AI

**Никто не комбинирует** GitHub-as-storage + multi-assistant MCP + consumer UX. Это уникальный wedge Marcus.

## Roadmap

**Эта неделя:**
- WHOIS на 6 secondary доменах (getmarcus.app, usemarcus.com, trymarcus.com, marcushq.com, marcusbrain.com, mymarcus.com)
- Lock 4-6 доменов + social handles
- Engage US trademark attorney
- Создать Marcus GitHub org + MIT-licensed `marcus-mcp-server` репо

**Q3 2026 - MVP:**
- Cloudflare Worker MCP сервер с 9 tools
- GitHub App + OAuth flow
- Vault template репо
- Landing page marcus.app
- Submission в Anthropic Connectors Directory

**Q4 2026 - Q1 2027 - iOS app v2:**
- AutoJournal с PhotoKit + Vision + Apple Foundation Models
- Sign in with Apple parallel
- Apple 5.1.2(i) compliance
- StoreKit 2 или external Stripe (US)

**Q2 2027+ - Android, voice-first, plugin SDK**

## Open questions

1. Bootstrap vs raise (recommendation: bootstrap или small seed <$1.5M)
2. Knowledge graph store: Neo4j managed vs JSON-derived в репо (deferred к v1.1)
3. Backfill старых фото в AutoJournal - нужен batch endpoint и rate limiting
4. Geo-tags в frontmatter - approximate area или ничего

## Мои стилевые предпочтения для общения

- Без emoji
- Без typographic punctuation (em dash, ellipsis, « »), только ASCII и обычный hyphen
- Casual но respectful, как partner
- Коротко, structured, без long text
- Шаг за шагом, с todo list для tasks
- Всегда search the internet для factual questions
- Slack messages: "Hi" / "Hello", не "Hey", никогда "Thank you for reaching out"
- Я работаю на iOS deployment target iOS 17 в Paste

## Файлы проекта (marcus-export)

В предыдущем чате создан полный архив:

- README.md - индекс
- 00-vision.md - концепция и решения
- 01-research-report.md - полный ресерч (30+ конкурентов, рынок, риски)
- 02-architecture.md - технический MVP
- 03-mcp-oauth-flow.md - OAuth flow для коннектора
- 04-autojournal.md - концепция v2 для iOS
- 05-pricing-and-naming.md - тарифы и проверка названия
- 06-roadmap-and-decisions.md - roadmap и open questions
- 07-mcp-connector-guide.md - исходный гайд по MCP коннекторам в Claude

## С чего продолжать

Возможные направления для следующего чата:

1. **Прайсинг и unit economics** - детальный расчет на 1000 / 10000 / 100000 юзеров с разбивкой по tiers
2. **MCP server skeleton** - реальный TypeScript код на Cloudflare Workers с Hono + `@modelcontextprotocol/sdk` v2 + `@cloudflare/workers-oauth-provider`
3. **Vault template репо** - конкретный layout с примерами .md файлов и frontmatter
4. **Landing page copy** - hero text, features section, FAQ для marcus.app
5. **Onboarding UX flow** - детальный screen-by-screen для mass market (60-second target)
6. **Privacy policy и Terms** - готовые для submission в Anthropic Connectors Directory
7. **iOS app architecture** - SwiftUI + GitHub OAuth + Sign in with Apple parallel + AutoJournal pipeline
8. **GTM content calendar** - конкретные посты для Show HN, r/ClaudeAI, X threads на первые 4 недели
