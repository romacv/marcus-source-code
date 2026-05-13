# Marcus — Anthropic Connector Directory Submission Guide

**Form:** https://clau.de/mcp-directory-submission  
**Source JSON:** `marcus-mcp-server/submissions/anthropic-connector.json`

Fill each field below by copying the provided value. Items marked **→ TBD-ROMAN** require manual input from you before submitting.

---

## Connector Name

```
Marcus - Auto Second Brain
```

---

## Tagline (≤120 chars)

```
Your AI-powered private memory vault backed by GitHub
```

---

## Long Description

Marcus is a personal knowledge management MCP server that stores your notes, memories, and daily logs in a private GitHub repository you own. It connects to Claude via the Model Context Protocol, giving Claude 14 tools to create, search, retrieve, and link notes — so your conversations can draw on and contribute to a persistent second brain without any extra apps or databases.

Every piece of data lives in Markdown files inside your own GitHub repo under a structured folder hierarchy (daily notes, topics, projects, people, memories). You control access, you can read the files directly in GitHub, and you can export or delete everything at any time. Marcus never stores credentials — it uses GitHub OAuth so your token stays in your browser session.

Common workflows include capturing book notes or meeting summaries mid-conversation, searching your vault by keyword or topic, appending to a rolling daily note, and storing durable preferences (like writing style or recurring instructions) that Claude retrieves automatically through the `recall` tool.

---

## Server URL

```
https://marcus-second-brain.com/mcp
```

---

## Transport

```
Streamable HTTP
```

---

## OAuth Configuration

| Field | Value |
|---|---|
| Authorization endpoint | `https://marcus-second-brain.com/authorize` |
| Token endpoint | `https://marcus-second-brain.com/token` |
| Registration endpoint | `https://marcus-second-brain.com/register` |
| PKCE | Required (`S256`) |
| Dynamic client registration | Yes (RFC 7591) |
| Redirect URIs | `https://claude.ai/api/mcp/auth_callback` |
| | `https://claude.com/api/mcp/auth_callback` |

---

## Icon

```
https://marcus-second-brain.com/img/submission/icon-512.png
```

512×512 PNG, transparent background.

---

## Screenshots (5)

```
https://marcus-second-brain.com/img/submission/screenshots/anthropic/s1-1280w.png
https://marcus-second-brain.com/img/submission/screenshots/anthropic/s2-1280w.png
https://marcus-second-brain.com/img/submission/screenshots/anthropic/s3-1280w.png
https://marcus-second-brain.com/img/submission/screenshots/anthropic/s4-1280w.png
https://marcus-second-brain.com/img/submission/screenshots/anthropic/s5-1280w.png
```

---

## Demo Video

**→ TBD-ROMAN: paste YouTube or Loom URL here after recording the 45-second demo (see `docs/DEMO-VIDEO-SCRIPT.md`).**

---

## Support Email

```
r@resrom.com
```

---

## Privacy Policy URL

```
https://marcus-second-brain.com/privacy
```

---

## Terms of Service URL

```
https://marcus-second-brain.com/terms
```

---

## Launch Date

**→ TBD-ROMAN: choose a public launch date (e.g. 2026-06-01). Must be ≥ the date the listing goes live.**

---

## Developer / Legal Name

**→ TBD-ROMAN: enter "Roman Resenchuk" or your registered company name if submitting under a business.**

---

## Tools (14)

List all 14 tools in the form's tool manifest field:

| Tool | Description |
|---|---|
| `create_note` | Create a new Markdown note at a given vault path |
| `update_note` | Overwrite the content of an existing note |
| `delete_note` | Delete a note from the vault |
| `search_notes` | Full-text search across all vault notes |
| `get_vault_context` | Return high-level vault stats and recent activity |
| `get_note` | Retrieve a specific note by path |
| `list_structure` | List the folder/file tree of the vault |
| `append_to_daily_note` | Append a block of text to today's daily note |
| `remember` | Store a durable memory block with a block ID |
| `forget` | Delete a specific memory block by block ID |
| `recall` | Retrieve memory blocks matching a query |
| `sync_to_claude_memory` | Push key memories into Claude's persistent memory |
| `link_notes` | Add a wiki-style link between two notes |
| `get_recent_notes` | Return the N most recently modified notes |

---

## Use Cases (5)

Paste these into the use-cases field:

1. **Capture knowledge mid-conversation** — Ask Claude to save a book summary, meeting outcome, or research finding directly into your vault without switching apps.
2. **Search your personal knowledge base** — Retrieve notes by keyword, topic, or tag while chatting; Claude surfaces the right context automatically.
3. **Maintain a rolling daily log** — Append tasks, decisions, and reflections to a dated daily note that accumulates over time.
4. **Store and recall personal preferences** — Remember writing style, recurring instructions, or personal context once; `recall` retrieves them in any future session.
5. **Link and cross-reference notes** — Create connections between related notes (people ↔ projects ↔ topics) so your vault becomes a navigable knowledge graph.

---

## Tested Surfaces

- [x] claude.ai (web)
- [x] Claude Desktop (macOS)

---

## Before Submitting — Roman's Checklist

- [ ] Record the 45-second demo video using `docs/DEMO-VIDEO-SCRIPT.md` and paste the URL above.
- [ ] Choose a launch date and fill in the field above.
- [ ] Confirm whether to submit under personal name or a registered company name.
- [ ] Verify all 5 screenshot images are uploaded and reachable at the `/img/submission/screenshots/anthropic/` URLs.
- [ ] Have your Anthropic account credentials ready — the form requires sign-in to https://clau.de/mcp-directory-submission.

---

## Anthropic-Specific Requirements

Anthropic requires a **public help-center article or blog post** describing how to install and use Marcus to be live by the go-live date. Prepare a short article (400–600 words, with the OAuth install steps and 3 example prompts) on your website or a public platform (dev.to, Medium, your own blog) before the listing is published.
