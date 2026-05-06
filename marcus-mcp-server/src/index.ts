import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { z } from "zod";
import app from "./app";
import { GitHubClient } from "./github";
import {
	formatMemoryLine,
	generateBlockId,
	isExpired,
	normalizeBlockId,
	parseMemoryLine,
	type ParsedMemoryLine,
} from "./memory";
import {
	archivePath,
	buildFrontmatter,
	dailyNotePath,
	generateUlid,
	MEMORY_CATEGORIES,
	type MemoryCategory,
	memoryArchivePath,
	memoryPath,
	parseFrontmatter,
} from "./vault";

export type MarcusEnv = Cloudflare.Env & {
	MARCUS_KV: KVNamespace;
	GITHUB_CLIENT_ID: string;
	GITHUB_CLIENT_SECRET: string;
	GITHUB_APP_ID: string;
	GITHUB_APP_SLUG: string;
	GITHUB_APP_PRIVATE_KEY: string;
	KV_ENCRYPTION_KEY: string;
};

export type MarcusProps = {
	userId: string;
	installationId: string;
	githubLogin: string;
	repoName: string;
};

const FrontmatterSchema = z.object({
	tags: z.array(z.string()).optional(),
	source: z.enum(["chat", "photo", "voice", "calendar", "manual"]).optional(),
	summary: z.string().max(280).optional(),
	links: z.array(z.string()).optional(),
	people: z.array(z.string()).optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
});

type GitHubFile = Awaited<ReturnType<GitHubClient["getFile"]>>;

type MemoryRecord = ParsedMemoryLine & {
	category: MemoryCategory;
	path: string;
	line: string;
};

const MemoryCategorySchema = z.enum(MEMORY_CATEGORIES);
const BLOCK_ID_QUERY_RE = /^\^?id-[a-z0-9]+$/i;

function todayIsoDate(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

function titleCase(value: string): string {
	return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function initialMemoryFile(category: MemoryCategory): string {
	return `# ${titleCase(category)}\n\n`;
}

function initialDailyNote(now: Date): string {
	const ts = now.toISOString();
	const dateStr = ts.slice(0, 10);
	return `${buildFrontmatter({ id: generateUlid(), created: ts, updated: ts, source: "chat", tags: ["daily"] })}\n\n# ${dateStr}\n`;
}

function appendMarkdownLine(content: string, line: string): string {
	return `${content.trimEnd()}\n\n${line}\n`;
}

function excerpt(content: string, max = 60): string {
	const compact = content.trim().replace(/\s+/g, " ");
	return compact.length <= max ? compact : `${compact.slice(0, max - 3)}...`;
}

function obsidianAlias(value: string): string {
	return value.replace(/[\]|]/g, " ").replace(/\s+/g, " ").trim();
}

function categoryFromPath(path: string): MemoryCategory | null {
	const match = path.match(/^15-memory\/([^/]+)\.md$/);
	if (!match) return null;
	const category = match[1];
	return MEMORY_CATEGORIES.includes(category as MemoryCategory)
		? (category as MemoryCategory)
		: null;
}

function memoryRecordsFromFile(category: MemoryCategory, content: string): MemoryRecord[] {
	const path = memoryPath(category);
	return content
		.split("\n")
		.map((line) => {
			const parsed = parseMemoryLine(line);
			return parsed ? { ...parsed, category, path, line } : null;
		})
		.filter((entry): entry is MemoryRecord => Boolean(entry));
}

export class MarcusMCP extends McpAgent<MarcusEnv, Record<string, never>, MarcusProps> {
	server = new McpServer({
		name: "Marcus",
		version: "0.1.0",
	});

	get github(): GitHubClient {
		if (!this.props) throw new Error("Not authenticated");
		return new GitHubClient(
			this.env.GITHUB_APP_PRIVATE_KEY,
			this.env.GITHUB_APP_ID,
			this.env.GITHUB_CLIENT_ID,
			this.props.installationId,
			this.props.githubLogin,
			this.props.repoName,
		);
	}

	private getClient(): string {
		try {
			const info = this.server.server.getClientVersion();
			if (info?.name) return `${info.name}${info.version ? ` ${info.version}` : ""}`;
		} catch {}
		return "unknown client";
	}

	private buildCommit(opts: { title: string; tool: string; extras?: Record<string, string> }): string {
		const lines = [
			`marcus-mcp-server: ${opts.title}`,
			"",
			`Tool: ${opts.tool}`,
			`User: @${this.props?.githubLogin ?? "unknown"}`,
			`Client: ${this.getClient()}`,
		];
		if (opts.extras) {
			for (const [k, v] of Object.entries(opts.extras)) lines.push(`${k}: ${v}`);
		}
		return lines.join("\n");
	}

	private async getFileOrNull(path: string): Promise<GitHubFile | null> {
		return this.github.getFile(path).catch((e: unknown) => {
			if (!/→ 404:/.test(String(e))) throw e;
			return null;
		});
	}

	private async commitWithHeadRetry(
		message: string,
		filesBuilder: () => Promise<Array<{ path: string; content: string }>>,
	): Promise<string> {
		for (let attempt = 0; attempt < 2; attempt++) {
			const files = await filesBuilder();
			try {
				return await this.github.createCommitOnBranch("main", message, files);
			} catch (e: unknown) {
				if (attempt === 0 && /HEAD_REF_OUTDATED|expectedHeadOid|409/i.test(String(e))) continue;
				throw e;
			}
		}
		throw new Error("commit retry exhausted");
	}

	private async getMemoryFile(category: MemoryCategory): Promise<GitHubFile | null> {
		return this.getFileOrNull(memoryPath(category));
	}

	private async readMemoryRecords(categories: readonly MemoryCategory[]): Promise<MemoryRecord[]> {
		const files = await Promise.all(
			categories.map(async (category) => ({ category, file: await this.getMemoryFile(category) })),
		);
		return files.flatMap(({ category, file }) =>
			file ? memoryRecordsFromFile(category, file.content) : [],
		);
	}

	private async findMemoryByQuery(
		query: string,
	): Promise<{ category: MemoryCategory; file: GitHubFile; line: string; parsed: ParsedMemoryLine } | null> {
		const normalizedQuery = normalizeBlockId(query).toLowerCase();
		let categories: MemoryCategory[] = [...MEMORY_CATEGORIES];

		if (!BLOCK_ID_QUERY_RE.test(query)) {
			const results = await this.github.searchCode(query, { folder: "15-memory", limit: 50 });
			const resultCategories = results
				.map((result) => categoryFromPath(result.path))
				.filter((category): category is MemoryCategory => Boolean(category));
			if (resultCategories.length > 0) categories = [...new Set(resultCategories)];
		}

		for (const category of categories) {
			const file = await this.getMemoryFile(category);
			if (!file) continue;
			for (const line of file.content.split("\n")) {
				const parsed = parseMemoryLine(line);
				if (!parsed || parsed.archived) continue;
				const matchesId = parsed.blockId.toLowerCase() === normalizedQuery;
				const matchesText = parsed.content.toLowerCase().includes(query.toLowerCase());
				if (matchesId || matchesText) return { category, file, line, parsed };
			}
		}

		return null;
	}

	async init() {
		this.server.registerTool(
			"create_note",
			{
				description:
					"Create a new markdown note in the vault with YAML frontmatter. Returns the commit SHA.",
				inputSchema: {
					path: z
						.string()
						.describe(
							"Relative vault path, e.g. '20-topics/MyNote.md' or '30-people/Masha.md'",
						),
					content: z.string().describe("Markdown body of the note (without frontmatter)"),
					frontmatter: FrontmatterSchema.optional(),
				},
				annotations: { destructiveHint: false },
			},
			async ({ path, content, frontmatter }) => {
				const id = generateUlid();
				const now = new Date().toISOString();
				const fm = buildFrontmatter({
					id,
					created: now,
					updated: now,
					...frontmatter,
				});
				const fullContent = `${fm}\n\n${content}`;
				const msg = this.buildCommit({
					title: `create ${path}`,
					tool: "create_note",
					extras: frontmatter?.tags?.length ? { Tags: frontmatter.tags.join(", ") } : undefined,
				});
				const result = await this.github.createFile(path, fullContent, msg);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ path, sha: result.sha, id }),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"update_note",
			{
				description:
					"Update an existing note. Mode: replace (full), append (add to end), prepend (add to start). Use expected_sha for optimistic concurrency.",
				inputSchema: {
					path: z.string().describe("Relative vault path"),
					content: z.string().describe("Content to write/append/prepend"),
					mode: z
						.enum(["replace", "append", "prepend"])
						.default("replace")
						.describe("Update mode"),
					expected_sha: z
						.string()
						.optional()
						.describe("Current file SHA to prevent overwrite conflicts"),
				},
				annotations: { destructiveHint: false },
			},
			async ({ path, content, mode, expected_sha }) => {
				const current = await this.github.getFile(path);
				if (expected_sha && current.sha !== expected_sha) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									error: "sha_mismatch",
									current_sha: current.sha,
								}),
							},
						],
						isError: true,
					};
				}
				const existing = current.content;
				const { body: existingBody, frontmatter: fm } = parseFrontmatter(existing);
				const now = new Date().toISOString();
				const updatedFm = buildFrontmatter({ ...fm, updated: now });

				let newBody: string;
				if (mode === "replace") newBody = content;
				else if (mode === "append") newBody = `${existingBody}\n\n${content}`;
				else newBody = `${content}\n\n${existingBody}`;

				const fullContent = `${updatedFm}\n\n${newBody}`;
				const msg = this.buildCommit({
					title: `update ${path} (${mode})`,
					tool: "update_note",
					extras: { Mode: mode },
				});
				const result = await this.github.updateFile(path, fullContent, current.sha, msg);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ path, sha: result.sha }) }],
				};
			},
		);

		this.server.registerTool(
			"delete_note",
			{
				description:
					"Delete a note. Mode 'archive' moves it to 90-archive/ (safe, default). Mode 'hard' permanently deletes.",
				inputSchema: {
					path: z.string().describe("Relative vault path"),
					mode: z
						.enum(["archive", "hard"])
						.default("archive")
						.describe("archive = move to 90-archive/, hard = permanent delete"),
				},
				annotations: { destructiveHint: true },
			},
			async ({ path, mode }) => {
				const current = await this.github.getFile(path);
				if (mode === "archive") {
					const dest = archivePath(path);
					await this.github.createFile(
						dest,
						current.content,
						this.buildCommit({ title: `archive ${path} → ${dest}`, tool: "delete_note", extras: { Mode: "archive" } }),
					);
					await this.github.deleteFile(
						path,
						current.sha,
						this.buildCommit({ title: `remove ${path} (archived)`, tool: "delete_note", extras: { Mode: "archive", "Archived-To": dest } }),
					);
					return {
						content: [
							{ type: "text" as const, text: JSON.stringify({ archived_to: dest }) },
						],
					};
				}
				await this.github.deleteFile(
					path,
					current.sha,
					this.buildCommit({ title: `delete ${path}`, tool: "delete_note", extras: { Mode: "hard" } }),
				);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ deleted: path }) }],
				};
			},
		);

		this.server.registerTool(
			"search_notes",
			{
				description: "Search notes by keyword, tags, or folder prefix using GitHub code search.",
				inputSchema: {
					query: z.string().describe("Search query"),
					tags: z.array(z.string()).optional().describe("Filter by tags in frontmatter"),
					folder: z.string().optional().describe("Limit to folder prefix, e.g. '20-topics'"),
					limit: z.number().int().min(1).max(50).default(10),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ query, tags, folder, limit }) => {
				const results = await this.github.searchCode(query, { folder, limit });
				const filtered = tags
					? results.filter((r) => tags.some((t) => r.tags?.includes(t)))
					: results;
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(filtered.slice(0, limit)),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"get_note",
			{
				description: "Get a note by its vault path. Returns frontmatter and markdown content.",
				inputSchema: {
					path: z.string().describe("Relative vault path"),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ path }) => {
				const file = await this.github.getFile(path);
				return {
					content: [{ type: "text" as const, text: file.content }],
				};
			},
		);

		this.server.registerTool(
			"list_structure",
			{
				description: "List the vault folder structure and file index.",
				inputSchema: {
					folder: z
						.string()
						.optional()
						.describe("Folder prefix to list, omit for full vault root"),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ folder }) => {
				const tree = await this.github.listTree(folder ?? "");
				return {
					content: [{ type: "text" as const, text: JSON.stringify(tree) }],
				};
			},
		);

		this.server.registerTool(
			"append_to_daily_note",
			{
				description:
					"Append a timestamped entry to today's daily note (00-daily/YYYY/MM/YYYY-MM-DD.md). Creates the note if it doesn't exist.",
				inputSchema: {
					content: z.string().describe("Markdown text to append"),
					heading: z
						.string()
						.optional()
						.describe("Optional H2 section heading to group content under"),
				},
				annotations: { destructiveHint: false },
			},
			async ({ content, heading }) => {
				const today = new Date();
				const path = dailyNotePath(today);
				const ts = today.toISOString();
				const dateStr = ts.slice(0, 10);
				const entry = heading
					? `\n\n## ${heading}\n\n${content}`
					: `\n\n<!-- ${ts} -->\n\n${content}`;

				let sha: string | undefined;
				for (let attempt = 0; attempt < 2; attempt++) {
					const existing = await this.github.getFile(path).catch((e: unknown) => {
						if (!/→ 404:/.test(String(e))) throw e;
						return null;
					});
					const body = existing
						? existing.content + entry
						: `${buildFrontmatter({ id: generateUlid(), created: ts, updated: ts, source: "chat", tags: ["daily"] })}\n\n# ${dateStr}${entry}`;
					const msg = this.buildCommit({
						title: existing ? `daily ${dateStr}: append entry` : `daily ${dateStr}: create note`,
						tool: "append_to_daily_note",
						extras: heading ? { Heading: heading } : undefined,
					});
					console.log("[append-daily]", { path, outcome: existing ? "update" : "create", attempt });
					try {
						sha = await this.github.createCommitOnBranch("main", msg, [{ path, content: body }]);
						break;
					} catch (e: unknown) {
						if (attempt === 0 && /HEAD_REF_OUTDATED|expectedHeadOid|409/i.test(String(e))) continue;
						throw e;
					}
				}

				return {
					content: [{ type: "text" as const, text: JSON.stringify({ path, sha }) }],
				};
			},
		);

		this.server.registerTool(
			"remember",
			{
				description:
					"Store a durable memory in the GitHub vault and link it from today's daily note.",
				inputSchema: {
					content: z.string().min(1).describe("Memory text to store"),
					category: MemoryCategorySchema.describe("Memory category"),
					date: z
						.string()
						.regex(/^\d{4}-\d{2}-\d{2}$/)
						.optional()
						.describe("Optional memory date in YYYY-MM-DD format"),
					ttl: z
						.number()
						.int()
						.min(1)
						.optional()
						.describe("Optional time-to-live in days; expired memories are hidden by recall"),
				},
				annotations: { destructiveHint: false },
			},
			async ({ content, category, date, ttl }) => {
				const now = new Date();
				const blockId = generateBlockId();
				const memoryDate = date ?? todayIsoDate(now);
				const memoryLine = formatMemoryLine({
					date: memoryDate,
					content,
					blockId,
					ttlDays: ttl,
				});
				const memoryFilePath = memoryPath(category);
				const dailyPath = dailyNotePath(now);
				const dailyLine = `- memory: [[15-memory/${category}#^${blockId}|${obsidianAlias(excerpt(content))}]]`;
				const msg = this.buildCommit({
					title: `remember ${category}`,
					tool: "remember",
					extras: { Category: category, "Block-Id": blockId },
				});

				const sha = await this.commitWithHeadRetry(msg, async () => {
					const [memoryFile, dailyFile] = await Promise.all([
						this.getMemoryFile(category),
						this.getFileOrNull(dailyPath),
					]);
					return [
						{
							path: memoryFilePath,
							content: appendMarkdownLine(
								memoryFile?.content ?? initialMemoryFile(category),
								memoryLine,
							),
						},
						{
							path: dailyPath,
							content: appendMarkdownLine(dailyFile?.content ?? initialDailyNote(now), dailyLine),
						},
					];
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								path: memoryFilePath,
								daily_path: dailyPath,
								block_id: blockId,
								sha,
							}),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"forget",
			{
				description:
					"Archive a memory by block id or text query. The source line is struck through and linked from 15-memory/_archive.md.",
				inputSchema: {
					query: z.string().min(1).describe("Block id like id-a1b2c3 or text to forget"),
				},
				annotations: { destructiveHint: true },
			},
			async ({ query }) => {
				const found = await this.findMemoryByQuery(query);
				if (!found) {
					return {
						content: [{ type: "text" as const, text: JSON.stringify({ error: "not_found" }) }],
						isError: true,
					};
				}

				const archivedDate = todayIsoDate();
				const archiveLine = `- [${archivedDate} archived] [[${found.category}#^${found.parsed.blockId}]] - ${found.parsed.content}`;
				const msg = this.buildCommit({
					title: `forget ${found.parsed.blockId}`,
					tool: "forget",
					extras: { Category: found.category, "Block-Id": found.parsed.blockId },
				});
				const sha = await this.commitWithHeadRetry(msg, async () => {
					const [sourceFile, archiveFile] = await Promise.all([
						this.getMemoryFile(found.category),
						this.getFileOrNull(memoryArchivePath()),
					]);
					if (!sourceFile) throw new Error(`Memory file missing: ${memoryPath(found.category)}`);

					let replaced = false;
					const updatedSource = sourceFile.content
						.split("\n")
						.map((line) => {
							if (!replaced && line === found.line) {
								replaced = true;
								return `~~${line}~~ <!-- archived ${archivedDate} -->`;
							}
							return line;
						})
						.join("\n");
					if (!replaced) throw new Error(`Memory line missing: ${found.parsed.blockId}`);

					return [
						{ path: memoryPath(found.category), content: updatedSource },
						{
							path: memoryArchivePath(),
							content: appendMarkdownLine(
								archiveFile?.content ?? "# Memory Archive\n",
								archiveLine,
							),
						},
					];
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								path: memoryPath(found.category),
								archive_path: memoryArchivePath(),
								block_id: found.parsed.blockId,
								sha,
							}),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"recall",
			{
				description: "Search active memory entries by text or block id.",
				inputSchema: {
					query: z.string().min(1).describe("Text or block id to search for"),
					category: MemoryCategorySchema.optional().describe("Optional category filter"),
					limit: z.number().int().min(1).max(50).default(10),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ query, category, limit }) => {
				const normalizedQuery = normalizeBlockId(query).toLowerCase();
				let categories: MemoryCategory[] = category ? [category] : [...MEMORY_CATEGORIES];

				if (!category && !BLOCK_ID_QUERY_RE.test(query)) {
					const results = await this.github.searchCode(query, { folder: "15-memory", limit: 50 });
					const resultCategories = results
						.map((result) => categoryFromPath(result.path))
						.filter((resultCategory): resultCategory is MemoryCategory => Boolean(resultCategory));
					if (resultCategories.length > 0) categories = [...new Set(resultCategories)];
				}

				const now = new Date();
				const records = (await this.readMemoryRecords(categories))
					.filter((record) => !record.archived)
					.filter((record) => !isExpired(record.date, record.ttlDays, now))
					.filter((record) => {
						const textMatch = record.content.toLowerCase().includes(query.toLowerCase());
						const idMatch = record.blockId.toLowerCase().includes(normalizedQuery);
						return textMatch || idMatch;
					})
					.sort((a, b) => b.date.localeCompare(a.date))
					.slice(0, limit)
					.map((record) => ({
						category: record.category,
						date: record.date,
						content: record.content,
						block_id: record.blockId,
						ttl_days: record.ttlDays,
						path: record.path,
					}));

				return {
					content: [{ type: "text" as const, text: JSON.stringify(records) }],
				};
			},
		);

		this.server.registerTool(
			"sync_to_claude_memory",
			{
				description:
					"Return a markdown snapshot of active Marcus memories for manual insertion into Claude memory.",
				inputSchema: {},
				annotations: { readOnlyHint: true },
			},
			async () => {
				const now = new Date();
				const active = (await this.readMemoryRecords(MEMORY_CATEGORIES))
					.filter((record) => !record.archived)
					.filter((record) => !isExpired(record.date, record.ttlDays, now))
					.sort((a, b) => b.date.localeCompare(a.date))
					.slice(0, 30);

				let text = active.length
					? [
							"# Marcus memory snapshot",
							"",
							...active.map(
								(record) =>
									`- [${record.date}] (${record.category}, ^${record.blockId}) ${record.content}`,
							),
						].join("\n")
					: "# Marcus memory snapshot\n\nNo active memories.";
				if (text.length > 100_000) text = text.slice(0, 100_000);

				return {
					content: [{ type: "text" as const, text }],
				};
			},
		);

		this.server.registerTool(
			"link_notes",
			{
				description:
					"Add a wikilink between two notes. Creates a stub note for the target if it doesn't exist.",
				inputSchema: {
					source_path: z.string().describe("Path of the note to add the link from"),
					target_path: z
						.string()
						.describe("Path of the note to link to (will be created as stub if missing)"),
					create_stub: z
						.boolean()
						.default(true)
						.describe("Create a stub note if target doesn't exist"),
				},
				annotations: { destructiveHint: false },
			},
			async ({ source_path, target_path, create_stub }) => {
				// Ensure target exists
				let targetCreated = false;
				try {
					await this.github.getFile(target_path);
				} catch {
					if (!create_stub) {
						return {
							content: [
								{
									type: "text" as const,
									text: JSON.stringify({ error: "target_not_found", path: target_path }),
								},
							],
							isError: true,
						};
					}
					const name = target_path.split("/").pop()?.replace(".md", "") ?? target_path;
					const fm = buildFrontmatter({
						id: generateUlid(),
						created: new Date().toISOString(),
						updated: new Date().toISOString(),
						status: "draft",
						stub: true,
					});
					await this.github.createFile(
						target_path,
						`${fm}\n\n# ${name}\n\n<!-- stub -->`,
						this.buildCommit({ title: `create stub ${target_path}`, tool: "link_notes", extras: { "Stub-For": source_path } }),
					);
					targetCreated = true;
				}

				// Update source frontmatter links
				const source = await this.github.getFile(source_path);
				const { body, frontmatter: fm } = parseFrontmatter(source.content);
				const targetLink = `[[${target_path.replace(".md", "")}]]`;
				const links = fm.links ?? [];
				if (!links.includes(targetLink)) {
					links.push(targetLink);
				}
				const updatedFm = buildFrontmatter({ ...fm, links, updated: new Date().toISOString() });
				const result = await this.github.updateFile(
					source_path,
					`${updatedFm}\n\n${body}`,
					source.sha,
					this.buildCommit({ title: `link ${source_path} → ${target_path}`, tool: "link_notes" }),
				);

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								source_sha: result.sha,
								target_created: targetCreated,
								link: targetLink,
							}),
						},
					],
				};
			},
		);

		this.server.registerTool(
			"get_recent_notes",
			{
				description: "Get the N most recently updated notes from the vault.",
				inputSchema: {
					limit: z.number().int().min(1).max(50).default(10),
					folder: z.string().optional().describe("Limit to folder prefix"),
				},
				annotations: { readOnlyHint: true },
			},
			async ({ limit, folder }) => {
				const commits = await this.github.getRecentCommits(limit * 3, folder);
				const seen = new Set<string>();
				const notes = [];
				for (const commit of commits) {
					for (const file of commit.files ?? []) {
						if (!file.filename.endsWith(".md")) continue;
						if (folder && !file.filename.startsWith(folder)) continue;
						if (seen.has(file.filename)) continue;
						seen.add(file.filename);
						notes.push({ path: file.filename, updated: commit.commit.author.date });
						if (notes.length >= limit) break;
					}
					if (notes.length >= limit) break;
				}
				return {
					content: [{ type: "text" as const, text: JSON.stringify(notes) }],
				};
			},
		);
	}
}

export default new OAuthProvider({
	apiRoute: "/mcp",
	apiHandler: MarcusMCP.serve("/mcp"),
	defaultHandler: app,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
});
