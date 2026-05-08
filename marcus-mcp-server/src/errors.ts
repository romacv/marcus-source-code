export type ErrorCode =
	| "auth_required"
	| "install_revoked"
	| "rate_limited"
	| "not_found"
	| "conflict"
	| "upstream_unavailable"
	| "invalid_input"
	| "internal";

export type ErrorRecovery = "reauth" | "retry" | "wait" | "contact_support";

export type ErrorExtras = {
	reauth_url?: string;
	retry_after_ms?: number;
	request_id?: string;
	current_sha?: string;
	path?: string;
};

export class StructuredToolError extends Error {
	readonly code: ErrorCode;
	readonly recovery: ErrorRecovery;
	readonly extras: ErrorExtras;

	constructor(
		code: ErrorCode,
		message: string,
		recovery: ErrorRecovery,
		extras: ErrorExtras = {},
	) {
		super(message);
		this.name = "StructuredToolError";
		this.code = code;
		this.recovery = recovery;
		this.extras = extras;
	}
}

export function isStructuredToolError(err: unknown): err is StructuredToolError {
	return err instanceof StructuredToolError;
}

function retryAfterMs(headers: Headers): number | undefined {
	const retryAfter = headers.get("retry-after");
	if (retryAfter) {
		const seconds = Number(retryAfter);
		if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
	}

	const reset = headers.get("x-ratelimit-reset");
	if (!reset) return undefined;
	const resetSeconds = Number(reset);
	if (!Number.isFinite(resetSeconds)) return undefined;
	return Math.max(0, resetSeconds * 1000 - Date.now());
}

export function mapGitHubError(status: number, headers: Headers, body: string): StructuredToolError {
	const retryMs = retryAfterMs(headers);
	const message = body.slice(0, 500) || `GitHub request failed with ${status}`;

	if (status === 401) {
		return new StructuredToolError("auth_required", message, "reauth");
	}
	if (status === 403 || status === 429) {
		const lower = body.toLowerCase();
		const code = lower.includes("installation") && lower.includes("suspend")
			? "install_revoked"
			: "rate_limited";
		return new StructuredToolError(
			code,
			message,
			code === "install_revoked" ? "reauth" : "wait",
			retryMs ? { retry_after_ms: retryMs } : {},
		);
	}
	if (status === 404) {
		return new StructuredToolError("not_found", message, "contact_support");
	}
	if (status === 409) {
		return new StructuredToolError("conflict", message, "retry");
	}
	if (status >= 500) {
		return new StructuredToolError("upstream_unavailable", message, "retry");
	}
	return new StructuredToolError("internal", message, "retry");
}

export function formatToolError(err: unknown, requestId?: string) {
	const structured = isStructuredToolError(err)
		? err
		: new StructuredToolError(
				"internal",
				err instanceof Error ? err.message : String(err),
				"retry",
			);
	const payload = {
		code: structured.code,
		message: structured.message,
		recovery: structured.recovery,
		...structured.extras,
		...(requestId ? { request_id: requestId } : {}),
	};
	return {
		content: [{ type: "text" as const, text: JSON.stringify(payload) }],
		isError: true,
	};
}
