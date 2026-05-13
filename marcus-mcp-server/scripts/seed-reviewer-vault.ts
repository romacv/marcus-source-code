// Usage: npx ts-node scripts/seed-reviewer-vault.ts <GITHUB_PAT>
// Or:    GITHUB_TOKEN=<PAT> npx ts-node scripts/seed-reviewer-vault.ts

const REPO_NAME = "marcus-second-brain-vault";
const GITHUB_API = "https://api.github.com";

interface GitHubUser {
  login: string;
}

interface NoteFile {
  path: string;
  content: string;
}

const token = process.env.GITHUB_TOKEN ?? process.argv[2];

if (!token) {
  console.error("Error: provide a GitHub PAT via GITHUB_TOKEN env var or first argument.");
  process.exit(1);
}

async function githubGet<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function createOrUpdateFile(owner: string, path: string, content: string): Promise<void> {
  const encoded = Buffer.from(content, "utf-8").toString("base64");
  const url = `${GITHUB_API}/repos/${owner}/${REPO_NAME}/contents/${path}`;

  // Check if file exists to get its SHA (required for updates)
  let sha: string | undefined;
  const checkRes = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (checkRes.ok) {
    const existing = (await checkRes.json()) as { sha: string };
    sha = existing.sha;
  }

  const body: Record<string, unknown> = {
    message: `seed: add ${path}`,
    content: encoded,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`PUT ${path} → ${putRes.status}: ${err}`);
  }
}

const TODAY = "2026-05-13";
const CREATED_TS = `${TODAY}T10:00:00.000Z`;

const notes: NoteFile[] = [
  {
    path: "20-topics/atomic-habits.md",
    content: `---
id: seed-001
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [books, productivity]
---

# Atomic Habits — James Clear

## Key Insight

Habits compound over time. A 1% improvement every day produces a 37x improvement over a year. The quality of your life depends on the quality of your habits.

## Core Framework

- **Cue** — the trigger that initiates the habit
- **Craving** — the motivational force behind every habit
- **Response** — the actual habit you perform
- **Reward** — the end goal of every habit

## Memorable Quotes

> "You do not rise to the level of your goals. You fall to the level of your systems."

> "Every action you take is a vote for the type of person you wish to become."

## Action Items

- [ ] Design environment to make good habits obvious
- [ ] Use habit stacking: after [CURRENT HABIT], I will [NEW HABIT]
- [ ] Track streaks with a simple calendar mark
`,
  },
  {
    path: "40-projects/website-redesign.md",
    content: `---
id: seed-002
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [project, web]
---

# Project: Website Redesign

**Status:** In progress
**Target launch:** Q3 2026

## Goal

Redesign the public landing page to better communicate Marcus's value proposition and improve conversion from visitor to OAuth install.

## Launch Checklist

- [ ] Finalize copy for hero section
- [ ] Design and export new icon set (512px, 1024px variants)
- [ ] Capture 5 screenshot assets per platform (Anthropic, OpenAI)
- [ ] Record 45-second demo video
- [ ] Write help-center article (required for Anthropic submission)
- [ ] Set up Open Graph and Twitter Card meta tags
- [ ] Run Lighthouse audit — target score ≥ 90 on all metrics
- [ ] Verify privacy policy and terms pages are live
- [ ] Test OAuth flow end-to-end in production

## Notes

Use Cloudflare Workers for edge delivery. Keep the page under 100 KB total (JS + CSS + HTML).
`,
  },
  {
    path: `00-daily/${TODAY}.md`,
    content: `---
id: seed-003
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [daily]
---

# Daily Note — ${TODAY}

## Log

- Seeded reviewer vault for marketplace submission testing
- Connected Marcus to claude.ai — OAuth flow took < 60 seconds

## Tasks

- [ ] Record demo video
- [ ] Upload screenshots to submission URLs
- [ ] Fill in launch date in submission guides
`,
  },
  {
    path: "15-memory/preferences.md",
    content: `---
id: seed-004
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [memory, preferences]
---

# Preferences

Stored durable memory blocks. Each block has a stable ID used by the \`forget\` tool.

I prefer short direct standup updates — one sentence per item, no preamble, no "I was working on". ^id-pref-001

I write in American English and prefer active voice over passive voice in all communications. ^id-pref-002
`,
  },
  {
    path: "30-people/alex.md",
    content: `---
id: seed-005
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [people]
---

# Alex

**Role:** Product team
**Met:** ${TODAY}

## Notes

Met Alex from the product team. Agreed to sync weekly on roadmap alignment.

## Follow-ups

- [ ] Schedule recurring weekly sync
- [ ] Share the current roadmap doc with Alex
`,
  },
  {
    path: "20-topics/cloudflare-workers.md",
    content: `---
id: seed-006
created: "${CREATED_TS}"
updated: "${CREATED_TS}"
tags: [cloudflare, infrastructure, deployment]
---

# Cloudflare Workers — Deployment Notes

Marcus runs entirely on Cloudflare Workers. No servers to manage, global edge deployment.

## Key Config

- Runtime: \`workerd\` (V8 isolates, not Node.js)
- Entry point: \`marcus-mcp-server/src/index.ts\`
- Wrangler config: \`wrangler.toml\` in \`marcus-mcp-server/\`
- Custom domain: \`marcus-second-brain.com\` — configured in Workers dashboard

## Deploy Commands

\`\`\`bash
# Deploy to production
wrangler deploy

# Preview (staging)
wrangler deploy --env staging
\`\`\`

## CI Auto-Deploy

Push to \`main\` triggers a GitHub Actions workflow that runs \`wrangler deploy\` automatically. Secrets (\`CLOUDFLARE_API_TOKEN\`, \`CLOUDFLARE_ACCOUNT_ID\`) are stored in GitHub repository secrets.

## Limits to Watch

- CPU time: 30 ms per request (free), 30 s (paid)
- Memory: 128 MB per isolate
- Subrequest limit: 1000 per request
`,
  },
];

async function main(): Promise<void> {
  let owner: string;
  try {
    const user = await githubGet<GitHubUser>("/user");
    owner = user.login;
    console.log(`Authenticated as: ${owner}`);
  } catch (err) {
    console.error("Failed to authenticate with GitHub:", err);
    process.exit(1);
    return;
  }

  let successCount = 0;

  for (const note of notes) {
    process.stdout.write(`Creating ${note.path} ... `);
    try {
      await createOrUpdateFile(owner, note.path, note.content);
      console.log("OK");
      successCount++;
    } catch (err) {
      console.log("FAILED");
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nSeed complete. ${successCount}/${notes.length} files written.`);
  if (successCount < notes.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
