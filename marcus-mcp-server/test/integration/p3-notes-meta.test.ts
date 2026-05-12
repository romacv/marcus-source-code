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

const FM = "---\nid: ln001\ncreated: 2026-01-01\nupdated: 2026-01-01\n---\n\n";

// ---------------------------------------------------------------------------
// link_notes
// ---------------------------------------------------------------------------
describe("link_notes", () => {
	test("happy: both notes exist → link inserted in source frontmatter", async () => {
		const sourceContent = `${FM}# Source note\n\nSource body.`;
		const targetContent = `${FM}# Target note\n\nTarget body.`;
		mock = installFetchMock([
			ghTokenMock(),
			// target note exists (GET)
			ghFileMock("/contents/20-topics/Target.md", "sha_target", targetContent),
			// source note (GET)
			ghFileMock("/contents/20-topics/Source.md", "sha_source", sourceContent),
			// update source (PUT) — must match PUT specifically; ghFileMock now guards GET-only
			ghPutMock("/contents/20-topics/Source.md", "sha_updated"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("link_notes", {
			source_path: "20-topics/Source.md",
			target_path: "20-topics/Target.md",
			create_stub: false,
		});
		expect(result.isError).toBe(false);
		const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(parsed).toHaveProperty("source_sha");
		expect(parsed).toHaveProperty("link");
	});

	test("failure: target missing, create_stub=false → not_found error", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			ghFileNotFoundMock("/contents/20-topics/Ghost.md"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("link_notes", {
			source_path: "20-topics/Source.md",
			target_path: "20-topics/Ghost.md",
			create_stub: false,
		});
		expect(result.isError).toBe(true);
		expect(result.code).toBe("not_found");
	});
});

// ---------------------------------------------------------------------------
// append_to_daily_note
// ---------------------------------------------------------------------------
describe("append_to_daily_note", () => {
	const DAILY_CONTENT = "---\nid: dn001\ncreated: 2026-05-11\nupdated: 2026-05-11\ntags: [daily]\n---\n\n# 2026-05-11\n\n<!-- earlier entry -->";

	test("happy: today's note exists → entry appended", async () => {
		// The tool uses createCommitOnBranch (GraphQL) after getFile + optional create
		mock = installFetchMock([
			ghTokenMock(),
			// getFile for today's daily note (exists)
			ghFileMock("/contents/00-daily/", "sha_daily", DAILY_CONTENT),
			// ref for HEAD sha (needed by createCommitOnBranch)
			ghRefMock("headsha_daily"),
			ghGraphqlMock("append_commit"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("append_to_daily_note", {
			content: "This is a new daily entry.",
		});
		expect(result.isError).toBe(false);
		const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(parsed).toHaveProperty("path");
		expect(parsed).toHaveProperty("sha");
	});

	test("absent daily note: created with new entry (not an error)", async () => {
		mock = installFetchMock([
			ghTokenMock(),
			// getFile: daily note does NOT exist → 404
			ghFileNotFoundMock("/contents/00-daily/"),
			ghRefMock("headsha_new"),
			ghGraphqlMock("create_daily_commit"),
		]);
		const h = await makeHarness();
		const result = await h.callTool("append_to_daily_note", {
			content: "First entry of the day.",
		});
		// Per implementation: creates note if absent (no error)
		expect(result.isError).toBe(false);
		const parsed = JSON.parse((result.content[0] as { text: string }).text) as Record<string, unknown>;
		expect(parsed).toHaveProperty("path");
	});
});
