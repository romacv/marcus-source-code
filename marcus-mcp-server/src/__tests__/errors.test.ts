import assert from "node:assert/strict";
import test from "node:test";
import { formatToolError, mapGitHubError, StructuredToolError } from "../errors.ts";

function headers(values: Record<string, string> = {}): Headers {
	return new Headers(values);
}

test("maps GitHub auth failures to structured reauth errors", () => {
	const err = mapGitHubError(401, headers(), "bad credentials");
	assert.equal(err.code, "auth_required");
	assert.equal(err.recovery, "reauth");
});

test("maps GitHub rate limits with retry timing", () => {
	const err = mapGitHubError(403, headers({ "retry-after": "2" }), "secondary rate limit");
	assert.equal(err.code, "rate_limited");
	assert.equal(err.recovery, "wait");
	assert.equal(err.extras.retry_after_ms, 2000);
});

test("maps GitHub not found, conflict, and upstream failures", () => {
	assert.equal(mapGitHubError(404, headers(), "missing").code, "not_found");
	assert.equal(mapGitHubError(409, headers(), "conflict").code, "conflict");
	assert.equal(mapGitHubError(503, headers(), "down").code, "upstream_unavailable");
});

test("formats structured tool errors as MCP error content", () => {
	const result = formatToolError(
		new StructuredToolError("conflict", "SHA mismatch", "retry", { current_sha: "abc" }),
		"req-1",
	);
	assert.equal(result.isError, true);
	const payload = JSON.parse(result.content[0].text);
	assert.deepEqual(payload, {
		code: "conflict",
		message: "SHA mismatch",
		recovery: "retry",
		current_sha: "abc",
		request_id: "req-1",
	});
});
