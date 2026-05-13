import { Header } from '@/app/components/Header';
import { getMatchDetailsAction } from '@/app/lib/actions/stats-actions';
import { MatchEditForm } from '@/app/components/admin/MatchEditForm';
import Link from 'next/link';
import { BackToAdminButton } from '@/app/components/admin/BackToAdminButton';

export default async function EditMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const data = await getMatchDetailsAction(matchId);

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Header />
        <main className="page-container flex flex-col items-center justify-center py-20">
          <h1 className="text-2xl font-bold mb-4">Match Not Found</h1>
          <Link href="/admin/manage-data" className="text-green-400 hover:underline">
            Back to Manage Data
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="page-container max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Link href="/admin/manage-data" className="text-green-400 text-sm hover:underline">Manage Data</Link>
               <span className="text-gray-600 text-sm">/</span>
               <span className="text-gray-400 text-sm">Edit Match</span>
            </div>
            <h1 className="page-title text-white">Update Match Data</h1>
            <p className="hint-text mt-1">Modify team scores and player statistics.</p>
          </div>
          <BackToAdminButton />
        </div>

        <MatchEditForm initialMatch={data.match} initialPerformances={data.performances} />
      </main>
    </div>
  );
}
