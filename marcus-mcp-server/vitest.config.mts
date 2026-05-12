import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

// Test-only RSA-2048 private key. Not used in production.
const TEST_RSA_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAw/zbToMDWcaiJNk8f2hT6xnpOPisHMXEFUFrigncrWyfgpYQ
X6d/qjs9s4NsM08UDCbMruhH4DMWq/HHX0q4rRAuMt6M2oDNZKJPgbg2YV5YDeQj
HOEzoVfsTtfpRhflzvrEJfidcDMFTCftQDwhxSlijPkPb0CCOoxuZKuxq3RknzbY
bB7nY0VJ/JQTdREZX6AvPmHQ9foH9Pe9xzgdgLNGVhtYS+5GBLLjSCpgTQ/pzKRJ
y+ozWjk8kMEqCFlR9oUYEDan0jX57qj+16wwlylE3PGXbQ054W3oYufrSZWioYPu
vaqgwFr1WVMNsfOrjtnCeNua6zZFuw7NwWkKXwIDAQABAoIBAAcWxc30sjHUm/fO
PcB0AxkNYmCzqfIOezWznJKtIaTKOYjNKcFz+wuqweQU3FyMvzJjUuL+tt7WqjrE
74u0VbK405r2bszWfNdngY21Ho5uDaxO9LAuOyJaXktJxv/IjIDslBy1fehZiBcF
mLDKnAQYJ57mwVaqVCuO+c09YptLdbPpmEcUbhRn0Dp+tE4YL32Z3SqwXc/Eah8s
qM1/PhsVRauxxV6UWSWM2JbnE43iCQFFGiDmWknGFuQ0CNtP3fhoyUDRvffyEXNN
Y4wIfFjHxVeSSGGBH2OUFiS+i0z6tizzZMSpeCFID3RJ8u28uKIna7Z1AezFpofw
fyxjBNkCgYEA9e3iK7cFrZfr2Nodqvb0fgDHQDelT0dk3hKIJ7r+0m1M8usm9EnO
T1eXJD6nOMIoiH7SfB/KG7PpteMh7UiUp63IE3ew08AUn6eR7AVO7EBviQzLJoHm
nIyW//orjP+ZhVJIS9nF2nm97euVOVef6qP/OiHqIAjl3yykxLCCl8cCgYEAzANt
mcoijM45B3usQ8veVtE6ld8ZU9Lzx0a7ZoNxw1iVRp/FIudtQ08ZreSrHe99nKrz
8MUumOepCQyqMTXV6eqzqK5yMkaA4njkjG53XEjjuumD6kXdkW4qr/JMzjjroO/Q
DO81FzC5Wh1L30tMv3kTdblNV3xcB/9tUSomaKkCgYAEc1OeeudtZsxr1janO2Td
SuJQNTGWp7IZmrhAD9BAup2j38GKtjM3mFwx2bho/IqDPdhNSr37llvqYLvicWfP
SQPP5mCa1GULJpsrbEUrXVcnYcXjYoJr3td0tnBHUvDSStToGn7MH1vijFrc+Mr6
EhGyWZ7FCaQvT72DmbYjTQKBgF6wkKQ6r4KPDOUuP6xP6Wh+QCTjocvIM6GgcMaJ
57l1WgOnkEY9B/eftRmC8vE4ASNALWzo+FG75DbxC+U/SYQCjVSTcylmk9eJqPqN
IxVQN3K/g5yuxMIFUgbL/V4SCTtvUy9Nr2SOFtl+k4KWXo7YUXHoib87VzPXGBP9
7knRAoGAS0dBZS+K6fihBU0dLY7gLua96V7aAdn+mmdQhl+kPGWtEp2bZi4TCGD3
/J9e4JYbEftnDwiU496vZeANhW/ER3mfm7JmIPnEanhF+wS7Azc6PcZ4Bwenk8SR
m6v9YEkRP4MW7giFQy4Au6+lMAIMjbs3/qBmeXT8qjLrVXwj+SI=
-----END RSA PRIVATE KEY-----`;

const WORKERS_OPTIONS = {
	main: "./src/index.ts",
	wrangler: { configPath: "./wrangler.jsonc" },
	miniflare: {
		// In-memory KV namespaces — override wrangler.jsonc IDs so placeholder doesn't matter
		kvNamespaces: ["OAUTH_KV", "MARCUS_KV", "RATE_LIMIT_KV"],
		// Fake secrets so env binding types are satisfied; fetch is mocked so values aren't validated
		bindings: {
			GITHUB_APP_CLIENT_ID: "Iv23TestClientId000",
			GITHUB_APP_ID: "999999",
			GITHUB_APP_SLUG: "marcus-test",
			GITHUB_APP_PRIVATE_KEY: TEST_RSA_KEY,
			GITHUB_OAUTH_CLIENT_ID: "test_oauth_client",
			GITHUB_OAUTH_CLIENT_SECRET: "test_oauth_secret",
			// 64 hex chars = 32-byte AES-256 key
			KV_ENCRYPTION_KEY: "0000000000000000000000000000000000000000000000000000000000000001",
		},
	},
};

export default defineConfig({
	plugins: [cloudflareTest(WORKERS_OPTIONS)],
	test: {
		include: ["test/integration/**/*.test.ts"],
	},
});
