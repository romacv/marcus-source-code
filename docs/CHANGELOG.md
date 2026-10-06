# Changelog

## 2026-10-06 — Secrets page

- Новая страница `/settings/secrets`: токен стороннего сервиса (например `TELEGRAM_BOT_TOKEN`) шифруется в браузере libsodium `crypto_box_seal` публичным ключом репозитория и сохраняется как Actions secret в `marcus-second-brain-vault` пользователя. Воркер получает только `{ name, key_id, encrypted_value }`, передает в GitHub одним `PUT` и ничего не хранит и не логирует
- Маршруты: `GET /settings/secrets`, `GET /settings/secrets/public-key`, `POST /settings/secrets`, `DELETE /settings/secrets/:name`; вход через GitHub OAuth Marcus (cookie-сессия), CSRF-токен на POST и DELETE (15 минут), белый список имен
- CSP для этой страницы: `script-src 'self' 'wasm-unsafe-eval'` (libsodium работает на WebAssembly), остальные пути без изменений
- Новое право GitHub App: `Secrets: Read and write`; для запуска workflow в будущих интеграциях `Actions: Read and write`. После смены прав установившие App должны подтвердить их на `https://github.com/settings/installations`

## 2026-09-25 — No third-party secrets

- `reel_frames` теперь принимает `caption`, `author` и `duration_sec` из результата собственного коннектора Apify пользователя, чтобы Instagram-рилсы сохранялись с описанием, автором и длительностью без повторного анонимного скрейпинга
- Marcus больше не хранит токены сторонних сервисов. Хранение токена Apify (`scraper_token:*` в `MARCUS_KV`) прекращено 2026-09-25, ключи удалены
- Удалены инструмент `connect_reel_scraper`, модуль `scraper-settings.ts` и страница `/settings/reels` (сейчас отвечает 410, удалить в следующем релизе)
- Instagram: только через собственный коннектор Apify пользователя (`https://mcp.apify.com`) и повторный `reel_frames` с `video_url`. Код обращения к API Apify из воркера удален
- Правило на будущее: [`docs/third-party-credentials.md`](./third-party-credentials.md)

## 2026-09-24 — Reels

- Новые MCP-инструменты `reel_frames`, `save_reel`, `search_reels`, `list_reels`
- Сценарий: в чате "Marcus reels <ссылка>" -> кадры через Cloudflare Media Transformations -> заметка в `50-resources/reels/` с раскадровкой -> строка в daily note под `## Reels`
- Новый binding `MEDIA` в `wrangler.jsonc`; без него `reel_frames` отдаёт только обложку

## 2026-05-06 — Doc cleanup

- Добавлен `MVP-PROTOTYPE-PLAN.md` — ведущий executable план P0–P6 с acceptance criteria
- `05-pricing-and-naming.md` разбит на `05-pricing.md` и `06-naming-and-trademark.md`
- `06-roadmap-and-decisions.md` → `07-roadmap-and-decisions.md` (single source of truth решений)
- `07-mcp-connector-guide.md` → `04-mcp-connector-guide.md` (исправлена нумерация)
- `04-autojournal.md` → `08-v2-autojournal.md` (помечен "не MVP")
- `CONVERSATION-SUMMARY.md` → `_archive/CONVERSATION-SUMMARY.md` (заморожен, заменён README + MVP-PROTOTYPE-PLAN)
- `README.md` упрощён: убрана дублирующая таблица решений, добавлен "Start here" и ссылки
- `00-vision.md` упрощён: убрана таблица решений (живёт в `07-roadmap-and-decisions.md`)
- `01-research-report.md`: добавлен TL;DR блок наверху
- `02-architecture.md`: разделены "MVP scope" и "Beyond MVP", удалён roadmap-дубль
