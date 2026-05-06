import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import type { MarcusEnv } from "./index";
import { encryptForKv, hmacSign, hmacVerify } from "./crypto";
import {
	VAULT_REPO_NAME,
	exchangeCodeForUserToken,
	findInstallationForApp,
	getAuthenticatedUser,
	provisionVault,
	vaultExists,
} from "./github-oauth";
import { homeContent, layout } from "./utils";

export type Bindings = MarcusEnv & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{ Bindings: Bindings }>();

// Homepage: renders static/README.md as markdown
app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "Marcus - Auto Second Brain"));
});

// Step 1 of OAuth: Claude calls /authorize → we redirect to GitHub
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const nonce = crypto.randomUUID();

	// Store oauthReqInfo in KV (30-min TTL — enough for the GitHub auth + install flow)
	await c.env.MARCUS_KV.put(`state:${nonce}`, JSON.stringify(oauthReqInfo), {
		expirationTtl: 1800,
	});

	// Build HMAC-signed state param so we can verify it on callback
	const statePayload = JSON.stringify({ nonce, ts: Date.now() });
	const sig = await hmacSign(c.env.KV_ENCRYPTION_KEY, statePayload);
	const state = btoa(statePayload) + "." + sig;

	const params = new URLSearchParams({
		client_id: c.env.GITHUB_CLIENT_ID,
		scope: "repo",
		state,
	});
	return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// OAuth callback — handles two phases:
//   Phase 1 (?code&state):              GitHub OAuth done → create vault → redirect to App install
//   Phase 2 (?installation_id&state):   App installed → store mapping → complete OAuth to Claude
app.get("/auth/github/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const installationId = c.req.query("installation_id");
	const setupAction = c.req.query("setup_action");

	if (!state) return c.text("Missing state parameter", 400);

	// Parse and verify HMAC-signed state
	const dotIdx = state.lastIndexOf(".");
	if (dotIdx === -1) return c.text("Malformed state", 400);
	const statePayload64 = state.slice(0, dotIdx);
	const sig = state.slice(dotIdx + 1);
	const statePayloadJson = atob(statePayload64);

	if (!(await hmacVerify(c.env.KV_ENCRYPTION_KEY, statePayloadJson, sig))) {
		return c.text("Invalid state signature — possible CSRF", 400);
	}

	const statePayload = JSON.parse(statePayloadJson) as {
		nonce: string;
		ts: number;
		userId?: string;
		login?: string;
	};

	// --- Phase 2: GitHub App installation callback ---
	if (installationId && setupAction === "install") {
		const { userId, login, nonce } = statePayload;
		if (!userId || !login || !nonce) return c.text("Missing user context in state", 400);

		// Recover oauthReqInfo stored in KV during phase 1
		const reqJson = await c.env.MARCUS_KV.get(`state:${nonce}`);
		if (!reqJson) return c.text("OAuth session expired. Please connect again.", 400);
		const oauthReqInfo = JSON.parse(reqJson) as AuthRequest;
		await c.env.MARCUS_KV.delete(`state:${nonce}`);

		// Encrypt installationId and persist user→installation mapping
		const encrypted = await encryptForKv(c.env.KV_ENCRYPTION_KEY, installationId);
		await c.env.MARCUS_KV.put(`user:${userId}`, encrypted);

		// Complete OAuth — Claude gets a Marcus bearer token bound to this user
		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			request: oauthReqInfo,
			userId,
			metadata: { label: login },
			scope: oauthReqInfo.scope,
			props: { userId, installationId, githubLogin: login, repoName: VAULT_REPO_NAME },
		});
		return c.redirect(redirectTo);
	}

	// --- Phase 1: GitHub OAuth callback ---
	if (!code) return c.text("Missing code", 400);

	const userToken = await exchangeCodeForUserToken(code, c.env);
	const user = await getAuthenticatedUser(userToken);
	const userId = String(user.id);

	// If Marcus App is already installed, skip install redirect
	const existingInstallId = await findInstallationForApp(userToken, c.env.GITHUB_APP_ID);
	if (existingInstallId) {
		if (!(await vaultExists(userToken, user.login))) {
			await provisionVault(userToken, user.login);
		}
		const encrypted = await encryptForKv(c.env.KV_ENCRYPTION_KEY, existingInstallId);
		await c.env.MARCUS_KV.put(`user:${userId}`, encrypted);

		const reqJson = await c.env.MARCUS_KV.get(`state:${statePayload.nonce}`);
		if (!reqJson) return c.text("OAuth session expired. Please connect again.", 400);
		const oauthReqInfo = JSON.parse(reqJson) as AuthRequest;
		await c.env.MARCUS_KV.delete(`state:${statePayload.nonce}`);

		const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
			request: oauthReqInfo,
			userId,
			metadata: { label: user.login },
			scope: oauthReqInfo.scope,
			props: {
				userId,
				installationId: existingInstallId,
				githubLogin: user.login,
				repoName: VAULT_REPO_NAME,
			},
		});
		return c.redirect(redirectTo);
	}

	// Provision vault if needed, then redirect user to install the Marcus GitHub App
	if (!(await vaultExists(userToken, user.login))) {
		await provisionVault(userToken, user.login);
	}

	// Build phase-2 state: same nonce (so we can look up oauthReqInfo in KV), plus user info
	const phase2Payload = JSON.stringify({
		nonce: statePayload.nonce,
		ts: Date.now(),
		userId,
		login: user.login,
	});
	const phase2Sig = await hmacSign(c.env.KV_ENCRYPTION_KEY, phase2Payload);
	const phase2State = btoa(phase2Payload) + "." + phase2Sig;

	const installParams = new URLSearchParams({ state: phase2State });
	return c.redirect(
		`https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?${installParams}`,
	);
});

app.get("/version", (c) => c.json({ version: "0.2.0", sha: "local-dev" }));

export default app;
