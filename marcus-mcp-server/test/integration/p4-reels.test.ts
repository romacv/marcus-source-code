import { afterEach, describe, expect, test } from "vitest";
import {
	ghFileMock,
	ghFileNotFoundMock,
	ghGraphqlMock,
	ghRefMock,
	ghTokenMock,
	installFetchMock,
	type FetchMock,
	type MockResponse,
} from "./_helpers/fetch-mock";
import { makeHarness } from "./_helpers/mcp-harness";

let mock: FetchMock | undefined;
afterEach(() => {
	mock?.restore();
	mock = undefined;
});

function treeMock(paths: string[]): MockResponse {
	return {
		match: (u) => u.includes("/git/trees/main"),
		body: { tree: paths.map((path) => ({ path, type: "blob" })) },
	};
}

function committedFiles(m: FetchMock): Array<{ path: string; content: string }> {
	const call = m.calls.find((c) => c.url.includes("graphql"));
	if (!call) return [];
	const body = JSON.parse(String(call.init.body)) as {
		variables: { input: { message: { headline: string }; fileChanges: { additions: Array<{ path: string; contents: string }> } } };
	};
	return body.variables.input.fileChanges.additions.map((a) => ({
		path: a.path,
		content: decodeURIComponent(escape(atob(a.contents))),
	}));
}

function commitHeadline(m: FetchMock): string {
	const call = m.calls.find((c) => c.url.includes("graphql"))!;
	return (JSON.parse(String(call.init.body)) as { variables: { input: { message: { headline: string } } } }).variables.input.message
		.headline;
}

const REEL = {
	source: "instagram",
	source_id: "DAgxVRCsDgA",
	url: "https://www.instagram.com/reel/DAgxVRCsDgA/",
	author: "swift_dev",
	title: "SwiftUI tricks",
	summary: "Three SwiftUI modifiers that simplify layout.",
	bullets: ["Use containerRelativeFrame"],
	tags: ["swift"],
	frames: [{ time_sec: 3, description: "Title card" }],
};

describe("save_reel", () => {
	test("new reel: writes note, daily line under ## Reels and index in one commit", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			treeMock(["20-topics/a.md"]),
			ghFileNotFoundMock("/contents/00-daily/"),
			ghRefMock("head_reel"),
			ghGraphqlMock("reel_commit"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("save_reel", REEL);
		expect(result.isError).toBe(false);
		const out = JSON.parse((result.content[0] as { text: string }).text);
		expect(out.path).toMatch(/^50-resources\/reels\/\d{4}-\d{2}-\d{2}-swift_dev-DAgxVRCsDgA\.md$/);
		expect(out.updated).toBe(false);

		const files = committedFiles(mock);
		expect(files.map((f) => f.path)).toEqual([out.path, out.daily_path, "50-resources/reels/_index.md"]);
		expect(files[0].content).toContain('type: "reel"');
		expect(files[0].content).toContain("## Раскадровка\n- 0:03 - Title card");
		expect(files[1].content).toMatch(/## Reels\n\n- \[\[\d{4}-\d{2}-\d{2}-swift_dev-DAgxVRCsDgA\]\] - Three SwiftUI/);
		expect(commitHeadline(mock).split("\n")[0]).toBe("reels: add DAgxVRCsDgA");
	});

	test("existing reel: updates same path, keeps id and created, no daily line", async () => {
		const existingPath = "50-resources/reels/2026-09-01-swift_dev-DAgxVRCsDgA.md";
		const existing = `---\nid: "OLDID"\ncreated: "2026-09-01"\nsource: "instagram"\ntype: "reel"\nsource_id: "DAgxVRCsDgA"\n---\n\n# Old`;
		mock = installFetchMock([
			ghTokenMock(),
			treeMock([existingPath, "50-resources/reels/_index.md"]),
			ghFileMock(`/contents/${existingPath}`, "sha_old", existing),
			ghRefMock("head_reel2"),
			ghGraphqlMock("reel_commit2"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("save_reel", { ...REEL, summary: "Updated" });
		expect(result.isError).toBe(false);
		const out = JSON.parse((result.content[0] as { text: string }).text);
		expect(out).toMatchObject({ path: existingPath, updated: true, daily_path: null });
		const files = committedFiles(mock);
		expect(files).toHaveLength(1);
		expect(files[0].content).toContain('id: "OLDID"');
		expect(files[0].content).toContain('created: "2026-09-01"');
		expect(files[0].content).toContain('summary: "Updated"');
		expect(commitHeadline(mock).split("\n")[0]).toBe("reels: update DAgxVRCsDgA");
	});

	test("invalid source_id is rejected before any write", async () => {
		mock = installFetchMock([ghTokenMock()]);
		const h = await makeHarness();
		const result = await h.callTool("save_reel", { ...REEL, source_id: "../../etc" });
		expect(result.isError).toBe(true);
		expect(mock.calls.some((c) => c.url.includes("graphql"))).toBe(false);
	});
});

describe("list_reels", () => {
	test("newest first, since and author filters use filenames", async () => {
		const note = (id: string, author: string, created: string) =>
			`---\ncreated: "${created}"\nsource: "instagram"\ntype: "reel"\ntitle: "T ${id}"\nsummary: "S ${id}"\nsource_id: "${id}"\nauthor: "${author}"\nurl: "https://www.instagram.com/reel/${id}/"\n---\n\n# T`;
		const paths = [
			"50-resources/reels/_index.md",
			"50-resources/reels/2026-09-01-dev-A1.md",
			"50-resources/reels/2026-09-10-dev-B2.md",
			"50-resources/reels/2026-09-12-cars-C3.md",
		];
		mock = installFetchMock([
			ghTokenMock(),
			treeMock(paths),
			ghFileMock(`/contents/${paths[2]}`, "s2", note("B2", "dev", "2026-09-10")),
			ghFileMock(`/contents/${paths[1]}`, "s1", note("A1", "dev", "2026-09-01")),
		]);
		const h = await makeHarness();
		const result = await h.callTool("list_reels", { since: "2026-09-05", author: "dev" });
		expect(result.isError).toBe(false);
		const out = JSON.parse((result.content[0] as { text: string }).text);
		expect(out.map((r: { source_id: string }) => r.source_id)).toEqual(["B2"]);
		expect(out[0]).toMatchObject({ summary: "S B2", url: "https://www.instagram.com/reel/B2/" });
	});
});

describe("reel_frames", () => {
	test("unsupported URL → invalid_argument", async () => {
		mock = installFetchMock([ghTokenMock()]);
		const h = await makeHarness();
		const result = await h.callTool("reel_frames", { url: "https://example.com/video" });
		expect(result.isError).toBe(true);
		expect(result.code).toBe("invalid_argument");
	});
});

describe("retired /settings/reels", () => {
	test("GET and POST answer 410 and never touch KV", async () => {
		const { default: app } = await import("../../src/app");
		const { env } = await import("cloudflare:test");
		for (const method of ["GET", "POST"]) {
			const res = await app.request("/settings/reels?t=x", { method }, env);
			expect(res.status).toBe(410);
			expect(await res.text()).toMatch(/no longer used/);
		}
		const keys = await env.MARCUS_KV.list({ prefix: "scraper_" });
		expect(keys.keys).toEqual([]);
	});
});
