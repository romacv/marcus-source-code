import assert from "node:assert/strict";
import test from "node:test";
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
