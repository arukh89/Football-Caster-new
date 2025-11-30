import { Suspense } from 'react';
import { DesktopNav, Navigation } from '@/components/Navigation';
import LeaderboardClient from './LeaderboardClient';

export default function SeasonLeaderboardPage(): JSX.Element {
  return (
    <>
      <DesktopNav />
      <div className="min-h-screen mobile-safe md:pt-20 pb-20 md:pb-8">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Loading leaderboard…</div>}>
            <LeaderboardClient />
          </Suspense>
        </div>
      </div>
      <Navigation />
    </>
  );
}
