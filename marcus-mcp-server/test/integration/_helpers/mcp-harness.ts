/**
 * MCP harness for integration tests.
 *
 * Invocation path: Option (b) — Direct DO RPC via getAgentByName.
 *
 * Why not (a) SELF.fetch: the OAuthProvider middleware intercepts /mcp and
 * rejects unauthenticated requests. Bypassing it requires either a valid KV
 * token or a source change — both out of scope.
 *
 * Why (b): getAgentByName(env.MCP_OBJECT, "rpc:<id>", { props }) calls
 * stub.setName → partyserver #ensureInitialized → McpAgent.onStart(props) →
 * MarcusMCP.init() (registers all 14 tools) + RPCServerTransport setup.
 * Then stub.handleMcpMessage(msg) drives the MCP protocol via DO RPC,
 * bypassing OAuth entirely.
 */
import { env } from "cloudflare:test";
import { getAgentByName } from "agents";
import type { MarcusProps } from "../../../src/index";

export type ToolResult = {
	isError: boolean;
	content: unknown[];
	code?: string;
	extras?: Record<string, unknown>;
};

export type Harness = {
	callTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
};

const DEFAULT_PROPS: MarcusProps = {
	userId: "test-user-001",
	installationId: "test-install-001",
	githubLogin: "testuser",
	repoName: "testuser-vault",
};

let harnessSeq = 0;

export async function makeHarness(opts?: { props?: Partial<MarcusProps> }): Promise<Harness> {
	const props = { ...DEFAULT_PROPS, ...(opts?.props ?? {}) };

	// Each harness gets a unique DO name to avoid state bleed between tests.
	const doName = `rpc:integration-test-${++harnessSeq}`;

	// getAgentByName triggers: stub.setName → #ensureInitialized → onStart(props)
	//   → updateProps(props) + init() (registers tools) + RPCServerTransport setup.
	const stub = await getAgentByName(
		(env as unknown as Record<string, DurableObjectNamespace>).MCP_OBJECT,
		doName,
		{ props },
	);

	// Perform MCP initialize handshake so the server is ready for tools/call.
	await (stub as unknown as { handleMcpMessage: (msg: unknown) => Promise<unknown> }).handleMcpMessage({
		jsonrpc: "2.0",
		id: 0,
		method: "initialize",
		params: {
			protocolVersion: "2024-11-05",
			capabilities: {},
			clientInfo: { name: "vitest-harness", version: "1.0.0" },
		},
	});

	let callSeq = 1;

	return {
		async callTool(name, args) {
			const id = callSeq++;
			const response = await (stub as unknown as { handleMcpMessage: (msg: unknown) => Promise<unknown> }).handleMcpMessage({
				jsonrpc: "2.0",
				id,
				method: "tools/call",
				params: { name, arguments: args },
			}) as Record<string, unknown> | undefined;

			if (!response) {
				return { isError: true, content: [], code: "no_response" };
			}

			// JSON-RPC error (protocol-level, not tool-level)
			if ("error" in response) {
				const err = response.error as Record<string, unknown>;
				return { isError: true, content: [{ type: "text", text: JSON.stringify(err) }], code: "rpc_error" };
			}

			const result = (response as { result?: Record<string, unknown> }).result;
			if (!result) return { isError: true, content: [], code: "no_result" };

			const isError = Boolean(result.isError);
			const content = Array.isArray(result.content) ? result.content : [];

			// If isError, try to parse the structured error code from the content text
			let code: string | undefined;
			let extras: Record<string, unknown> | undefined;
			if (isError && content.length > 0) {
				try {
					const parsed = JSON.parse((content[0] as { text?: string }).text ?? "{}") as Record<string, unknown>;
					code = parsed.code as string | undefined;
					extras = parsed as Record<string, unknown>;
				} catch { /* non-JSON error text */ }
			}

			return { isError, content, code, extras };
		},
	};
}
