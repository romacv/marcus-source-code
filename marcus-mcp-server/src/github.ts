const GITHUB_API = "https://api.github.com";

type FileResult = {
	sha: string;
	content: string;
};

type WriteResult = {
	sha: string;
};

type SearchMatch = {
	path: string;
	sha: string;
	tags?: string[];
};

type CommitFile = {
	filename: string;
};

type Commit = {
	sha: string;
	commit: { author: { date: string } };
	files?: CommitFile[];
};

type TreeEntry = {
	path: string;
	type: "blob" | "tree";
};

// Signs a JWT for GitHub App authentication.
async function signAppJwt(appId: string, privateKeyPem: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: "RS256", typ: "JWT" };
	const payload = { iat: now - 60, exp: now + 600, iss: appId };

	const enc = (obj: object) =>
		btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

	const signingInput = `${enc(header)}.${enc(payload)}`;

	// Import RSA private key
	const pemBody = privateKeyPem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
	const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey(
		"pkcs8",
		keyData,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sigBytes = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(signingInput),
	);
	const sig = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");

	return `${signingInput}.${sig}`;
}

export class GitHubClient {
	private installationToken: string | null = null;
	private tokenExpiry = 0;

	constructor(
		private readonly privateKeyPem: string,
		private readonly appId: string,
		private readonly installationId: string,
		private readonly owner: string,
		private readonly repo: string,
	) {}

	private async getToken(): Promise<string> {
		if (this.installationToken && Date.now() < this.tokenExpiry) {
			return this.installationToken;
		}
		const jwt = await signAppJwt(this.appId, this.privateKeyPem);
		const res = await fetch(
			`${GITHUB_API}/app/installations/${this.installationId}/access_tokens`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
		);
		if (!res.ok) throw new Error(`GitHub token fetch failed: ${res.status}`);
		const data = (await res.json()) as { token: string; expires_at: string };
		this.installationToken = data.token;
		this.tokenExpiry = new Date(data.expires_at).getTime() - 60_000;
		return this.installationToken;
	}

	private async api(path: string, opts: RequestInit = {}): Promise<Response> {
		const token = await this.getToken();
		const res = await fetch(`${GITHUB_API}${path}`, {
			...opts,
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"Content-Type": "application/json",
				"User-Agent": "marcus-mcp-server/0.2.0",
				...(opts.headers ?? {}),
			},
		});
		if (!res.ok) {
			const body = await res.text();
			throw new Error(`GitHub API ${path} → ${res.status}: ${body}`);
		}
		return res;
	}

	async getFile(path: string): Promise<FileResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`);
		const data = (await res.json()) as { sha: string; content: string; encoding: string };
		const content = atob(data.content.replace(/\n/g, ""));
		return { sha: data.sha, content };
	}

	async createFile(path: string, content: string): Promise<WriteResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "PUT",
			body: JSON.stringify({
				message: `marcus: create ${path}`,
				content: btoa(unescape(encodeURIComponent(content))),
			}),
		});
		const data = (await res.json()) as { content: { sha: string } };
		return { sha: data.content.sha };
	}

	async updateFile(path: string, content: string, sha: string): Promise<WriteResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "PUT",
			body: JSON.stringify({
				message: `marcus: update ${path}`,
				content: btoa(unescape(encodeURIComponent(content))),
				sha,
			}),
		});
		const data = (await res.json()) as { content: { sha: string } };
		return { sha: data.content.sha };
	}

	async deleteFile(path: string, sha: string): Promise<void> {
		await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "DELETE",
			body: JSON.stringify({
				message: `marcus: delete ${path}`,
				sha,
			}),
		});
	}

	async searchCode(
		query: string,
		opts: { folder?: string; limit?: number } = {},
	): Promise<SearchMatch[]> {
		const qualifier = `repo:${this.owner}/${this.repo}${opts.folder ? ` path:${opts.folder}` : ""}`;
		const q = encodeURIComponent(`${query} ${qualifier} extension:md`);
		const res = await this.api(
			`/search/code?q=${q}&per_page=${opts.limit ?? 10}`,
			{ headers: { Accept: "application/vnd.github.text-match+json" } },
		);
		const data = (await res.json()) as { items: Array<{ path: string; sha: string }> };
		return data.items.map((item) => ({ path: item.path, sha: item.sha }));
	}

	async listTree(folder: string): Promise<TreeEntry[]> {
		const path = folder ? `${folder}?recursive=1` : "HEAD?recursive=1";
		const res = await this.api(
			`/repos/${this.owner}/${this.repo}/git/trees/${path}`,
		);
		const data = (await res.json()) as {
			tree: Array<{ path: string; type: "blob" | "tree" }>;
		};
		return data.tree
			.filter((e) => !folder || e.path.startsWith(folder))
			.map((e) => ({ path: e.path, type: e.type }));
	}

	async getRecentCommits(limit: number, folder?: string): Promise<Commit[]> {
		const pathFilter = folder ? `&path=${encodeURIComponent(folder)}` : "";
		const res = await this.api(
			`/repos/${this.owner}/${this.repo}/commits?per_page=${limit}${pathFilter}`,
		);
		const commits = (await res.json()) as Commit[];
		// Fetch files for each commit (needed to filter by path)
		return Promise.all(
			commits.map(async (c) => {
				const detail = await this.api(`/repos/${this.owner}/${this.repo}/commits/${c.sha}`);
				return detail.json() as Promise<Commit>;
			}),
		);
	}

	// Multi-file atomic commit via GraphQL (used for batch operations)
	async createCommitOnBranch(
		branch: string,
		message: string,
		files: Array<{ path: string; content: string }>,
	): Promise<string> {
		// Get current branch HEAD SHA
		const refRes = await this.api(
			`/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`,
		);
		const refData = (await refRes.json()) as { object: { sha: string } };
		const headSha = refData.object.sha;

		const token = await this.getToken();
		const mutation = `
      mutation($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit { oid }
        }
      }
    `;
		const additions = files.map((f) => ({
			path: f.path,
			contents: btoa(unescape(encodeURIComponent(f.content))),
		}));
		const res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: mutation,
				variables: {
					input: {
						branch: { repositoryNameWithOwner: `${this.owner}/${this.repo}`, branchName: branch },
						message: { headline: message },
						fileChanges: { additions },
						expectedHeadOid: headSha,
					},
				},
			}),
		});
		const data = (await res.json()) as {
			data?: { createCommitOnBranch: { commit: { oid: string } } };
			errors?: unknown;
		};
		if (data.errors) throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
		return data.data!.createCommitOnBranch.commit.oid;
	}
}
