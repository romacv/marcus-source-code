# 00. Vision и концепция продукта

## Что такое Marcus

Marcus - Second Brain.

Приватная AI-powered база знаний жизни. Юзер записывает все что у него происходит (заметки, дневник, фото-саммари), все хранится в его собственном приватном GitHub репозитории как связанные .md файлы.

Killer feature - remote MCP коннектор для Claude, ChatGPT и Perplexity. Юзер общается с любимым AI ассистентом, дневной чат автоматически саммаризируется в базу, на любой вопрос ассистент быстро находит контекст из прошлого.

## Целевая аудитория

Массовый рынок. Не разработчики и не power users. Люди которые уже платят за Claude Pro / ChatGPT Plus / Perplexity Pro и хотят чтобы эти AI помнили их жизнь.

## Privacy posture

Максимальная приватность. End-to-end по цепочке:

```
chat with Claude -> Marcus MCP connector -> user's own GitHub private repo
```

Marcus сервер - **contentless** (не stateless). Контент заметок никогда не интерпретируется, не индексируется и не сохраняется на серверах Marcus. Юзер может зайти на github.com и посмотреть свои данные в исходном виде в любой момент.

Minimum credentials хранятся encrypted в Workers KV (per-user envelope key + master key в Workers Secrets):
- Marcus user_id -> GitHub installation_id mapping
- Marcus bearer токены (выданные Claude/ChatGPT/Perplexity)
- Rate limit counters (TTL 24h)
- Audit log хеши (sha256 + daily pepper, TTL 30d)

Не хранится: контент заметок, список заметок, embeddings, search index, GitHub long-lived токены (только installation_id, токены generated on-demand на 1h), юзер API keys для Claude/OpenAI/Perplexity (BYOK encrypted client-side).

## Монетизация

Subscription с rate limits на MCP коннектор. Тарифы → [05-pricing.md](./05-pricing.md).

## MVP юзкейс

1. Юзер заходит на marcus.app
2. Sign in with GitHub
3. Marcus авто-создает приватный репо `marcus-vault` из template
4. Юзер копирует MCP URL `https://mcp.marcus.app/sse`
5. Юзер вставляет в claude.ai/settings/connectors -> Add custom connector
6. Все, можно работать

В чате юзер пишет: "сохрани что я сегодня встретил Машу в кафе на пляже Чангу". Claude сам решает вызвать `marcus.create_note` с уже саммаризированным контентом и frontmatter тегами. Marcus коммитит файл в GitHub. Когда юзер позже спросит "что я делал на той неделе?", Claude через MCP search находит заметки и отвечает.

Полная таблица решений → [07-roadmap-and-decisions.md](./07-roadmap-and-decisions.md).
