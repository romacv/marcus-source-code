# 08. AutoJournal: автоматический дневник жизни (v2 после MVP)

> **Не входит в MVP.** Активируется после Q3 2026 launch и iOS app v2. Детали roadmap → [07-roadmap-and-decisions.md](./07-roadmap-and-decisions.md).

## Что это

После MVP Marcus получает iOS приложение с killer feature - **автоматическим сбором дня**. Юзер нажимает кнопку "Собрать день", Marcus за 10-30 секунд собирает draft дневниковой записи из:

- iCloud Photos (где был, что ел, с кем)
- Чата с Claude / ChatGPT за день
- Voice memos и quick notes из Marcus app
- Calendar и CoreLocation (опционально, opt-in)

Все обрабатывается **on-device через Apple Foundation Models + Vision framework**. В GitHub репо коммитится только текстовое описание дня. Фото и GPS координаты остаются в iCloud, репо хранит только saliency descriptions и asset IDs для deep links.

Утром юзер открывает Claude и спрашивает "что я делал вчера?" - Claude через MCP читает yesterday's entry и делает recap. Юзер правит ошибки прямо в чате.

Решения по AutoJournal (когда строить, триггер, что коммитится, GPS, AI processing) → [07-roadmap-and-decisions.md](./07-roadmap-and-decisions.md) раздел "Feature scope".

## Конкурентное преимущество

Что делают другие в апреле 2026:

| Продукт | AI journaling | Storage ownership | MCP |
|---|---|---|---|
| Day One 2026.7 | Daily Chat AI | Cloud Day One | Нет |
| Rosebud | Best conversational | Cloud Rosebud | Нет |
| Limitless / Rewind | Был лучшим | - (Meta acquired дек 2025, hardware killed) | - |
| Stoic | Limited AI | Cloud | Нет |
| Marcus AutoJournal | On-device + GitHub | **User's GitHub** | **Yes** |

Никто не делает связку:
- автоматический сбор сигналов
- on-device AI
- GitHub-as-storage
- MCP recall в Claude

Это второй ров после самого MCP коннектора.

## Технические компоненты

### iOS app

- PhotoKit framework + `PHAuthorizationStatus` - доступ к iCloud Photos
- Vision framework - on-device recognition (places, food, faces, objects, OCR)
- Apple Foundation Models (iOS 26+) - summarization и structured generation
- CoreLocation (opt-in) - текущая локация для тегов
- EventKit (opt-in) - calendar events за день
- AVFoundation - voice memo capture
- Speech framework - on-device transcription voice memos

### MCP tools (новые в v2)

В дополнение к 9 MVP tools:

| Tool | Назначение |
|---|---|
| `generate_daily_draft` | Запускается из iOS app, создает draft daily entry из локальных данных |
| `get_daily_draft` | Получить текущий draft (read-only до confirm) |
| `confirm_daily_draft` | Юзер подтвердил, коммитим в репо |

`generate_daily_draft` запускается **с устройства**, не с сервера. iOS app:
1. Собирает локальные сигналы (фото, voice, calendar)
2. Прогоняет через Apple Foundation Models локально
3. Генерирует markdown text
4. Шлет готовый markdown через MCP в Marcus
5. Marcus коммитит в `10-journal/2026-04-26.md`

Сервер никогда не видит фото, только текст который уже саммаризирован on-device.

## Privacy implications

**Каждый источник данных = отдельный consent screen в onboarding:**

- Photos: explicit `PHPhotoLibraryAddUsageDescription` + per-source consent
- Calendar: `NSCalendarsUsageDescription`
- Location: `NSLocationWhenInUseUsageDescription`
- Microphone: `NSMicrophoneUsageDescription`

Apple App Store Guideline 5.1.2(i) с ноября 2025 требует:
- Per-AI-provider disclosure (даже для Apple Foundation Models когда используется)
- Privacy nutrition label с каждым subprocessor по имени
- Toggle в settings для каждого источника без потери app

## Flow от юзера

### Вечерний flow (опциональный)

1. 21:00 локальное время - Marcus app шлет local notification "Готов собрать твой день?"
2. Юзер тапает - открывается app
3. Юзер видит preview (фото с обеда, voice memo о встрече)
4. Жмет "Generate"
5. 15-30 секунд on-device обработки
6. Видит draft markdown
7. Может править прямо в app или confirm как есть
8. Жмет "Save to vault"
9. Marcus коммитит в GitHub

### Утренний flow (recall в Claude)

1. Юзер открывает Claude
2. "Что я делал вчера?"
3. Claude через MCP `search_notes` находит `10-journal/2026-04-25.md`
4. Через `get_note` читает entry
5. Делает recap: "Вчера ты обедал с Машей в кафе на Чангу, потом..."
6. Юзер: "На самом деле там был Pavel а не Маша, поправь"
7. Claude через `update_note` правит запись в репо

Это feedback loop делает дневник точным со временем.

## Roadmap implications

AutoJournal попадает в Q4 2026 - Q1 2027 release iOS app, после MVP web/desktop launch и validation в Anthropic Connectors Directory.

До iOS app в MVP можно добавить minimal version:
- Webhook endpoint `/api/photos/process` который принимает уже саммаризированный текст из iOS Shortcuts
- Юзер в iOS Shortcut собирает photos из последнего часа, прогоняет через Foundation Models через Shortcut, шлет результат в Marcus webhook
- Это даст работающий AutoJournal в MVP без нативной app

Но primary push в v2 - native iOS с lockscreen widget и Siri integration.

## Open questions для v2

1. Stub-creation для людей которых нет в репо: Marcus должен сам создавать `30-people/Маша.md` или ждать что юзер сам создаст?
2. Geo-tags в frontmatter: storing approximate area ("Bali, Чангу") vs не storing вообще
3. Photo asset IDs: deep link `photos-redirect://asset/ABC123` стабилен через iCloud sync или может сломаться?
4. Backfill старых фото: позволить юзеру указать "обработай мне последние 30 дней" - это thousands MCP calls, нужен batch endpoint и rate-limiting
