import { decryptFromKv, encryptForKv } from "./crypto.ts";

// Per-user Apify token for reel scraping. Entered on a one-time web page so it never
// passes through the chat, stored encrypted and bound to the user id.

const LINK_TTL_SEC = 15 * 60;
const NONCE_RE = /^[a-f0-9]{64}$/;

const linkKey = (nonce: string) => `scraper_link:${nonce}`;
const tokenKey = (userId: string) => `scraper_token:${userId}`;
const aad = (userId: string) => new TextEncoder().encode(`scraper:${userId}`);

export async function createScraperLink(kv: KVNamespace, userId: string): Promise<string> {
	const nonce = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
	await kv.put(linkKey(nonce), userId, { expirationTtl: LINK_TTL_SEC });
	return nonce;
}

export async function peekScraperLink(kv: KVNamespace, nonce: string): Promise<string | null> {
	if (!NONCE_RE.test(nonce)) return null;
	return kv.get(linkKey(nonce));
}

// Consumes the one-time link and saves (or, for an empty token, removes) the user's token.
export async function redeemScraperLink(
	kv: KVNamespace,
	encryptionKey: string,
	nonce: string,
	token: string,
): Promise<"saved" | "removed" | "invalid_link"> {
	const userId = await peekScraperLink(kv, nonce);
	if (!userId) return "invalid_link";
	await kv.delete(linkKey(nonce));
	const clean = token.trim();
	if (!clean) {
		await kv.delete(tokenKey(userId));
		return "removed";
	}
	await kv.put(tokenKey(userId), await encryptForKv(encryptionKey, clean, aad(userId)));
	return "saved";
}

export async function getScraperToken(kv: KVNamespace, encryptionKey: string, userId: string): Promise<string | null> {
	const stored = await kv.get(tokenKey(userId));
	if (!stored) return null;
	try {
		return await decryptFromKv(encryptionKey, stored, aad(userId));
	} catch {
		return null;
	}
}
