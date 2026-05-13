import assert from "node:assert/strict";
import test from "node:test";
import { provisionVault, vaultRepoState } from "../github-oauth.ts";
import { findUnrelatedVaultEntries } from "../vault-guard.ts";
import { assertVaultPath, buildFrontmatter, extractAutoTags, parseFrontmatter } from "../vault.ts";

// --- assertVaultPath ---

test("assertVaultPath: allows valid memory path", () => {
	assert.doesNotThrow(() => assertVaultPath("15-memory/personal.md"));
});

test("assertVaultPath: allows README.md", () => {
	assert.doesNotThrow(() => assertVaultPath("README.md"));
});

test("assertVaultPath: allows index.md", () => {
	assert.doesNotThrow(() => assertVaultPath("index.md"));
});

test("assertVaultPath: allows nested daily path", () => {
	assert.doesNotThrow(() => assertVaultPath("00-daily/2026/05/2026-05-13.md"));
});

test("assertVaultPath: rejects parent traversal (..)", () => {
	assert.throws(() => assertVaultPath("15-memory/../../etc/passwd"), /parent segment forbidden/);
});

test("assertVaultPath: rejects encoded parent traversal via normalized path", () => {
	assert.throws(() => assertVaultPath("15-memory/sub/../../escape.md"), /parent segment forbidden/);
});

test("assertVaultPath: rejects absolute path", () => {
	assert.throws(() => assertVaultPath("/etc/passwd"), /absolute path forbidden/);
});

test("assertVaultPath: rejects .github/workflows path", () => {
	assert.throws(() => assertVaultPath(".github/workflows/x.yml"));
});

test("assertVaultPath: rejects _marcus/ internal path", () => {
	assert.throws(() => assertVaultPath("_marcus/anything"));
});

test("assertVaultPath: rejects non-.md extension under allowed prefix", () => {
	assert.throws(() => assertVaultPath("20-topics/note.yml"), /must end with .md/);
});

test("assertVaultPath: allows .gitkeep under allowed prefix", () => {
	assert.doesNotThrow(() => assertVaultPath("60-photos/.gitkeep"));
});

test("extractAutoTags returns existing tags unchanged", () => {
	assert.deepEqual(extractAutoTags("SwiftUI Xcode", { tags: ["manual"] }), ["manual"]);
});

test("extractAutoTags picks known technical vocabulary by frequency", () => {
	assert.deepEqual(
		extractAutoTags("SwiftUI uses Xcode. SwiftUI and iOS workflows use Xcode.", {}),
		["swiftui", "xcode", "ios"],
	);
});

test("extractAutoTags ignores unknown words", () => {
	assert.deepEqual(extractAutoTags("ordinary meeting notes with unrelated nouns", {}), []);
});

test("parseFrontmatter preserves arrays and body", () => {
	const content = `${buildFrontmatter({ tags: ["swift", "xcode"], summary: "Build note" })}\n\n# Body`;
	const parsed = parseFrontmatter(content);
	assert.deepEqual(parsed.frontmatter.tags, ["swift", "xcode"]);
	assert.equal(parsed.frontmatter.summary, "Build note");
	assert.equal(parsed.body, "# Body");
});

test("provisionVault creates the repo, bootstraps main, and seeds the rest atomically", async () => {
	const originalFetch = globalThis.fetch;
	const calls: Array<{ url: string; init?: RequestInit }> = [];

	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
		calls.push({ url, init });

		if (url.endsWith("/user/repos")) {
			return new Response(JSON.stringify({ name: "marcus-second-brain-vault" }), { status: 201 });
		}

		if (url.endsWith("/contents/README.md")) {
			return new Response(JSON.stringify({ commit: { sha: "bootstrap-sha" } }), { status: 201 });
		}

		if (url === "https://api.github.com/graphql") {
			return new Response(
				JSON.stringify({ data: { createCommitOnBranch: { commit: { oid: "seed-oid" } } } }),
				{ status: 200 },
			);
		}

		throw new Error(`Unexpected fetch: ${url}`);
	}) as typeof fetch;

	try {
		await provisionVault("gho_test", "testuser", "test-key");
	} finally {
		globalThis.fetch = originalFetch;
	}

	assert.equal(calls.length, 3);

	const createBody = JSON.parse(String(calls[0].init?.body)) as {
		name: string;
		private: boolean;
		auto_init: boolean;
	};
	assert.equal(createBody.name, "marcus-second-brain-vault");
	assert.equal(createBody.private, true);
	assert.equal(createBody.auto_init, false);

	const bootstrapBody = JSON.parse(String(calls[1].init?.body)) as { message: string; content: string };
	assert.equal(bootstrapBody.message, "marcus: bootstrap vault");
	assert.ok(bootstrapBody.content.length > 0);

	const graphQlBody = JSON.parse(String(calls[2].init?.body)) as {
		variables: {
			input: {
				expectedHeadOid: string;
				fileChanges: { additions: Array<{ path: string; contents: string }> };
			};
		};
	};
	assert.equal(graphQlBody.variables.input.expectedHeadOid, "bootstrap-sha");
	assert.ok(graphQlBody.variables.input.fileChanges.additions.length > 0);
});

test("vaultRepoState returns 'none' when repo is missing (404)", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })) as typeof fetch;

	try {
		const state = await vaultRepoState("gho_test", "testuser", "test-key");
		assert.equal(state, "none");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("vaultRepoState returns 'conflict' when repo exists but sentinel is missing", async () => {
	const originalFetch = globalThis.fetch;
	let callIndex = 0;
	globalThis.fetch = (async () => {
		callIndex += 1;
		if (callIndex === 1) {
			return new Response(JSON.stringify({ id: 1 }), { status: 200 });
		}
		return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
	}) as typeof fetch;

	try {
		const state = await vaultRepoState("gho_test", "testuser", "test-key");
		assert.equal(state, "conflict");
		assert.equal(callIndex, 2);
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("vaultRepoState returns 'vault' when sentinel file exists", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ id: 1 }), { status: 200 })) as typeof fetch;

	try {
		const state = await vaultRepoState("gho_test", "testuser", "test-key");
		assert.equal(state, "vault");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("vaultRepoState fails closed to 'conflict' on unexpected repo lookup error", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ message: "Server error" }), { status: 500 })) as typeof fetch;

	try {
		const state = await vaultRepoState("gho_test", "testuser", "test-key");
		assert.equal(state, "conflict");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("findUnrelatedVaultEntries returns empty for expected vault paths", () => {
	const unrelated = findUnrelatedVaultEntries([
		{ path: "_marcus/version.txt" },
		{ path: "00-daily/.gitkeep" },
		{ path: "README.md" },
	]);
	assert.deepEqual(unrelated, []);
});

test("findUnrelatedVaultEntries returns top-level unrelated entries", () => {
	const unrelated = findUnrelatedVaultEntries([
		{ path: "_marcus/version.txt" },
		{ path: "legacy.md" },
		{ path: "random-folder/note.md" },
	]);
	assert.deepEqual(unrelated.sort(), ["legacy.md", "random-folder"]);
});
