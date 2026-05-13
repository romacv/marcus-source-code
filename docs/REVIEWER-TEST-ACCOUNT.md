# Marcus — Reviewer Test Account Setup

Instructions for app store reviewers to set up a working Marcus vault and verify the tool suite.

---

## 1. Create a GitHub Account

Create a dedicated GitHub account for review purposes. Suggested username format: `marcus-reviewer-2026`.

After creating the account:
1. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Set expiration to 30 days.
4. Select the `repo` scope (full repository access).
5. Copy the token — you will need it in step 4.

---

## 2. Connect Marcus

Go to https://marcus-second-brain.com and click the **Add to Claude** (or **Add to ChatGPT**) button for the relevant platform.

This starts the OAuth flow:
1. You are redirected to GitHub to authorize the Marcus app.
2. GitHub prompts you to install the Marcus GitHub App on your account.
3. Select the reviewer account and confirm installation.
4. You are redirected back — Marcus is now connected.

The full flow takes approximately 4 clicks and under 60 seconds.

---

## 3. Create the Vault Repository

After OAuth completes, Marcus automatically creates a private GitHub repository named `marcus-second-brain-vault` in the reviewer account. Confirm the repo exists at:

```
https://github.com/marcus-reviewer-2026/marcus-second-brain-vault
```

If the repo was not created automatically, create it manually (empty, private) with that exact name.

---

## 4. Seed the Vault

Run the seed script from the `marcus-mcp-server/` directory. It writes 6 sample notes to the vault so the search and retrieval test cases have data to work with.

```bash
cd marcus-mcp-server
GITHUB_TOKEN=<reviewer-PAT> npx ts-node scripts/seed-reviewer-vault.ts
```

Or pass the token as a positional argument:

```bash
npx ts-node scripts/seed-reviewer-vault.ts <reviewer-PAT>
```

Expected output:
```
Authenticated as: marcus-reviewer-2026
Creating 20-topics/atomic-habits.md ... OK
Creating 40-projects/website-redesign.md ... OK
Creating 00-daily/2026-05-13.md ... OK
Creating 15-memory/preferences.md ... OK
Creating 30-people/alex.md ... OK
Creating 20-topics/cloudflare-workers.md ... OK
Seed complete. 6 files written.
```

---

## 5. Sample Prompts

Run these 7 prompts in the connected AI client (Claude or ChatGPT). Each tests a different set of Marcus tools.

### Prompt 1 — Save a note
> "Save a note in my second brain about the book Atomic Habits: key insight is habits compound over time. Tags: books, productivity."

**Expected:** Claude calls `create_note`, creates or updates `20-topics/atomic-habits.md`, confirms the note is saved.

---

### Prompt 2 — Search the vault
> "Search my second brain for anything I saved about Cloudflare Workers."

**Expected:** Claude calls `search_notes` with query "Cloudflare Workers", returns at least the seeded note `20-topics/cloudflare-workers.md` with a summary.

---

### Prompt 3 — Retrieve a specific note
> "Open the note at 20-topics/cloudflare-workers.md from my vault."

**Expected:** Claude calls `get_note` with path `20-topics/cloudflare-workers.md`, returns the full Markdown content of the file.

---

### Prompt 4 — Append to daily note
> "Add to today's daily note that I met Alex from the product team and we agreed to sync weekly."

**Expected:** Claude calls `append_to_daily_note`, appends the entry to `00-daily/2026-05-13.md` (or today's date), confirms the append.

---

### Prompt 5 — Remember and recall
> "Remember that I prefer short direct standup updates, then recall my preferences."

**Expected:** Claude calls `remember` to store the preference with a block ID, then immediately calls `recall` and returns the stored preference.

---

### Prompt 6 — Append a section to an existing note
> "Append a new section to 40-projects/website-redesign.md with the heading 'Launch Blockers' and one bullet point."

**Expected:** Claude calls `get_note` to read the current content, then `update_note` or `append_to_daily_note` to add the new section. Returns the updated note.

---

### Prompt 7 — Forget a memory
> "Forget the memory with block id id-a1b2c3."

**Expected:** Claude calls `forget` with block ID `id-a1b2c3`, confirms deletion. (The block may not exist in the seeded vault — confirm the tool returns a clean "not found" or "deleted" response without an unhandled error.)

---

## 6. Reviewer Credentials

Store the reviewer GitHub username and PAT in:

```
plans/marketplace-submissions/reviewer-creds.md
```

This path is listed in `.gitignore` and must **not** be committed to any public repository.

---

## 7. Health Check

Verify the server is reachable before running any prompts:

```bash
curl https://marcus-second-brain.com/health
```

Expected: HTTP 200 with a JSON body indicating healthy status.
