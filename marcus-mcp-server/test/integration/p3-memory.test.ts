import { afterEach, describe, expect, test } from "vitest";
import {
	ghFileMock,
	ghFileNotFoundMock,
	ghGraphqlMock,
	ghRefMock,
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

const MEMORY_FILE_CONTENT =
	"# Work\n\n- [2026-05-10] I learned about vitest ^id-abc123\n- [2026-05-09] SwiftUI tip ^id-def456\n";

const MEMORY_FILE_EMPTY = "# Work\n\n";

const DAILY_NOTE =
	"---\nid: d001\ncreated: 2026-05-11\nupdated: 2026-05-11\ntags: [daily]\n---\n\n# 2026-05-11\n\n";

// Categories: hardware, finance, health, work, travel, personal, decisions
function allCategoryMocksEmpty() {
	return [
		ghFileNotFoundMock("/contents/15-memory/hardware.md"),
		ghFileNotFoundMock("/contents/15-memory/finance.md"),
		ghFileNotFoundMock("/contents/15-memory/health.md"),
		ghFileNotFoundMock("/contents/15-memory/work.md"),
		ghFileNotFoundMock("/contents/15-memory/travel.md"),
		ghFileNotFoundMock("/contents/15-memory/personal.md"),
		ghFileNotFoundMock("/contents/15-memory/decisions.md"),
	];
}

function allCategoryMocksWithWork() {
	return [
		ghFileNotFoundMock("/contents/15-memory/hardware.md"),
		ghFileNotFoundMock("/contents/15-memory/finance.md"),
		ghFileNotFoundMock("/contents/15-memory/health.md"),
		ghFileMock("/contents/15-memory/work.md", "sha_mem", MEMORY_FILE_CONTENT),
		ghFileNotFoundMock("/contents/15-memory/travel.md"),
		ghFileNotFoundMock("/contents/15-memory/personal.md"),
		ghFileNotFoundMock("/contents/15-memory/decisions.md"),
	];
}

// ---------------------------------------------------------------------------
// recall
// ---------------------------------------------------------------------------
describe("recall", () => {
	test("happy: matching memory found → returns memory records", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// searchCode for recall — returns work.md match
			{
				match: (u) => u.includes("/search/code"),
				body: { items: [{ path: "15-memory/work.md", sha: "sha_mem" }] },
			},
			// getMemoryFile for work category
			ghFileMock("/contents/15-memory/work.md", "sha_mem", MEMORY_FILE_CONTENT),
		]);
		const h = await makeHarness();
		const result = await h.callTool("recall", { query: "vitest", limit: 5 });
		expect(result.isError).toBe(false);
		const records = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(records.length).toBeGreaterThan(0);
	});

	test("failure: nothing stored → empty array (no error)", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// searchCode returns no category matches
			{ match: (u) => u.includes("/search/code"), body: { items: [] } },
			// fallback: reads all 7 memory categories
			...allCategoryMocksEmpty(),
		]);
		const h = await makeHarness();
		const result = await h.callTool("recall", { query: "nothing_here", limit: 5 });
		expect(result.isError).toBe(false);
		const records = JSON.parse((result.content[0] as { text: string }).text) as unknown[];
		expect(records).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// remember
// ---------------------------------------------------------------------------
describe("remember", () => {
	test("happy: new memory → stored and returns block_id", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// getMemoryFile for work category (may or may not exist)
			ghFileMock("/contents/15-memory/work.md", "sha_mem", MEMORY_FILE_CONTENT),
			// getDailyNote (match on 00-daily path prefix)
			ghFileMock("/contents/00-daily/", "sha_daily", DAILY_NOTE),
			// HEAD ref for graphql commit
			ghRefMock("headsha_rem"),
			ghGraphqlMock("remember_commit"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("remember", {
			content: "Integration tests now run inside Miniflare.",
			category: "work",
		});
		expect(result.isError).toBe(false);
		const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(parsed).toHaveProperty("block_id");
		expect(parsed).toHaveProperty("path");
	});

	test("failure: invalid category (not in enum) → validation error", async () => {
		mock = installFetchMock([ghTokenMock()]);
		const h = await makeHarness();
		const result = await h.callTool("remember", {
			content: "Some memory.",
			category: "nonexistent_category",
		});
		// Zod validation fails → MCP returns an error result
		expect(result.isError).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// forget
// ---------------------------------------------------------------------------
describe("forget", () => {
	test("happy: existing memory found → archived", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// searchCode returns the memory file
			{
				match: (u) => u.includes("/search/code"),
				body: { items: [{ path: "15-memory/work.md", sha: "sha_mem" }] },
			},
			// getMemoryFile for work category
			ghFileMock("/contents/15-memory/work.md", "sha_mem", MEMORY_FILE_CONTENT),
			// archive file (does not exist yet)
			ghFileNotFoundMock("/contents/15-memory/_archive.md"),
			// HEAD ref for commit
			ghRefMock("headsha_forget"),
			ghGraphqlMock("forget_commit"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("forget", { query: "vitest" });
		expect(result.isError).toBe(false);
		const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(parsed).toHaveProperty("block_id");
	});

	test("failure: memory not found → not_found error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// searchCode returns empty
			{ match: (u) => u.includes("/search/code"), body: { items: [] } },
			// fallback: reads all 7 memory categories (all empty/missing)
			...allCategoryMocksEmpty(),
		]);
		const h = await makeHarness();
		const result = await h.callTool("forget", { query: "nonexistent_memory_xyz" });
		expect(result.isError).toBe(true);
		expect(result.code).toBe("not_found");
	});
});

// ---------------------------------------------------------------------------
// sync_to_claude_memory
// ---------------------------------------------------------------------------
describe("sync_to_claude_memory", () => {
	test("happy: active memories present → snapshot returned", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// sync reads all 7 categories
			...allCategoryMocksWithWork(),
		]);
		const h = await makeHarness();
		const result = await h.callTool("sync_to_claude_memory", {});
		expect(result.isError).toBe(false);
		const text = (result.content[0] as { text: string }).text;
		expect(text).toContain("# Marcus memory snapshot");
		expect(text).toContain("vitest");
	});

	test("failure: no memories stored → minimal snapshot (0 items, no error)", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// all 7 categories empty/missing
			...allCategoryMocksEmpty(),
		]);
		const h = await makeHarness();
		const result = await h.callTool("sync_to_claude_memory", {});
		expect(result.isError).toBe(false);
		const text = (result.content[0] as { text: string }).text;
		expect(text).toContain("No active memories");
	});
});
