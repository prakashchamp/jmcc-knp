'use client';

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { updateMatchAction } from '@/app/lib/actions/match-update-actions';
import { generatePlayerId } from '@/app/lib/player-utils';
import { CustomSelect } from '@/app/components/CustomSelect';
import { BatterDropdownSelect } from '@/app/components/scorer/dialogs/BatterDropdownSelect';
import { useRouter } from 'next/navigation';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import type { RootState } from '@/app/lib/redux/store';

interface MatchEditFormProps {
  initialMatch: Match;
  initialPerformances: Performance[];
}

interface NewPlayerForm {
  playerId: string;
  battingRuns: number | '';
  battingBalls: number | '';
  battingFours: number | '';
  battingSixes: number | '';
  bowlingOvers: number | '';
  bowlingMaidens: number | '';
  bowlingWickets: number | '';
  bowlingRuns: number | '';
}

export function MatchEditForm({ initialMatch, initialPerformances }: MatchEditFormProps) {
  const router = useRouter();
  const { liveMatch } = useSelector((state: RootState) => state.scorer);
  const teamRoster = useSelector((state: RootState) => state.team.team?.players || []);
  const [match, setMatch] = useState<Partial<Match>>(initialMatch);
  const [performances, setPerformances] = useState<Partial<Performance>[]>(initialPerformances);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [addPlayerType, setAddPlayerType] = useState<'batting' | 'bowling' | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<TeamPlayer | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerData, setNewPlayerData] = useState<NewPlayerForm>({
    playerId: '',
    battingRuns: '',
    battingBalls: '',
    battingFours: '',
    battingSixes: '',
    bowlingOvers: '',
    bowlingMaidens: '',
    bowlingWickets: '',
    bowlingRuns: '',
  });

  const availablePlayers: TeamPlayer[] = useMemo(() => {
    const rosterPlayers = teamRoster.length > 0 ? teamRoster : [];
    const matchPlayers = liveMatch?.teamPlayers ?? [];
    const merged = new Map<string, TeamPlayer>();

    [...rosterPlayers, ...matchPlayers].forEach((player) => {
      if (player?.id) merged.set(player.id, player);
    });

    return Array.from(merged.values());
  }, [teamRoster, liveMatch?.teamPlayers]);

  const [winMarginValue, setWinMarginValue] = useState<string>(() => {
    const margin = (initialMatch.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return parsed?.[1] ?? '';
  });

  const [winMarginUnit, setWinMarginUnit] = useState<'runs' | 'wickets'>(() => {
    const margin = (initialMatch.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return (parsed?.[2]?.toLowerCase() as 'runs' | 'wickets') || 'runs';
  });

  const handleMatchChange = (field: keyof Match, value: any) => {
    let finalValue = value;
    if (typeof value === 'number' || (!isNaN(Number(value)) && value !== '')) {
      const numValue = Number(value);
      if (numValue < 0) finalValue = 0;
    }
    setMatch((prev) => ({ ...prev, [field]: finalValue }));
  };

  const handlePerformanceChange = (index: number, field: string, subField: string, value: any) => {
    const updated = [...performances];
    const perf = { ...updated[index] };
    
    let finalValue = value;
    if (field !== 'playerName' && (typeof value === 'number' || (!isNaN(Number(value)) && value !== ''))) {
      const numValue = Number(value);
      if (numValue < 0) finalValue = 0;
    }

    if (field === 'playerName') {
      perf.playerName = finalValue;
    } else {
      (perf as any)[field] = {
        ...(perf as any)[field],
        [subField]: finalValue,
      };
    }
    updated[index] = perf;
    setPerformances(updated);
  };

  const handleAddPlayer = () => {
    if (!selectedPlayer && !newPlayerName.trim()) {
      setError('Select or create player');
      return;
    }

    // Use selected player or create new one from name
    const player = selectedPlayer || {
      id: generatePlayerId(),
      name: newPlayerName.trim(),
    };

    const battingRunsValue = Number(newPlayerData.battingRuns || 0);
    const battingBallsValue = Number(newPlayerData.battingBalls || 0);
    const bowlingOversValue = Number(newPlayerData.bowlingOvers || 0);
    const bowlingRunsValue = Number(newPlayerData.bowlingRuns || 0);
    const bowlingWicketsValue = Number(newPlayerData.bowlingWickets || 0);
    const bowlingMaidensValue = Number(newPlayerData.bowlingMaidens || 0);

    const existingIndex = performances.findIndex((p) => p.playerId === player.id);
    if (existingIndex !== -1) {
      const updated = [...performances];
      const existingPerf = { ...updated[existingIndex] };

      if (addPlayerType === 'batting') {
        const hasBatting = existingPerf.batting?.didBat || Number(existingPerf.batting?.runs || 0) > 0 || Number(existingPerf.batting?.balls || 0) > 0;
        if (hasBatting) {
          setError('Player already has batting stats');
          return;
        }

        existingPerf.batting = {
          ...existingPerf.batting,
          runs: battingRunsValue,
          balls: battingBallsValue,
          zeros: 0,
          fours: Number(newPlayerData.battingFours || 0),
          sixes: Number(newPlayerData.battingSixes || 0),
          dismissed: false,
          isDuck: false,
          isThirty: false,
          isFifty: false,
          isHundred: false,
          didBat: battingRunsValue > 0 || battingBallsValue > 0,
          innings: battingRunsValue > 0 || battingBallsValue > 0 ? 1 : 0,
          strikeRate: battingBallsValue > 0 ? (battingRunsValue / battingBallsValue) * 100 : 0,
        };
      } else {
        const hasBowling = existingPerf.bowling?.didBowl || Number(existingPerf.bowling?.overs || 0) > 0 || Number(existingPerf.bowling?.runs || 0) > 0 || Number(existingPerf.bowling?.wickets || 0) > 0;
        if (hasBowling) {
          setError('Player already has bowling stats');
          return;
        }

        existingPerf.bowling = {
          ...existingPerf.bowling,
          overs: bowlingOversValue,
          balls: 0,
          runs: bowlingRunsValue,
          wickets: bowlingWicketsValue,
          maidens: bowlingMaidensValue,
          isThreeFer: false,
          isFourFer: false,
          isFiveFer: false,
          didBowl: bowlingOversValue > 0 || bowlingRunsValue > 0 || bowlingWicketsValue > 0,
          innings: bowlingOversValue > 0 ? 1 : 0,
          economy: bowlingOversValue > 0 ? bowlingRunsValue / (Math.floor(bowlingOversValue) + (bowlingOversValue % 1) / 0.6) : 0,
        };
      }

      updated[existingIndex] = existingPerf;
      setPerformances(updated);
      setShowAddPlayerModal(false);
      setAddPlayerType(null);
      setSelectedPlayer(null);
      setNewPlayerName('');
      setNewPlayerData({
        playerId: '',
        battingRuns: '',
        battingBalls: '',
        battingFours: '',
        battingSixes: '',
        bowlingOvers: '',
        bowlingMaidens: '',
        bowlingWickets: '',
        bowlingRuns: '',
      });
      setError('');
      return;
    }

    const newPerformance: Partial<Performance> = {
      id: `${match.id}_${player.id}`,
      matchId: match.id,
      playerId: player.id,
      playerName: player.name,
      date: initialMatch.date,
      year: initialMatch.year,
      month: initialMatch.month,
      opponent: initialMatch.opponent,
      batting: addPlayerType === 'batting' ? {
        runs: battingRunsValue,
        balls: battingBallsValue,
        zeros: 0,
        fours: Number(newPlayerData.battingFours || 0),
        sixes: Number(newPlayerData.battingSixes || 0),
        dismissed: false,
        isDuck: false,
        isThirty: false,
        isFifty: false,
        isHundred: false,
        didBat: battingRunsValue > 0 || battingBallsValue > 0,
        innings: battingRunsValue > 0 || battingBallsValue > 0 ? 1 : 0,
        strikeRate: battingBallsValue > 0 ? (battingRunsValue / battingBallsValue) * 100 : 0,
      } : {
        didBat: false,
        innings: 0,
        runs: 0,
        balls: 0,
        zeros: 0,
        fours: 0,
        sixes: 0,
        dismissed: false,
        isDuck: false,
        isThirty: false,
        isFifty: false,
        isHundred: false,
        strikeRate: 0,
      },
      bowling: addPlayerType === 'bowling' ? {
        overs: bowlingOversValue,
        balls: 0,
        runs: bowlingRunsValue,
        wickets: bowlingWicketsValue,
        maidens: bowlingMaidensValue,
        isThreeFer: false,
        isFourFer: false,
        isFiveFer: false,
        didBowl: bowlingOversValue > 0 || bowlingRunsValue > 0 || bowlingWicketsValue > 0,
        innings: bowlingOversValue > 0 ? 1 : 0,
        economy: bowlingOversValue > 0 ? bowlingRunsValue / (Math.floor(bowlingOversValue) + (bowlingOversValue % 1) / 0.6) : 0,
      } : {
        didBowl: false,
        innings: 0,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        isThreeFer: false,
        isFourFer: false,
        isFiveFer: false,
        economy: 0,
      },
      createdAt: new Date().toISOString(),
    };

    setPerformances([...performances, newPerformance]);
    setShowAddPlayerModal(false);
    setAddPlayerType(null);
    setSelectedPlayer(null);
    setNewPlayerName('');
    setNewPlayerData({
      playerId: '',
      battingRuns: '',
      battingBalls: '',
      battingFours: '',
      battingSixes: '',
      bowlingOvers: '',
      bowlingMaidens: '',
      bowlingWickets: '',
      bowlingRuns: '',
    });
    setError('');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedMatch = {
        ...match,
        winMargin: winMarginValue ? `${winMarginValue} ${winMarginUnit}` : '',
        teamRuns: Math.max(0, Number(match.teamRuns || 0)),
        teamWickets: Math.max(0, Number(match.teamWickets || 0)),
        teamOversPlayed: Math.max(0, Number(match.teamOversPlayed || 0)),
        opponentRuns: Math.max(0, Number(match.opponentRuns || 0)),
        opponentWickets: Math.max(0, Number(match.opponentWickets || 0)),
        opponentOversPlayed: Math.max(0, Number(match.opponentOversPlayed || 0)),
      };

      // Ensure all derived fields are re-calculated if needed
      const finalPerformances = performances.map(perf => {
        const battingRuns = Math.max(0, Number(perf.batting?.runs || 0));
        const battingBalls = Math.max(0, Number(perf.batting?.balls || 0));
        const bowlingOvers = Math.max(0, Number(perf.bowling?.overs || 0));
        const bowlingRuns = Math.max(0, Number(perf.bowling?.runs || 0));
        const bowlingWickets = Math.max(0, Number(perf.bowling?.wickets || 0));
        const battingFours = Math.max(0, Number(perf.batting?.fours || 0));
        const battingSixes = Math.max(0, Number(perf.batting?.sixes || 0));

        return {
          ...perf,
          batting: {
            ...perf.batting,
            runs: battingRuns,
            balls: battingBalls,
            zeros: perf.batting?.zeros || 0,
            fours: battingFours,
            sixes: battingSixes,
            didBat: battingRuns > 0 || battingBalls > 0 || !!perf.batting?.dismissed,
            innings: (battingRuns > 0 || battingBalls > 0) ? 1 : 0,
            strikeRate: battingBalls > 0 ? (battingRuns / battingBalls) * 100 : 0,
          },
          bowling: {
            ...perf.bowling,
            runs: bowlingRuns,
            wickets: bowlingWickets,
            overs: bowlingOvers,
            didBowl: bowlingOvers > 0 || bowlingRuns > 0 || bowlingWickets > 0,
            innings: bowlingOvers > 0 ? 1 : 0,
            economy: bowlingOvers > 0 ? bowlingRuns / (Math.floor(bowlingOvers) + (bowlingOvers % 1) / 0.6) : 0,
          }
        } as Performance;
      });

      const result = await updateMatchAction(match.id!, updatedMatch as Match, finalPerformances);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update match');
      }

      setSuccess('Match updated successfully!');
      setTimeout(() => {
        router.push('/admin/manage-data');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg">{success}</div>}

      {/* Match Details */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
          Match Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Opponent</label>
            <input
              type="text"
              value={match.opponent || ''}
              onChange={(e) => handleMatchChange('opponent', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <CustomSelect
              id="venue-select"
              label="Venue"
              value={match.venue || ''}
              onChange={(val) => handleMatchChange('venue', val)}
              options={[{ value: 'Home', label: 'Home' }, { value: 'Away', label: 'Away' }, { value: 'Neutral', label: 'Neutral' }]}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Match Result</label>
            <div className="flex flex-wrap gap-2">
              {[
                { val: 'won', label: 'Win' },
                { val: 'lost', label: 'Loss' },
                { val: 'tie', label: 'Tie' },
                { val: 'no_result', label: 'N/R' },
              ].map((res) => (
                <button
                  key={res.val}
                  type="button"
                  onClick={() => handleMatchChange('result', res.val)}
                  className={`flex-1 py-2.5 px-2 rounded-xl font-bold text-sm transition-all border ${
                    match.result === res.val
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Win Margin</label>
              <input
                type="number"
                min="0"
                value={winMarginValue}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)).toString();
                  setWinMarginValue(val);
                }}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <CustomSelect
                id="margin-unit-select"
                label="Unit"
                value={winMarginUnit}
                onChange={(val) => setWinMarginUnit(val as 'runs' | 'wickets')}
                options={[{ value: 'runs', label: 'Runs' }, { value: 'wickets', label: 'Wickets' }]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Team Runs</label>
              <input
                type="number"
                min="0"
                value={match.teamRuns ?? ''}
                onChange={(e) => handleMatchChange('teamRuns', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Team Wkts</label>
              <input
                type="number"
                min="0"
                value={match.teamWickets ?? ''}
                onChange={(e) => handleMatchChange('teamWickets', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Team Overs</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={match.teamOversPlayed ?? ''}
                onChange={(e) => handleMatchChange('teamOversPlayed', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Opponent Overs</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={match.opponentOversPlayed ?? ''}
                onChange={(e) => handleMatchChange('opponentOversPlayed', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
          Player Statistics
        </h3>

        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Batting</h4>
                <p className="text-xs text-gray-400">Player list and batting stats</p>
              </div>
            </div>
            <div className="space-y-4">
              {performances.map((perf, idx) => {
                const battingPlayed = perf.batting?.didBat || Number(perf.batting?.runs || 0) > 0 || Number(perf.batting?.balls || 0) > 0;
                if (!battingPlayed) return null;

                return (
                  <div key={`${perf.id}-batting`} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-white">{perf.playerName}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Runs</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.batting?.runs ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'batting', 'runs', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Balls</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.batting?.balls ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'batting', 'balls', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">4s</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.batting?.fours ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'batting', 'fours', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">6s</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.batting?.sixes ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'batting', 'sixes', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Bowling</h4>
                <p className="text-xs text-gray-400">Player list and bowling stats</p>
              </div>
            </div>
            <div className="space-y-4">
              {performances.map((perf, idx) => {
                const bowlingPlayed = Number(perf.bowling?.overs || 0) > 0 || Number(perf.bowling?.balls || 0) > 0;
                if (!bowlingPlayed) return null;

                return (
                  <div key={`${perf.id}-bowling`} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-white">{perf.playerName}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Overs</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={perf.bowling?.overs ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'bowling', 'overs', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Maidens</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.bowling?.maidens ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'bowling', 'maidens', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Wkts</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.bowling?.wickets ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'bowling', 'wickets', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Bowl R</label>
                        <input
                          type="number"
                          min="0"
                          value={perf.bowling?.runs ?? ''}
                          onChange={(e) => handlePerformanceChange(idx, 'bowling', 'runs', e.target.value)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              setAddPlayerType('batting');
              setShowAddPlayerModal(true);
            }}
            className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <span>+ Add Batting Player</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAddPlayerType('bowling');
              setShowAddPlayerModal(true);
            }}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <span>+ Add Bowling Player</span>
          </button>
        </div>
      </div>

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-2xl max-w-md w-full h-[60vh] max-h-[60vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-6">Add {addPlayerType === 'batting' ? 'Batting' : 'Bowling'} Player</h3>

            <div className="space-y-5">
              {/* Player Selection Dropdown */}
              <div>
                <BatterDropdownSelect
                  label="Select Player"
                  placeholder="Choose from team or create new"
                  selectedBatter={selectedPlayer}
                  batters={availablePlayers}
                  onSelect={setSelectedPlayer}
                  allowNew={true}
                  newPlayerName={newPlayerName}
                  onNewPlayerNameChange={setNewPlayerName}
                  onCreateNew={(name) => {
                    // Create new player and select it
                    const newPlayer: TeamPlayer = {
                      id: generatePlayerId(),
                      name: name.trim(),
                    };
                    setSelectedPlayer(newPlayer);
                    setNewPlayerName('');
                  }}
                />
              </div>

              {selectedPlayer && (
                <>
                  {addPlayerType === 'batting' && (
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Batting Stats</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Runs</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.battingRuns}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, battingRuns: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Balls</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.battingBalls}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, battingBalls: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">4s</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.battingFours}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, battingFours: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">6s</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.battingSixes}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, battingSixes: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {addPlayerType === 'bowling' && (
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bowling Stats</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Overs</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={newPlayerData.bowlingOvers}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, bowlingOvers: e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Maidens</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.bowlingMaidens}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, bowlingMaidens: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Wkts</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.bowlingWickets}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, bowlingWickets: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Runs</label>
                          <input
                            type="number"
                            min="0"
                            value={newPlayerData.bowlingRuns}
                            onChange={(e) => setNewPlayerData({ ...newPlayerData, bowlingRuns: e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddPlayerModal(false);
                  setAddPlayerType(null);
                  setSelectedPlayer(null);
                  setNewPlayerName('');
                  setError('');
                }}
                className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddPlayer}
                disabled={!selectedPlayer}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all"
              >
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
