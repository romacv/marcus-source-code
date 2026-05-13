import { StructuredToolError } from "./errors.ts";

export const FREE_DAILY_CAP = 30;
export const KV_KEY_PREFIX = "rl";
const TTL_SECONDS = 60 * 60 * 48; // 48h — survives UTC rollover

export type Tier = "free" | "pro" | "founders";

export type RateLimitDeps = {
	kv: KVNamespace;
	userId: string;
	tier: Tier;
	/** Override for tests — defaults to current UTC date */
	now?: () => Date;
};

function utcDateKey(d: Date): string {
	return d.toISOString().slice(0, 10);
}

function secondsUntilUtcMidnight(d: Date): number {
	const next = new Date(
		Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0),
	);
	return Math.max(1, Math.floor((next.getTime() - d.getTime()) / 1000));
}

/**
 * Increment-and-check. Throws StructuredToolError("rate_limited") when over cap.
 * Pro/founders are no-ops. Counter resets at UTC midnight.
 */
export async function checkAndIncrement(deps: RateLimitDeps): Promise<void> {
	if (deps.tier !== "free") return;

	const now = (deps.now ?? (() => new Date()))();
	const dateKey = utcDateKey(now);
	const key = `${KV_KEY_PREFIX}:${deps.userId}:${dateKey}`;

	const raw = await deps.kv.get(key);
	const current = raw ? Number(raw) || 0 : 0;

	if (current >= FREE_DAILY_CAP) {
		const retryAfter = secondsUntilUtcMidnight(now);
		throw new StructuredToolError(
			"rate_limited",
			`Free tier daily cap of ${FREE_DAILY_CAP} calls reached. ` +
				`Resets in ${Math.ceil(retryAfter / 60)} min (UTC midnight). ` +
				`Upgrade at https://marcus-second-brain.com/pricing`,
			"retry",
			{ retry_after_ms: retryAfter * 1000 },
		);
	}

	// Eventual-consistency is acceptable for a daily cap.
	await deps.kv.put(key, String(current + 1), { expirationTtl: TTL_SECONDS });
}

/** Stub for future tier lookup. Today: everyone is free. */
export function resolveTier(_userId: string): Tier {
	return "free";
}
