import assert from "node:assert/strict";
import test from "node:test";
import { anonId } from "../audit.ts";
import { checkAndIncrement, FREE_DAILY_CAP } from "../rate-limit.ts";
import { isStructuredToolError } from "../errors.ts";

const TEST_ENC_KEY = "b".repeat(64);

function fakeKv() {
	const store = new Map<string, { value: string; ttl?: number }>();
	return {
		store,
		async get(k: string) { return store.get(k)?.value ?? null; },
		async put(k: string, v: string, opts?: { expirationTtl?: number }) {
			store.set(k, { value: v, ttl: opts?.expirationTtl });
		},
	} as unknown as KVNamespace & { store: Map<string, { value: string; ttl?: number }> };
}

const FIXED = new Date("2026-05-10T12:00:00Z");

test("free tier under cap: increments and passes", async () => {
	const kv = fakeKv() as any;
	for (let i = 0; i < FREE_DAILY_CAP; i++) {
		await checkAndIncrement({ kv, userId: "u1", tier: "free", encryptionKey: TEST_ENC_KEY, now: () => FIXED });
	}
	// The key is now hashed — just check a key was written with the right count
	assert.equal(kv.store.size, 1);
	const stored = [...kv.store.values()][0];
	assert.equal(stored?.value, String(FREE_DAILY_CAP));
});

test("free tier at cap: next call throws rate_limited", async () => {
	const kv = fakeKv() as any;
	// Pre-populate with hashed key
	const uid = await anonId("u1", TEST_ENC_KEY);
	kv.store.set(`rl:${uid}:2026-05-10`, { value: String(FREE_DAILY_CAP) });
	await assert.rejects(
		() => checkAndIncrement({ kv, userId: "u1", tier: "free", encryptionKey: TEST_ENC_KEY, now: () => FIXED }),
		(err: unknown) => isStructuredToolError(err) && err.code === "rate_limited",
	);
});

test("pro tier: no-op, no kv writes", async () => {
	const kv = fakeKv() as any;
	for (let i = 0; i < 100; i++) {
		await checkAndIncrement({ kv, userId: "u1", tier: "pro", encryptionKey: TEST_ENC_KEY, now: () => FIXED });
	}
	assert.equal(kv.store.size, 0);
});

test("founders tier: no-op", async () => {
	const kv = fakeKv() as any;
	await checkAndIncrement({ kv, userId: "u1", tier: "founders", encryptionKey: TEST_ENC_KEY, now: () => FIXED });
	assert.equal(kv.store.size, 0);
});

test("rolls over at UTC midnight", async () => {
	const kv = fakeKv() as any;
	const uid = await anonId("u1", TEST_ENC_KEY);
	kv.store.set(`rl:${uid}:2026-05-10`, { value: String(FREE_DAILY_CAP) });
	// Day 2 — different date key, fresh budget
	const day2 = new Date("2026-05-11T00:00:01Z");
	await checkAndIncrement({ kv, userId: "u1", tier: "free", encryptionKey: TEST_ENC_KEY, now: () => day2 });
	// The new entry must have value "1" (day-2 key is fresh)
	const day2Key = `rl:${uid}:2026-05-11`;
	assert.equal(kv.store.get(day2Key)?.value, "1");
});

test("Retry-After roughly matches seconds-until-UTC-midnight", async () => {
	const kv = fakeKv() as any;
	const uid = await anonId("u1", TEST_ENC_KEY);
	kv.store.set(`rl:${uid}:2026-05-10`, { value: String(FREE_DAILY_CAP) });
	try {
		await checkAndIncrement({ kv, userId: "u1", tier: "free", encryptionKey: TEST_ENC_KEY, now: () => FIXED });
		assert.fail("should have thrown");
	} catch (err: any) {
		// FIXED = 12:00:00 UTC → 12h to next midnight → 43200s → 43200000ms ± margin
		const ms = err.extras?.retry_after_ms;
		assert.ok(typeof ms === "number" && ms > 43000_000 && ms < 43300_000, `got ${ms}`);
	}
});
