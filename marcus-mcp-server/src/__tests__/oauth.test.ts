import assert from "node:assert/strict";
import test from "node:test";
import { hmacSign } from "../crypto.ts";

const TEST_KEY = "a".repeat(64);

async function makeState(ts: number, extra: Record<string, unknown> = {}): Promise<string> {
	const payload = JSON.stringify({ nonce: "test-nonce", ts, ...extra });
	const sig = await hmacSign(TEST_KEY, payload);
	return btoa(payload) + "." + sig;
}

// Simulate the state TTL check from the callback handler
async function checkState(state: string, now = Date.now()): Promise<"ok" | "bad_sig" | "expired"> {
	const { hmacVerify } = await import("../crypto.ts");
	const dotIdx = state.lastIndexOf(".");
	if (dotIdx === -1) return "bad_sig";
	const payloadJson = atob(state.slice(0, dotIdx));
	const sig = state.slice(dotIdx + 1);
	if (!(await hmacVerify(TEST_KEY, payloadJson, sig))) return "bad_sig";
	const payload = JSON.parse(payloadJson) as { ts?: unknown };
	const STATE_MAX_AGE_MS = 10 * 60 * 1000;
	if (typeof payload.ts !== "number" || now - payload.ts > STATE_MAX_AGE_MS) return "expired";
	return "ok";
}

test("state with fresh ts is accepted", async () => {
	const state = await makeState(Date.now());
	assert.equal(await checkState(state), "ok");
});

test("state with ts 11 minutes ago is rejected as expired", async () => {
	const oldTs = Date.now() - 11 * 60 * 1000;
	const state = await makeState(oldTs);
	assert.equal(await checkState(state), "expired");
});

test("state with missing ts is rejected as expired", async () => {
	const payload = JSON.stringify({ nonce: "test-nonce" });
	const sig = await hmacSign(TEST_KEY, payload);
	const state = btoa(payload) + "." + sig;
	assert.equal(await checkState(state), "expired");
});

test("tampered state returns bad_sig", async () => {
	const state = await makeState(Date.now());
	const tampered = state.slice(0, -4) + "xxxx";
	assert.equal(await checkState(tampered), "bad_sig");
});
