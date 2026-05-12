# 05. Тарифы

## Финальные тарифы

| Tier | Monthly | Annual | MCP calls/day | Заметки | AI |
|---|---|---|---|---|---|
| Free | $0 | $0 | 30 | 100 max | BYOK only |
| Pro | $10/mo | $96/year ($8/mo) | 1000 | Unlimited | BYOK or proxy |
| Pro Plus | $15/mo | $144/year ($12/mo) | 5000 | Unlimited + voice | Proxy default + BYOK |
| Founders Lifetime | $99 one-time | — | Pro Plus level | Unlimited | BYOK or proxy |
| Family | $15/mo | — | Pro Plus level x5 | Каждый со своим репо | — |

Annual discount 20%. Education и non-profit 40% off (matches Obsidian).

## Логика выбора

**$10–15 — native pricing band 2026:**
- Saner $8 / $16
- Reflect $10
- Tana Plus $10 / Pro $18
- RemNote Pro $10 / Power $20
- Capacities Pro $11.99
- Rosebud $12.99
- Mem Pro $14.99
- NotebookLM Plus $20

Ниже $10 — reads as commodity. Выше $20 — нужно hardware или enterprise positioning.

**Free tier 30 calls/day:**
- ~5 chat sessions per day — достаточно почувствовать value
- Достаточно тесно для conversion на Pro
- BYOK only защищает unit economics на free

**Founders Lifetime $99:**
- Mirrors Obsidian Catalyst tier
- Early-adopter signal "this team isn't planning to flip"
- Critical для privacy-crowd word-of-mouth

**Family $15 для 5 seats:**
- Каждый со своим репо
- Решает Day One Family-Sharing complaint которая годами bleeds customers

## BYOK vs proxy

**Hybrid: proxy default, BYOK toggle.**

Pure BYOK выкидывает 80% mass-market. Pure proxy убивает margins на scale (Claude Sonnet $3/$15 per million tokens, один power user 5000 calls/day ломает unit economics).

Когда юзер даёт свой Claude / OpenAI / Perplexity ключ, rate limits становятся "fair-use unlimited" capped 50000/day для prevention runaway scripts.

API keys никогда не хранятся в plaintext server-side: encrypt at rest user-derived key или store client-side и pass-through (Standard Notes E2EE model).

## Pitch

> "$10 чтобы $20 AI которые ты уже платишь наконец-то помнили тебя"

Юзер уже платит $20–60/mo за Claude Pro + ChatGPT Plus + Perplexity Pro. Marcus не должен feel like another $20 — это слой памяти на существующий стек.
