# Memory Sync MCP

## Goal

Marcus is the source of truth for durable memories. Claude memory is optional cache.
The `marcus-mcp-server` exposes four memory tools backed by the user's private
GitHub vault.

## Storage

Active memories live in `15-memory/<category>.md`.

Categories:

- `hardware`
- `finance`
- `health`
- `work`
- `travel`
- `personal`
- `decisions`

Each memory is one markdown list item:

```md
- [2026-05-06] Bought M4 Mac mini base 16/256. ^id-b1k2m7 <!-- ttl:365 -->
```

Expired memories are hidden lazily on read. `forget` archives by striking the
source line and appending a backlink in `15-memory/_archive.md`.

## Tools

`remember({ content, category, date?, ttl? })`

Stores a memory in `15-memory/<category>.md` and appends a wikilink to today's
daily note in the same GraphQL commit.

`forget({ query })`

Finds one active memory by block id or text query, strikes the source line, and
adds a link to `_archive.md` in one GraphQL commit.

`recall({ query, category?, limit? })`

Returns active matching memories only. Archived and expired entries are filtered
out.

`sync_to_claude_memory({})`

Read-only. Returns the newest active memories as markdown for manual insertion
into Claude memory. It does not write to the vault or Claude memory.

## System Prompt

When the user asks to remember, forget, recall, or sync memory, use only Marcus
memory tools:

- Use `marcus.remember` for "remember", "save this", "запомни", "сохрани".
- Use `marcus.forget` for "forget", "delete this memory", "забудь", "удали из памяти".
- Use `marcus.recall` for "what do you remember", "что ты помнишь", "найди в памяти".
- Use `marcus.sync_to_claude_memory` when the user asks to refresh Claude memory
  from Marcus.

Do not write directly to `memory_user_edits`. Marcus vault remains the source of
truth.
