# 01. Research Report: рынок, конкуренты, риски

> Полный отчет из extended research, апрель 2026.

## TL;DR

**Bottom line:** Marcus стреляет в реальное узкое окно. Из 30+ продуктов только два consumer-продукта (Recall и Capacities) имеют remote MCP коннектор, и ни один не комбинирует GitHub-as-storage с multi-assistant MCP для не-разработчиков. Авто-создание приватного GitHub репо на signup — genuinely greenfield UX pattern.

**Топ конкуренты с MCP (апрель 2026):**

| Продукт | MCP | Privacy | Ключевое отличие |
|---|---|---|---|
| **Recall** | Да | Cloud | Один из двух с MCP; cloud storage |
| **Capacities** | Да (апр 2026) | Cloud | Шипнул MCP месяц назад; cloud storage |
| Obsidian | Нет (plugin) | Local files | 1.5M+ юзеров; developer-leaning; без MCP |
| Mem 2.0 | Нет | Cloud, проп. | $29.1M raised; no GitHub ownership |
| Rosebud | Нет | Cloud | Лучший AI journal; $6M seed; без MCP |
| Foam | Нет | **GitHub** | Developer-only VS Code ext; без AI |

**3 топ-риска:**
1. GitHub UX hurdle — bar: onboarding <60 сек с zero git terminology
2. Anthropic/OpenAI/Perplexity platform risk — митигация: multi-vendor + GitHub-as-storage
3. Apple App Store 5.1.2(i) — per-AI-provider consent в iOS v2

**Окно:** открыто 2–4 квартала. После Q4 2026 моат не MCP, а связка GitHub-storage + privacy + multi-assistant.

---

## Detailed findings

## Bottom line

Marcus стреляет в реальное узкое окно. Из 30+ продуктов в категориях AI second-brain, markdown-PKM и AI-journaling только два consumer-продукта (Recall и Capacities, оба в апреле 2026) имеют remote MCP коннектор, и ни один не комбинирует GitHub-as-storage с multi-assistant MCP для не-разработчиков.

Архитектура Marcus технически крепкая и защищаемая. Главные риски не технические:
- Название Marcus сильно занято в SEO и риск отказа в USPTO как фамилия
- Тагline "Your AI Knowledge Base of Life" - awkward English и почти копия `thesecondbrain.io`
- Apple Guideline 5.1.2(i) с ноября 2025 требует per-AI-provider disclosure

Окно открыто 2-4 квартала. Capacities выпустил MCP в апреле 2026, Day One добавил AI в 2026.7, Mem 2.0 наконец-то стартовал, Forte Labs запустил "The AI Second Brain" программу в марте 2026. После Q4 2026 моат уже не MCP, а связка GitHub-storage + privacy + multi-assistant + life-scope.

## 1. Конкурентный ландшафт

### AI Second Brain / AI knowledge management

| Продукт | Цена 2026 | MCP | Privacy | Заметки |
|---|---|---|---|---|
| Mem 2.0 | $14.99/mo | Нет | Cloud, проп. | $29.1M raised, OpenAI Startup Fund + a16z |
| Reflect | $10/mo | Нет | E2E encrypted | Niche, но preданный фанбэйз |
| Saner.ai | $8 / $16 | Нет | Cloud | Очень ранняя стадия |
| Tana | $10 / $18 | Нет | Cloud | $25M raised в 2025 |
| RemNote | $10 / $20 | Нет | Cloud | Стабильный игрок |
| **Recall** | varies | **Да** | Cloud | Один из двух с MCP |
| **Capacities** | $11.99/mo | **Да (апр 2026)** | Cloud | Шипнул MCP месяц назад |
| NotebookLM | $20/mo (Plus) | Нет | Cloud Google | |
| Khoj | OSS / cloud | MCP client only | Self-host опция | Не выставляет MCP server |
| Limitless / Rewind | - | - | - | **Acqui-hired Meta дек 2025**, hardware убит |
| Heyday | - | - | - | Effectively abandoned |

### Markdown / local-first с AI

| Продукт | Цена | AI | Privacy |
|---|---|---|---|
| Obsidian | Free + Sync $4-10/mo | Plugin assembly | Local files |
| Logseq | Free | Limited | Local |
| Anytype | $0-5/mo | Limited | E2EE, P2P sync |
| Foam | Free OSS | None | **GitHub storage** (но developer-only) |
| Silverbullet | Free OSS | Limited | Self-host |

Obsidian остается гравитационным центром: 1.5M+ юзеров, +22% YoY на февраль 2026, free для коммерческого использования с того же месяца.

**Foam единственный продукт во всем survey который использует GitHub для storage**, но это developer-only VS Code extension без AI и без MCP.

### AI journaling

| Продукт | Цена 2026 | AI | MCP |
|---|---|---|---|
| Rosebud | $12.99/mo | Conversational AI journaling | Нет |
| Day One | Silver/Gold tiers | Daily Chat AI (релиз 2026.7) | Нет |
| Stoic | $5/mo | Limited | Нет |
| Daylio | Free + Premium | None | Нет |
| Diarly | Premium | Limited | Нет |

Журналинг-категория - **100% MCP greenfield**. Rosebud поднял $6M от Bessemer и Tim Ferriss в июне 2025 и шипит лучший conversational AI journal но без MCP.

## 2. Уникальная дифференциация

Differentiation сводится к матрице 4 свойств. Marcus единственный кандидат который может закрыть все четыре:

| Свойство | Кто держит |
|---|---|
| User-owned portable storage (markdown в git) | Foam, GitJournal, частично Obsidian, Anytype |
| Best-in-class AI через remote MCP в Claude/ChatGPT/Perplexity | Recall, Capacities, Notion (но Notion fails storage test) |
| Stateless server без plaintext custodian | Self-hosted Khoj, Reor, Anytype, Standard Notes |
| Consumer UX без Docker, без PAT, без plugin chains | Mem, Reflect, Notion, Capacities, Rosebud |

**Авто-создание private GitHub репо на signup - genuinely greenfield UX pattern.** Даже GitJournal и NotesHub заставляют юзера создать репо и вставить URL или PAT. Никто из mainstream consumer продуктов сейчас не использует GitHub OAuth + create-from-template REST endpoint для invisible provisioning.

Чистое позиционирование одним предложением:

> "Your second brain in your own private GitHub repo, accessible from Claude, ChatGPT, and Perplexity - not a SaaS holding your data hostage, not a plugin you have to wire up."

## 3. Платформенный риск

MCP стал durable стандартом. Anthropic передал MCP в **Agentic AI Foundation под Linux Foundation в декабре 2025**, OpenAI и Block как co-founders, AWS / Google / Microsoft / Cloudflare / Bloomberg как supporters.

Поверхности (Claude/ChatGPT/Perplexity) - другая история:
- OpenAI churnил дважды: Plugins -> GPTs -> Connectors -> Apps (rebrand 17 декабря 2025)
- Anthropic в апреле 2026 терминировал Claude access у компании на 60 человек без warning
- Anthropic блокировал xAI's Cursor-based access под Commercial Terms §D.4
- Anthropic ужесточил anti-spoofing и сломал OpenCode

**Урок: directory это маркетинг, custom remote MCP это выживание.** Marcus должен работать как custom remote connector с дня один для платных Claude/ChatGPT/Perplexity юзеров вне зависимости от directory статуса.

## 4. Market timing

Три тренда сошлись за последние 9 месяцев:

1. **MCP попал в consumer surfaces.** Claude Connectors Directory с июля 2025 (~280 коннекторов сейчас). ChatGPT Plus/Pro полная MCP поддержка с сентября 2025, ребрендинг в Apps SDK в декабре 2025. Perplexity remote custom MCP с OAuth 2.0 discovery. Google Gemini CLI native MCP. Все три target клиента принимают remote MCP от платных юзеров.

2. **Платный consumer спрос на AI растет.** Claude paid subscribers удвоились в 2026 per TechCrunch. ChatGPT Pro $100/mo в апреле 2026. Perplexity Max $200/mo. Юзеры уже платят $20-60/mo по этим трем подпискам.

3. **AI second brain категория из waitlists в revenue.** Mem 2.0 $14.99/mo, Rosebud $6M seed, Tana $25M, Capacities и Recall шипнули MCP, Day One добавил AI.

Pricing band 2026 для AI knowledge tools узкий и устоявшийся:
- Floor: $5/mo (Anytype Plus, Stoic)
- Modal cluster: $8-15/mo (Saner $8, Reflect $10, Tana Plus $10, RemNote Pro $10, Capacities Pro $11.99, Rosebud $12.99, Mem Pro $14.99)
- Ceiling: $18-20/mo (Tana Pro $18, NotebookLM Plus $20)
- Annual discount: 20-22%

Marcus в $10-15 читается как native. Ниже $10 - commodity. Выше $20 нужен hardware или enterprise positioning.

## 5. Ключевые риски

### Риск 1: GitHub UX hurdle (highest probability)

Полностью определяет mass-market addressability. Working patterns:
- Скрыть слово "GitHub" в consumer UX, называть "your private vault" или "your private cloud"
- Repo URL только в advanced settings как "Storage Location" + "Open in GitHub" power-user button
- GitHub токен в OS Keychain на mobile
- Batch коммиты каждые 30 секунд или 50 entries, без commit message UI ("Saved" не "Committed")
- Auto-resolve sync conflicts через last-write-wins
- "Geek Mode" toggle для exposing repo

Уроки от других:
- GitJournal с 2019 года, ~4.1k stars, не пробил mass-market - UX остался developer-leaning
- Quartz 10k+ stars, требует Git knowledge
- Obsidian Git plugin - fractional adoption из 1.5M юзеров

**Bar: onboarding под 60 секунд с zero git terminology.**

### Риск 2: Anthropic / OpenAI / Perplexity platform risk

Реальный и с историческими прецедентами:
- OpenAI ChatGPT Plugins: announce март 2023, deprecated апрель 2024 - 12-месячный цикл
- Heyday shut down в 2025 после провала с durable revenue
- Anthropic enforcement действия в апреле 2026 показывают unilateral authority

Митигации stack:
- Frame Marcus как **MCP server, не Claude connector**
- Multi-vendor (Claude + ChatGPT + Perplexity) с дня один
- BYOK для свободного hopping providers
- **Данные в GitHub репо юзера - даже если Marcus завтра умрет, у юзера полный markdown vault** (это лучшая защита и должна быть lead marketing claim)
- Open-source MCP server для community fork

### Риск 3: Apple App Store (underestimated)

Guideline 5.1.2(i) updated 13 ноября 2025 требует:
- Explicit per-AI-provider disclosure и consent перед sharing
- Generic "we share with AI services" - rejection trigger
- Per-provider consent modal на first use Claude / OpenAI / Perplexity
- Privacy nutrition label с каждым AI subprocessor по имени
- Per-provider toggle в settings для revoke без потери app
- Sign in with Apple как parallel option к GitHub OAuth (mandatory)
- In-app account deletion (mandatory)
- StoreKit 2 для subscriptions
- Xcode 26 / iOS 26 SDK с апреля 2026

EU DMA fees после 1 января 2026: unified Core Technology Commission 2% acquisition + 5-13% Store Services + 5% CTC для external links. После Epic-ruling US: prefer external payment via Stripe (3-7% net) над Apple IAP (15-17% net).

**Build PWA-first параллельно native, чтобы rejection не блокировал launch.**

### Риск 4: GitHub API rate limits

GitHub App дает 5000-12500 req/h **per installation** (vs 5000/h shared для классического OAuth). Platform-wide лимит не binding constraint на realistic scale.

Binding constraints на batch операциях:
- 100 concurrent requests
- 900 points/min REST
- Content creation 80/min, 500/h

Митигации: aggressive client-side caching, exponential backoff с jitter, batch коммиты через GraphQL `createCommitOnBranch` (один коммит per minute, не per note), GraphQL для read paths, никогда unauthenticated requests (60/h это brutal).

### Риск 5: Auto-organization unstructured chat

Решаемый с 2024-2026 research consensus:
- A-MEM-style atomic notes + LLM-link inference на write-time
- Temporal knowledge graph в стиле Zep для fact-validity-over-time queries
- LLM4Tag-style tag inference с confidence calibration
- Hybrid retrieval (vector + graph + keyword)

Pure vector ломается на relationships. Pure graph дорогой. Industry consensus - hybrid.

Преимущество Marcus: **structured layer derivable, не authored**. Хранить atomic notes как markdown + YAML frontmatter в GitHub, derive graph и embeddings на Marcus серверах, recompute on demand.

## 6. Pricing strategy

Hybrid BYOK + proxy default. Pure BYOK выкидывает 80% mass-market (юзеры не знают что такое API key). Pure proxy убивает margins на scale (Claude Sonnet $3/$15 per million tokens, один power user на 5000 calls/day ломает unit economics).

Tier структура:

| Tier | Цена | MCP calls/day | Notes | AI mode |
|---|---|---|---|---|
| Free | $0 | 50 | 100 max | BYOK only |
| Pro | $8/mo annual ($96), $10/mo monthly | 1000 | Unlimited | BYOK or proxy |
| Pro Plus | $15/mo, $144/year | 5000 | Unlimited + voice | Proxy default + BYOK |
| Founders Lifetime | $99 one-time | Pro Plus level | | |
| Family | $15/mo | Pro Plus level x5 | каждый со своим репо | |

Annual discount 20%, education и non-profit 40% off (matches Obsidian).

Pitch: "$10 чтобы $20 AI которые ты уже платишь наконец-то помнили тебя".

Когда юзер дает свой Claude/OpenAI/Perplexity ключ, rate limits становятся "fair-use unlimited" capped 50000/day для prevention runaway scripts.

Никогда не хранить юзер API keys в plaintext server-side: encrypt at rest user-derived key или store client-side и pass-through (по модели Standard Notes E2EE).

## 7. Naming verdict: Marcus

**Conditional go.** Bare word USPTO в Class 9/42 для AI/PKM software не зарегистрирован - сильный signal. Но 6 проблем:

Active competitors в adjacent SaaS:
- Marcus AI for events (`dearmarcus.ai`, `agentmarcus.com`) - press в Q1 2026 pilots
- Marcus.tech - UK ed-tech AI marking
- Marcus at Welby - clinical AI assistant
- HelloMarcus.ai - French AI marketing employee
- Marcus.agency - B2B AI marketing €2.5K/mo
- HeyMarcus - European restaurant/cinema POS

Marcus by Goldman Sachs доминирует "Marcus app" autocomplete.

Bare-word Google SERP занят:
- Marcus Persson (Notch / Minecraft)
- Marcus Zusak (The Book Thief)
- IKEA MARCUS office chair

**Слово эффективно неrankable как brand на годы.**

USPTO 2(e)(4) refusal risk: "primarily merely a surname" так как Marcus - common given name. Stylized logo или compound (`MARCUS AI`, `MARCUS BRAIN`) substantially improves registrability.

Premium домены `marcus.app`, `marcus.ai`, `marcus.com` почти точно taken на 5-6 значные суммы.

Secondary candidates likely available (нужен WHOIS confirmation):
- `getmarcus.app`
- `usemarcus.com`
- `trymarcus.com`
- `marcushq.com`
- `marcusbrain.com`
- `mymarcus.com`

**Action items:**
- Run WHOIS сегодня, lock 4-6 secondaries + social handles до любого public surface
- Premium acquisition только если brand investment justifies

## 8. Title/tagline verdict: replace before launch

"Your AI Knowledge Base of Life" заменить. Три причины:

1. Awkward English - "knowledge base for life" (ongoing) vs "knowledge base of life" (database about life) - разные значения
2. "AI Knowledge Base" heavily occupied B2B-support phrase (Front, Help Scout, Guru, Document360, Zendesk, Capacity, monday service)
3. **`thesecondbrain.io` homepage tagline литерально "The AI Knowledge Base That Actually Works"** - near-identical concept уже в market

Recommended replacements (по силе):
- **"Marcus - Auto Second Brain"** ⭐ winner
- "Marcus - The AI memory for everything you know."
- "Marcus - your life, indexed."

## 9. "Second Brain" usage safety

Forte Labs holds **BUILDING A SECOND BRAIN®** (USPTO Serial 87768093, Class 41) и активно polices. Brand-sharing guide explicitly target:
- "Constructing a Second Brain"
- "Building a Third Brain"
- даже "Fuilding a Fecond Frain"

Forte Labs запустил "The AI Second Brain" educational program в марте 2026 - directly adjacent.

Bare phrase "Second Brain" **не зарегистрирован** как live US/EU trademark для software. Только abandoned (87193487) или cancelled (79040243) filings.

Mem, Reflect, Capacities, Tana, Obsidian, Notion, Supernormal, AFFiNE, Buildin, Logseq, Roam, RemNote, Anytype - все используют "second brain" descriptively без challenge.

**Safe usage:**
- "Second brain" в tagline и body copy - OK
- "Building a Second Brain" anywhere - NEVER
- "Second Brain" как legal product name - NEVER

## 10. Open strategic questions ranked

1. **BYOK vs proxy vs hybrid** (recommendation: hybrid, proxy default, BYOK toggle)
2. **Single-vendor "Claude memory" vs multi-vendor "second brain that talks to all AIs"** (lead with Claude в маркетинге, ship multi-vendor day one)
3. **Как агрессивно скрывать GitHub** (hide by default, expose в Geek Mode)
4. **Knowledge organization: vector / graph / hybrid** (hybrid 2026 consensus, open sub-question - где graph store живет)
5. **Mobile-first / desktop-first / PWA-only** (PWA + thin native shells lowest-risk)
6. **Bootstrap vs raise** (bootstrap или small seed <$1.5M от privacy-aligned investors)
7. **Free-tier shape** (MCP-call cap 50/day - юзер чувствует, scales линейно с compute, training value)
8. **Open-source posture** (OSS server + sync engine, closed knowledge-graph compute)

## Sources

Day One 2026.7 release, PitchBook Mem profile, Automateed Reflect review, AI Chief Saner / Tana / NotebookLM reviews, Cloudflare Workers MCP docs, GitHub API rate limits docs, OpenAI ChatGPT Apps SDK docs, Perplexity custom remote connectors help center, TechCrunch Anthropic / Standard Notes coverage, Forte Labs trademark records.
