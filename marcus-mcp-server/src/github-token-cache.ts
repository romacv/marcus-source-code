import { decryptFromKv, encryptForKv } from "./crypto.ts";

const SAFETY_MARGIN_MS = 120_000;
const KV_FLOOR_TTL_S = 60;

type CachedToken = { token: string; expiresAt: number };

export async function getCachedInstallationToken(
	kv: KVNamespace,
	encryptionKey: string,
	installationId: string,
): Promise<string | null> {
	const key = `install_token:${installationId}`;
	const raw = await kv.get(key);
	if (!raw) return null;
	let parsed: CachedToken;
	try {
		const decrypted = await decryptFromKv(encryptionKey, raw);
		parsed = JSON.parse(decrypted) as CachedToken;
	} catch {
		await kv.delete(key);
		return null;
	}
	if (parsed.expiresAt - Date.now() < SAFETY_MARGIN_MS) {
		await kv.delete(key);
		return null;
	}
	return parsed.token;
}

export async function setCachedInstallationToken(
	kv: KVNamespace,
	encryptionKey: string,
	installationId: string,
	token: string,
	expiresAtIso: string,
): Promise<void> {
	const expiresAt = new Date(expiresAtIso).getTime();
	const ttlS = Math.max(KV_FLOOR_TTL_S, Math.floor((expiresAt - Date.now()) / 1000) - 60);
	const payload = JSON.stringify({ token, expiresAt } satisfies CachedToken);
	const encrypted = await encryptForKv(encryptionKey, payload);
	await kv.put(`install_token:${installationId}`, encrypted, { expirationTtl: ttlS });
}
