export function calculateRankFromFollowers(followers: number | null | undefined): 'S' | 'A' | 'B' | 'C' | 'D' {
  const f = Math.max(0, Number(followers || 0));
  if (f >= 100_000) return 'S';
  if (f >= 50_000) return 'A';
  if (f >= 10_000) return 'B';
  if (f >= 1_000) return 'C';
  return 'D';
}

export function calculateIntelligenceFromFollowers(followers: number | null | undefined): number {
  const f = Math.max(0, Number(followers || 0));
  const capped = Math.min(100_000, f);
  // Map 0..100k -> 30..95 (bounded and simple)
  const x = 30 + Math.round((capped / 100_000) * 65);
  return Math.max(0, Math.min(100, x));
}
