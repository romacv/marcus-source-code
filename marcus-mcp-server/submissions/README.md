# Submission files

This directory contains ready-to-submit configuration files for each marketplace that lists Marcus — Auto Second Brain.

---

## Files

### `openai-app.json`

**Target:** OpenAI ChatGPT Apps submission form  
**Form URL:** https://chatgpt.com/apps/submit (or the developer portal at platform.openai.com)

Derived from `../chatgpt-app-submission.json` (the source of truth for tool annotations). Adds the fields required by the OpenAI Apps schema v1:

- `server` — MCP server URL, OAuth 2.0 endpoints, dynamic client registration URL, and scopes
- `privacy_policy_url`, `terms_of_service_url`, `support_email`
- `developer` — name and contact email
- `version`, `icon_url`, `demo_video_url`, `screenshots`
- `app_info.launch_date`
- `title` annotation on every tool entry

### `anthropic-connector.json`

**Target:** Anthropic Connector Directory submission form  
**Form URL:** https://www.anthropic.com/connectors/submit (check the Anthropic developer docs for the current URL)

A fresh JSON built for the Anthropic Connector Directory schema (no published JSON Schema URL as of May 2026). Covers OAuth PKCE flow, tested surfaces (claude.ai, claude-desktop), use cases, and full tool list with annotations.

---

## Fields marked `TBD-ROMAN`

The following fields need to be filled in before submitting:

| Field | Location | What to enter |
|---|---|---|
| `developer.name` | both files | Your public display name (e.g. "Roman Resenchuk") |
| `launch_date` | both files | ISO 8601 date of public launch (e.g. `"2026-06-01"`) |
| `demo_video_url` | both files | Public URL to a screen-recording demo (YouTube or direct MP4) |

---

## Screenshots

Screenshots are referenced but not yet uploaded. Track B generates them at:

- **OpenAI (1920×1080):** `https://marcus-second-brain.com/img/submission/screenshots/openai/s1-1920x1080.png` … `s5-1920x1080.png`
- **Anthropic (1280w):** `https://marcus-second-brain.com/img/submission/screenshots/anthropic/s1-1280w.png` … `s5-1280w.png`
- **Icon (OpenAI, 1024px):** `https://marcus-second-brain.com/img/submission/icon-1024.png`
- **Icon (Anthropic, 512px):** `https://marcus-second-brain.com/img/submission/icon-512.png`

Upload all assets to the Workers static assets before submitting.

---

## Full field-by-field submission guides

See the detailed paste-ready instructions in:

- `docs/SUBMISSION-OPENAI.md` — step-by-step for the ChatGPT Apps form
- `docs/SUBMISSION-ANTHROPIC.md` — step-by-step for the Anthropic Connector Directory form

(Create those docs files if deeper per-field guidance is needed before the submission review.)
