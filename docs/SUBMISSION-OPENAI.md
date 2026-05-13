# Marcus — OpenAI ChatGPT Apps Submission Guide

**Form:** https://platform.openai.com/apps-manage  
**Source JSON:** `marcus-mcp-server/submissions/openai-app.json`

Fill each field below by copying the provided value. Items marked **→ TBD-ROMAN** require manual input from you before submitting.

---

## App Name

```
Marcus - Auto Second Brain
```

---

## Subtitle / Tagline (≤80 chars)

```
Private memory vault
```

---

## Description

Marcus is a personal knowledge management MCP server that stores your notes, memories, and daily logs in a private GitHub repository you own. It connects to ChatGPT via the Model Context Protocol, giving ChatGPT 14 tools to create, search, retrieve, and link notes — so your conversations can draw on and contribute to a persistent second brain without any extra apps or databases.

Every piece of data lives in Markdown files inside your own GitHub repo under a structured folder hierarchy (daily notes, topics, projects, people, memories). You control access, you can read the files directly in GitHub, and you can export or delete everything at any time. Marcus uses GitHub OAuth and a GitHub App scoped to a single repository you choose; the installation token is encrypted at rest on the server, never logged, and revocable at any time from your GitHub installation settings.

Common workflows include capturing book notes or meeting summaries mid-conversation, searching your vault by keyword or topic, appending to a rolling daily note, and storing durable preferences (like writing style or recurring instructions) that ChatGPT retrieves automatically through the `recall` tool.

---

## Category

```
PRODUCTIVITY
```

---

## Icon

```
https://marcus-second-brain.com/img/submission/icon-1024.png
```

1024×1024 PNG, transparent background.

---

## Screenshots (5, 16:9 / 1920×1080)

```
https://marcus-second-brain.com/img/submission/screenshots/openai/s1-1920x1080.png
https://marcus-second-brain.com/img/submission/screenshots/openai/s2-1920x1080.png
https://marcus-second-brain.com/img/submission/screenshots/openai/s3-1920x1080.png
https://marcus-second-brain.com/img/submission/screenshots/openai/s4-1920x1080.png
https://marcus-second-brain.com/img/submission/screenshots/openai/s5-1920x1080.png
```

---

## Demo Video

```
https://marcus-second-brain.com/demo.mov
```

5.5 MB QuickTime (H.264). Hosted on Cloudflare Workers static assets. If OpenAI portal rejects .mov, re-export from QuickTime as .mp4 and redeploy.

---

## MCP Endpoint

```
https://marcus-second-brain.com/mcp
```

---

## Authentication

| Field | Value |
|---|---|
| Auth type | OAuth 2.0 |
| PKCE | Required (`S256`) |
| Dynamic client registration | Yes (RFC 7591) |
| Registration endpoint | `https://marcus-second-brain.com/register` |
| Authorization endpoint | `https://marcus-second-brain.com/authorize` |
| Token endpoint | `https://marcus-second-brain.com/token` |

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

## Support Email

```
r@resrom.com
```

---

## Developer Name

**→ TBD-ROMAN: enter "Roman Resenchuk" or your registered company name.**

---

## Version

```
0.3.0
```

---

## Launch Date

**→ TBD-ROMAN: choose a public launch date. Must align with the date you flip the listing to public.**

---

## Test Account Instructions for Reviewers

Provide these instructions verbatim in the reviewer instructions field:

1. Create a new GitHub account (e.g. `marcus-reviewer-2026`) and generate a personal access token with `repo` scope.
2. Visit https://marcus-second-brain.com and click **Add to ChatGPT** to begin the OAuth flow. Complete GitHub OAuth and app installation (4 clicks).
3. Run the vault seed script to populate 6 sample notes:
   ```
   GITHUB_TOKEN=<your-PAT> npx ts-node scripts/seed-reviewer-vault.ts
   ```
   (Script is in the `marcus-mcp-server/` directory.)
4. Try these 7 sample prompts in ChatGPT:
   - "Save a note in my second brain about the book Atomic Habits: key insight is habits compound over time. Tags: books, productivity."
   - "Search my second brain for anything I saved about Cloudflare Workers."
   - "Open the note at 20-topics/cloudflare-workers.md from my vault."
   - "Add to today's daily note that I met Alex from the product team and we agreed to sync weekly."
   - "Remember that I prefer short direct standup updates, then recall my preferences."
   - "Append a new section to 40-projects/website-redesign.md with the heading 'Launch Blockers' and one bullet point."
   - "Forget the memory with block id id-a1b2c3."

Expected outputs are described in `marcus-mcp-server/submissions/openai-app.json` under `test_cases`.

---

## EU / EEA / UK Distribution

In the distribution settings, tick the acknowledgement box for EEA, Switzerland, and UK distribution. OpenAI handles user-surface blocking for restricted regions — no server-side geo-filtering required on Marcus's end.

---

## Before Submitting — Roman's Checklist

- [ ] Record the 45-second demo video using `docs/DEMO-VIDEO-SCRIPT.md` and paste the URL above. Demo video is a required field.
- [ ] Choose a launch date and fill in the field above.
- [ ] Confirm developer name (personal vs. company).
- [ ] Verify all 5 screenshot images are uploaded at the `/img/submission/screenshots/openai/` URLs.
- [ ] Verify MCP endpoint health: `curl https://marcus-second-brain.com/health` returns 200.
- [ ] Tick the EEA/CH/UK distribution acknowledgement box.
- [ ] Have your OpenAI platform account credentials ready — form is at https://platform.openai.com/apps-manage.

See `docs/SUBMISSION-OPENAI.md` for the paste-ready submission guide.
