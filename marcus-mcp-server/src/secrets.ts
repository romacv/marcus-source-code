// Settings page that stores a user's third-party token as a GitHub Actions secret in
// their own vault repository (docs/third-party-credentials.md, variant 2).
//
// The token is sealed in the browser with libsodium crypto_box_seal against the
// repository public key. This worker only relays { name, key_id, encrypted_value } to
// GitHub in a single PUT: it never receives, logs or stores the plaintext, and it does not
// store the ciphertext either (no KV, no log, no audit entry).
import type { OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import type { Context } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { html } from "hono/html";
import { anonId } from "./audit.ts";
import { hmacSign, hmacVerify } from "./crypto.ts";
import { GitHubClient } from "./github.ts";
import { exchangeCodeForUserToken, findInstallationByLogin, getAuthenticatedUser } from "./github-oauth.ts";
import type { MarcusEnv } from "./index";
import { layout } from "./utils.ts";
import { VAULT_REPO_NAME } from "./vault.ts";

type Bindings = MarcusEnv & { OAUTH_PROVIDER: OAuthHelpers };
type Ctx = Context<{ Bindings: Bindings }>;

// Secret names Marcus may write. Extend when a new integration needs a token.
export const SECRET_ALLOWLIST: readonly string[] = ["TELEGRAM_BOT_TOKEN"];

export const SECRET_NAME_RE = /^[A-Z][A-Z0-9_]{0,63}$/;
const KEY_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;
// A sealed box is at least 32 (ephemeral key) + 16 (MAC) bytes = 64 base64 characters.
const ENCRYPTED_MIN_LEN = 64;
export const ENCRYPTED_MAX_LEN = 64 * 1024;
const BODY_MAX_LEN = ENCRYPTED_MAX_LEN + 1024;

const SESSION_COOKIE = "marcus_session";
const LOGIN_COOKIE = "marcus_login";
const SESSION_TTL_MS = 60 * 60 * 1000;
const LOGIN_TTL_MS = 10 * 60 * 1000;
const CSRF_TTL_MS = 15 * 60 * 1000;

const PURPOSE_SESSION = "settings-session";
const PURPOSE_LOGIN = "settings-login";
const PURPOSE_CSRF = "settings-csrf";

export const SETTINGS_PATH = "/settings/secrets";
const PERMISSION_HINT =
	"Marcus needs the new GitHub App permission Secrets: Read and write. Open your GitHub installation settings and approve the updated permissions, then reload this page.";

export function isAllowedSecretName(name: unknown): name is string {
	return (
		typeof name === "string" &&
		SECRET_NAME_RE.test(name) &&
		!name.startsWith("GITHUB_") &&
		SECRET_ALLOWLIST.includes(name)
	);
}

export type SecretBody = { name: string; key_id: string; encrypted_value: string };

// Accepts only { name, key_id, encrypted_value }; anything else is rejected so that a
// plaintext value can never ride along in another field.
export function parseSecretBody(raw: string): { ok: true; body: SecretBody } | { ok: false; message: string } {
	if (raw.length > BODY_MAX_LEN) return { ok: false, message: "Request body is too large." };
	let data: unknown;
	try {
		data = JSON.parse(raw);
	} catch {
		return { ok: false, message: "Body must be JSON." };
	}
	if (typeof data !== "object" || data === null || Array.isArray(data)) {
		return { ok: false, message: "Body must be a JSON object." };
	}
	const keys = Object.keys(data).sort().join(",");
	if (keys !== "encrypted_value,key_id,name") {
		return { ok: false, message: "Body must contain exactly name, key_id and encrypted_value." };
	}
	const { name, key_id, encrypted_value } = data as Record<string, unknown>;
	if (!isAllowedSecretName(name)) return { ok: false, message: "This secret name is not allowed." };
	if (typeof key_id !== "string" || !KEY_ID_RE.test(key_id)) {
		return { ok: false, message: "Invalid key_id." };
	}
	if (
		typeof encrypted_value !== "string" ||
		encrypted_value.length < ENCRYPTED_MIN_LEN ||
		encrypted_value.length > ENCRYPTED_MAX_LEN ||
		!BASE64_RE.test(encrypted_value)
	) {
		return { ok: false, message: "encrypted_value must be a base64 sealed box of at most 64 KB." };
	}
	return { ok: true, body: { name, key_id, encrypted_value } };
}

// --- signed tokens (session cookie, CSRF token, login state) on KV_ENCRYPTION_KEY ---

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function signToken(key: string, payload: Record<string, unknown>): Promise<string> {
	const json = JSON.stringify(payload);
	return `${b64url(json)}.${await hmacSign(key, json)}`;
}

async function verifyToken<T extends { p: string; ts: number }>(
	key: string,
	token: string | undefined,
	purpose: string,
	ttlMs: number,
): Promise<T | null> {
	if (!token) return null;
	const dot = token.lastIndexOf(".");
	if (dot === -1) return null;
	try {
		const json = unb64url(token.slice(0, dot));
		if (!(await hmacVerify(key, json, token.slice(dot + 1)))) return null;
		const data = JSON.parse(json) as T;
		if (data.p !== purpose || typeof data.ts !== "number" || Date.now() - data.ts > ttlMs) return null;
		return data;
	} catch {
		return null;
	}
}

type Session = { p: string; ts: number; uid: string; login: string; inst: string };

async function readSession(c: Ctx): Promise<Session | null> {
	const s = await verifyToken<Session>(
		c.env.KV_ENCRYPTION_KEY,
		getCookie(c, SESSION_COOKIE),
		PURPOSE_SESSION,
		SESSION_TTL_MS,
	);
	return s && s.uid && s.login && s.inst ? s : null;
}

async function csrfToken(c: Ctx, session: Session): Promise<string> {
	return signToken(c.env.KV_ENCRYPTION_KEY, {
		p: PURPOSE_CSRF,
		ts: Date.now(),
		sub: session.uid,
		nonce: crypto.randomUUID(),
	});
}

// POST/DELETE guard: signed short-lived token in a header bound to the session user, JSON
// content type for bodies (a cross-site form cannot send it) and a same-origin check.
async function csrfError(c: Ctx, session: Session): Promise<Response | null> {
	const token = await verifyToken<{ p: string; ts: number; sub: string }>(
		c.env.KV_ENCRYPTION_KEY,
		c.req.header("x-csrf-token"),
		PURPOSE_CSRF,
		CSRF_TTL_MS,
	);
	if (!token || token.sub !== session.uid) {
		return c.json({ error: "csrf", message: "This page has expired. Reload it and try again." }, 403);
	}
	const origin = c.req.header("origin");
	if (origin && origin !== new URL(c.req.url).origin) {
		return c.json({ error: "csrf", message: "Cross-origin request refused." }, 403);
	}
	return null;
}

function noStore(c: Ctx) {
	c.header("Cache-Control", "no-store");
}

function installationsUrl(inst: string): string {
	return `https://github.com/settings/installations/${encodeURIComponent(inst)}`;
}

function clientFor(c: Ctx, session: Session): GitHubClient {
	// Owner and repository come only from the signed session, never from the request.
	return new GitHubClient(
		c.env.GITHUB_APP_PRIVATE_KEY,
		c.env.GITHUB_APP_ID,
		c.env.GITHUB_APP_CLIENT_ID,
		session.inst,
		session.login,
		VAULT_REPO_NAME,
		c.env.MARCUS_KV,
		c.env.KV_ENCRYPTION_KEY,
	);
}

type UserError = { status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 502; error: string; message: string; fix_url?: string };

async function githubMessage(res: Response): Promise<string> {
	try {
		const data = (await res.json()) as { message?: unknown };
		if (typeof data.message === "string") return data.message.slice(0, 200);
	} catch {
		// not JSON
	}
	return `GitHub answered ${res.status}`;
}

// Maps a failed GitHub response to a message for the page. Never echoes request data.
async function mapFailure(res: Response, session: Session): Promise<UserError> {
	const detail = await githubMessage(res);
	if (res.status === 403 && /resource not accessible/i.test(detail)) {
		return { status: 403, error: "permission", message: PERMISSION_HINT, fix_url: installationsUrl(session.inst) };
	}
	if (res.status === 401) {
		return { status: 401, error: "auth", message: "GitHub rejected the Marcus installation. Reconnect Marcus and try again." };
	}
	if (res.status === 404) {
		return { status: 404, error: "not_found", message: `Marcus cannot reach ${VAULT_REPO_NAME}. Check that the app is installed on that repository.`, fix_url: installationsUrl(session.inst) };
	}
	if (res.status === 409 || res.status === 422) {
		return { status: 422, error: "key_changed", message: "GitHub rejected the sealed value (the repository key may have changed). Reload the page and save again." };
	}
	if (res.status === 403 || res.status === 429) {
		return { status: 429, error: "rate_limited", message: "GitHub is rate limiting requests. Wait a minute and try again." };
	}
	return { status: 502, error: "upstream", message: "GitHub is not available right now. Try again shortly." };
}

function userErrorResponse(c: Ctx, e: UserError): Response {
	return c.json({ error: e.error, message: e.message, ...(e.fix_url ? { fix_url: e.fix_url } : {}) }, e.status);
}

async function audit(c: Ctx, session: Session, action: string, name: string, result: string): Promise<void> {
	const uid = await anonId(session.login, c.env.KV_ENCRYPTION_KEY);
	console.log("[secret-" + action + "]", JSON.stringify({ uid, name, result }));
}

type SecretListItem = { name: string; updated_at?: string };

async function listSecrets(c: Ctx, session: Session): Promise<{ items: SecretListItem[] } | { error: UserError }> {
	const res = await clientFor(c, session).actionsSecretsRequest("GET", "?per_page=100");
	if (!res.ok) return { error: await mapFailure(res, session) };
	const data = (await res.json()) as { secrets?: SecretListItem[] };
	const items = (data.secrets ?? [])
		.filter((s) => isAllowedSecretName(s.name))
		.map((s) => ({ name: s.name, updated_at: s.updated_at }));
	return { items };
}

// --- login via the existing GitHub OAuth app (callback is /auth/github/callback) ---

async function startLogin(c: Ctx): Promise<Response> {
	const nonce = crypto.randomUUID();
	const state = await signToken(c.env.KV_ENCRYPTION_KEY, { p: PURPOSE_LOGIN, ts: Date.now(), nonce });
	// Binds the OAuth round trip to this browser (blocks login CSRF).
	setCookie(c, LOGIN_COOKIE, nonce, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/auth/github/callback",
		maxAge: LOGIN_TTL_MS / 1000,
	});
	const params = new URLSearchParams({ client_id: c.env.GITHUB_OAUTH_CLIENT_ID, state });
	return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

// Called from /auth/github/callback once the signed state is verified and purpose matches.
export async function completeSettingsLogin(c: Ctx, state: { nonce?: string }): Promise<Response> {
	const cookieNonce = getCookie(c, LOGIN_COOKIE);
	deleteCookie(c, LOGIN_COOKIE, { path: "/auth/github/callback" });
	if (!state.nonce || !cookieNonce || cookieNonce !== state.nonce) {
		return c.text("Sign-in does not match this browser. Open the settings page again.", 400);
	}
	const code = c.req.query("code");
	if (!code) return c.text("Missing code", 400);
	const userToken = await exchangeCodeForUserToken(code, c.env);
	const user = await getAuthenticatedUser(userToken);
	const inst = await findInstallationByLogin(c.env, user.login, c.env.KV_ENCRYPTION_KEY);
	if (!inst) {
		return c.html(
			layout(
				await html`<div style="max-width:560px;margin:0 auto;padding:2rem 0"><h1>Marcus is not installed</h1><p>Connect Marcus to your AI client first so it can create and access your vault repository.</p><p><a class="cta--primary" href="/docs">Open the setup guide</a></p></div>`,
				"Marcus — not installed",
			),
			403,
		);
	}
	const session = await signToken(c.env.KV_ENCRYPTION_KEY, {
		p: PURPOSE_SESSION,
		ts: Date.now(),
		uid: String(user.id),
		login: user.login,
		inst,
	});
	setCookie(c, SESSION_COOKIE, session, {
		httpOnly: true,
		secure: true,
		sameSite: "Lax",
		path: "/settings",
		maxAge: SESSION_TTL_MS / 1000,
	});
	return c.redirect(SETTINGS_PATH);
}

export const loginPurpose = PURPOSE_LOGIN;

// --- routes ---

const secrets = new Hono<{ Bindings: Bindings }>();

secrets.get("/public-key", async (c) => {
	noStore(c);
	const session = await readSession(c);
	if (!session) return c.json({ error: "auth", message: "Sign in required." }, 401);
	const res = await clientFor(c, session).actionsSecretsRequest("GET", "/public-key");
	if (!res.ok) return userErrorResponse(c, await mapFailure(res, session));
	const data = (await res.json()) as { key_id?: string; key?: string };
	if (!data.key_id || !data.key) {
		return c.json({ error: "upstream", message: "GitHub returned no public key." }, 502);
	}
	return c.json({ key_id: data.key_id, key: data.key });
});

secrets.post("/", async (c) => {
	noStore(c);
	const session = await readSession(c);
	if (!session) return c.json({ error: "auth", message: "Sign in required." }, 401);
	const denied = await csrfError(c, session);
	if (denied) return denied;
	if (!(c.req.header("content-type") ?? "").toLowerCase().startsWith("application/json")) {
		return c.json({ error: "invalid", message: "Content-Type must be application/json." }, 400);
	}
	const parsed = parseSecretBody(await c.req.text());
	if (!parsed.ok) return c.json({ error: "invalid", message: parsed.message }, 400);
	const { name, key_id, encrypted_value } = parsed.body;
	const res = await clientFor(c, session).actionsSecretsRequest("PUT", `/${name}`, { encrypted_value, key_id });
	if (res.status === 201 || res.status === 204) {
		await audit(c, session, "save", name, String(res.status));
		return res.status === 201 ? c.json({ ok: true, created: true }, 201) : c.body(null, 204);
	}
	const failure = await mapFailure(res, session);
	await audit(c, session, "save", name, failure.error);
	return userErrorResponse(c, failure);
});

secrets.delete("/:name", async (c) => {
	noStore(c);
	const session = await readSession(c);
	if (!session) return c.json({ error: "auth", message: "Sign in required." }, 401);
	const denied = await csrfError(c, session);
	if (denied) return denied;
	const name = c.req.param("name");
	if (!isAllowedSecretName(name)) {
		return c.json({ error: "invalid", message: "This secret name is not allowed." }, 400);
	}
	const res = await clientFor(c, session).actionsSecretsRequest("DELETE", `/${name}`);
	if (res.status === 204) {
		await audit(c, session, "delete", name, "204");
		return c.body(null, 204);
	}
	const failure = await mapFailure(res, session);
	await audit(c, session, "delete", name, failure.error);
	return userErrorResponse(c, failure);
});

secrets.get("/", async (c) => {
	noStore(c);
	const session = await readSession(c);
	if (!session) return startLogin(c);
	const csrf = await csrfToken(c, session);
	const listed = await listSecrets(c, session);
	const newSecretUrl = `https://github.com/${session.login}/${VAULT_REPO_NAME}/settings/secrets/actions/new`;
	const blocked = "error" in listed && listed.error.error === "permission";

	const alert =
		"error" in listed
			? html`<div class="alert"><div class="alert__title">Could not load secrets</div><p class="alert__body">${listed.error.message}${listed.error.fix_url ? html` <a href="${listed.error.fix_url}" target="_blank" rel="noopener noreferrer">Open installation settings</a>` : ""}</p></div>`
			: "";

	const rows =
		"items" in listed && listed.items.length > 0
			? html`<ul class="secrets-list" style="list-style:none;padding:0;margin:0 0 2rem">${listed.items.map(
					(s) => html`<li style="display:flex;gap:1rem;align-items:center;justify-content:space-between;padding:.6rem 0;border-bottom:1px solid var(--ink-hair)"><code>${s.name}</code><span style="color:var(--subtle);font-family:var(--f-mono);font-size:var(--tx-xs)">${(s.updated_at ?? "").slice(0, 10)}</span><button type="button" class="cta--secondary" data-delete="${s.name}" hidden>Delete</button></li>`,
				)}</ul>`
			: "items" in listed
				? html`<p style="color:var(--subtle)">No secrets saved yet.</p>`
				: "";

	const form = blocked
		? ""
		: html`
			<form id="secret-form" autocomplete="off" hidden style="gap:1rem;max-width:560px">
				<label>Secret name
					<select id="secret-name" name="name" required>${SECRET_ALLOWLIST.map((n) => html`<option value="${n}">${n}</option>`)}</select>
				</label>
				<label>Value
					<input id="secret-value" type="password" autocomplete="off" spellcheck="false" required />
				</label>
				<button type="submit" class="cta--primary">Save to GitHub</button>
				<p id="secret-status" role="status" style="font-family:var(--f-mono);font-size:var(--tx-xs)"></p>
			</form>`;

	const content = html`
		<div id="secrets-page" data-csrf="${csrf}" style="max-width:680px;margin:0 auto;padding:2rem 0">
			<h1 style="font-family:var(--f-display);font-size:var(--tx-2xl);font-weight:400;letter-spacing:-.025em;text-transform:uppercase;margin-bottom:1rem">Secrets</h1>
			<p class="lede">Tokens for your integrations are sealed in this browser and saved as GitHub Actions secrets in <code>${session.login}/${VAULT_REPO_NAME}</code>. Marcus only relays the sealed value and can never read it back.</p>
			${alert}
			${rows}
			${form}
			<noscript>
				<p>JavaScript is required to seal the value in your browser. Without it, add the secret directly on GitHub: <a href="${newSecretUrl}" rel="noopener noreferrer">${newSecretUrl}</a></p>
			</noscript>
			<script src="/js/sodium.min.js" integrity="sha384-9ZK5BwsLIV+KHOiKGR4nILTb1sBUz8d0njyneQweTjvHgRY0DWdeHNmMxTA+JPya" crossorigin="anonymous"></script>
			<script src="/js/secrets.js"></script>
		</div>
	`;
	return c.html(layout(await content, "Marcus — Secrets"));
});

export default secrets;
