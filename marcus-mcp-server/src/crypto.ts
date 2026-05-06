// HMAC-SHA256 for OAuth state signing.
// AES-GCM-256 for encrypting GitHub installation IDs in KV.
// Both use the same raw key material from KV_ENCRYPTION_KEY (64-hex chars = 32 bytes).

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function importHmacKey(hexKey: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		hexToBytes(hexKey.slice(0, 64)),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function importAesKey(hexKey: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		hexToBytes(hexKey.slice(0, 64)),
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function hmacSign(hexKey: string, data: string): Promise<string> {
	const key = await importHmacKey(hexKey);
	const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
	return bytesToHex(new Uint8Array(sig));
}

export async function hmacVerify(hexKey: string, data: string, sig: string): Promise<boolean> {
	try {
		const expected = await hmacSign(hexKey, data);
		if (expected.length !== sig.length) return false;
		let diff = 0;
		for (let i = 0; i < expected.length; i++) {
			diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
		}
		return diff === 0;
	} catch {
		return false;
	}
}

// Encrypts plaintext to base64 string (12-byte IV prepended to ciphertext).
export async function encryptForKv(hexKey: string, plaintext: string): Promise<string> {
	const key = await importAesKey(hexKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const cipher = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		new TextEncoder().encode(plaintext),
	);
	const combined = new Uint8Array(12 + cipher.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(cipher), 12);
	return btoa(String.fromCharCode(...combined));
}

export async function decryptFromKv(hexKey: string, ciphertext: string): Promise<string> {
	const key = await importAesKey(hexKey);
	const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const cipher = combined.slice(12);
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		cipher,
	);
	return new TextDecoder().decode(plain);
}
