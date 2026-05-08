import assert from "node:assert/strict";
import test from "node:test";
import { provisionVault } from "../github-oauth.ts";
import { buildFrontmatter, extractAutoTags, parseFrontmatter } from "../vault.ts";

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
		await provisionVault("gho_test", "romacv");
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
