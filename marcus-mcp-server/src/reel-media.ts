import { StructuredToolError } from "./errors.ts";
import { extractInstagramReel, frameTimestamps, type ExtractedReel, type ParsedReelUrl } from "./reels.ts";

// Minimal shape of the Cloudflare Media Transformations binding (env.MEDIA) used here.
export type MediaLike = {
	input(media: ReadableStream<Uint8Array>): {
		transform(options?: { width?: number; height?: number; fit?: "contain" | "cover" | "scale-down" }): {
			output(options?: { mode?: "frame"; time?: string; format?: "jpg" | "png" }): { response(): Promise<Response> };
		};
	};
};

export type ReelFrame = { time_sec: number | null; label: string; data: string; mimeType: string };

export type ReelFramesResult = {
	meta: ExtractedReel & ParsedReelUrl & { title: string };
	frames: ReelFrame[];
	warnings: string[];
};

const BROWSER_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FRAME_WIDTH = 512;

function toBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

async function fetchText(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/json", "Accept-Language": "en-US,en;q=0.9" },
			redirect: "follow",
		});
		return res.ok ? await res.text() : null;
	} catch {
		return null;
	}
}

async function fetchBytes(url: string, maxBytes: number): Promise<Uint8Array | null> {
	try {
		const res = await fetch(url, { headers: { "User-Agent": BROWSER_UA }, redirect: "follow" });
		if (!res.ok) return null;
		const declared = Number(res.headers.get("content-length") ?? 0);
		if (declared > maxBytes) return null;
		const buf = new Uint8Array(await res.arrayBuffer());
		return buf.byteLength > maxBytes ? null : buf;
	} catch {
		return null;
	}
}

async function fetchImage(url: string, label: string): Promise<ReelFrame | null> {
	const bytes = await fetchBytes(url, MAX_IMAGE_BYTES);
	if (!bytes || bytes.byteLength === 0) return null;
	return { time_sec: null, label, data: toBase64(bytes), mimeType: "image/jpeg" };
}

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

async function fetchOEmbed(url: string): Promise<OEmbed> {
	const text = await fetchText(url);
	if (!text) return {};
	try {
		return JSON.parse(text) as OEmbed;
	} catch {
		return {};
	}
}

async function resolveSource(parsed: ParsedReelUrl): Promise<ExtractedReel & { title: string }> {
	const empty: ExtractedReel = { videoUrl: null, author: "", caption: "", durationSec: null, thumbnailUrl: null };
	if (parsed.source === "instagram") {
		for (const pageUrl of [`${parsed.url}embed/captioned/`, parsed.url]) {
			const html = await fetchText(pageUrl);
			if (!html) continue;
			const found = extractInstagramReel(html);
			if (found.videoUrl || found.caption) return { ...found, title: "" };
		}
		return { ...empty, title: "" };
	}
	if (parsed.source === "youtube") {
		const o = await fetchOEmbed(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(parsed.url)}`);
		return { ...empty, author: o.author_name ?? "", caption: o.title ?? "", title: o.title ?? "", thumbnailUrl: o.thumbnail_url ?? null };
	}
	const o = await fetchOEmbed(`https://www.tiktok.com/oembed?url=${encodeURIComponent(parsed.url)}`);
	return { ...empty, author: o.author_name ?? "", caption: o.title ?? "", title: "", thumbnailUrl: o.thumbnail_url ?? null };
}

async function extractVideoFrames(
	media: MediaLike,
	video: Uint8Array,
	timestamps: number[],
): Promise<ReelFrame[]> {
	const frames: ReelFrame[] = [];
	for (const t of timestamps) {
		try {
			const res = await media
				.input(new Blob([video]).stream())
				.transform({ width: FRAME_WIDTH, fit: "scale-down" })
				.output({ mode: "frame", time: `${t}s`, format: "jpg" })
				.response();
			if (!res.ok) continue;
			const bytes = new Uint8Array(await res.arrayBuffer());
			if (bytes.byteLength === 0) continue;
			frames.push({ time_sec: t, label: `${t}s`, data: toBase64(bytes), mimeType: res.headers.get("content-type") ?? "image/jpeg" });
		} catch {
			// A timestamp past the end or a decode error only drops that frame.
		}
	}
	return frames;
}

export async function getReelFrames(opts: {
	parsed: ParsedReelUrl;
	media?: MediaLike;
	videoUrl?: string;
	count: number;
}): Promise<ReelFramesResult> {
	const { parsed, media, count } = opts;
	const warnings: string[] = [];
	const source = await resolveSource(parsed);
	const videoUrl = opts.videoUrl ?? source.videoUrl;
	let frames: ReelFrame[] = [];

	if (videoUrl && media) {
		const video = await fetchBytes(videoUrl, MAX_VIDEO_BYTES);
		if (video) frames = await extractVideoFrames(media, video, frameTimestamps(source.durationSec, count));
		else warnings.push("video download failed or exceeded 40 MB");
	} else if (videoUrl && !media) {
		warnings.push("MEDIA binding is not configured; falling back to thumbnails");
	} else {
		warnings.push("no direct video URL found (login wall or private post); falling back to thumbnails");
	}

	if (frames.length === 0) {
		const thumbs =
			parsed.source === "youtube"
				? [1, 2, 3].map((n) => ({ url: `https://i.ytimg.com/vi/${parsed.source_id}/hq${n}.jpg`, label: `auto-thumb ${n}/3` }))
				: source.thumbnailUrl
					? [{ url: source.thumbnailUrl, label: "cover" }]
					: [];
		for (const thumb of thumbs) {
			const frame = await fetchImage(thumb.url, thumb.label);
			if (frame) frames.push(frame);
		}
	}

	if (frames.length === 0 && !source.caption) {
		throw new StructuredToolError(
			"upstream_unavailable",
			`Could not fetch frames or caption for ${parsed.url}. The post may be private or behind a login wall; pass video_url with a direct MP4 link.`,
			"fix_input",
		);
	}

	return { meta: { ...parsed, ...source, videoUrl: videoUrl ?? null }, frames, warnings };
}
