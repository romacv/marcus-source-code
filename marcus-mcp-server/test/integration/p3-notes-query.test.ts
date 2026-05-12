import { afterEach, describe, expect, test } from "vitest";
import {
	ghCommitsMock,
	ghFileMock,
	ghTokenMock,
	installFetchMock,
	type FetchMock,
} from "./_helpers/fetch-mock";
import { makeHarness } from "./_helpers/mcp-harness";

let mock: FetchMock | undefined;
afterEach(() => {
	mock?.restore();
	mock = undefined;
});

const NOTE_CONTENT = "---\nid: qr001\ncreated: 2026-05-01\nupdated: 2026-05-01\ntags: [testing]\n---\n\n# Query Note\n\nContains keyword swiftui.";

// ---------------------------------------------------------------------------
// search_notes
// ---------------------------------------------------------------------------
describe("search_notes", () => {
	test("happy: matches found → list of hits", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// GitHub code search returns one hit
			{
				match: (u) => u.includes("/search/code"),
				body: { items: [{ path: "20-topics/Query.md", sha: "sha_q1" }] },
			},
			// localScan tree
			{
				match: (u) => u.includes("/git/trees/main"),
				body: { tree: [{ path: "20-topics/Query.md", type: "blob" }] },
			},
			// getRecentCommits for localScan
			...ghCommitsMock([{ sha: "c001", date: "2026-05-01", files: ["20-topics/Query.md"] }]),
			// getContentsBatch: file content for the search hit (called for code search results)
			ghFileMock("/contents/20-topics/Query.md", "sha_q1", NOTE_CONTENT),
			// getContentsBatch for localScan hit
			ghFileMock("/contents/20-topics/Query.md", "sha_q1", NOTE_CONTENT),
		]);
		const h = await makeHarness();
		const result = await h.callTool("search_notes", { query: "swiftui", limit: 10 });
		expect(result.isError).toBe(false);
		const hits = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(hits.length).toBeGreaterThan(0);
	});

	test("failure: code search returns 403 (rate limited) → falls back to local scan, no crash", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// GitHub code search rate-limited
			{ match: (u) => u.includes("/search/code"), status: 403, body: { message: "rate limited" } },
			// localScan tree (fallback)
			{ match: (u) => u.includes("/git/trees/main"), body: { tree: [] } },
			// getRecentCommits for empty repo
			{ match: (u) => u.includes("/commits?"), body: [] },
		]);
		const h = await makeHarness();
		const result = await h.callTool("search_notes", { query: "anything", limit: 10 });
		// Falls back to local scan; empty repo → empty array, no error
		expect(result.isError).toBe(false);
		const hits = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(hits).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// list_structure
// ---------------------------------------------------------------------------
describe("list_structure", () => {
	test("happy: repo has notes → tree returned", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			{
				match: (u) => u.includes("/git/trees/"),
				body: {
					tree: [
						{ path: "20-topics", type: "tree" },
						{ path: "20-topics/Note.md", type: "blob" },
					],
				},
			},
		]);
		const h = await makeHarness();
		const result = await h.callTool("list_structure", {});
		expect(result.isError).toBe(false);
		const tree = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(tree.length).toBeGreaterThan(0);
	});

	test("failure: empty repo → empty tree (no error)", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			{ match: (u) => u.includes("/git/trees/"), body: { tree: [] } },
		]);
		const h = await makeHarness();
		const result = await h.callTool("list_structure", {});
		expect(result.isError).toBe(false);
		const tree = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(tree).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// get_vault_context
// ---------------------------------------------------------------------------
describe("get_vault_context", () => {
	test("happy: vault populated → tags + recent_topics returned", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// getRecentCommits for vault context (folder = 20-topics)
			...ghCommitsMock([{ sha: "c001", date: "2026-05-01", files: ["20-topics/Note.md"] }]),
			// getContentsBatch for the recent note
			ghFileMock("/contents/20-topics/Note.md", "sha_vc1", NOTE_CONTENT),
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_vault_context", {});
		expect(result.isError).toBe(false);
		const ctx = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(ctx).toHaveProperty("tags");
		expect(ctx).toHaveProperty("recent_topics");
	});

	test("failure: repo empty (no commits) → minimal digest returned, no error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// getRecentCommits returns empty
			{ match: (u) => u.includes("/commits?"), body: [] },
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_vault_context", {});
		expect(result.isError).toBe(false);
		const ctx = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(ctx).toHaveProperty("tags");
		expect(Array.isArray(ctx.tags)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// get_recent_notes
// ---------------------------------------------------------------------------
describe("get_recent_notes", () => {
	test("happy: commits exist → recent list returned", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			...ghCommitsMock([
				{ sha: "c001", date: "2026-05-10", files: ["20-topics/Recent.md"] },
				{ sha: "c002", date: "2026-05-09", files: ["20-topics/Older.md"] },
			]),
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_recent_notes", { limit: 5 });
		expect(result.isError).toBe(false);
		const notes = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(notes.length).toBeGreaterThan(0);
	});

	test("failure: repo empty → empty list (no error)", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			{ match: (u) => u.includes("/commits?"), body: [] },
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_recent_notes", { limit: 5 });
		expect(result.isError).toBe(false);
		const notes = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(notes).toEqual([]);
	});
});
