import { mintAppJwt } from "./github.ts";
import { VAULT_REPO_NAME, VAULT_SEED_FILES } from "./vault.ts";

const GITHUB_API = "https://api.github.com";

type OAuthEnv = {
	GITHUB_OAUTH_CLIENT_ID: string;
	GITHUB_OAUTH_CLIENT_SECRET: string;
	GITHUB_APP_ID: string;
	GITHUB_APP_SLUG: string;
};

function githubHeaders(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"Content-Type": "application/json",
		"User-Agent": "marcus-mcp-server/0.2.0",
	};
}

function encodeBase64Utf8(value: string): string {
	return btoa(unescape(encodeURIComponent(value)));
}

export async function exchangeCodeForUserToken(code: string, env: OAuthEnv): Promise<string> {
	const res = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: env.GITHUB_OAUTH_CLIENT_ID,
			client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
			code,
		}),
	});
	const data = (await res.json()) as { access_token?: string; token_type?: string; scope?: string; error?: string; error_description?: string };
	console.log("[token-exchange]", JSON.stringify({ status: res.status, token_prefix: data.access_token?.slice(0, 8), token_type: data.token_type, scope: data.scope, error: data.error, error_description: data.error_description }));
	if (!data.access_token) throw new Error(`GitHub token exchange failed: ${data.error} — ${data.error_description}`);
	return data.access_token;
}

export async function getAuthenticatedUser(
	token: string,
): Promise<{ login: string; id: number }> {
	const res = await fetch(`${GITHUB_API}/user`, { headers: githubHeaders(token) });
	if (!res.ok) {
		const body = await res.text();
		console.error("[get-user]", res.status, body.slice(0, 200));
		throw new Error(`GitHub /user failed: ${res.status}`);
	}
	return res.json() as Promise<{ login: string; id: number }>;
}

// Canonical "is App installed for user X" lookup using a GitHub App JWT.
// Does NOT depend on user OAuth scope or numeric GITHUB_APP_ID being correctly set.
export async function findInstallationByLogin(
	env: { GITHUB_APP_PRIVATE_KEY: string; GITHUB_APP_CLIENT_ID: string },
	login: string,
): Promise<string | null> {
	const jwt = mintAppJwt(env);
	const res = await fetch(`${GITHUB_API}/users/${login}/installation`, {
		headers: {
			Authorization: `Bearer ${jwt}`,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"User-Agent": "marcus-mcp-server/0.2.0",
		},
	});
	if (res.status === 404) {
		console.log("[find-install-by-login]", JSON.stringify({ login, result: "none" }));
		return null;
	}
	if (!res.ok) {
		console.error("[find-install-by-login]", JSON.stringify({
			login, status: res.status, body: (await res.text()).slice(0, 200),
		}));
		return null;
	}
	const data = (await res.json()) as { id: number };
	console.log("[find-install-by-login]", JSON.stringify({ login, result: "found", id: data.id }));
	return String(data.id);
}

// Legacy lookup using user OAuth token. Kept as a logged fallback so we can
// detect cases where the JWT path misses but this path hits (would indicate
// the App JWT call was misconfigured). Logs status/body on error and the
// match outcome on success.
export async function findInstallationForApp(
	userToken: string,
	appId: string,
): Promise<string | null> {
	const res = await fetch(`${GITHUB_API}/user/installations`, {
		headers: githubHeaders(userToken),
	});
	if (!res.ok) {
		console.error("[find-install-for-app]", JSON.stringify({
			status: res.status, body: (await res.text()).slice(0, 200),
		}));
		return null;
	}
	const data = (await res.json()) as {
		installations: Array<{ id: number; app_id: number }>;
	};
	const found = data.installations.find((i) => i.app_id.toString() === appId);
	console.log("[find-install-for-app]", JSON.stringify({
		expectedAppId: appId,
		listedCount: data.installations.length,
		listedAppIds: data.installations.map((i) => i.app_id),
		matched: !!found,
	}));
	return found ? String(found.id) : null;
}

// Returns the state of the user's vault repo:
//   "none"     — repo does not exist (safe to provision)
//   "vault"    — repo exists and contains the Marcus sentinel file
//   "conflict" — repo exists but is not a Marcus vault, OR repo state is
//                unknown (any non-200/404 response). Fail closed: never
//                provision over a repo we can't classify.
export async function vaultRepoState(
	userToken: string,
	login: string,
): Promise<"none" | "vault" | "conflict"> {
	const repoRes = await fetch(`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}`, {
		headers: githubHeaders(userToken),
	});
	if (repoRes.status === 404) {
		console.log("[vault-repo-state]", JSON.stringify({ login, result: "none" }));
		return "none";
	}
	if (!repoRes.ok) {
		console.error("[vault-repo-state]", JSON.stringify({
			login, status: repoRes.status, body: (await repoRes.text()).slice(0, 200),
		}));
		return "conflict";
	}
	const sentinelRes = await fetch(
		`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}/contents/_marcus/version.txt`,
		{ headers: githubHeaders(userToken) },
	);
	const result = sentinelRes.ok ? "vault" : "conflict";
	console.log("[vault-repo-state]", JSON.stringify({
		login, repoExists: true, sentinelExists: sentinelRes.ok, result,
	}));
	return result;
}

// Creates marcus-auto-second-brain repo and seeds it with folder structure.
export async function provisionVault(userToken: string, login: string): Promise<void> {
	const createRes = await fetch(`${GITHUB_API}/user/repos`, {
		method: "POST",
		headers: githubHeaders(userToken),
		body: JSON.stringify({
			name: VAULT_REPO_NAME,
			private: true,
			description: "Marcus — your personal second brain",
			auto_init: false,
		}),
	});
	if (!createRes.ok) {
		const body = await createRes.text();
		throw new Error(`Failed to create vault repo: ${createRes.status} ${body}`);
	}

	const readme = VAULT_SEED_FILES.find((file) => file.path === "README.md") ?? {
		path: "README.md",
		content: "# Marcus Second Brain\n\nManaged by Marcus.\n",
	};
	const bootstrapRes = await fetch(
		`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}/contents/${readme.path}`,
		{
			method: "PUT",
			headers: githubHeaders(userToken),
			body: JSON.stringify({
				message: "marcus: bootstrap vault",
				content: encodeBase64Utf8(readme.content),
			}),
		},
	);
	if (!bootstrapRes.ok) {
		const body = await bootstrapRes.text();
		throw new Error(`Bootstrap failed: ${bootstrapRes.status} ${body}`);
	}
	const bootstrapData = (await bootstrapRes.json()) as { commit: { sha: string } };
	const headSha = bootstrapData.commit.sha;

	const additions = VAULT_SEED_FILES
		.filter((file) => file.path !== readme.path)
		.map((f) => ({
		path: f.path,
		contents: encodeBase64Utf8(f.content),
	}));

	const gqlRes = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${userToken}`,
			"Content-Type": "application/json",
			"User-Agent": "marcus-mcp-server/0.2.0",
		},
		body: JSON.stringify({
			query: `
        mutation($input: CreateCommitOnBranchInput!) {
          createCommitOnBranch(input: $input) { commit { oid } }
        }
      `,
			variables: {
				input: {
					branch: {
						repositoryNameWithOwner: `${login}/${VAULT_REPO_NAME}`,
						branchName: "main",
					},
					message: { headline: "marcus: initialize vault structure" },
					fileChanges: { additions },
					expectedHeadOid: headSha,
				},
			},
		}),
	});
	if (!gqlRes.ok) {
		throw new Error(`GraphQL vault seed failed: ${gqlRes.status} ${await gqlRes.text()}`);
	}

	const gqlData = (await gqlRes.json()) as {
		data?: { createCommitOnBranch: { commit: { oid: string } } };
		errors?: unknown;
	};
	if (gqlData.errors) {
		throw new Error(`GraphQL vault seed failed: ${JSON.stringify(gqlData.errors)}`);
	}
	console.log("[provision-vault]", JSON.stringify({ login, ok: true, repoCreated: true, seeded: true }));
}
