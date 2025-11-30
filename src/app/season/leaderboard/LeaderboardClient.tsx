"use client";

import { useSearchParams } from 'next/navigation';
import { Trophy } from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';

export default function LeaderboardClient(): JSX.Element {
  const sp = useSearchParams();
  const seasonId = sp.get('seasonId') || '2025-S1';

  const rows = [
    { rank: 1, fid: 1234, points: 12, w: 4, d: 0, l: 0 },
    { rank: 2, fid: 5678, points: 10, w: 3, d: 1, l: 0 },
    { rank: 3, fid: 250704, points: 7, w: 2, d: 1, l: 1 },
  ];

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
          <Trophy className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Season {seasonId}</p>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">FID</th>
              <th className="text-right px-4 py-2">Pts</th>
              <th className="text-right px-4 py-2">W</th>
              <th className="text-right px-4 py-2">D</th>
              <th className="text-right px-4 py-2">L</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.rank} className="border-t border-border">
                <td className="px-4 py-2">{r.rank}</td>
                <td className="px-4 py-2">{r.fid}</td>
                <td className="px-4 py-2 text-right font-semibold">{r.points}</td>
                <td className="px-4 py-2 text-right">{r.w}</td>
                <td className="px-4 py-2 text-right">{r.d}</td>
                <td className="px-4 py-2 text-right">{r.l}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </>
  );
}
