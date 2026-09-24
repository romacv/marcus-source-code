import { z } from "zod";
import { buildFrontmatter, generateUlid, parseFrontmatter } from "./vault.ts";

export const REELS_FOLDER = "50-resources/reels";
export const REELS_INDEX_PATH = `${REELS_FOLDER}/_index.md`;
export const REELS_DAILY_HEADING = "Reels";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REEL_FILE_RE = /^50-resources\/reels\/(\d{4}-\d{2}-\d{2})-(.+)\.md$/;

export const ReelInputSchema = z.object({
	source: z.enum(["instagram", "youtube", "tiktok"]),
	source_id: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "source_id must be [A-Za-z0-9_-]"),
	url: z.string().url().max(2048),
	author: z.string().max(200).default(""),
	author_url: z.string().max(2048).default(""),
	published_at: z.string().regex(DATE_RE).optional(),
	duration_sec: z.number().min(0).default(0),
	title: z.string().max(500).default(""),
	description: z.string().max(20_000).default(""),
	frames: z
		.array(z.object({ time_sec: z.number().min(0), description: z.string().max(2_000) }))
		.max(30)
		.default([])
		.describe("Per-frame breakdown: what is on screen at each timestamp"),
	transcript: z.string().max(200_000).default(""),
	summary: z.string().max(2_000).default(""),
	bullets: z.array(z.string().max(1_000)).max(20).default([]),
	tags: z.array(z.string().max(64)).max(20).default([]),
	links: z.array(z.string().max(2048)).max(50).default([]),
	language: z.string().max(16).default(""),
});

export type ReelInput = z.infer<typeof ReelInputSchema>;

export function slugify(value: string, fallback = "unknown"): string {
	const slug = value
		.toLowerCase()
		.replace(/^@/, "")
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^[-.]+|[-.]+$/g, "")
		.slice(0, 40);
	return slug || fallback;
}

export function normalizeTags(tags: string[]): string[] {
	const out = new Set<string>(["reels"]);
	for (const tag of tags) {
		const t = tag
			.toLowerCase()
			.replace(/^#/, "")
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/^-+|-+$/g, "");
		if (t) out.add(t);
	}
	return [...out];
}

export function reelNotePath(input: Pick<ReelInput, "author" | "source_id">, createdDate: string): string {
	return `${REELS_FOLDER}/${createdDate}-${slugify(input.author)}-${input.source_id}.md`;
}

export function reelNoteName(path: string): string {
	return path.split("/").pop()!.replace(/\.md$/, "");
}

export type ReelFileEntry = { path: string; created: string; rest: string };

// Parses a reel note path into its created date and the "<author>-<source_id>" remainder.
export function parseReelPath(path: string): ReelFileEntry | null {
	const match = path.match(REEL_FILE_RE);
	if (!match) return null;
	return { path, created: match[1], rest: match[2] };
}

// Finds candidate notes for a source_id among vault paths. Callers confirm via frontmatter.
export function findReelPathsBySourceId(paths: string[], sourceId: string): string[] {
	return paths.filter((path) => {
		const entry = parseReelPath(path);
		return entry !== null && (entry.rest === sourceId || entry.rest.endsWith(`-${sourceId}`));
	});
}

function reelTitle(input: ReelInput): string {
	const raw = input.title.trim() || input.description.trim().split(/\s+/).slice(0, 10).join(" ");
	const title = raw.replace(/\s+/g, " ").trim();
	return title || `${input.source} ${input.source_id}`;
}

function listOrPlaceholder(items: string[]): string {
	const clean = items.map((item) => item.trim()).filter(Boolean);
	return clean.length ? clean.map((item) => `- ${item}`).join("\n") : "- (нет)";
}

function formatTimestamp(sec: number): string {
	const total = Math.max(0, Math.round(sec));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function framesSection(frames: ReelInput["frames"]): string {
	const clean = frames.filter((f) => f.description.trim());
	if (!clean.length) return "- (нет)";
	return [...clean]
		.sort((a, b) => a.time_sec - b.time_sec)
		.map((f) => `- ${formatTimestamp(f.time_sec)} - ${f.description.trim().replace(/\s+/g, " ")}`)
		.join("\n");
}

export function buildReelNote(
	input: ReelInput,
	opts: { created: string; id?: string; now?: Date },
): string {
	const now = (opts.now ?? new Date()).toISOString();
	const title = reelTitle(input);
	const fm = buildFrontmatter({
		id: opts.id ?? generateUlid(),
		created: opts.created,
		updated: now,
		tags: normalizeTags(input.tags),
		source: input.source,
		summary: input.summary.trim() || undefined,
		type: "reel",
		title,
		source_id: input.source_id,
		url: input.url,
		author: input.author || undefined,
		author_url: input.author_url || undefined,
		published: input.published_at,
		duration_sec: Math.round(input.duration_sec),
		language: input.language || undefined,
	});
	const sections = [
		`# ${title}`,
		`## Тезисы\n${listOrPlaceholder(input.bullets)}`,
		`## Резюме\n${input.summary.trim() || "(нет)"}`,
		`## Раскадровка\n${framesSection(input.frames)}`,
		`## Ссылки из видео\n${listOrPlaceholder(input.links)}`,
		...(input.transcript.trim() ? [`## Транскрипт\n${input.transcript.trim()}`] : []),
		`## Оригинальное описание\n${input.description.trim() || "(нет)"}`,
	];
	return `${fm}\n\n${sections.join("\n\n")}\n`;
}

export function reelsIndexNote(now = new Date()): string {
	const ts = now.toISOString();
	const fm = buildFrontmatter({ id: generateUlid(), created: ts, updated: ts, tags: ["reels", "index"] });
	return `${fm}

# Reels

\`\`\`dataview
TABLE author, summary, tags, url
FROM "${REELS_FOLDER}"
WHERE type = "reel"
SORT created DESC
\`\`\`
`;
}

export function dailyReelLine(notePath: string, summary: string): string {
	const compact = summary.trim().replace(/\s+/g, " ");
	const short = compact.length <= 100 ? compact : `${compact.slice(0, 97)}...`;
	return `- [[${reelNoteName(notePath)}]] - ${short || "(без резюме)"}`;
}

// Appends a line to the end of the "## <heading>" section, creating the section if missing.
export function appendUnderHeading(content: string, heading: string, line: string): string {
	const lines = content.trimEnd().split("\n");
	const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
	if (start === -1) return `${content.trimEnd()}\n\n## ${heading}\n\n${line}\n`;
	let end = lines.findIndex((l, i) => i > start && /^#{1,2} /.test(l));
	if (end === -1) end = lines.length;
	let insertAt = end;
	while (insertAt > start + 1 && lines[insertAt - 1].trim() === "") insertAt--;
	const head = lines.slice(0, insertAt);
	if (insertAt === start + 1) head.push("");
	const tail = lines.slice(end);
	return `${[...head, line, ...(tail.length ? ["", ...tail] : [])].join("\n")}\n`;
}

export type ReelSummary = {
	path: string;
	title: string;
	summary: string;
	tags: string[];
	url: string;
	author: string;
	source: string;
	source_id: string;
	created: string;
};

export function reelSummaryFromContent(path: string, content: string): ReelSummary | null {
	const { frontmatter } = parseFrontmatter(content);
	if (frontmatter.type !== "reel") return null;
	const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));
	return {
		path,
		title: str(frontmatter.title),
		summary: str(frontmatter.summary),
		tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
		url: str(frontmatter.url),
		author: str(frontmatter.author),
		source: str(frontmatter.source),
		source_id: str(frontmatter.source_id),
		created: str(frontmatter.created),
	};
}

export function matchesReelFilters(
	reel: ReelSummary,
	filters: { tags?: string[]; author?: string },
): boolean {
	if (filters.author && slugify(reel.author) !== slugify(filters.author)) return false;
	if (filters.tags?.length) {
		const have = reel.tags.map((t) => t.toLowerCase());
		if (!filters.tags.some((t) => have.includes(t.toLowerCase().replace(/^#/, "")))) return false;
	}
	return true;
}

export type ReelSource = ReelInput["source"];
export type ParsedReelUrl = { source: ReelSource; source_id: string; url: string };

// Recognizes supported short-video URLs and returns a canonical form.
export function parseReelUrl(raw: string): ParsedReelUrl | null {
	let u: URL;
	try {
		u = new URL(raw.trim());
	} catch {
		return null;
	}
	if (u.protocol !== "https:" && u.protocol !== "http:") return null;
	const host = u.hostname.replace(/^(www\.|m\.)/, "");
	const parts = u.pathname.split("/").filter(Boolean);
	if (host === "instagram.com") {
		const i = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p");
		const id = i >= 0 ? parts[i + 1] : undefined;
		if (id && /^[A-Za-z0-9_-]+$/.test(id)) {
			return { source: "instagram", source_id: id, url: `https://www.instagram.com/reel/${id}/` };
		}
	}
	if (host === "youtube.com" && parts[0] === "shorts" && parts[1] && /^[A-Za-z0-9_-]+$/.test(parts[1])) {
		return { source: "youtube", source_id: parts[1], url: `https://www.youtube.com/shorts/${parts[1]}` };
	}
	if (host === "tiktok.com" && parts[0]?.startsWith("@") && parts[1] === "video" && /^\d+$/.test(parts[2] ?? "")) {
		return { source: "tiktok", source_id: parts[2], url: `https://www.tiktok.com/${parts[0]}/video/${parts[2]}` };
	}
	return null;
}

export type ExtractedReel = {
	videoUrl: string | null;
	author: string;
	caption: string;
	durationSec: number | null;
	thumbnailUrl: string | null;
};

function decodeJsonString(raw: string): string {
	try {
		return JSON.parse(`"${raw}"`) as string;
	} catch {
		return raw;
	}
}

function decodeHtml(raw: string): string {
	return raw
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&#x27;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&amp;/g, "&")
		.trim();
}

// Instagram often embeds JSON inside a JSON string; strip one escaping layer so the same
// patterns match either form.
function unescapeLayer(html: string): string {
	return html.replace(/\\(["\\/])/g, "$1");
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
	for (const re of patterns) {
		const m = text.match(re);
		if (m?.[1]) return m[1];
	}
	return null;
}

// Pulls the direct MP4 URL and metadata out of an Instagram embed or reel page.
export function extractInstagramReel(html: string): ExtractedReel {
	const raw = html.replace(/\\\//g, "/");
	const text = /\\"video_url\\"/.test(raw) ? unescapeLayer(raw) : raw;
	const rawVideo = firstMatch(text, [
		/"video_url"\s*:\s*"((?:[^"\\]|\\.)+)"/,
		/"contentUrl"\s*:\s*"((?:[^"\\]|\\.)+)"/,
		/<meta[^>]+property="og:video(?::secure_url)?"[^>]+content="([^"]+)"/i,
	]);
	const rawAuthor = firstMatch(text, [
		/"owner"\s*:\s*\{[^}]*?"username"\s*:\s*"([^"]+)"/,
		/class="UsernameText"[^>]*>([^<]+)</,
		/"username"\s*:\s*"([^"]+)"/,
	]);
	const rawCaptionJson = firstMatch(text, [
		/"edge_media_to_caption"\s*:\s*\{\s*"edges"\s*:\s*\[\s*\{\s*"node"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/,
	]);
	const rawCaptionHtml = rawCaptionJson ? null : firstMatch(html, [/<div class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments"/]);
	const rawDuration = firstMatch(text, [/"video_duration"\s*:\s*([\d.]+)/]);
	const rawThumb = firstMatch(text, [
		/"display_url"\s*:\s*"((?:[^"\\]|\\.)+)"/,
		/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i,
	]);

	let caption = "";
	if (rawCaptionJson) caption = decodeJsonString(rawCaptionJson);
	else if (rawCaptionHtml) {
		caption = decodeHtml(rawCaptionHtml.replace(/<a[^>]+class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/, ""));
	}
	const clean = (v: string | null) => (v ? decodeHtml(decodeJsonString(v)) : null);
	return {
		videoUrl: clean(rawVideo),
		author: clean(rawAuthor)?.trim() ?? "",
		caption: caption.trim(),
		durationSec: rawDuration ? Number(rawDuration) : null,
		thumbnailUrl: clean(rawThumb),
	};
}

// Evenly spaced timestamps, skipping the very first and last moments (often black or end cards).
export function frameTimestamps(durationSec: number | null, count: number): number[] {
	const duration = durationSec && durationSec > 0 ? durationSec : 30;
	const n = Math.max(1, Math.min(count, 16));
	const step = duration / (n + 1);
	return Array.from({ length: n }, (_, i) => Math.round(step * (i + 1) * 10) / 10);
}
