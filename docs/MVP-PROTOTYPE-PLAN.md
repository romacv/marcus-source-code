# Markus MVP Prototype Plan

> Executable план от нулевого кода до limited beta. Читай вместе с `02-architecture.md` (tech), `03-mcp-oauth-flow.md` (OAuth) и `04-mcp-connector-guide.md` (submission).

---

## Цель MVP

Работающий remote MCP коннектор для Claude / ChatGPT / Perplexity. Юзер подключает его за 30–45 секунд через "Sign in with GitHub" на лендинге `markus.app`. Markus сам создаёт приватный `markus-vault` репо из template. Никаких токенов руками, никаких CLI команд.

---

## P0 — Admin (неделя 1)

**Что делаем:**
1. WHOIS на 6 secondary доменах: `getmarkus.app`, `usemarkus.com`, `trymarkus.com`, `markushq.com`, `markusbrain.com`, `mymarkus.com`
2. Залочить 4–6 из них которые available + social handles (Twitter, Bluesky, GitHub, HackerNews, Reddit)
3. Engage US trademark attorney — clearance для Classes 9 + 42 (USPTO), stylized или compound filing
4. Создать GitHub org `markus-app`
5. Открыть MIT-licensed репо `markus-mcp-server` с README + LICENSE

**Acceptance criteria:**
- Репо `markus-app/markus-mcp-server` публичен с README и LICENSE
- Attorney engaged (email подтверждение)
- 4+ доменов и matching social handles залочены

---

## P1 — Server skeleton

**Что делаем:**
```bash
npm create cloudflare@latest markus-mcp-server -- --template=cloudflare/ai/demos/remote-mcp-server
```
- Подключить Hono adapter
- Добавить `@modelcontextprotocol/sdk` v2
- Deploy на `mcp.markus.app/sse`
- `/version` endpoint возвращает deployed git SHA

**Acceptance criteria:**
- `npx @modelcontextprotocol/inspector https://mcp.markus.app/sse` подключается без ошибок
- `/version` → `{ "sha": "<commit-hash>" }`

---

## P2 — OAuth + vault provisioning

**Что делаем:**
- Подключить `@cloudflare/workers-oauth-provider`
- Создать GitHub App с Contents read+write на single repo
- Whitelist OAuth callback `https://claude.ai/api/mcp/auth_callback`
- При первом sign-in: `POST /repos/{template}/generate` создаёт приватный `markus-vault` из template repo

**Acceptance criteria:**
- Тестовый юзер из claude.ai добавляет коннектор → через 30–45 сек видит новый приватный репо `markus-vault` в своём github.com аккаунте
- GitHub token никогда не достигает Claude (проверить: только Markus bearer в Claude headers)

Детали OAuth цепочки: → `03-mcp-oauth-flow.md`

---

## P3 — 9 MCP tools

**Что реализовываем:**

| Tool | Назначение |
|---|---|
| `create_note` | Создать заметку с path, content, frontmatter |
| `update_note` | replace/append/prepend modes + `expected_sha` |
| `delete_note` | Soft archive (перемещение в `90-archive/`) |
| `search_notes` | GitHub code-search + Trees pass для frontmatter filters |
| `get_note` | Получить заметку по path |
| `list_structure` | Структура vault (folders, index) |
| `append_to_daily_note` | Добавить запись в today's `00-daily/` note |
| `link_notes` | Создать связь, stub-creation если target не существует |
| `get_recent_notes` | N последних заметок |

Требования к каждому tool:
- Zod schema на входные параметры
- `readOnlyHint` или `destructiveHint` аннотация (обязательно для Anthropic Directory)
- Multi-file commits через GraphQL `createCommitOnBranch` (не N×Contents PUT)

**Acceptance criteria:**
- Все 9 tools проходят integration тесты против реального тестового `markus-vault` репо
- `npx @modelcontextprotocol/inspector` показывает все 9 tools с корректными hints

---

## P4 — Лендинг markus.app

**Что делаем:**
- 1-экранная страница: что такое Markus + кнопка "Sign in with GitHub"
- GitHub OAuth → установка GitHub App → provisioning vault → экран "Готово, скопируй MCP URL"
- MCP URL `https://mcp.markus.app/sse` на финальном экране с кнопкой Copy

**Acceptance criteria:**
- Новый юзер (без аккаунта Markus) проходит весь flow за <60 секунд
- На финальном экране виден рабочий MCP URL, vault репо создан

---

## P5 — Privacy & compliance

**Что делаем:**
- Публикуем `PRIVACY.md` по HTTPS URL (обязательно для Anthropic Directory)
- Contentless server doc: описывает что хранится и что не хранится (см. `02-architecture.md` → раздел "Privacy proof")
- Audit-log scheme: sha256 + daily pepper, TTL 30d, без PII (path, content, repo names не логируются)
- `/version` endpoint (уже из P1)
- SBOM + SLSA L2 provenance attestation в CI
- Stripe tier интеграция: Free / Pro / Pro Plus / Founders Lifetime / Family
- Rate limits в Workers KV (TTL 24h)

**Acceptance criteria:**
- Privacy policy опубликована по HTTPS
- Rate limits работают: Free tier блокирует на 51-м MCP call за 24h
- Все production логи без PII (spot-check 10 записей)

---

## P6 — Limited beta + submission

**Что делаем:**
- 3–5 friendly юзеров в production на 2–3 недели
- Мониторинг: zero data-loss bugs, latency <500ms p95
- Submission в Anthropic Connectors Directory: `https://clau.de/mcp-directory-submission`
- Submission в OpenAI Apps Directory

**Acceptance criteria:**
- Ноль data-loss багов за 2 недели beta
- Оба submissions поданы
- Конец Q3 2026

---

## Дальше (out of MVP scope)

- **v1.1:** Knowledge graph derivation (vector + graph + keyword hybrid), backup и export tools
- **v2 iOS app:** AutoJournal — on-device AI сбор дня из Photos + Voice + Calendar → `08-v2-autojournal.md`
- **Android:** только после iOS demand validation
