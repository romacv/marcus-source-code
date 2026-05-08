export const VAULT_REPO_NAME = "marcus-second-brain-vault";

export const MEMORY_CATEGORIES = [
	"hardware",
	"finance",
	"health",
	"work",
	"travel",
	"personal",
	"decisions",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const VAULT_TOPIC_FOLDERS = [
	"00-daily",
	"10-journal",
	"15-memory",
	"20-topics",
	"30-people",
	"40-projects",
	"50-resources",
	"60-photos",
	"90-archive",
] as const;

function titleCase(value: string): string {
	return value.slice(0, 1).toUpperCase() + value.slice(1);
}

const README_CONTENT = `# Marcus — Your Second Brain

Your personal vault, managed by [Marcus](https://marcus-second-brain.com).
Talk to it from Claude using the Marcus connector — every note here was
written by you (or by Claude on your behalf).

## Folders

- [\`00-daily/\`](./00-daily/) — Daily notes, organized as \`YYYY/MM/YYYY-MM-DD.md\`
- [\`10-journal/\`](./10-journal/) — Longer journal entries
- [\`15-memory/\`](./15-memory/) — Long-term memory by category
  - [hardware](./15-memory/hardware.md) · [finance](./15-memory/finance.md) · [health](./15-memory/health.md) · [work](./15-memory/work.md) · [travel](./15-memory/travel.md) · [personal](./15-memory/personal.md) · [decisions](./15-memory/decisions.md) · [_archive](./15-memory/_archive.md)
- [\`20-topics/\`](./20-topics/) — Topic-organized notes
- [\`30-people/\`](./30-people/) — Notes about people
- [\`40-projects/\`](./40-projects/) — Projects
- [\`50-resources/\`](./50-resources/) — Reference resources, links, clippings
- [\`60-photos/\`](./60-photos/) — Photos
- [\`90-archive/\`](./90-archive/) — Archived notes

## Other files

- [\`index.md\`](./index.md) — Vault index
- [\`_marcus/\`](./_marcus/) — Marcus internal metadata (do not edit)

## How to use

- **Capture a memory**: *"Remember that I prefer dark mode"* → \`15-memory/personal.md\`
- **Daily log**: *"Add to today: shipped feature X"* → appends to today's daily note
- **Recall**: *"What did I write about Foo last week?"* → semantic search across the vault
- **Browse**: open any folder above on GitHub to read your notes directly

> This README is generated on first connect. Edit freely — Marcus will not
> overwrite it.
`;

export const VAULT_SEED_FILES: Array<{ path: string; content: string }> = [
	{ path: "README.md", content: README_CONTENT },
	{ path: "00-daily/.gitkeep", content: "" },
	{ path: "10-journal/.gitkeep", content: "" },
	...MEMORY_CATEGORIES.map((category) => ({
		path: memoryPath(category),
		content: `# ${titleCase(category)}\n\n`,
	})),
	{ path: memoryArchivePath(), content: "# Memory Archive\n\n" },
	{ path: "20-topics/.gitkeep", content: "" },
	{ path: "30-people/.gitkeep", content: "" },
	{ path: "40-projects/.gitkeep", content: "" },
	{ path: "50-resources/.gitkeep", content: "" },
	{ path: "60-photos/.gitkeep", content: "" },
	{ path: "90-archive/.gitkeep", content: "" },
	{ path: "_marcus/version.txt", content: "1" },
	{
		path: "index.md",
		content: "# Marcus Vault\n\nYour personal second brain. Managed by [Marcus](https://marcus-second-brain.com). See [README.md](./README.md) for navigation.\n",
	},
];

// ULID: 26-char, time-sortable, URL-safe. No external dep — pure WebCrypto.
export function generateUlid(): string {
	const TIME_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
	const ts = Date.now();
	let time = "";
	let t = ts;
	for (let i = 9; i >= 0; i--) {
		time = TIME_CHARS[t % 32] + time;
		t = Math.floor(t / 32);
	}
	const randomBytes = crypto.getRandomValues(new Uint8Array(10));
	let rand = "";
	for (const byte of randomBytes) {
		rand += TIME_CHARS[byte % 32];
	}
	return time + rand;
}

type FrontmatterFields = {
	id?: string;
	created?: string;
	updated?: string;
	tags?: string[];
	source?: string;
	summary?: string;
	links?: string[];
	people?: string[];
	status?: string;
	stub?: boolean;
	[key: string]: unknown;
};

// Serializes frontmatter object to YAML block (simple key: value, no nested objects).
export function buildFrontmatter(fields: FrontmatterFields): string {
	const lines = ["---"];
	const order = ["id", "created", "updated", "tags", "source", "summary", "links", "people", "status"];
	const written = new Set<string>();

	for (const key of order) {
		if (fields[key] === undefined) continue;
		written.add(key);
		const val = fields[key];
		if (Array.isArray(val)) {
			if (val.length === 0) {
				lines.push(`${key}: []`);
			} else {
				lines.push(`${key}:`);
				for (const item of val) lines.push(`  - ${item}`);
			}
		} else {
			lines.push(`${key}: ${JSON.stringify(val)}`);
		}
	}

	for (const [key, val] of Object.entries(fields)) {
		if (written.has(key)) continue;
		if (val === undefined) continue;
		lines.push(`${key}: ${JSON.stringify(val)}`);
	}

	lines.push("schema_version: 1");
	lines.push("---");
	return lines.join("\n");
}

type ParsedNote = {
	frontmatter: FrontmatterFields;
	body: string;
};

// Extracts YAML frontmatter from markdown. Returns raw parsed object + body.
export function parseFrontmatter(content: string): ParsedNote {
	const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!match) return { frontmatter: {}, body: content };

	const yamlBlock = match[1];
	const body = match[2].trim();
	const frontmatter: FrontmatterFields = {};

	let currentKey: string | null = null;
	let currentArray: string[] | null = null;

	for (const line of yamlBlock.split("\n")) {
		const arrayItem = line.match(/^  - (.+)$/);
		if (arrayItem && currentKey && currentArray) {
			currentArray.push(arrayItem[1].trim());
			continue;
		}

		if (currentKey && currentArray) {
			frontmatter[currentKey] = currentArray;
			currentKey = null;
			currentArray = null;
		}

		const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
		if (!kv) continue;
		const [, key, rawVal] = kv;
		const val = rawVal.trim();

		if (val === "" || val === "[]") {
			if (val === "") {
				currentKey = key;
				currentArray = [];
			} else {
				frontmatter[key] = [];
			}
			continue;
		}

		try {
			frontmatter[key] = JSON.parse(val);
		} catch {
			frontmatter[key] = val;
		}
	}

	if (currentKey && currentArray) {
		frontmatter[currentKey] = currentArray;
	}

	return { frontmatter, body };
}

const AUTO_TAG_VOCAB = new Set([
	"android",
	"api",
	"claude",
	"cloudflare",
	"compose",
	"codex",
	"docker",
	"figma",
	"github",
	"ios",
	"iterm",
	"linear",
	"macos",
	"mcp",
	"node",
	"oauth",
	"react",
	"slack",
	"swift",
	"swiftui",
	"typescript",
	"wrangler",
	"xcode",
]);

const AUTO_TAG_STOP_WORDS = new Set([
	"about",
	"after",
	"also",
	"and",
	"are",
	"but",
	"for",
	"from",
	"have",
	"into",
	"not",
	"that",
	"the",
	"this",
	"with",
	"you",
]);

export function extractAutoTags(content: string, frontmatter: FrontmatterFields = {}): string[] {
	if (Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0) return frontmatter.tags;

	const counts = new Map<string, number>();
	for (const raw of content.toLowerCase().match(/[a-z][a-z0-9+#.-]{1,}/g) ?? []) {
		const tag = raw.replace(/^[.#]+|[.#]+$/g, "");
		if (!AUTO_TAG_VOCAB.has(tag) || AUTO_TAG_STOP_WORDS.has(tag)) continue;
		counts.set(tag, (counts.get(tag) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, 5)
		.map(([tag]) => tag);
}

// Returns the vault path for today's daily note.
// Format: 00-daily/YYYY/MM/YYYY-MM-DD.md
export function dailyNotePath(date: Date): string {
	const y = date.getUTCFullYear().toString();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `00-daily/${y}/${m}/${y}-${m}-${d}.md`;
}

export function memoryPath(category: MemoryCategory): string {
	return `15-memory/${category}.md`;
}

export function memoryArchivePath(): string {
	return "15-memory/_archive.md";
}

// Moves a vault path into the 90-archive/ folder.
export function archivePath(path: string): string {
	return `90-archive/${path}`;
}
