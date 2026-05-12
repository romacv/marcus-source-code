import { afterEach, describe, expect, test } from "vitest";
import {
	ghFileMock,
	ghFileNotFoundMock,
	ghGraphqlMock,
	ghPutMock,
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

// ---------------------------------------------------------------------------
// create_note
// ---------------------------------------------------------------------------
describe("create_note", () => {
	test("happy: new file at valid path → returns path and sha", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// create_note uses github.createFile() which is a REST PUT (not GraphQL)
			ghPutMock("/contents/20-topics/TestNote.md", "sha_created001"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("create_note", {
			path: "20-topics/TestNote.md",
			content: "# Test Note\n\nBody text.",
		});
		expect(result.isError).toBe(false);
		const text = (result.content[0] as { text: string }).text;
		expect(JSON.parse(text)).toMatchObject({ path: "20-topics/TestNote.md" });
	});

	test("failure: GitHub returns 422 (file conflict) → tool error surfaced", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// Ref call for HEAD sha
			ghRefMock("headsha002"),
			// GraphQL createCommitOnBranch fails with a HEAD_REF_OUTDATED (conflict)
			{
				match: (u) => u.includes("graphql"),
				status: 200,
				body: {
					data: null,
					errors: [{ message: "HEAD_REF_OUTDATED: expected abc but was xyz" }],
				},
			},
		]);
		const h = await makeHarness();
		const result = await h.callTool("create_note", {
			path: "20-topics/Conflict.md",
			content: "# Conflict",
		});
		// Tool catches the GraphQL error and returns a structured error
		expect(result.isError).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// update_note
// ---------------------------------------------------------------------------
describe("update_note", () => {
	const EXISTING_CONTENT = "---\nid: test001\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\n# Existing note\n\nOld body.";

	test("happy: existing file with correct sha → updates and returns sha", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// update_note uses github.updateFile() which is REST PUT (not GraphQL)
			ghFileMock("/contents/20-topics/Existing.md", "sha001", EXISTING_CONTENT),
			ghPutMock("/contents/20-topics/Existing.md", "sha_updated001"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("update_note", {
			path: "20-topics/Existing.md",
			content: "New body content.",
			mode: "replace",
			expected_sha: "sha001",
		});
		expect(result.isError).toBe(false);
		const text = (result.content[0] as { text: string }).text;
		expect(JSON.parse(text)).toMatchObject({ path: "20-topics/Existing.md" });
	});

	test("failure: stale sha → conflict error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileMock("/contents/20-topics/Existing.md", "sha999", EXISTING_CONTENT),
		]);
		const h = await makeHarness();
		const result = await h.callTool("update_note", {
			path: "20-topics/Existing.md",
			content: "New body.",
			mode: "replace",
			expected_sha: "sha_stale",
		});
		expect(result.isError).toBe(true);
		expect(result.code).toBe("conflict");
	});
});

// ---------------------------------------------------------------------------
// delete_note (archive mode)
// ---------------------------------------------------------------------------
describe("delete_note", () => {
	const EXISTING_CONTENT = "---\nid: del001\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\n# To delete";

	test("happy: existing file → archives successfully", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileMock("/contents/20-topics/ToDelete.md", "sha_del", EXISTING_CONTENT),
			// create in archive
			ghPutMock("/contents/90-archive/", "arch001"),
			// delete original
			{
				match: (u, init) => u.includes("/contents/20-topics/ToDelete.md") && init.method === "DELETE",
				status: 200,
				body: { commit: { sha: "del_commit" } },
			},
		]);
		const h = await makeHarness();
		const result = await h.callTool("delete_note", {
			path: "20-topics/ToDelete.md",
			mode: "archive",
		});
		expect(result.isError).toBe(false);
		const text = (result.content[0] as { text: string }).text;
		expect(text).toMatch(/archived_to/);
	});

	test("failure: file not found → not_found error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileNotFoundMock("/contents/20-topics/Missing.md"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("delete_note", {
			path: "20-topics/Missing.md",
			mode: "archive",
		});
		expect(result.isError).toBe(true);
		expect(result.code).toBe("not_found");
	});
});

// ---------------------------------------------------------------------------
// get_note
// ---------------------------------------------------------------------------
describe("get_note", () => {
	const NOTE_CONTENT = "---\nid: gn001\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\n# My Note\n\nHello world.";

	test("happy: existing file → returns content", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileMock("/contents/20-topics/MyNote.md", "sha_get", NOTE_CONTENT),
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_note", { path: "20-topics/MyNote.md" });
		expect(result.isError).toBe(false);
		expect((result.content[0] as { text: string }).text).toContain("Hello world.");
	});

	test("failure: file not found → not_found error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileNotFoundMock("/contents/20-topics/Ghost.md"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("get_note", { path: "20-topics/Ghost.md" });
		expect(result.isError).toBe(true);
		expect(result.code).toBe("not_found");
	});
});
