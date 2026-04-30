# 03. Как юзер подключает Marcus коннектор в Claude / ChatGPT / Perplexity

## Что делает юзер (30 секунд)

1. Идет в claude.ai/settings/connectors (или аналог в ChatGPT / Perplexity)
2. Жмет "Add custom connector"
3. Вставляет URL `https://mcp.marcus.app/sse`
4. Жмет "Add"
5. Открывается popup с GitHub авторизацией
6. Логинится в GitHub
7. Жмет "Authorize Marcus" и "Install on marcus-vault"
8. Popup закрывается, готово

Никаких токенов руками не копировать. Никаких PAT. Никаких command line команд.

## Что происходит технически

Работает OAuth 2.1 spec MCP протокола. Цепочка:

```
1. Claude → mcp.marcus.app/sse
   GET request

2. Marcus → Claude
   HTTP 401 + WWW-Authenticate header
   указывает свой OAuth endpoint

3. Claude → mcp.marcus.app/.well-known/oauth-authorization-server
   читает OAuth metadata

4. Claude → mcp.marcus.app/register
   Dynamic Client Registration (DCR)
   Claude автоматически регистрируется как клиент у Marcus

5. Claude открывает popup → mcp.marcus.app/authorize
   с PKCE challenge

6. Marcus сервер → редирект на github.com/login/oauth/authorize
   Marcus = OAuth client для GitHub

7. Юзер на GitHub
   логинится, нажимает Authorize Marcus,
   ставит Marcus App на репо marcus-vault

8. GitHub → mcp.marcus.app/github/callback
   с auth code

9. Marcus
   меняет GitHub code на installation token,
   шифрует в KV,
   генерирует свой собственный bearer токен,
   привязывает к этому юзеру

10. Marcus → claude.ai/api/mcp/auth_callback
    с Marcus bearer токеном

11. Claude теперь имеет Marcus токен
    зовет MCP tools с Authorization: Bearer <marcus-token>
```

## Ключевая идея: Marcus двухсторонний OAuth узел

Marcus выступает одновременно:

- **OAuth сервером для Claude** - выдает Claude свой Marcus токен
- **OAuth клиентом для GitHub** - получает от GitHub installation токен

Claude никогда не видит GitHub токен. У Claude только Marcus токен который умеет звать MCP tools и больше ничего.

## Почему это безопасно

| Слой | Что хранит | Что видит |
|---|---|---|
| Claude / ChatGPT | Marcus bearer токен | MCP tool calls и responses |
| Marcus сервер | Encrypted GitHub installation токен в KV | Marcus токены, mapping к installation IDs |
| GitHub | Сам репо и юзер account | API calls от Marcus App |

Если Claude сольют все логи, GitHub репо в безопасности - Marcus токен умеет говорить только с Marcus сервером.

Если Marcus скомпрометирован, GitHub installation токен зашифрован per-user envelope key, и юзер может одним кликом на github.com/settings/installations отозвать доступ - все старые токены становятся бесполезными мгновенно.

Если юзер просто хочет уйти - Settings → Applications → Installed GitHub Apps → Marcus → Uninstall. Доступ отозван, репо продолжает существовать в его аккаунте, все заметки остаются у него.

## Что упрощает Cloudflare

Библиотека `@cloudflare/workers-oauth-provider` делает шаги 2-4, 9-10 за тебя из коробки. Marcus код пишется только для:

- Шаг 6: редирект на GitHub OAuth с правильными scopes и state
- Шаг 8: обработка GitHub callback, получение installation token
- Шаг 9: привязка GitHub installation ID к Marcus user ID, encrypt и store в KV

Все остальное (DCR, PKCE, token refresh, audience binding) - библиотека.

## Что видит юзер vs что видит разработчик

**Юзер видит:**
- Один popup с GitHub login
- Один экран "Authorize Marcus"
- Один экран "Install Marcus App on marcus-vault"

**Разработчик в логах видит:**
- POST /register (Claude DCR)
- GET /authorize (Claude redirect)
- GET /github/callback (юзер вернулся)
- POST /token (Claude обменял auth code)
- POST /sse (первый MCP tool call)

Типичный onboarding 30-45 секунд от вставки URL до первого работающего MCP запроса.

## Что если Cloudflare Worker умер?

Юзер: ничего страшного.

- GitHub репо остается в его аккаунте, все .md файлы лежат
- Юзер может склонировать репо локально
- Юзер может открыть в Obsidian, VS Code, любом markdown редакторе
- Когда Marcus вернется, juicer заходит обратно в Settings → Connectors, проверяет что коннектор активен, продолжает работать

Это lead marketing claim Marcus: **"даже если мы умрем завтра, твой second brain остается у тебя"**.
