import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import * as admin from 'firebase-admin';

interface BestFields {
  bowl_best_wickets: number;
  bowl_best_runs: number;
  bowl_best: string;
  bat_highest: number;
}

function computeBestFromPerfs(perfs: admin.firestore.DocumentData[]): BestFields {
  let bowl_best_wickets = 0;
  let bowl_best_runs = 999;
  let bat_highest = 0;

  for (const perf of perfs) {
    // Batting best
    if (perf.bat_did_bat) {
      bat_highest = Math.max(bat_highest, perf.bat_runs || 0);
    }

    // Bowling best
    if (perf.bowl_did_bowl) {
      const wkts = perf.bowl_wickets || 0;
      const runs = perf.bowl_runs ?? 999;

      if (wkts > bowl_best_wickets) {
        bowl_best_wickets = wkts;
        bowl_best_runs = runs;
      } else if (wkts === bowl_best_wickets && wkts > 0) {
        if (runs < bowl_best_runs) {
          bowl_best_runs = runs;
        }
      }
    }
  }

  const hasBowled = bowl_best_wickets > 0;
  return {
    bowl_best_wickets,
    bowl_best_runs: hasBowled ? bowl_best_runs : 0,
    bowl_best: hasBowled ? `${bowl_best_wickets}/${bowl_best_runs === 999 ? 0 : bowl_best_runs}` : '',
    bat_highest,
  };
}

/**
 * POST /api/recompute-best
 * Body: { playerIds: string[] }
 *
 * Triggered after a match edit to fix bowl_best / bat_highest which
 * can't be correctly decremented — must be recomputed from raw perf docs.
 * Scans ALL years/months from the player's perf history, not just the edited match's.
 */
export async function recomputeBestForPlayers(playerIds: string[]) {
  if (!playerIds.length) return 0;

  const db = getFirebaseAdmin();

  // Chunk playerIds — Firestore 'in' supports max 30 (Next.js ≥ firebase-admin 12 raised limit)
  const CHUNK = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < playerIds.length; i += CHUNK) {
    chunks.push(playerIds.slice(i, i + CHUNK));
  }

  // Fetch ALL performances for affected players
  const allPerfs: admin.firestore.DocumentData[] = [];
  for (const chunk of chunks) {
    const snap = await db.collection('performances').where('player_id', 'in', chunk).get();
    snap.docs.forEach(d => allPerfs.push({ ...d.data(), _id: d.id }));
  }

  // Group by playerId
  const byPlayer = new Map<string, admin.firestore.DocumentData[]>();
  for (const perf of allPerfs) {
    const pid = perf.player_id;
    if (!byPlayer.has(pid)) byPlayer.set(pid, []);
    byPlayer.get(pid)!.push(perf);
  }

  const batch = db.batch();
  let writeCount = 0;

  for (const pid of playerIds) {
    const perfs = byPlayer.get(pid) ?? [];

    // --- ALL-TIME ---
    const alltimeBest = computeBestFromPerfs(perfs);
    const alltimeRef = db.collection('player_stats_alltime').doc(pid);
    batch.set(alltimeRef, {
      ...alltimeBest,
      last_updated: admin.firestore.Timestamp.now(),
    }, { merge: true });
    writeCount++;

    // --- YEARLY: all years from perf history ---
    const uniqueYears = Array.from(new Set(perfs.map(p => p.year as string).filter(Boolean)));

    for (const year of uniqueYears) {
      const yearPerfs = perfs.filter(p => p.year === year);
      const yearBest = computeBestFromPerfs(yearPerfs);
      const yearRef = db.collection('player_stats_yearly').doc(`${pid}_${year}`);
      batch.set(yearRef, {
        ...yearBest,
        last_updated: admin.firestore.Timestamp.now(),
      }, { merge: true });
      writeCount++;
    }

    // --- MONTHLY: all months from perf history ---
    const uniqueMonths = Array.from(new Set(perfs.map(p => p.month as string).filter(Boolean)));

    for (const month of uniqueMonths) {
      const monthPerfs = perfs.filter(p => p.month === month);
      const monthBest = computeBestFromPerfs(monthPerfs);
      const monthRef = db.collection('player_stats_monthly').doc(`${pid}_${month}`);
      batch.set(monthRef, {
        ...monthBest,
        last_updated: admin.firestore.Timestamp.now(),
      }, { merge: true });
      writeCount++;
    }
  }

  await batch.commit();
  return writeCount;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const playerIds: string[] = body.playerIds ?? [];

    if (!playerIds.length) {
      return NextResponse.json({ success: false, error: 'No playerIds provided' }, { status: 400 });
    }

    const writeCount = await recomputeBestForPlayers(playerIds);



    return NextResponse.json({
      success: true,
      message: `Recomputed best fields for ${playerIds.length} player(s). ${writeCount} stat docs updated.`,
    });
  } catch (error: any) {
    console.error('[recompute-best] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
