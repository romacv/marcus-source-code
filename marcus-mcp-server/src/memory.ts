export type ParsedMemoryLine = {
	date: string;
	content: string;
	blockId: string;
	ttlDays?: number;
	archived: boolean;
};

const BLOCK_ID_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";
const MEMORY_LINE_RE =
	/^(?<archived>~~)?- \[(?<date>\d{4}-\d{2}-\d{2})\] (?<content>.*?) \^(?<blockId>id-[a-z0-9]{6})(?: <!-- ttl:(?<ttlDays>\d+) -->)?(?:~~)?(?: <!-- archived \d{4}-\d{2}-\d{2} -->)?$/;

export function generateBlockId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(6));
	let id = "";
	for (const byte of bytes) id += BLOCK_ID_CHARS[byte % BLOCK_ID_CHARS.length];
	return `id-${id}`;
}

export function normalizeBlockId(value: string): string {
	return value.trim().replace(/^\^/, "");
}

function normalizeContent(content: string): string {
	const trimmed = content.trim().replace(/\s+/g, " ");
	if (!trimmed) return trimmed;
	return /[.!?)]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatMemoryLine(opts: {
	date: string;
	content: string;
	blockId: string;
	ttlDays?: number;
}): string {
	const ttl = opts.ttlDays ? ` <!-- ttl:${opts.ttlDays} -->` : "";
	return `- [${opts.date}] ${normalizeContent(opts.content)} ^${normalizeBlockId(opts.blockId)}${ttl}`;
}

export function parseMemoryLine(line: string): ParsedMemoryLine | null {
	const match = line.match(MEMORY_LINE_RE);
	if (!match?.groups) return null;
	const ttlDays = match.groups.ttlDays ? Number(match.groups.ttlDays) : undefined;
	return {
		date: match.groups.date,
		content: match.groups.content,
		blockId: match.groups.blockId,
		ttlDays,
		archived: Boolean(match.groups.archived) || line.includes("<!-- archived "),
	};
}

export function isExpired(date: string, ttlDays: number | undefined, now: Date): boolean {
	if (!ttlDays) return false;
	const start = Date.parse(`${date}T00:00:00.000Z`);
	if (Number.isNaN(start)) return false;
	return start + ttlDays * 86_400_000 <= now.getTime();
}
