export type MockResponse = {
	match: (url: string, init: RequestInit) => boolean;
	status?: number;
	body?: unknown;
	headers?: Record<string, string>;
};

export type FetchMock = {
	calls: Array<{ url: string; init: RequestInit }>;
	restore: () => void;
};

export function installFetchMock(responses: MockResponse[]): FetchMock {
	const original = globalThis.fetch;
	const calls: Array<{ url: string; init: RequestInit }> = [];

	globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
		const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
		calls.push({ url, init });
		const m = responses.find((r) => r.match(url, init));
		if (!m) {
			return new Response(
				JSON.stringify({ error: "no-mock-match", url }),
				{ status: 599, headers: { "content-type": "application/json" } },
			);
		}
		const bodyStr = m.body === undefined
			? null
			: typeof m.body === "string"
				? m.body
				: JSON.stringify(m.body);
		return new Response(bodyStr, {
			status: m.status ?? 200,
			headers: m.headers ?? { "content-type": "application/json" },
		});
	}) as typeof fetch;

	return {
		calls,
		restore: () => { globalThis.fetch = original; },
	};
}

/** Convenience: mock that returns a fake token for the GitHub App token endpoint. */
export function ghTokenMock(): MockResponse {
	// Use a date ~10 minutes from now so KV TTL stays well within int32 range.
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
	return {
		match: (u) => u.includes("/app/installations/") && u.includes("/access_tokens"),
		status: 201,
		body: { token: "ghs_fake_token", expires_at: expiresAt },
	};
}

/** Convenience: mock a GitHub Contents GET (file found). Only matches GET requests. */
export function ghFileMock(pathFragment: string, sha: string, content: string): MockResponse {
	const encoded = btoa(unescape(encodeURIComponent(content)));
	return {
		match: (u, init) => u.includes(pathFragment) && !u.includes("graphql") && (!init.method || init.method === "GET"),
		status: 200,
		body: { sha, content: encoded, encoding: "base64" },
	};
}

/** Convenience: mock a GitHub Contents GET (file not found). Only matches GET requests. */
export function ghFileNotFoundMock(pathFragment: string): MockResponse {
	return {
		match: (u, init) => u.includes(pathFragment) && !u.includes("graphql") && (!init.method || init.method === "GET"),
		status: 404,
		body: { message: "Not Found" },
	};
}

/** Convenience: mock the GitHub GraphQL createCommitOnBranch. */
export function ghGraphqlMock(commitSha = "abc123def456"): MockResponse {
	return {
		match: (u) => u.includes("graphql"),
		body: { data: { createCommitOnBranch: { commit: { oid: commitSha } } } },
	};
}

/** Convenience: mock a GitHub Contents PUT (create/update file). */
export function ghPutMock(pathFragment: string, sha = "newsha123"): MockResponse {
	return {
		match: (u, init) => u.includes(pathFragment) && init.method === "PUT",
		body: { content: { sha } },
	};
}

/** Convenience: mock GitHub REST ref (branch HEAD) */
export function ghRefMock(sha = "headsha123"): MockResponse {
	return {
		match: (u) => u.includes("/git/ref/heads/"),
		body: { object: { sha } },
	};
}

/** Convenience: mock GitHub commits list */
export function ghCommitsMock(items: Array<{ sha: string; date: string; files?: string[] }>): MockResponse[] {
	const listBody = items.map((c) => ({
		sha: c.sha,
		commit: { author: { date: c.date } },
		files: (c.files ?? []).map((f) => ({ filename: f })),
	}));
	return [
		{
			match: (u) => u.includes("/commits?"),
			body: listBody,
		},
		...items.map((c) => ({
			match: (u: string) => u.includes(`/commits/${c.sha}`),
			body: {
				sha: c.sha,
				commit: { author: { date: c.date } },
				files: (c.files ?? []).map((f) => ({ filename: f })),
			},
		})),
	];
}
