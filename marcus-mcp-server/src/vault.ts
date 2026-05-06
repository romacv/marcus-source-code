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

// Returns the vault path for today's daily note.
// Format: 00-daily/YYYY/MM/YYYY-MM-DD.md
export function dailyNotePath(date: Date): string {
	const y = date.getUTCFullYear().toString();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `00-daily/${y}/${m}/${y}-${m}-${d}.md`;
}

// Moves a vault path into the 90-archive/ folder.
export function archivePath(path: string): string {
	return `90-archive/${path}`;
}
