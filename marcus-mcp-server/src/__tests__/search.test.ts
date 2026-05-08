import assert from "node:assert/strict";
import test from "node:test";
import { GitHubClient } from "../github.ts";
import { buildFrontmatter, parseFrontmatter } from "../vault.ts";

function clientWith(files: Array<{ path: string; content: string; sha?: string; updated?: string }>): GitHubClient {
	const client = Object.create(GitHubClient.prototype) as GitHubClient & {
		getTreesRecursive: GitHubClient["getTreesRecursive"];
		getRecentCommits: GitHubClient["getRecentCommits"];
		getContentsBatch: GitHubClient["getContentsBatch"];
	};
	client.getTreesRecursive = async (folder?: string) =>
		files
			.filter((file) => !folder || file.path.startsWith(folder))
			.map((file) => ({ path: file.path, type: "blob" as const }));
	client.getRecentCommits = async () =>
		files.map((file) => ({
			sha: file.sha ?? file.path,
			commit: { author: { date: file.updated ?? "2026-01-01T00:00:00.000Z" } },
			files: [{ filename: file.path }],
		}));
	client.getContentsBatch = async (paths: string[]) =>
		paths.flatMap((path) => {
			const file = files.find((candidate) => candidate.path === path);
			if (!file) return [];
			const parsed = parseFrontmatter(file.content);
			return [{
				path,
				sha: file.sha ?? path,
				content: file.content,
				frontmatter: parsed.frontmatter,
				body: parsed.body,
			}];
		});
	return client;
}

test("localScan finds fresh notes by body text", async () => {
	const client = clientWith([
		{ path: "20-topics/Fresh.md", content: `${buildFrontmatter({ tags: ["plan-test"] })}\n\nUniqueAlpha body` },
	]);
	const results = await client.localScan("UniqueAlpha");
	assert.equal(results[0].path, "20-topics/Fresh.md");
	assert.equal(results[0].match, "body");
});

test("localScan filters by parsed frontmatter tags", async () => {
	const client = clientWith([
		{ path: "20-topics/A.md", content: `${buildFrontmatter({ tags: ["keep"] })}\n\nneedle` },
		{ path: "20-topics/B.md", content: `${buildFrontmatter({ tags: ["skip"] })}\n\nneedle` },
	]);
	const results = await client.localScan("needle", { tags: ["keep"] });
	assert.deepEqual(results.map((result) => result.path), ["20-topics/A.md"]);
});

test("localScan ranks filename matches before body matches", async () => {
	const client = clientWith([
		{ path: "20-topics/Body.md", content: `${buildFrontmatter({})}\n\nneedle` },
		{ path: "20-topics/Needle.md", content: `${buildFrontmatter({})}\n\nother` },
	]);
	const results = await client.localScan("needle");
	assert.deepEqual(results.map((result) => result.path), ["20-topics/Needle.md", "20-topics/Body.md"]);
});
