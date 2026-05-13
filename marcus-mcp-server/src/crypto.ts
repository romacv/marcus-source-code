// HMAC-SHA256 for OAuth state signing.
// AES-GCM-256 for encrypting GitHub installation IDs in KV.
// v1: raw key material from KV_ENCRYPTION_KEY (64-hex = 32 bytes), no AAD.
// v2: HKDF-derived subkeys + optional AAD. Ciphertext prefixed with "v2:".
//     Existing v1 ciphertext (no prefix) continues to decrypt via legacy path.

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

async function deriveSubkey(masterHex: string, info: string, length = 32): Promise<ArrayBuffer> {
	const ikm = hexToBytes(masterHex);
	const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
	return crypto.subtle.deriveBits(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array().buffer as ArrayBuffer,
			info: new TextEncoder().encode(info).buffer as ArrayBuffer,
		},
		baseKey,
		length * 8,
	);
}

async function importHmacKeyRaw(hexKey: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		hexToBytes(hexKey.slice(0, 64)),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function importHmacKey(hexKey: string): Promise<CryptoKey> {
	const derived = await deriveSubkey(hexKey, "marcus-hmac-v1");
	return crypto.subtle.importKey(
		"raw",
		derived,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign", "verify"],
	);
}

async function importAesKeyRaw(hexKey: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		hexToBytes(hexKey.slice(0, 64)),
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

async function importAesKey(hexKey: string): Promise<CryptoKey> {
	const derived = await deriveSubkey(hexKey, "marcus-aes-v1");
	return crypto.subtle.importKey(
		"raw",
		derived,
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
		// Try HKDF-derived key first (v2 signing), fall back to raw key (v1 signing).
		for (const keyFn of [importHmacKey, importHmacKeyRaw]) {
			const key = await keyFn(hexKey);
			const expected = bytesToHex(new Uint8Array(
				await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)),
			));
			if (expected.length !== sig.length) continue;
			let diff = 0;
			for (let i = 0; i < expected.length; i++) {
				diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
			}
			if (diff === 0) return true;
		}
		return false;
	} catch {
		return false;
	}
}

type GcmParams = { name: "AES-GCM"; iv: ArrayBuffer; additionalData?: ArrayBuffer };

// Encrypts plaintext to "v2:<base64>" string with optional AAD.
export async function encryptForKv(hexKey: string, plaintext: string, aad?: Uint8Array): Promise<string> {
	const key = await importAesKey(hexKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const params: GcmParams = { name: "AES-GCM", iv: iv.buffer as ArrayBuffer };
	if (aad) params.additionalData = aad.buffer as ArrayBuffer;
	const cipher = await crypto.subtle.encrypt(params, key, new TextEncoder().encode(plaintext));
	const combined = new Uint8Array(12 + cipher.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(cipher), 12);
	return "v2:" + btoa(String.fromCharCode(...combined));
}

// Decrypts "v2:<base64>" (HKDF key + AAD) or legacy raw base64 (v1, no AAD).
export async function decryptFromKv(hexKey: string, ciphertext: string, aad?: Uint8Array): Promise<string> {
	if (ciphertext.startsWith("v2:")) {
		const key = await importAesKey(hexKey);
		const combined = Uint8Array.from(atob(ciphertext.slice(3)), (c) => c.charCodeAt(0));
		const iv = combined.slice(0, 12);
		const cipher = combined.slice(12);
		const params: GcmParams = { name: "AES-GCM", iv: iv.buffer as ArrayBuffer };
		if (aad) params.additionalData = aad.buffer as ArrayBuffer;
		const plain = await crypto.subtle.decrypt(params, key, cipher);
		return new TextDecoder().decode(plain);
	}
	// Legacy v1: raw key, no AAD
	const key = await importAesKeyRaw(hexKey);
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
