import assert from "node:assert/strict";
import test from "node:test";
import { getCachedInstallationToken, setCachedInstallationToken } from "../github-token-cache.ts";
import { encryptForKv } from "../crypto.ts";

const TEST_KEY = "a".repeat(64); // 64 hex chars = 32 bytes
const INSTALLATION_ID = "123456";

function makeKv(store: Map<string, string> = new Map()): KVNamespace {
	return {
		get: async (key: string) => store.get(key) ?? null,
		put: async (key: string, value: string) => { store.set(key, value); },
		delete: async (key: string) => { store.delete(key); },
		// Stubs for unused methods
		getWithMetadata: async () => ({ value: null, metadata: null }),
		list: async () => ({ keys: [], list_complete: true, cursor: "" }),
	} as unknown as KVNamespace;
}

test("getCachedInstallationToken returns null when KV is empty", async () => {
	const kv = makeKv();
	const result = await getCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID);
	assert.equal(result, null);
});

test("getCachedInstallationToken returns null when token expires within 2 min", async () => {
	const store = new Map<string, string>();
	const kv = makeKv(store);
	// expiresAt is 90s from now — less than 120s safety margin
	const expiresAt = Date.now() + 90_000;
	const payload = JSON.stringify({ token: "ghs_test", expiresAt });
	const encrypted = await encryptForKv(TEST_KEY, payload);
	store.set(`install_token:${INSTALLATION_ID}`, encrypted);

	const result = await getCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID);
	assert.equal(result, null);
	// Expired entry should have been deleted
	assert.equal(store.has(`install_token:${INSTALLATION_ID}`), false);
});

test("getCachedInstallationToken returns token when valid", async () => {
	const store = new Map<string, string>();
	const kv = makeKv(store);
	const expiresAt = Date.now() + 30 * 60 * 1000; // 30 min from now
	const payload = JSON.stringify({ token: "ghs_valid", expiresAt });
	const encrypted = await encryptForKv(TEST_KEY, payload);
	store.set(`install_token:${INSTALLATION_ID}`, encrypted);

	const result = await getCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID);
	assert.equal(result, "ghs_valid");
});

test("getCachedInstallationToken returns null and deletes on corrupt ciphertext", async () => {
	const store = new Map<string, string>();
	store.set(`install_token:${INSTALLATION_ID}`, "not-valid-base64-encrypted-data");
	const kv = makeKv(store);

	const result = await getCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID);
	assert.equal(result, null);
	assert.equal(store.has(`install_token:${INSTALLATION_ID}`), false);
});

test("setCachedInstallationToken round-trips correctly", async () => {
	const store = new Map<string, string>();
	const kv = makeKv(store);
	const expiresAtIso = new Date(Date.now() + 60 * 60 * 1000).toISOString();

	await setCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID, "ghs_roundtrip", expiresAtIso);

	assert.equal(store.has(`install_token:${INSTALLATION_ID}`), true);
	const retrieved = await getCachedInstallationToken(kv, TEST_KEY, INSTALLATION_ID);
	assert.equal(retrieved, "ghs_roundtrip");
});
