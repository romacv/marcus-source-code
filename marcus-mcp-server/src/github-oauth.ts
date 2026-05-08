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

export async function marcusVaultExists(userToken: string, login: string): Promise<boolean> {
	const repoRes = await fetch(`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}`, {
		headers: githubHeaders(userToken),
	});
	if (!repoRes.ok) return false;

	const sentinelRes = await fetch(
		`${GITHUB_API}/repos/${login}/${VAULT_REPO_NAME}/contents/_marcus/version.txt`,
		{ headers: githubHeaders(userToken) },
	);
	return sentinelRes.ok;
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
}
