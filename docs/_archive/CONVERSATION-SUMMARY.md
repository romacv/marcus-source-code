> **ARCHIVED 2026-05-06. Заменён README + MVP-PROTOTYPE-PLAN.md. Только для исторической справки.**

---

# Marcus project - саммари переписки для нового чата

> Контекст для продолжения работы над проектом Marcus в новом чате с Claude.

## Кто я

Senior iOS Software Developer, 14+ лет опыта (Swift, SwiftUI, UIKit, Apple frameworks). Сейчас работаю в Paste (pasteapp.io). Базируюсь в Ubud, Bali. Запускаю side project Marcus.

Использую TypeScript на Cloudflare Workers для backend (не Swift). Знаком с MCP протоколом, Anthropic Connectors Directory, GitHub API.

## Что такое Marcus

**Marcus - Auto Second Brain**

Приватная AI-powered база знаний жизни. Юзер записывает все (заметки, дневник, фото-саммари), хранится в его собственном приватном GitHub репозитории как связанные .md файлы.

**Killer feature:** remote MCP коннектор для Claude / ChatGPT / Perplexity. Юзер общается с AI как обычно, чат автоматически саммаризируется в репо, на любой вопрос ассистент находит контекст из прошлого через MCP search.

## Зафиксированные решения (не пересматриваем)

### Продукт
- Целевой юзер - **массовый рынок** (не developers, не power users)
- Privacy - **end-to-end** (chat -> connector -> user GitHub)
- Storage MVP - **GitHub приватный репо юзера**
- Storage v2 - iCloud Drive / Google Drive как **описания файлов** (markdown описывает контент, не embed файлы)
- CRUD - **полный** с управлением структурой

### Stack
- Backend - **TypeScript на Cloudflare Workers** (категорически не Swift)
- Hosting - Cloudflare Workers Paid $5/mo, escape hatch на Hetzner CAX11
- Server posture - **contentless** (не stateless как изначально писал, а именно contentless: контент юзера не хранится, но minimum credentials хранятся encrypted в Workers KV)

### GTM
- **Сарафан + социальные сети**, без paid ads
- Tier 1: r/ClaudeAI, r/ObsidianMD, r/LocalLLaMA, Show HN, r/ChatGPT
- Submission в Anthropic Connectors Directory и ChatGPT Apps Directory в конце Q3 2026

### Pricing
- Free $0: 50 MCP calls/day, 100 notes max, BYOK only
- Pro $10/mo ($96/year): 1000 calls/day, unlimited notes, hybrid AI
- Pro Plus $15/mo ($144/year): 5000 calls/day, voice, multi-device
- Founders Lifetime $99 one-time
- Family $15/mo для 5 seats
- BYOK + proxy hybrid (proxy default)

### Brand
- Название - **Marcus** (filed как stylized или compound, не bare word)
- Title/tagline - **"Marcus - Auto Second Brain"**
- Trademark scope - Classes 9 + 42, US first, нужен attorney
- **Никогда** не использовать "Building a Second Brain" anywhere (Forte Labs trademark)
- **Никогда** не делать "Second Brain" legal product name

### AutoJournal (v2)
- После MVP, в iOS app, по запросу юзера
- AI processing on-device через Apple Foundation Models (iOS 26+)
- В репо только текстовые описания (не сами фото)
