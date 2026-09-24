import assert from "node:assert/strict";
import test from "node:test";
import { getReelFrames, type MediaLike } from "../reel-media.ts";
import {
	appendUnderHeading,
	buildReelNote,
	dailyReelLine,
	extractInstagramReel,
	findReelPathsBySourceId,
	frameTimestamps,
	matchesReelFilters,
	parseReelPath,
	parseReelUrl,
	ReelInputSchema,
	reelNotePath,
	reelSummaryFromContent,
} from "../reels.ts";
import { assertVaultPath, parseFrontmatter } from "../vault.ts";

// --- parseReelUrl ---

test("parseReelUrl: instagram reel with query string", () => {
	assert.deepEqual(parseReelUrl("https://www.instagram.com/reel/DAgxVRCsDgA/?igsh=abc"), {
		source: "instagram",
		source_id: "DAgxVRCsDgA",
		url: "https://www.instagram.com/reel/DAgxVRCsDgA/",
	});
});

test("parseReelUrl: instagram /p/ and /reels/ and user-prefixed paths", () => {
	assert.equal(parseReelUrl("https://instagram.com/p/Cxyz_1-2/")?.source_id, "Cxyz_1-2");
	assert.equal(parseReelUrl("https://www.instagram.com/reels/ABC123/")?.source_id, "ABC123");
	assert.equal(parseReelUrl("https://www.instagram.com/someone/reel/ABC123/")?.source_id, "ABC123");
});

test("parseReelUrl: youtube shorts and tiktok", () => {
	assert.equal(parseReelUrl("https://youtube.com/shorts/aBc-123_x?si=1")?.source, "youtube");
	assert.deepEqual(parseReelUrl("https://www.tiktok.com/@user.name/video/7412345678901234567"), {
		source: "tiktok",
		source_id: "7412345678901234567",
		url: "https://www.tiktok.com/@user.name/video/7412345678901234567",
	});
});

test("parseReelUrl: rejects unsupported and malformed URLs", () => {
	assert.equal(parseReelUrl("not a url"), null);
	assert.equal(parseReelUrl("https://www.instagram.com/someone/"), null);
	assert.equal(parseReelUrl("https://youtube.com/watch?v=abc"), null);
	assert.equal(parseReelUrl("ftp://instagram.com/reel/ABC/"), null);
});

// --- extractInstagramReel ---

test("extractInstagramReel: plain JSON in page", () => {
	const html = `<script>{"video_url":"https:\\/\\/cdn.example\\/v.mp4?x=1\\u0026y=2","video_duration":23.4,"owner":{"id":"1","username":"swift_dev"},"edge_media_to_caption":{"edges":[{"node":{"text":"SwiftUI tip\\nuse @Observable"}}]}}</script>`;
	const r = extractInstagramReel(html);
	assert.equal(r.videoUrl, "https://cdn.example/v.mp4?x=1&y=2");
	assert.equal(r.durationSec, 23.4);
	assert.equal(r.author, "swift_dev");
	assert.equal(r.caption, "SwiftUI tip\nuse @Observable");
});

test("extractInstagramReel: JSON nested inside a JSON string", () => {
	const inner = JSON.stringify({ video_url: "https://cdn.example/v2.mp4", owner: { username: "car_reviews" } });
	const html = `<script>window.__data = ${JSON.stringify(inner)};</script>`;
	const r = extractInstagramReel(html);
	assert.equal(r.videoUrl, "https://cdn.example/v2.mp4");
	assert.equal(r.author, "car_reviews");
});

test("extractInstagramReel: embed HTML caption and og tags", () => {
	const html = `<meta property="og:image" content="https://cdn.example/cover.jpg?a=1&amp;b=2">
<a class="UsernameText" href="#">travel_guy</a>
<div class="Caption"><a class="CaptionUsername" href="#">travel_guy</a><br>Mountain trail &amp; coffee<br>#hiking<div class="CaptionComments"></div></div>`;
	const r = extractInstagramReel(html);
	assert.equal(r.videoUrl, null);
	assert.equal(r.author, "travel_guy");
	assert.equal(r.caption, "Mountain trail & coffee\n#hiking");
	assert.equal(r.thumbnailUrl, "https://cdn.example/cover.jpg?a=1&b=2");
});

// --- frameTimestamps ---

test("frameTimestamps: evenly spaced inside the clip", () => {
	assert.deepEqual(frameTimestamps(10, 4), [2, 4, 6, 8]);
	assert.deepEqual(frameTimestamps(null, 2), [10, 20]);
	assert.equal(frameTimestamps(60, 100).length, 16);
});

// --- note building ---

const INPUT = ReelInputSchema.parse({
	source: "instagram",
	source_id: "DAgxVRCsDgA",
	url: "https://www.instagram.com/reel/DAgxVRCsDgA/",
	author: "@Swift Dev",
	published_at: "2026-09-20",
	duration_sec: 47.4,
	title: "",
	description: "Three SwiftUI tricks you did not know about #swift",
	summary: "Three SwiftUI modifiers that simplify layout.",
	bullets: ["Use containerRelativeFrame", "Prefer @Observable"],
	tags: ["SwiftUI", "#ios", "swift ui"],
	links: ["https://developer.apple.com/documentation/swiftui"],
	frames: [
		{ time_sec: 20, description: "Xcode preview with a grid" },
		{ time_sec: 5, description: "Title card:  3 tricks" },
	],
	language: "en",
});

test("reelNotePath: dated, author slug, source id; passes vault guard", () => {
	const path = reelNotePath(INPUT, "2026-09-24");
	assert.equal(path, "50-resources/reels/2026-09-24-swift-dev-DAgxVRCsDgA.md");
	assert.doesNotThrow(() => assertVaultPath(path));
	assert.equal(reelNotePath({ author: "", source_id: "X1" }, "2026-09-24"), "50-resources/reels/2026-09-24-unknown-X1.md");
});

test("buildReelNote: frontmatter round-trips and sections are ordered", () => {
	const note = buildReelNote(INPUT, { created: "2026-09-24", id: "ID1", now: new Date("2026-09-24T01:00:00Z") });
	const { frontmatter, body } = parseFrontmatter(note);
	assert.equal(frontmatter.type, "reel");
	assert.equal(frontmatter.source, "instagram");
	assert.equal(frontmatter.source_id, "DAgxVRCsDgA");
	assert.equal(frontmatter.url, INPUT.url);
	assert.equal(frontmatter.created, "2026-09-24");
	assert.equal(frontmatter.id, "ID1");
	assert.equal(frontmatter.duration_sec, 47);
	assert.equal(frontmatter.published, "2026-09-20");
	assert.deepEqual(frontmatter.tags, ["reels", "swiftui", "ios", "swift-ui"]);
	assert.equal(frontmatter.title, "Three SwiftUI tricks you did not know about #swift");
	const order = ["## Тезисы", "## Резюме", "## Раскадровка", "## Ссылки из видео", "## Оригинальное описание"].map((h) =>
		body.indexOf(h),
	);
	assert.ok(order.every((i, n) => i > 0 && (n === 0 || i > order[n - 1])));
	assert.ok(body.indexOf("0:05 - Title card: 3 tricks") < body.indexOf("0:20 - Xcode preview"));
	assert.ok(!body.includes("## Транскрипт"));
});

test("reelSummaryFromContent + matchesReelFilters", () => {
	const note = buildReelNote(INPUT, { created: "2026-09-24" });
	const reel = reelSummaryFromContent("50-resources/reels/x.md", note)!;
	assert.equal(reel.summary, INPUT.summary);
	assert.equal(reel.author, "@Swift Dev");
	assert.ok(matchesReelFilters(reel, { author: "swift dev" }));
	assert.ok(matchesReelFilters(reel, { tags: ["#iOS"] }));
	assert.ok(!matchesReelFilters(reel, { tags: ["cars"] }));
	assert.equal(reelSummaryFromContent("20-topics/a.md", "---\ntags: []\n---\n\nbody"), null);
});

test("findReelPathsBySourceId and parseReelPath", () => {
	const paths = [
		"50-resources/reels/_index.md",
		"50-resources/reels/2026-09-20-dev-ABC.md",
		"50-resources/reels/2026-09-21-dev-XABC.md",
		"50-resources/reels/2026-09-22-other-ABC.md",
	];
	assert.deepEqual(findReelPathsBySourceId(paths, "ABC"), [paths[1], paths[3]]);
	assert.equal(parseReelPath(paths[0]), null);
	assert.deepEqual(parseReelPath(paths[1]), { path: paths[1], created: "2026-09-20", rest: "dev-ABC" });
});

// --- daily note ---

test("dailyReelLine: basename wikilink and 100-char summary", () => {
	const line = dailyReelLine("50-resources/reels/2026-09-24-dev-ABC.md", "x".repeat(150));
	assert.ok(line.startsWith("- [[2026-09-24-dev-ABC]] - "));
	assert.equal(line.length, "- [[2026-09-24-dev-ABC]] - ".length + 100);
});

test("appendUnderHeading: creates section when missing", () => {
	assert.equal(appendUnderHeading("# 2026-09-24\n", "Reels", "- a"), "# 2026-09-24\n\n## Reels\n\n- a\n");
});

test("appendUnderHeading: appends at end of existing section before next heading", () => {
	const before = "# Day\n\n## Reels\n\n- a\n\n## Chats\n\n- chat\n";
	assert.equal(appendUnderHeading(before, "Reels", "- b"), "# Day\n\n## Reels\n\n- a\n- b\n\n## Chats\n\n- chat\n");
});

test("appendUnderHeading: empty section at end of file", () => {
	assert.equal(appendUnderHeading("# Day\n\n## Reels\n", "Reels", "- a"), "# Day\n\n## Reels\n\n- a\n");
});

// --- getReelFrames ---

function withFetch(routes: Record<string, () => Response>, fn: () => Promise<void>): Promise<void> {
	const original = globalThis.fetch;
	globalThis.fetch = (async (input: RequestInfo | URL) => {
		const url = String(input instanceof Request ? input.url : input);
		const key = Object.keys(routes).find((k) => url.startsWith(k));
		return key ? routes[key]() : new Response("nope", { status: 404 });
	}) as typeof fetch;
	return fn().finally(() => {
		globalThis.fetch = original;
	});
}

function fakeMedia(times: string[]): MediaLike {
	return {
		input: () => ({
			transform: () => ({
				output: (o) => ({
					response: async () => {
						times.push(o?.time ?? "");
						if (o?.time === "40s") throw new Error("past end");
						return new Response(new Uint8Array([0xff, 0xd8, 1]), { headers: { "content-type": "image/jpeg" } });
					},
				}),
			}),
		}),
	};
}

test("getReelFrames: instagram video -> frames via MEDIA; failing frame is dropped", async () => {
	const embed = `{"video_url":"https://cdn.example/v.mp4","video_duration":50,"owner":{"username":"dev"}}`;
	const times: string[] = [];
	await withFetch(
		{
			"https://www.instagram.com/reel/ABC/embed/captioned/": () => new Response(embed),
			"https://cdn.example/v.mp4": () => new Response(new Uint8Array(16)),
		},
		async () => {
			const r = await getReelFrames({ parsed: parseReelUrl("https://www.instagram.com/reel/ABC/")!, media: fakeMedia(times), count: 4 });
			assert.deepEqual(times, ["10s", "20s", "30s", "40s"]);
			assert.equal(r.frames.length, 3);
			assert.equal(r.frames[0].data, "/9gB");
			assert.equal(r.meta.author, "dev");
			assert.deepEqual(r.warnings, []);
		},
	);
});

test("getReelFrames: login wall -> cover thumbnail fallback with warning", async () => {
	const embed = `<meta property="og:image" content="https://cdn.example/cover.jpg"><div class="Caption">hello<div class="CaptionComments"></div></div>`;
	await withFetch(
		{
			"https://www.instagram.com/reel/ABC/embed/captioned/": () => new Response(embed),
			"https://cdn.example/cover.jpg": () => new Response(new Uint8Array([1, 2, 3])),
		},
		async () => {
			const r = await getReelFrames({ parsed: parseReelUrl("https://www.instagram.com/reel/ABC/")!, count: 4 });
			assert.equal(r.frames.length, 1);
			assert.equal(r.frames[0].label, "cover");
			assert.equal(r.meta.caption, "hello");
			assert.match(r.warnings[0], /no direct video URL/);
		},
	);
});

test("getReelFrames: nothing reachable -> upstream_unavailable", async () => {
	await withFetch({}, async () => {
		await assert.rejects(
			getReelFrames({ parsed: parseReelUrl("https://www.instagram.com/reel/ABC/")!, count: 4 }),
			(err: { code?: string }) => err.code === "upstream_unavailable",
		);
	});
});
