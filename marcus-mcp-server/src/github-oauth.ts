import { VAULT_REPO_NAME, VAULT_SEED_FILES } from "./vault";

const GITHUB_API = "https://api.github.com";

type OAuthEnv = {
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
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

export async function exchangeCodeForUserToken(code: string, env: OAuthEnv): Promise<string> {
	const res = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: { Accept: "application/json", "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
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

// Returns the Marcus App installation ID for this user, or null if not installed.
export async function findInstallationForApp(
	userToken: string,
	appId: string,
): Promise<string | null> {
	const res = await fetch(`${GITHUB_API}/user/installations`, {
		headers: githubHeaders(userToken),
	});
	if (!res.ok) return null;
	const data = (await res.json()) as {
		installations: Array<{ id: number; app_id: number }>;
	};
	const found = data.installations.find((i) => i.app_id.toString() === appId);
	return found ? String(found.id) : null;
}

export async function vaultExists(userToken: string, login: string): Promise<boolean> {
	const res = await fetch(`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}`, {
		headers: githubHeaders(userToken),
	});
	return res.ok;
}

// Creates marcus-auto-second-brain repo and seeds it with folder structure.
export async function provisionVault(userToken: string, login: string): Promise<void> {
	// Step 1: create empty private repo with auto_init (creates main branch)
	const createRes = await fetch(`${GITHUB_API}/user/repos`, {
		method: "POST",
		headers: githubHeaders(userToken),
		body: JSON.stringify({
			name: VAULT_REPO_NAME,
			private: true,
			description: "Marcus — your personal second brain",
			auto_init: true,
		}),
	});
	if (!createRes.ok) {
		const body = await createRes.text();
		throw new Error(`Failed to create vault repo: ${createRes.status} ${body}`);
	}

	// Step 2: poll until main branch ref is available (auto_init takes 1-3s)
	let headSha: string | null = null;
	for (let attempt = 0; attempt < 6; attempt++) {
		await new Promise((r) => setTimeout(r, 1500));
		const refRes = await fetch(
			`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}/git/ref/heads/main`,
			{ headers: githubHeaders(userToken) },
		);
		if (refRes.ok) {
			headSha = ((await refRes.json()) as { object: { sha: string } }).object.sha;
			break;
		}
	}
	if (!headSha) throw new Error("Vault repo not ready after creation — ref polling timed out");

	// Step 3: seed files in one atomic commit via GraphQL
	const additions = VAULT_SEED_FILES.map((f) => ({
		path: f.path,
		contents: btoa(unescape(encodeURIComponent(f.content))),
	}));

	const gqlRes = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
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

	const gqlData = (await gqlRes.json()) as {
		data?: { createCommitOnBranch: { commit: { oid: string } } };
		errors?: unknown;
	};
	if (gqlData.errors) {
		throw new Error(`GraphQL vault seed failed: ${JSON.stringify(gqlData.errors)}`);
	}
}
