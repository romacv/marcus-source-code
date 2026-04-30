# Размещение MCP-коннектора в Claude и ChatGPT Apps — полное руководство

Суммаризация диалога: исследование того, как разместить собственное приложение в Anthropic Connectors Directory и ChatGPT Apps Directory, построить удалённый MCP-сервер и дать пользователям инструкцию по подключению.

---

## 1. Connectors Directory: что это и как туда попасть

Директорий коннекторов в Claude (~299 интеграций на апрель 2026) — **это не закрытые партнёрства Anthropic**, а открытый каталог с процессом самостоятельной подачи заявки. Любой разработчик может подать свой MCP-сервер на ревью.

### Официальные формы подачи

- **Remote MCP серверы (включая MCP Apps с интерактивным UI):** https://clau.de/mcp-directory-submission
- **Desktop расширения (MCPB бандлы):** https://clau.de/desktop-extention-submission *(typo "extention" — официальный URL Anthropic)*

Среднее время ревью: ~2 недели. Единый трек, без ускоренного.

### Что можно подать

- **Remote MCP servers** — серверы в интернете с OAuth
- **Desktop extensions** — локальные MCP, упакованные как MCP Bundles (MCPB)
- **MCP Apps** — серверы с интерактивным UI (как Canva/Figma/Slack). Требуют скриншоты.

### Обязательные требования (иначе reject)

1. **Безопасность** — соответствие стандартам Anthropic
2. **Tool hints** — каждый tool должен объявлять `readOnlyHint` или `destructiveHint`
3. **Auth** — OAuth 2.0 для всех аутентифицированных сервисов
4. **Privacy policy** — HTTPS URL, описывающий: сбор/использование/хранение данных, передача третьим сторонам, контакты. Для локальных коннекторов: секция "Privacy Policy" в README.md + массив `privacy_policies` в manifest.json. Отсутствие или неполнота = немедленный reject.
5. **Документация** — чёткие инструкции по setup и использованию

### Что нужно для формы

- Базовая инфо: name, URL, tagline, description, use cases
- Connection: тип auth, transport, read/write capabilities
- Data & compliance: обработка данных, third-party connections, health data, категория
- Полный список tools, resources, prompts (с человекочитаемыми именами) + подтверждение аннотаций
- Ссылки на docs, privacy policy, support
- **Тестовый аккаунт** с пошаговым setup для ревьюера
- Готовность к запуску: дата GA, протестированные surfaces (Claude.ai, Desktop)
- Брендинг: логотип (URL или SVG), favicon, промо-материалы, скриншоты для MCP Apps
- Чек-листы соответствия policy (OAuth, HTTPS, CORS, аннотации)

### Каналы поддержки

- Проблемы с формой / эскалация статуса: [email protected]

---

## 2. Что такое Remote MCP Server

**Важное уточнение:** MCP-серверы не хостятся на claude.ai. Anthropic не размещает чужие серверы. Ты хостишь сервер сам где-то в публичном интернете. Claude.ai подключается к нему из облачной инфраструктуры Anthropic.

### Архитектура

```
[iPhone Claude app]
        ↓
[Anthropic cloud — claude.ai]
        ↓ (HTTPS + OAuth)
[ТВОЙ remote MCP сервер на публичном интернете]
        ↓
[Твой backend / database / API]
```

### Технические требования к серверу

- Доступен из IP-диапазонов Anthropic через публичный интернет (без VPN, без localhost)
- Только HTTPS
- Поддерживает **Streamable HTTP** transport (SSE deprecated)
- Реализует OAuth 2.0 с **Dynamic Client Registration (DCR)** при необходимости auth
- В whitelist OAuth callback Anthropic: `https://claude.ai/api/mcp/auth_callback` (и будущий `https://claude.com/api/mcp/auth_callback`)
- Поддержка token expiry и refresh
- Возврат HTTP 401 с `invalid_client` при удалении регистрации Claude (для re-registration)

---

## 3. Хостинг — реальные цены

| Платформа | Бесплатно | Платный тариф | Когда выбирать |
|-----------|-----------|---------------|----------------|
| **Cloudflare Workers** | 100 000 запросов/день навсегда | $5/мес = 10 млн запросов | Рекомендуется. Лучшая поддержка MCP, OAuth из коробки |
| **Vercel** | 100 GB трафика/мес | Pro $20/мес | Если уже используешь Next.js |
| **Railway** | $5 кредита/мес trial | от $5/мес usage-based | Простой Node/Python деплой |
| **Fly.io** | Нет полностью бесплатного | от ~$3/мес за маленькую VM | Полный контроль |
| **Render** | Бесплатный (засыпает) | от $7/мес always-on | Просто, но засыпание мешает |
| **VPS Hetzner** | — | от €4/мес | Если нужен полный контроль |

**Рекомендация:** начать на Cloudflare Workers. Free tier хватит для тестов и первых пользователей. Кредитка на старте не нужна.

---

## 4. Создание сервера — пошагово

### Шаг 1. Установить шаблон Cloudflare

```bash
npm create cloudflare@latest my-mcp-server -- \
  --template=cloudflare/ai/demos/remote-mcp-server
cd my-mcp-server
```

### Шаг 2. Описать tools

Каждому tool обязательна аннотация `readOnlyHint` или `destructiveHint` для публичного директория.

### Шаг 3. Локальный тест

```bash
npm run dev
```

### Шаг 4. Тест через MCP Inspector (без Клода)

```bash
npx @modelcontextprotocol/inspector
```

### Шаг 5. Деплой

```bash
npx wrangler deploy
```

Получаешь URL вида `https://my-mcp-server.твой-аккаунт.workers.dev/sse`.

### Шаг 6. OAuth (если нужны приватные данные пользователей)

Cloudflare framework берёт на себя Dynamic Client Registration, refresh-токены и callback `https://claude.ai/api/mcp/auth_callback`. Реализуешь только логин юзера к своему сервису.

### Шаг 7. Подача в директорий (опционально)

После публичной стабильной работы — подавай на https://clau.de/mcp-directory-submission.

### SDK и инструменты

- **TypeScript SDK:** https://github.com/modelcontextprotocol/typescript-sdk
- **Python SDK:** https://github.com/modelcontextprotocol/python-sdk
- **Swift SDK:** https://github.com/modelcontextprotocol/swift-sdk
- **MCP Inspector:** https://github.com/modelcontextprotocol/inspector
- **Cloudflare guide:** https://developers.cloudflare.com/agents/guides/remote-mcp-server/

---

## 5. Инструкция для юзера БЕЗ навыков программирования

Готовый текст для копирования в README, лендинг, email.

---

### Как подключить [НАЗВАНИЕ СЕРВИСА] к Claude

**Что нужно:** аккаунт Claude (любой план — Free, Pro, Max, Team, Enterprise). Free-юзеры могут подключить только 1 кастомный коннектор.

#### На компьютере (займёт 2 минуты)

1. Открой https://claude.ai/settings/connectors в браузере
2. Прокрути вниз
3. Нажми **«Add custom connector»**
4. В поле URL вставь: `https://my-mcp-server.example.workers.dev/sse` *(подставь реальный URL)*
5. Нажми **«Add»**
6. Откроется окно входа — авторизуйся в [твоём сервисе]
7. Готово

#### На iPhone/Android

Если хочешь добавить коннектор по URL — это нужно сделать **с компьютера** через https://claude.ai/settings/connectors. С мобильного приложения добавление кастомных коннекторов пока недоступно.

После добавления на компьютере коннектор автоматически появится в мобильном приложении Claude — пользоваться им можно с телефона как обычно. Перезапусти приложение, если не видишь сразу.

#### Как использовать в чате

1. Открой новый чат в Claude
2. Нажми **«+»** в левом нижнем углу поля ввода
3. Выбери **«Connectors»**
4. Включи переключатель напротив [сервиса]
5. Пиши сообщения — Claude сам поймёт, когда обратиться к сервису

#### Как отключить

Settings → Connectors → найди коннектор → три точки → Remove.

---

### Для ChatGPT

ChatGPT поддерживает MCP через Apps SDK и Connectors:

1. Открой ChatGPT в браузере
2. Settings → Connectors → **Create**
3. Вставь URL MCP-сервера
4. Авторизуйся
5. В чате выбери режим с включёнными коннекторами

**Важно:** интерфейс ChatGPT часто меняется — перед публикацией инструкции для юзеров проверь актуальные шаги в их официальной документации.

---

## 6. Публикация в ChatGPT Apps Directory

OpenAI Apps SDK строится вокруг MCP server + optional UI components. Для Marcus это значит: текущий remote MCP backend переиспользуется, но submission flow отличается от старых ChatGPT Actions.

### Подготовка

- Backend/MCP server доступен по HTTPS
- OAuth 2.1 flow по MCP authorization spec
- Tool descriptors, metadata, scopes, privacy policy, support URL
- UI не обязателен для базового connector-style сценария, но поддерживается через Apps SDK components/widgets
- Test/demo account для ревьюера без MFA и ручной настройки

### Создание и тестирование

1. В OpenAI Platform включить Developer Mode для ChatGPT Apps
2. Подключить Marcus как private/developer app по MCP URL
3. Проверить tool calls из ChatGPT web и mobile
4. Прогнать тест-кейсы на create/search/update/delete заметок
5. Проверить, что tool responses не возвращают лишние user identifiers, debug payloads, tokens или PII

### Сабмит

1. Пройти identity verification в OpenAI Platform для имени публикации
2. Подать app через dashboard-based review flow
3. Указать countries/availability, metadata, auth details, test credentials, privacy/support links
4. Дождаться review: безопасность, корректность MCP server/API, privacy disclosures, UX и надежность expected results

### Публикация

После approve app доступен для public distribution в ChatGPT Apps Directory. OpenAI также указывает, что approved app может получить Codex plugin distribution; self-serve plugin publishing отдельно обозначен как coming soon.

### Отличие от OpenAPI Actions

Для ChatGPT Apps SDK не нужен OpenAPI schema как обязательный контракт. OpenAPI относится к legacy ChatGPT Actions/GPTs flow. Для Marcus основной контракт — MCP tools, OAuth 2.1, metadata и optional UI resources/components.

Официальные ссылки:
- Apps SDK: https://developers.openai.com/apps-sdk
- Build MCP server: https://developers.openai.com/apps-sdk/build/mcp-server
- Authentication: https://developers.openai.com/apps-sdk/build/auth
- Submit app: https://developers.openai.com/apps-sdk/deploy/submission
- App submission guidelines: https://developers.openai.com/apps-sdk/app-submission-guidelines

---

## 7. Мобильные коннекторы — нюанс

| Тип коннектора | Установка с мобилы |
|----------------|---------------------|
| **Кастомный по URL** | НЕТ — только через claude.ai на компьютере |
| **Из публичного директория** | ДА (в beta) — пара тапов прямо в приложении |

Это аргумент в пользу подачи в директорий: после одобрения юзеры смогут ставить твой коннектор с телефона без захода на десктоп.

---

## 8. Ключевые ссылки

### Официальная документация Anthropic

- Submission guide: https://claude.com/docs/connectors/building/submission
- Connectors overview: https://claude.com/docs/connectors/overview
- Building MCP connectors: https://claude.com/docs/connectors/building/mcp
- Building MCP Apps: https://claude.com/docs/connectors/building/mcp-apps/getting-started
- Remote MCP: https://claude.com/docs/connectors/custom/remote-mcp
- Building remote MCP servers: https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers
- Custom connectors getting started: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Directory terms: https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms
- Directory policy: https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy
- Partner page: https://claude.com/partners/mcp

### MCP протокол и SDK

- MCP протокол docs: https://modelcontextprotocol.io
- MCP Auth spec: https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Python SDK: https://github.com/modelcontextprotocol/python-sdk
- Swift SDK: https://github.com/modelcontextprotocol/swift-sdk
- MCP Inspector: https://github.com/modelcontextprotocol/inspector
- MCP Bundles spec: https://github.com/modelcontextprotocol/mcpb

### Хостинг

- Cloudflare Remote MCP guide: https://developers.cloudflare.com/agents/guides/remote-mcp-server/
- Cloudflare шаблон: https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-server

### Формы

- Подача remote MCP: https://clau.de/mcp-directory-submission
- Подача desktop extension: https://clau.de/desktop-extention-submission

---

## 9. Конкретный первый шаг

Для контекста (Cloudflare уже подключён, опыт iOS, знание TypeScript/Swift):

```bash
npm create cloudflare@latest my-mcp-server -- \
  --template=cloudflare/ai/demos/remote-mcp-server
cd my-mcp-server
npm run dev               # локальный тест
npx wrangler deploy       # деплой на *.workers.dev с HTTPS
```

Получишь URL `https://my-mcp-server.<subdomain>.workers.dev/sse`. Вставляешь в claude.ai → Settings → Connectors → Add custom connector. Через минуту доступно в iPhone Claude app.

**Бюджет на старте: 0 ₽.** Cloudflare Workers free + claude.ai Free = можно протестировать всё без вложений. Платить начнёшь только когда пойдут реальные юзеры.
