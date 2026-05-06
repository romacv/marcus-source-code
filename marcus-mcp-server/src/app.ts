import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import type { MarcusEnv } from "./index";
import { encryptForKv, hmacSign, hmacVerify } from "./crypto";
import { GitHubClient } from "./github";
import {
	exchangeCodeForUserToken,
	findInstallationForApp,
	getAuthenticatedUser,
	vaultExists,
} from "./github-oauth";
import { homeContent, layout } from "./utils";
import { VAULT_REPO_NAME, VAULT_SEED_FILES } from "./vault";

export type Bindings = MarcusEnv & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "Marcus - Auto Second Brain"));
});

// Step 1: Claude calls /authorize → redirect to GitHub OAuth
app.get("/authorize", async (c) => {
	const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	const nonce = crypto.randomUUID();

	await c.env.MARCUS_KV.put(`state:${nonce}`, JSON.stringify(oauthReqInfo), {
		expirationTtl: 1800,
	});

	const statePayload = JSON.stringify({ nonce, ts: Date.now() });
	const sig = await hmacSign(c.env.KV_ENCRYPTION_KEY, statePayload);
	const state = btoa(statePayload) + "." + sig;

	const params = new URLSearchParams({ client_id: c.env.GITHUB_CLIENT_ID, scope: "repo", state });
	return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// Handles two phases:
//   Phase 1 (?code&state):            GitHub OAuth → get user info → redirect to App install
//   Phase 2 (?installation_id&state): App installed → seed vault → complete OAuth to Claude
app.get("/auth/github/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const installationId = c.req.query("installation_id");
	const setupAction = c.req.query("setup_action");

	if (!state) return c.text("Missing state parameter", 400);

	const dotIdx = state.lastIndexOf(".");
	if (dotIdx === -1) return c.text("Malformed state", 400);
	const statePayloadJson = atob(state.slice(0, dotIdx));
	const sig = state.slice(dotIdx + 1);

	if (!(await hmacVerify(c.env.KV_ENCRYPTION_KEY, statePayloadJson, sig))) {
		return c.text("Invalid state signature", 400);
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

		const reqJson = await c.env.MARCUS_KV.get(`state:${nonce}`);
		if (!reqJson) return c.text("OAuth session expired. Please connect again.", 400);
		const oauthReqInfo = JSON.parse(reqJson) as AuthRequest;
		await c.env.MARCUS_KV.delete(`state:${nonce}`);

		// Seed vault via installation token (has Contents R+W on the repo)
		await seedVaultIfNeeded(c.env, installationId, login);

		const encrypted = await encryptForKv(c.env.KV_ENCRYPTION_KEY, installationId);
		await c.env.MARCUS_KV.put(`user:${userId}`, encrypted);

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

	// If App already installed, seed vault if needed and complete OAuth directly
	const existingInstallId = await findInstallationForApp(userToken, c.env.GITHUB_APP_ID);
	if (existingInstallId) {
		await seedVaultIfNeeded(c.env, existingInstallId, user.login);

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
			props: { userId, installationId: existingInstallId, githubLogin: user.login, repoName: VAULT_REPO_NAME },
		});
		return c.redirect(redirectTo);
	}

	// No install yet — build phase2 state and redirect to vault setup page
	const phase2Payload = JSON.stringify({
		nonce: statePayload.nonce,
		ts: Date.now(),
		userId,
		login: user.login,
	});
	const phase2Sig = await hmacSign(c.env.KV_ENCRYPTION_KEY, phase2Payload);
	const phase2State = btoa(phase2Payload) + "." + phase2Sig;

	// If vault already exists, go straight to install
	if (await vaultExists(userToken, user.login)) {
		return c.redirect(
			`https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?${new URLSearchParams({ state: phase2State })}`,
		);
	}

	// Vault doesn't exist — show setup page (GitHub Apps can't create repos on behalf of users)
	return c.redirect(`/vault/setup?state=${encodeURIComponent(btoa(phase2Payload) + "." + phase2Sig)}&login=${encodeURIComponent(user.login)}`);
});

// Intermediate page shown when vault repo doesn't exist yet.
// Guides user to create the repo on GitHub, then continue to App install.
app.get("/vault/setup", (c) => {
	const state = c.req.query("state") ?? "";
	const login = c.req.query("login") ?? "";
	const appSlug = c.env.GITHUB_APP_SLUG;

	const githubNewRepoUrl = `https://github.com/new?name=${VAULT_REPO_NAME}&visibility=private&description=Marcus+second+brain+vault`;
	const installUrl = `https://github.com/apps/${appSlug}/installations/new?state=${encodeURIComponent(state)}`;

	return c.html(layout(
		`<div style="max-width:560px;margin:0 auto;padding:2rem 0">
			<h1 style="font-family:var(--f-display);font-size:var(--tx-2xl);font-weight:700;margin-bottom:.75rem">One more step</h1>
			<p style="color:var(--muted);margin-bottom:2rem">Marcus stores your notes in a private GitHub repository. Create it now — it takes 10 seconds.</p>
			<ol style="color:var(--muted);padding-left:1.25rem;margin-bottom:2rem;line-height:2">
				<li>Click <strong style="color:var(--text)">Create Repository</strong> — GitHub will open with the name pre-filled</li>
				<li>Make sure it's set to <strong style="color:var(--text)">Private</strong></li>
				<li>Check <strong style="color:var(--text)">Add a README file</strong></li>
				<li>Click <strong style="color:var(--text)">Create repository</strong> on GitHub</li>
				<li>Come back here and click <strong style="color:var(--text)">Continue</strong></li>
			</ol>
			<div style="display:flex;gap:1rem;flex-wrap:wrap">
				<a href="${githubNewRepoUrl}" target="_blank" style="display:inline-block;padding:.75rem 1.5rem;background:var(--accent);color:#000;font-weight:600;border-radius:6px;text-decoration:none">Create Repository on GitHub ↗</a>
				<a href="${installUrl}" style="display:inline-block;padding:.75rem 1.5rem;border:1px solid var(--hair);color:var(--text);border-radius:6px;text-decoration:none">I created it, continue →</a>
			</div>
			<p style="color:var(--subtle);font-size:.8rem;margin-top:1.5rem">Repo will be: <code style="color:var(--muted)">github.com/${login}/${VAULT_REPO_NAME}</code></p>
		</div>`,
		"Marcus — Create your vault",
	));
});

app.get("/version", (c) => c.json({ version: "0.2.0", sha: "local-dev" }));

// Seeds vault folder structure via installation token (Contents R+W).
// Called after GitHub App is installed on the repo.
async function seedVaultIfNeeded(env: MarcusEnv, installationId: string, login: string): Promise<void> {
	const gh = new GitHubClient(
		env.GITHUB_APP_PRIVATE_KEY,
		env.GITHUB_APP_ID,
		installationId,
		login,
		VAULT_REPO_NAME,
	);

	// Skip if already seeded
	try {
		await gh.getFile("_marcus/version.txt");
		return;
	} catch {
		// not seeded yet
	}

	// Seed in one atomic commit
	await gh.createCommitOnBranch("main", "marcus: initialize vault structure", VAULT_SEED_FILES);
}

export default app;
