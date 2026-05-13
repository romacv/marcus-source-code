import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";

// Replicate the CSP middleware exactly as defined in app.ts so we can test it
// without pulling in the full CF-bindings import chain (OAuthProvider, McpAgent, …).
const CSP_PATHS_RE = /^\/(authorize|register|auth\/|vault\/)/;

function makeTestApp() {
	const app = new Hono();
	app.use("*", async (c, next) => {
		await next();
		if (!CSP_PATHS_RE.test(new URL(c.req.url).pathname)) return;
		if (c.res.headers.get("content-type")?.includes("text/html")) {
			c.header(
				"Content-Security-Policy",
				"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'none'; frame-ancestors 'none'",
			);
			c.header("X-Content-Type-Options", "nosniff");
			c.header("Referrer-Policy", "no-referrer");
		}
	});
	app.get("/", (c) => c.html("<html>home</html>"));
	app.get("/vault/error", (c) => c.html("<html>vault error</html>"));
	app.get("/vault/conflict", (c) => c.html("<html>conflict</html>"));
	app.get("/authorize", (c) => c.html("<html>authorize</html>"));
	app.get("/privacy", (c) => c.html("<html>privacy</html>"));
	app.get("/docs", (c) => c.html("<html>docs</html>"));
	return app;
}

const app = makeTestApp();

// --- CSP scope: vault/OAuth paths get the header ---

test("CSP header present on /vault/error", async () => {
	const res = await app.request("/vault/error");
	assert.ok(
		res.headers.get("content-security-policy")?.includes("script-src 'none'"),
		"expected CSP on /vault/error",
	);
});

test("CSP header present on /vault/conflict", async () => {
	const res = await app.request("/vault/conflict");
	assert.ok(res.headers.get("content-security-policy"), "expected CSP on /vault/conflict");
});

test("CSP header present on /authorize", async () => {
	const res = await app.request("/authorize");
	assert.ok(res.headers.get("content-security-policy"), "expected CSP on /authorize");
});

test("nosniff header present on /vault/error", async () => {
	const res = await app.request("/vault/error");
	assert.equal(res.headers.get("x-content-type-options"), "nosniff");
});

// --- CSP scope: marketing pages must NOT get the header ---

test("CSP header absent on /", async () => {
	const res = await app.request("/");
	assert.equal(
		res.headers.get("content-security-policy"),
		null,
		"CSP must not appear on landing page (breaks copyMcpUrl inline handler)",
	);
});

test("CSP header absent on /privacy", async () => {
	const res = await app.request("/privacy");
	assert.equal(res.headers.get("content-security-policy"), null);
});

test("CSP header absent on /docs", async () => {
	const res = await app.request("/docs");
	assert.equal(res.headers.get("content-security-policy"), null);
});

// --- CSP_PATHS_RE correctness ---

test("CSP_PATHS_RE matches expected OAuth/vault paths", () => {
	for (const path of ["/authorize", "/register", "/auth/github/callback", "/vault/install", "/vault/error", "/vault/conflict"]) {
		assert.ok(CSP_PATHS_RE.test(path), `expected match: ${path}`);
	}
});

test("CSP_PATHS_RE does not match marketing/static paths", () => {
	for (const path of ["/", "/privacy", "/terms", "/docs", "/health", "/version", "/mcp"]) {
		assert.ok(!CSP_PATHS_RE.test(path), `expected no match: ${path}`);
	}
});
