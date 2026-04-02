'use client';

import { Header } from '@/app/components/Header';
import { TeamStatsCard } from '@/app/components/TeamStatsCard';
import { TeamMatchCard } from '@/app/components/TeamMatchCard';
import { TopBattersSection } from '@/app/components/TopBattersSection';
import { TopBowlersSection } from '@/app/components/TopBowlersSection';
import { useTeamStats } from '@/app/lib/hooks/useTeamStats';
import { useRecentMatch } from '@/app/lib/hooks/useRecentMatch';

export default function Home() {
  const { data: stats, loading, error } = useTeamStats();
  const { data: recentMatch, loading: matchLoading } = useRecentMatch();

  return (
    <>
      <Header />
      <main className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Recent Match Card */}
          {!matchLoading && recentMatch && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Recent Match</h2>
              <TeamMatchCard match={recentMatch} />
            </div>
          )}

          {/* Team Stats Card */}
          <TeamStatsCard stats={stats} loading={loading} error={error} />

          {/* Top Batters Section */}
          <TopBattersSection />

          {/* Top Bowlers Section */}
          <TopBowlersSection />
        </div>
      </main>
    </>
  );
}
