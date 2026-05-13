'use client';

import { Header } from '@/app/components/Header';
import { TeamStatsCard } from '@/app/components/TeamStatsCard';
import { TeamMatchDetails } from '@/app/components/TeamMatchDetails';
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
      <main className="flex-1 bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
        <div className="page-container space-y-4 sm:space-y-8">
          {/* Recent Match Details */}
          {!matchLoading && recentMatch && (
            <div>
              <h2 className="section-title text-white mb-3 sm:mb-4">Recent Match</h2>
              <TeamMatchDetails match={recentMatch} />
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
