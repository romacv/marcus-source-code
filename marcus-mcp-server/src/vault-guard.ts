const MARCUS_VAULT_ALLOWLIST = new Set([
	"_marcus",
	"00-daily",
	"10-journal",
	"15-memory",
	"20-topics",
	"30-people",
	"40-projects",
	"50-resources",
	"60-photos",
	"90-archive",
	"README.md",
	"index.md",
]);

export function findUnrelatedVaultEntries(
	entries: Array<{ path: string }>,
): string[] {
	const topLevel = new Set(
		entries
			.map((entry) => entry.path.split("/")[0])
			.filter(Boolean),
	);
	return [...topLevel].filter((entry) => !MARCUS_VAULT_ALLOWLIST.has(entry));
}
