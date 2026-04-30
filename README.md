# Marcus - Auto Second Brain: Project Workspace

Полный архив проекта Marcus, экспортированный из чата 26 апреля 2026.

## Структура

- [00-vision.md](./00-vision.md) - концепция и решения по продукту
- [01-research-report.md](./01-research-report.md) - полный отчет по конкурентам, рынку, рискам
- [02-architecture.md](./02-architecture.md) - техническая архитектура MVP
- [03-mcp-oauth-flow.md](./03-mcp-oauth-flow.md) - как работает подключение коннектора в Claude/ChatGPT/Perplexity
- [04-autojournal.md](./04-autojournal.md) - концепция автоматического дневника жизни (v2)
- [05-pricing-and-naming.md](./05-pricing-and-naming.md) - тарифы, проверка названия, тагline
- [06-roadmap-and-decisions.md](./06-roadmap-and-decisions.md) - дорожная карта и зафиксированные решения
- [07-mcp-connector-guide.md](./07-mcp-connector-guide.md) - руководство по размещению MCP коннектора в Claude и ChatGPT Apps

## Решения зафиксированы

- Целевой юзер - массовый рынок (не developers, не power users)
- Хранилище - GitHub приватный репо юзера
- Приватность - end-to-end (chat -> connector -> GitHub)
- Server posture - **contentless** (контент не хранится, minimum credentials encrypted в Workers KV)
- Монетизация - subscription с rate limits на MCP коннектор
- Storage - GitHub в MVP, iCloud Drive / Google Drive в v2
- CRUD - полный с управлением структурой
- Stack - TypeScript на Cloudflare Workers (не Swift)
- Hosting - Cloudflare Workers Paid $5/mo, escape hatch на Hetzner CAX11
- GTM - сарафан и соцсети, без paid ads
- Название - Marcus (filed как stylized или compound, не bare word; Classes 9 + 42, US first)
- Title/tagline - "Marcus - Auto Second Brain"
- BYOK + proxy hybrid (proxy default)
- AutoJournal - после MVP, по запросу юзера, в репо только текстовые описания
- AI processing для AutoJournal - on-device через Apple Foundation Models (iOS 26+)
- Никогда не использовать "Building a Second Brain" (Forte Labs trademark)
- Никогда не делать "Second Brain" legal product name

## Что делать на этой неделе

1. Запустить WHOIS на доменах (getmarcus.app, usemarcus.com, trymarcus.com, marcushq.com, marcusbrain.com, mymarcus.com)
2. Залочить 4-6 secondary доменов и social handles
3. Engage trademark attorney для clearance в USPTO (Classes 9, 42)
4. Создать Marcus GitHub organization
5. Открыть MIT-licensed репо `marcus-mcp-server` с README + LICENSE
6. Подготовить privacy policy для будущей подачи в Anthropic Connectors Directory

## Главные риски (active)

1. **GitHub UX hurdle для mass market** - спрятать "GitHub" под "your private vault"
2. **Anthropic / OpenAI / Perplexity platform risk** - митигация: multi-vendor + GitHub-as-storage means data survives shutdown
3. **Apple App Store Guideline 5.1.2(i)** (ноябрь 2025) - per-AI-provider consent для v2 iOS app
4. **Trademark Marcus** - filing stylized/compound, attorney engaged

## Open questions

1. Bootstrap vs raise (recommendation: bootstrap или small seed <$1.5M)
2. Knowledge graph store: Neo4j managed vs JSON-derived в репо (deferred к v1.1)
3. Backfill старых фото в AutoJournal - нужен batch endpoint и rate limiting
4. Geo-tags в frontmatter - approximate area или ничего
