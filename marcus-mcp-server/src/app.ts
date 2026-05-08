import type { AuthRequest, OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";
import { html, raw } from "hono/html";
import { StructuredToolError } from "./errors.ts";
import type { MarcusEnv } from "./index";
import { encryptForKv, hmacSign, hmacVerify } from "./crypto";
import { GitHubClient } from "./github";
import {
	exchangeCodeForUserToken,
	findInstallationForApp,
	getAuthenticatedUser,
	marcusVaultExists,
	provisionVault,
} from "./github-oauth";
import { homeContent, layout } from "./utils";
import { findUnrelatedVaultEntries } from "./vault-guard.ts";
import { VAULT_REPO_NAME, VAULT_SEED_FILES } from "./vault";

export type Bindings = MarcusEnv & {
	OAUTH_PROVIDER: OAuthHelpers;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
	const content = await homeContent(c.req.raw);
	return c.html(layout(content, "Marcus - Second Brain"));
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

	const params = new URLSearchParams({ client_id: c.env.GITHUB_OAUTH_CLIENT_ID, scope: "repo", state });
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

	const installPagePath = `/vault/install?state=${encodeURIComponent(phase2State)}&login=${encodeURIComponent(user.login)}`;
	if (await marcusVaultExists(userToken, user.login)) {
		return c.redirect(installPagePath);
	}

	try {
		await provisionVault(userToken, user.login);
		return c.redirect(installPagePath);
	} catch (error) {
		const message = String(error);
		if (message.includes("422")) {
			return c.redirect(`/vault/conflict?login=${encodeURIComponent(user.login)}`);
		}
		console.warn("[provision-vault] redirecting to error page", String(error).slice(0, 300));
		return c.redirect("/vault/error");
	}
});

// Intermediate page shown between vault provisioning and GitHub's install screen.
// Previews the 4 clicks the user must perform on GitHub's hosted install page.
app.get("/vault/install", async (c) => {
	const state = c.req.query("state") ?? "";
	const login = c.req.query("login") ?? "";
	const installUrl = `https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new?state=${encodeURIComponent(state)}`;

	const content = html`
    <section class="hero" style="grid-template-columns:1fr;max-width:680px;margin-inline:auto;text-align:center">
      <div class="hero__copy">
        <h1>One last step</h1>
        <p class="lede">Marcus has created your private vault. One last step: install the app on it so it can read &amp; write your notes.</p>
      </div>
    </section>

    <section class="section" style="max-width:680px;margin-inline:auto;text-align:center">
      <p class="section__eyebrow">What you'll see next</p>
      <h2>4 clicks on GitHub</h2>
      <ol class="connect-steps" style="margin-inline:auto;text-align:left">
        <li>On the next screen, choose <strong>Only select repositories</strong></li>
        <li>Click the <strong>Select repositories</strong> dropdown</li>
        <li>Pick <code>${VAULT_REPO_NAME}</code> (the one we just created)</li>
        <li>Click <strong>Install &amp; Authorize</strong></li>
      </ol>
      <img class="section__img section__img--center"
           src="/img/install-authorize.png"
           alt="GitHub Install & Authorize screen — Only select repositories selected, ${VAULT_REPO_NAME} picked from dropdown, green Install & Authorize button">
      <div class="cta" style="justify-content:center;margin-top:2.5rem">
        <a class="cta--primary" href="${installUrl}">Continue to GitHub →</a>
      </div>
      <p style="color:var(--subtle);font-family:var(--f-mono);font-size:var(--tx-xs);margin-top:1.5rem">Your vault: <a href="https://github.com/${login}/${VAULT_REPO_NAME}" style="color:var(--muted)">github.com/${login}/${VAULT_REPO_NAME}</a></p>
    </section>
  `;

	return c.html(layout(await content, "Marcus — Install on your vault"));
});

app.get("/vault/setup", (c) => {
	const qs = new URL(c.req.url).search;
	return c.redirect(`/vault/install${qs}`, 302);
});

app.get("/vault/error", (c) => {
	const reconnectUrl = "/authorize";
	const content = raw(
		`<div style="max-width:560px;margin:0 auto;padding:2rem 0">
			<h1 style="font-family:var(--f-display);font-size:var(--tx-2xl);font-weight:700;margin-bottom:.75rem">Vault setup failed</h1>
			<p style="color:var(--muted);margin-bottom:1.5rem">Marcus could not create your private vault repository.</p>
			<p style="color:var(--muted);margin-bottom:2rem">Please try again. If it keeps failing, check that your GitHub account has permission to create repositories.</p>
			<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem">
				<a href="${reconnectUrl}" style="display:inline-block;padding:.75rem 1.5rem;background:var(--accent);color:#000;font-weight:600;border-radius:6px;text-decoration:none">Try again</a>
			</div>
		</div>`,
	);
	return c.html(layout(content, "Marcus — Vault setup failed"));
});

app.get("/vault/conflict", (c) => {
	const login = c.req.query("login") ?? "";
	const settingsUrl = `https://github.com/${login}/${VAULT_REPO_NAME}/settings`;
	const reconnectUrl = "/authorize";
	const content = raw(
		`<div style="max-width:560px;margin:0 auto;padding:2rem 0">
			<h1 style="font-family:var(--f-display);font-size:var(--tx-2xl);font-weight:700;margin-bottom:.75rem">Vault name conflict</h1>
			<p style="color:var(--muted);margin-bottom:1.5rem">Marcus found a repository named <strong style="color:var(--text)">${VAULT_REPO_NAME}</strong>, but it does not look like a Marcus vault.</p>
			<p style="color:var(--muted);margin-bottom:2rem">To avoid writing Marcus files into unrelated content, rename or delete that repository first, then reconnect.</p>
			<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem">
				<a href="${settingsUrl}" target="_blank" style="display:inline-block;padding:.75rem 1.5rem;background:var(--accent);color:#000;font-weight:600;border-radius:6px;text-decoration:none">Open repository settings ↗</a>
				<a href="${reconnectUrl}" style="display:inline-block;padding:.75rem 1.5rem;border:1px solid var(--hair);color:var(--text);border-radius:6px;text-decoration:none">Try again</a>
			</div>
			<p style="color:var(--subtle);font-size:.8rem">Conflicting repo: <code style="color:var(--muted)">github.com/${login}/${VAULT_REPO_NAME}</code></p>
		</div>`,
	);
	return c.html(layout(content, "Marcus — Vault conflict"));
});

app.get("/version", (c) => c.json({ version: "0.2.0", sha: "local-dev" }));

// Seeds vault folder structure via installation token (Contents R+W).
// Called after GitHub App is installed on the repo.
async function seedVaultIfNeeded(env: MarcusEnv, installationId: string, login: string): Promise<void> {
	const gh = new GitHubClient(
		env.GITHUB_APP_PRIVATE_KEY,
		env.GITHUB_APP_ID,
		env.GITHUB_APP_CLIENT_ID,
		installationId,
		login,
		VAULT_REPO_NAME,
		env.MARCUS_KV,
		env.KV_ENCRYPTION_KEY,
	);

	// Skip if already seeded
	try {
		await gh.getFile("_marcus/version.txt");
		console.log("[seed-vault]", JSON.stringify({ login, result: "skipped", reason: "sentinel" }));
		return;
	} catch {
		// not seeded yet
	}

	try {
		const tree = await gh.listTree("");
		const unrelated = findUnrelatedVaultEntries(tree);
		if (unrelated.length > 0) {
			console.log("[seed-vault]", JSON.stringify({ login, result: "refused", reason: "unrelated_content", unrelated: unrelated.slice(0, 3) }));
			throw new StructuredToolError(
				"conflict",
				`Refusing to seed vault: repo contains unrelated content (${unrelated.slice(0, 3).join(", ")}). Rename/delete it or use an empty repository.`,
				"contact_support",
			);
		}
	} catch (error) {
		if (error instanceof StructuredToolError && error.code === "conflict") {
			throw error;
		}
	}

	const readmeFile = VAULT_SEED_FILES.find((f) => f.path === "README.md");

	// Empty repo (no commits / no main branch) — bootstrap via Contents API,
	// which creates the default branch with the first commit. Without this,
	// createCommitOnBranch's git/ref/heads/main lookup returns 409
	// "Git Repository is empty."
	const branchExisted = await gh.branchExists("main");
	if (!branchExisted && readmeFile) {
		await gh.createFile(readmeFile.path, readmeFile.content, "marcus-mcp-server: bootstrap vault");
	}

	const seedAdditions = branchExisted
		? VAULT_SEED_FILES
		: VAULT_SEED_FILES.filter((f) => f.path !== "README.md");

	// Seed in one atomic commit
	await gh.createCommitOnBranch(
		"main",
		[
			"marcus-mcp-server: initialize vault structure",
			"",
			`User: @${login}`,
			"Via: GitHub App installation",
			"Folders: 00-daily, 10-journal, 20-topics, 30-people, 40-projects, 50-resources, 60-photos, 90-archive",
		].join("\n"),
		seedAdditions,
	);
	console.log("[seed-vault]", JSON.stringify({ login, result: "seeded" }));
}

export default app;
