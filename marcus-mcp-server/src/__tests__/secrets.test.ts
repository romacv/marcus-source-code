import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import app from "../app.ts";
import { ENCRYPTED_MAX_LEN, isAllowedSecretName, parseSecretBody } from "../secrets.ts";

const KEY = "b".repeat(64);
const SEALED = "A".repeat(80); // stands in for a libsodium sealed box (base64)
const PLAINTEXT = "123456789:AAH-plain-telegram-token";
const REPO = "marcus-second-brain-vault";
const SECRETS_API = `https://api.github.com/repos/alice/${REPO}/actions/secrets`;

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const PEM = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

function makeKv() {
	const store = new Map<string, string>();
	return {
		store,
		get: async (k: string) => store.get(k) ?? null,
		put: async (k: string, v: string) => void store.set(k, v),
		delete: async (k: string) => void store.delete(k),
	};
}

type Call = { method: string; url: string; body: string | null };

function setup(over: Record<string, (call: Call) => Response> = {}) {
	const kv = makeKv();
	const calls: Call[] = [];
	const logs: string[] = [];
	const realFetch = globalThis.fetch;
	const realLog = [console.log, console.warn, console.error];
	for (const m of ["log", "warn", "error"] as const) {
		console[m] = (...a: unknown[]) => void logs.push(a.map(String).join(" "));
	}
	const json = (o: unknown, status = 200) =>
		new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
	globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const call: Call = { method: init?.method ?? "GET", url, body: typeof init?.body === "string" ? init.body : null };
		calls.push(call);
		const key = `${call.method} ${url}`;
		if (over[key]) return over[key](call);
		if (key === "POST https://github.com/login/oauth/access_token") return json({ access_token: "user-token" });
		if (key === "GET https://api.github.com/user") return json({ login: "alice", id: 7 });
		if (key === "GET https://api.github.com/users/alice/installation") return json({ id: 99 });
		if (key === "POST https://api.github.com/app/installations/99/access_tokens") {
			return json({ token: "inst-token", expires_at: new Date(Date.now() + 3_600_000).toISOString() });
		}
		if (key === `GET ${SECRETS_API}/public-key`) return json({ key_id: "k1", key: "c29tZS1rZXk=" });
		if (key === `GET ${SECRETS_API}?per_page=100`) {
			return json({ secrets: [{ name: "TELEGRAM_BOT_TOKEN", updated_at: "2026-10-06T10:00:00Z" }, { name: "UNRELATED", updated_at: "2026-01-01T00:00:00Z" }] });
		}
		if (key === `PUT ${SECRETS_API}/TELEGRAM_BOT_TOKEN`) return new Response(null, { status: 201 });
		if (key === `DELETE ${SECRETS_API}/TELEGRAM_BOT_TOKEN`) return new Response(null, { status: 204 });
		return json({ message: "unexpected " + key }, 500);
	}) as typeof fetch;
	const env = {
		MARCUS_KV: kv,
		KV_ENCRYPTION_KEY: KEY,
		GITHUB_APP_PRIVATE_KEY: PEM,
		GITHUB_APP_CLIENT_ID: "Iv1.test",
		GITHUB_APP_ID: "1",
		GITHUB_OAUTH_CLIENT_ID: "oauth-id",
		GITHUB_OAUTH_CLIENT_SECRET: "oauth-secret",
	};
	const restore = () => {
		globalThis.fetch = realFetch;
		[console.log, console.warn, console.error] = realLog;
	};
	return { env, kv, calls, logs, restore };
}

function cookies(res: Response): string {
	return res.headers
		.getSetCookie()
		.map((c) => c.split(";")[0])
		.filter((c) => !c.endsWith("="))
		.join("; ");
}

// Runs the real sign-in: page redirect -> GitHub -> callback -> session cookie.
async function signIn(env: object): Promise<string> {
	const start = await app.request("https://marcus.test/settings/secrets", {}, env);
	assert.equal(start.status, 302);
	const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
	const cb = await app.request(
		`https://marcus.test/auth/github/callback?code=abc&state=${encodeURIComponent(state)}`,
		{ headers: { cookie: cookies(start) } },
		env,
	);
	assert.equal(cb.status, 302);
	assert.equal(cb.headers.get("location"), "/settings/secrets");
	return cookies(cb);
}

async function csrfFrom(env: object, cookie: string): Promise<string> {
	const page = await app.request("https://marcus.test/settings/secrets", { headers: { cookie } }, env);
	assert.equal(page.status, 200);
	const m = (await page.text()).match(/id="secrets-page" data-csrf="([^"]+)"/);
	assert.ok(m, "csrf token in page");
	return m![1];
}

const post = (cookie: string, csrf: string | null, body: unknown): { method: string; headers: Record<string, string>; body: string } =>
	({
		method: "POST",
		headers: { cookie, "content-type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
		body: typeof body === "string" ? body : JSON.stringify(body),
	});

// --- unit ---

test("secret name: allowlist, pattern and GITHUB_ prefix", () => {
	assert.equal(isAllowedSecretName("TELEGRAM_BOT_TOKEN"), true);
	assert.equal(isAllowedSecretName("OTHER_TOKEN"), false);
	assert.equal(isAllowedSecretName("telegram_bot_token"), false);
	assert.equal(isAllowedSecretName("GITHUB_TOKEN"), false);
	assert.equal(isAllowedSecretName("../x"), false);
	assert.equal(isAllowedSecretName(undefined), false);
});

test("body: valid, extra field, missing field, bad base64, size", () => {
	const ok = { name: "TELEGRAM_BOT_TOKEN", key_id: "k1", encrypted_value: SEALED };
	assert.equal(parseSecretBody(JSON.stringify(ok)).ok, true);
	assert.equal(parseSecretBody(JSON.stringify({ ...ok, value: PLAINTEXT })).ok, false);
	assert.equal(parseSecretBody(JSON.stringify({ name: ok.name, key_id: "k1" })).ok, false);
	assert.equal(parseSecretBody(JSON.stringify({ ...ok, encrypted_value: PLAINTEXT })).ok, false);
	assert.equal(parseSecretBody(JSON.stringify({ ...ok, name: "NOPE" })).ok, false);
	assert.equal(parseSecretBody(JSON.stringify({ ...ok, encrypted_value: "A".repeat(ENCRYPTED_MAX_LEN + 1) })).ok, false);
	assert.equal(parseSecretBody("[]").ok, false);
	assert.equal(parseSecretBody("{").ok, false);
});

// --- routes ---

test("no session: 401 on JSON routes, redirect to GitHub on the page", async () => {
	const t = setup();
	try {
		assert.equal((await app.request("https://marcus.test/settings/secrets/public-key", {}, t.env)).status, 401);
		assert.equal((await app.request("https://marcus.test/settings/secrets", post("", null, {}), t.env)).status, 401);
		assert.equal((await app.request("https://marcus.test/settings/secrets/TELEGRAM_BOT_TOKEN", { method: "DELETE" }, t.env)).status, 401);
		const page = await app.request("https://marcus.test/settings/secrets", {}, t.env);
		assert.equal(page.status, 302);
		assert.match(page.headers.get("location")!, /^https:\/\/github\.com\/login\/oauth\/authorize\?/);
	} finally {
		t.restore();
	}
});

test("callback refuses a browser without the login cookie", async () => {
	const t = setup();
	try {
		const start = await app.request("https://marcus.test/settings/secrets", {}, t.env);
		const state = new URL(start.headers.get("location")!).searchParams.get("state")!;
		const cb = await app.request(`https://marcus.test/auth/github/callback?code=abc&state=${encodeURIComponent(state)}`, {}, t.env);
		assert.equal(cb.status, 400);
	} finally {
		t.restore();
	}
});

test("page lists only allowlisted names, CSP allows own scripts", async () => {
	const t = setup();
	try {
		const cookie = await signIn(t.env);
		const page = await app.request("https://marcus.test/settings/secrets", { headers: { cookie } }, t.env);
		const text = await page.text();
		assert.match(text, /TELEGRAM_BOT_TOKEN/);
		assert.match(text, /2026-10-06/);
		assert.doesNotMatch(text, /UNRELATED/);
		assert.match(text, new RegExp(`settings/secrets/actions/new`));
		const csp = page.headers.get("content-security-policy")!;
		assert.ok(csp.includes("script-src 'self'"));
		const other = await app.request("https://marcus.test/vault/error", {}, t.env);
		assert.ok(other.headers.get("content-security-policy")!.includes("script-src 'none'"));
	} finally {
		t.restore();
	}
});

test("save: relays only name, key_id, sealed value; nothing stored or logged", async () => {
	const t = setup();
	try {
		const cookie = await signIn(t.env);
		const csrf = await csrfFrom(t.env, cookie);
		const pk = await app.request("https://marcus.test/settings/secrets/public-key", { headers: { cookie } }, t.env);
		assert.deepEqual(await pk.json(), { key_id: "k1", key: "c29tZS1rZXk=" });

		const res = await app.request("https://marcus.test/settings/secrets", post(cookie, csrf, { name: "TELEGRAM_BOT_TOKEN", key_id: "k1", encrypted_value: SEALED }), t.env);
		assert.equal(res.status, 201);
		const put = t.calls.find((c) => c.method === "PUT")!;
		assert.equal(put.url, `${SECRETS_API}/TELEGRAM_BOT_TOKEN`);
		assert.deepEqual(JSON.parse(put.body!), { encrypted_value: SEALED, key_id: "k1" });

		for (const [k, v] of t.kv.store) {
			assert.ok(k.startsWith("install_token:"), `unexpected KV key ${k}`);
			assert.ok(!v.includes(SEALED));
		}
		const logged = t.logs.join("\n");
		assert.ok(!logged.includes(SEALED), "ciphertext in logs");
		assert.ok(!logged.includes(PLAINTEXT), "plaintext in logs");
		assert.match(logged, /secret-save/);
	} finally {
		t.restore();
	}
});

test("save: rejects extra fields, missing or foreign CSRF, bad content type", async () => {
	const t = setup();
	try {
		const cookie = await signIn(t.env);
		const csrf = await csrfFrom(t.env, cookie);
		const good = { name: "TELEGRAM_BOT_TOKEN", key_id: "k1", encrypted_value: SEALED };
		const url = "https://marcus.test/settings/secrets";
		assert.equal((await app.request(url, post(cookie, csrf, { ...good, value: PLAINTEXT }), t.env)).status, 400);
		assert.equal((await app.request(url, post(cookie, null, good), t.env)).status, 403);
		assert.equal((await app.request(url, post(cookie, "x.y", good), t.env)).status, 403);
		const foreign = { ...post(cookie, csrf, good) };
		foreign.headers = { ...foreign.headers, origin: "https://evil.test" };
		assert.equal((await app.request(url, foreign, t.env)).status, 403);
		const plain = { ...post(cookie, csrf, good) };
		plain.headers = { ...plain.headers, "content-type": "text/plain" };
		assert.equal((await app.request(url, plain, t.env)).status, 400);
		assert.equal(t.calls.filter((c) => c.method === "PUT").length, 0);
	} finally {
		t.restore();
	}
});

test("delete: allowlisted name only, needs CSRF", async () => {
	const t = setup();
	try {
		const cookie = await signIn(t.env);
		const csrf = await csrfFrom(t.env, cookie);
		const del = (name: string, token: string | null) =>
			app.request(`https://marcus.test/settings/secrets/${name}`, { method: "DELETE", headers: { cookie, ...(token ? { "x-csrf-token": token } : {}) } }, t.env);
		assert.equal((await del("TELEGRAM_BOT_TOKEN", null)).status, 403);
		assert.equal((await del("OTHER_SECRET", csrf)).status, 400);
		assert.equal((await del("TELEGRAM_BOT_TOKEN", csrf)).status, 204);
		assert.equal(t.calls.filter((c) => c.method === "DELETE").length, 1);
	} finally {
		t.restore();
	}
});

test("GitHub 403 without the Secrets permission gives a clear message and a link", async () => {
	const t = setup({
		[`GET ${SECRETS_API}/public-key`]: () =>
			new Response(JSON.stringify({ message: "Resource not accessible by integration" }), { status: 403 }),
	});
	try {
		const cookie = await signIn(t.env);
		const res = await app.request("https://marcus.test/settings/secrets/public-key", { headers: { cookie } }, t.env);
		assert.equal(res.status, 403);
		const body = (await res.json()) as { error: string; message: string; fix_url: string };
		assert.equal(body.error, "permission");
		assert.match(body.message, /Secrets: Read and write/);
		assert.equal(body.fix_url, "https://github.com/settings/installations/99");
	} finally {
		t.restore();
	}
});

test("permission 403 drops the cached installation token and retries once", async () => {
	let hits = 0;
	const t = setup({
		[`GET ${SECRETS_API}/public-key`]: () => {
			hits++;
			return hits === 1
				? new Response(JSON.stringify({ message: "Resource not accessible by integration" }), { status: 403 })
				: new Response(JSON.stringify({ key_id: "k2", key: "c29tZS1rZXk=" }), { status: 200 });
		},
	});
	try {
		const cookie = await signIn(t.env);
		const res = await app.request("https://marcus.test/settings/secrets/public-key", { headers: { cookie } }, t.env);
		assert.equal(res.status, 200);
		assert.equal(hits, 2);
		assert.equal(t.calls.filter((c) => c.url.endsWith("/access_tokens")).length, 2, "fresh token minted on retry");
	} finally {
		t.restore();
	}
});

test("GitHub 422 on save maps to a reload hint", async () => {
	const t = setup({
		[`PUT ${SECRETS_API}/TELEGRAM_BOT_TOKEN`]: () => new Response(JSON.stringify({ message: "Bad key" }), { status: 422 }),
	});
	try {
		const cookie = await signIn(t.env);
		const csrf = await csrfFrom(t.env, cookie);
		const res = await app.request("https://marcus.test/settings/secrets", post(cookie, csrf, { name: "TELEGRAM_BOT_TOKEN", key_id: "k1", encrypted_value: SEALED }), t.env);
		assert.equal(res.status, 422);
		assert.match(((await res.json()) as { message: string }).message, /Reload/);
	} finally {
		t.restore();
	}
});
