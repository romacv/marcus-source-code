import { createPrivateKey, createSign } from "node:crypto";
import { mapGitHubError, StructuredToolError } from "./errors.ts";
import { getCachedInstallationToken, setCachedInstallationToken } from "./github-token-cache.ts";
import { anonId } from "./audit.ts";
import { parseFrontmatter } from "./vault.ts";

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
	updated?: string;
	match?: "filename" | "frontmatter" | "body";
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

type ContentsResult = {
	path: string;
	sha: string;
	content: string;
	frontmatter: ReturnType<typeof parseFrontmatter>["frontmatter"];
	body: string;
};

type TreeCacheEntry = {
	expires: number;
	entries: TreeEntry[];
};

// Signs a JWT for GitHub App authentication using node:crypto.
// Uses clientId as iss per GitHub's recommendation (migrating away from numeric App ID).
// node:crypto handles PKCS#1 RSA keys natively — no manual DER wrapping needed.
export function mintAppJwt(env: {
	GITHUB_APP_PRIVATE_KEY: string;
	GITHUB_APP_CLIENT_ID: string;
}): string {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: "RS256", typ: "JWT" };
	const payload = { iat: now - 60, exp: now + 600, iss: env.GITHUB_APP_CLIENT_ID };

	const enc = (obj: object) =>
		btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

	const signingInput = `${enc(header)}.${enc(payload)}`;
	const sig = createSign("RSA-SHA256")
		.update(signingInput)
		.sign(createPrivateKey({ key: env.GITHUB_APP_PRIVATE_KEY, format: "pem" }), "base64")
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");

	return `${signingInput}.${sig}`;
}

export class GitHubClient {
	private _cachedToken: string | null = null;
	private treeCache = new Map<string, TreeCacheEntry>();
	private readonly privateKeyPem: string;
	private readonly appId: string;
	private readonly clientId: string;
	private readonly installationId: string;
	private readonly owner: string;
	private readonly repo: string;
	private readonly kv: KVNamespace;
	private readonly encryptionKey: string;

	constructor(
		privateKeyPem: string,
		appId: string,
		clientId: string,
		installationId: string,
		owner: string,
		repo: string,
		kv: KVNamespace,
		encryptionKey: string,
	) {
		this.privateKeyPem = privateKeyPem;
		this.appId = appId;
		this.clientId = clientId;
		this.installationId = installationId;
		this.owner = owner;
		this.repo = repo;
		this.kv = kv;
		this.encryptionKey = encryptionKey;
	}

	private async getToken(): Promise<string> {
		if (this._cachedToken) return this._cachedToken;

		const cached = await getCachedInstallationToken(this.kv, this.encryptionKey, this.installationId);
		if (cached) {
			this._cachedToken = cached;
			return cached;
		}

		const jwt = mintAppJwt({
			GITHUB_APP_CLIENT_ID: this.clientId,
			GITHUB_APP_PRIVATE_KEY: this.privateKeyPem,
		});
		const anonInstallId = await anonId(this.installationId, this.encryptionKey);
		console.log("[app-jwt]", JSON.stringify({ installationId: anonInstallId, exp_in_s: 600 }));
		const res = await fetch(
			`${GITHUB_API}/app/installations/${this.installationId}/access_tokens`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${jwt}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
					"User-Agent": "marcus-mcp-server/0.2.0",
				},
			},
		);
		if (!res.ok) {
			const body = await res.text();
			console.error("[app-token]", res.status, body.slice(0, 500));
			throw mapGitHubError(res.status, res.headers, body);
		}
		const data = (await res.json()) as { token: string; expires_at: string };
		await setCachedInstallationToken(this.kv, this.encryptionKey, this.installationId, data.token, data.expires_at);
		this._cachedToken = data.token;
		return data.token;
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
			throw mapGitHubError(res.status, res.headers, body);
		}
		return res;
	}

	async branchExists(branch: string): Promise<boolean> {
		try {
			await this.api(`/repos/${this.owner}/${this.repo}/git/ref/heads/${branch}`);
			return true;
		} catch (e) {
			if (e instanceof StructuredToolError && (e.code === "not_found" || e.code === "conflict")) {
				return false;
			}
			throw e;
		}
	}

	async getFile(path: string): Promise<FileResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`);
		const data = (await res.json()) as { sha: string; content: string; encoding: string };
		const binary = atob(data.content.replace(/\n/g, ""));
		const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
		const content = new TextDecoder("utf-8").decode(bytes);
		return { sha: data.sha, content };
	}

	async createFile(path: string, content: string, message?: string): Promise<WriteResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "PUT",
			body: JSON.stringify({
				message: message ?? `marcus-mcp-server: create ${path}`,
				content: btoa(unescape(encodeURIComponent(content))),
			}),
		});
		const data = (await res.json()) as { content: { sha: string } };
		return { sha: data.content.sha };
	}

	async updateFile(path: string, content: string, sha: string, message?: string): Promise<WriteResult> {
		const res = await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "PUT",
			body: JSON.stringify({
				message: message ?? `marcus-mcp-server: update ${path}`,
				content: btoa(unescape(encodeURIComponent(content))),
				sha,
			}),
		});
		const data = (await res.json()) as { content: { sha: string } };
		return { sha: data.content.sha };
	}

	async deleteFile(path: string, sha: string, message?: string): Promise<void> {
		await this.api(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
			method: "DELETE",
			body: JSON.stringify({
				message: message ?? `marcus-mcp-server: delete ${path}`,
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

	async getTreesRecursive(folder?: string): Promise<TreeEntry[]> {
		const key = folder ?? "*";
		const cached = this.treeCache.get(key);
		if (cached && cached.expires > Date.now()) return cached.entries;

		const res = await this.api(
			`/repos/${this.owner}/${this.repo}/git/trees/main?recursive=1`,
		);
		const data = (await res.json()) as {
			tree: Array<{ path: string; type: "blob" | "tree" }>;
		};
		const entries = data.tree
			.filter((e) => e.type === "blob")
			.filter((e) => e.path.endsWith(".md"))
			.filter((e) => !folder || e.path.startsWith(folder))
			.map((e) => ({ path: e.path, type: e.type }));
		this.treeCache.set(key, { expires: Date.now() + 30_000, entries });
		return entries;
	}

	async getContentsBatch(paths: string[]): Promise<ContentsResult[]> {
		const uniquePaths = [...new Set(paths)].slice(0, 50);
		const files = await Promise.allSettled(uniquePaths.map((path) => this.getFile(path)));
		return files.flatMap((result, index) => {
			if (result.status !== "fulfilled") return [];
			const parsed = parseFrontmatter(result.value.content);
			return [{
				path: uniquePaths[index],
				sha: result.value.sha,
				content: result.value.content,
				frontmatter: parsed.frontmatter,
				body: parsed.body,
			}];
		});
	}

	async localScan(
		query: string,
		opts: { folder?: string; tags?: string[]; limit?: number } = {},
	): Promise<SearchMatch[]> {
		const limit = opts.limit ?? 50;
		const trees = await this.getTreesRecursive(opts.folder);
		const commits = await this.getRecentCommits(limit, opts.folder).catch(() => []);
		const updatedByPath = new Map<string, string>();
		for (const commit of commits) {
			for (const file of commit.files ?? []) {
				if (!file.filename.endsWith(".md")) continue;
				if (opts.folder && !file.filename.startsWith(opts.folder)) continue;
				if (!updatedByPath.has(file.filename)) updatedByPath.set(file.filename, commit.commit.author.date);
			}
		}

		const candidatePaths = trees
			.map((entry) => entry.path)
			.sort((a, b) => (updatedByPath.get(b) ?? "").localeCompare(updatedByPath.get(a) ?? ""))
			.slice(0, 50);
		const files = await this.getContentsBatch(candidatePaths);
		const normalizedQuery = query.toLowerCase();
		const tagFilter = opts.tags?.map((tag) => tag.toLowerCase()) ?? [];

		const rank = { filename: 3, frontmatter: 2, body: 1 } as const;
		return files.flatMap((file) => {
			const tags = Array.isArray(file.frontmatter.tags)
				? file.frontmatter.tags.map(String)
				: [];
			if (tagFilter.length > 0 && !tagFilter.some((tag) => tags.map((t) => t.toLowerCase()).includes(tag))) {
				return [];
			}
			const frontmatterText = JSON.stringify(file.frontmatter).toLowerCase();
			const pathText = file.path.toLowerCase();
			const bodyText = file.body.toLowerCase();
			const match: SearchMatch["match"] | null = pathText.includes(normalizedQuery)
				? "filename"
				: frontmatterText.includes(normalizedQuery)
					? "frontmatter"
					: bodyText.includes(normalizedQuery)
						? "body"
						: null;
			if (!match) return [];
			return [{
				path: file.path,
				sha: file.sha,
				tags,
				updated: updatedByPath.get(file.path),
				match,
			}];
		}).sort((a, b) => {
			const rankDelta = rank[b.match ?? "body"] - rank[a.match ?? "body"];
			return rankDelta || (b.updated ?? "").localeCompare(a.updated ?? "");
		});
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
				"User-Agent": "marcus-mcp-server/0.2.0",
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
		if (!res.ok) {
			const body = await res.text();
			throw mapGitHubError(res.status, res.headers, body);
		}
		const data = (await res.json()) as {
			data?: { createCommitOnBranch: { commit: { oid: string } } };
			errors?: unknown;
		};
		if (data.errors) {
			throw new StructuredToolError("conflict", `GraphQL error: ${JSON.stringify(data.errors)}`, "retry");
		}
		return data.data!.createCommitOnBranch.commit.oid;
	}
}
