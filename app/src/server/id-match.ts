export function resolveIdLikeGitHash(
  input: string,
  candidates: readonly string[]
): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  const q = raw.toLowerCase();
  const qCompact = q.replace(/-/g, "");

  // 1) Exact match (case-insensitive)
  const exact = candidates.find((c) => c.toLowerCase() === q);
  if (exact) return exact;

  // 2) Exact match ignoring hyphens (UUID convenience)
  const exactCompact = candidates.find(
    (c) => c.toLowerCase().replace(/-/g, "") === qCompact
  );
  if (exactCompact) return exactCompact;

  // 3) Prefix match (git-hash style)
  const prefix = candidates.find((c) => c.toLowerCase().startsWith(q));
  if (prefix) return prefix;

  // 4) Prefix match ignoring hyphens
  const prefixCompact = candidates.find((c) =>
    c.toLowerCase().replace(/-/g, "").startsWith(qCompact)
  );
  if (prefixCompact) return prefixCompact;

  // 5) Substring match (fallback)
  const contains = candidates.find((c) => c.toLowerCase().includes(q));
  if (contains) return contains;

  // 6) Substring match ignoring hyphens
  const containsCompact = candidates.find((c) =>
    c.toLowerCase().replace(/-/g, "").includes(qCompact)
  );
  if (containsCompact) return containsCompact;

  return null;
}
