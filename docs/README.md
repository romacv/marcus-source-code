# Marcus - Second Brain: Project Workspace

Полный архив проекта Marcus. Экспортирован из чата 26 апреля 2026, реструктурирован 6 мая 2026.

**Start here →** [MVP-PROTOTYPE-PLAN.md](./MVP-PROTOTYPE-PLAN.md)

## Структура

| Файл | Что внутри |
|---|---|
| [MVP-PROTOTYPE-PLAN.md](./MVP-PROTOTYPE-PLAN.md) | **Ведущий документ.** Фазы P0–P6, acceptance criteria, команды |
| [00-vision.md](./00-vision.md) | Что такое Marcus, аудитория, privacy posture, MVP юзкейс, pitch |
| [01-research-report.md](./01-research-report.md) | TL;DR + полный отчёт по конкурентам, рынку, рискам |
| [02-architecture.md](./02-architecture.md) | Техническая архитектура: MVP scope + Beyond MVP |
| [03-mcp-oauth-flow.md](./03-mcp-oauth-flow.md) | OAuth flow: как юзер подключает коннектор за 30 сек |
| [04-mcp-connector-guide.md](./04-mcp-connector-guide.md) | Руководство по размещению в Anthropic и ChatGPT директориях |
| [05-pricing.md](./05-pricing.md) | Тарифы, BYOK/proxy логика, pitch |
| [06-naming-and-trademark.md](./06-naming-and-trademark.md) | Название Marcus, домены, "Second Brain" safety |
| [07-roadmap-and-decisions.md](./07-roadmap-and-decisions.md) | Зафиксированные решения, roadmap, risk register, GTM |
| [08-v2-autojournal.md](./08-v2-autojournal.md) | AutoJournal концепция (не MVP, v2 iOS app) |

## Статус

Фаза: **P0 — Admin**. Все зафиксированные решения → [07-roadmap-and-decisions.md](./07-roadmap-and-decisions.md).

## Главные риски (active)

1. **GitHub UX hurdle для mass market** — скрыть "GitHub" под "your private vault"
2. **Anthropic / OpenAI / Perplexity platform risk** — митигация: multi-vendor + GitHub-as-storage means data survives shutdown
3. **Apple App Store Guideline 5.1.2(i)** (ноябрь 2025) — per-AI-provider consent для v2 iOS app
4. **Trademark Marcus** — filing stylized/compound, attorney engaged
