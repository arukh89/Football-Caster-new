"use client";

import Link from 'next/link';
import { Trophy, Calendar, Info } from 'lucide-react';
import { GlassCard } from '@/components/glass/GlassCard';
import { Button } from '@/components/ui/button';
import { DesktopNav, Navigation } from '@/components/Navigation';

export default function SeasonHome(): JSX.Element {
  const currentSeasonId = '2025-S1';

  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Season</h1>
              <p className="text-sm text-muted-foreground">Compete over a season and climb the leaderboard</p>
            </div>
          </div>

          <GlassCard>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-1 text-amber-600" />
              <div className="text-sm space-y-1">
                <div className="font-semibold">About Seasons</div>
                <div className="text-muted-foreground">Seasons group PvP results into standings. Earn points for wins and draws.</div>
                <div className="text-muted-foreground">This is a placeholder UI. Full season logic to follow.</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold">Current Season</div>
                <div className="text-xs text-muted-foreground">ID: {currentSeasonId}</div>
              </div>
            </div>
            <Link href={`/season/leaderboard?seasonId=${currentSeasonId}`}>
              <Button>Open Leaderboard</Button>
            </Link>
          </GlassCard>
        </div>
      </div>
      <Navigation />
    </>
  );
}
