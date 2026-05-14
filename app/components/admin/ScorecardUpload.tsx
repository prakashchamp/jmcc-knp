'use client';

import { useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { createNewPlayer } from '@/app/lib/player-utils';
import Tesseract from 'tesseract.js';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';
import { CustomSelect } from '@/app/components/CustomSelect';
import type { RootState } from '@/app/lib/redux/store';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

interface ScorecardUploadProps {
  onDataParsed: (data: ParsedData) => void;
}

interface BattingRow {
  playerId?: string;
  playerName: string;
  runs: number | '';
  balls: number | '';
  fours: number | '';
  sixes: number | '';
  dismissed: boolean;
}

interface BowlingRow {
  playerId?: string;
  playerName: string;
  overs: string;
  runs: number | '';
  maidens: number | '';
  wickets: number | '';
}

export function ScorecardUpload({ onDataParsed }: ScorecardUploadProps) {
  const rosterPlayers = useSelector((state: RootState) => state.team.team?.players) || [];
  const { players: firestorePlayers } = useAllPlayers();

  const normalizePlayerName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  const allPlayers = useMemo(() => {
    const normalizedMap = new Map<string, { playerId: string; playerName: string }>();

    const addPlayer = (playerId: string, playerName: string) => {
      const normalized = normalizePlayerName(playerName);
      if (!normalizedMap.has(normalized)) {
        normalizedMap.set(normalized, { playerId, playerName });
      }
    };

    rosterPlayers.forEach((player) => addPlayer(player.id, player.name));
    firestorePlayers.forEach((player) => addPlayer(player.playerId, player.playerName));

    return Array.from(normalizedMap.values());
  }, [rosterPlayers, firestorePlayers]);

  const buildPlayerOptionValue = (playerId: string) => `player:${playerId}`;

  const playerOptions = allPlayers.map((player) => ({
    value: buildPlayerOptionValue(player.playerId),
    label: player.playerName,
  }));

  const [battingImage, setBattingImage] = useState<File | null>(null);
  const [bowlingImage, setBowlingImage] = useState<File | null>(null);
  const [battingPreview, setBattingPreview] = useState<string>('');
  const [bowlingPreview, setBowlingPreview] = useState<string>('');
  const [isParsingBatting, setIsParsingBatting] = useState(false);
  const [isParsingBowling, setIsParsingBowling] = useState(false);
  const [error, setError] = useState('');

  const [battingRows, setBattingRows] = useState<BattingRow[]>([{ playerId: undefined, playerName: '', runs: '', balls: '', fours: '', sixes: '', dismissed: false }]);
  const [bowlingRows, setBowlingRows] = useState<BowlingRow[]>([{ playerId: undefined, playerName: '', overs: '', runs: '', maidens: '', wickets: '' }]);

  const findRosterPlayer = (name: string) => {
    const normalized = normalizePlayerName(name);
    return allPlayers.find((player) => normalizePlayerName(player.playerName) === normalized)
      || allPlayers.find((player) => normalizePlayerName(player.playerName).endsWith(normalized))
      || allPlayers.find((player) => normalizePlayerName(player.playerName).startsWith(normalized));
  };

  const buildCustomOptionValue = (playerName: string) => `custom:${playerName}`;

  const playerOptionsForRow = (row: BattingRow | BowlingRow) => {
    const options = [...playerOptions];
    if (row.playerName.trim()) {
      const match = findRosterPlayer(row.playerName);
      if (!match) {
        options.unshift({ value: buildCustomOptionValue(row.playerName), label: row.playerName });
      }
    }
    return options;
  };

  const getSelectedPlayerValue = (row: BattingRow | BowlingRow) => {
    if (row.playerId) {
      return buildPlayerOptionValue(row.playerId);
    }
    if (row.playerName.trim()) {
      const match = findRosterPlayer(row.playerName);
      if (match) {
        return buildPlayerOptionValue(match.playerId);
      }
      return buildCustomOptionValue(row.playerName);
    }
    return '';
  };

  const handlePlayerSelection = (index: number, isBatting: boolean, rawValue: string) => {
    const newRows = isBatting ? [...battingRows] : [...bowlingRows];
    const row = { ...newRows[index] } as BattingRow | BowlingRow;

    if (rawValue.startsWith('player:')) {
      const selectedId = rawValue.replace('player:', '');
      const selectedPlayer = allPlayers.find((p) => p.playerId === selectedId);
      if (selectedPlayer) {
        row.playerId = selectedPlayer.playerId;
        row.playerName = selectedPlayer.playerName;
      }
    } else if (rawValue.startsWith('custom:')) {
      const customName = rawValue.replace('custom:', '');
      row.playerId = undefined;
      row.playerName = customName;
    } else {
      row.playerId = undefined;
      row.playerName = rawValue;
    }

    newRows[index] = row;
    if (isBatting) {
      setBattingRows(newRows as BattingRow[]);
    } else {
      setBowlingRows(newRows as BowlingRow[]);
    }
  };

  const battingInputRef = useRef<HTMLInputElement>(null);
  const bowlingInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'batting' | 'bowling'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (type === 'batting') {
        setBattingImage(file);
        setBattingPreview(url);
      } else {
        setBowlingImage(file);
        setBowlingPreview(url);
      }
    };
    reader.readAsDataURL(file);
    setError('');
  };

  const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            setError('Enhancing image quality...');
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) throw new Error('Failed to get canvas context');

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              const contrast = 1.8;
              const adjusted = Math.round(128 + (gray - 128) * contrast);
              const clamped = Math.max(0, Math.min(255, adjusted));

              data[i] = clamped;
              data[i + 1] = clamped;
              data[i + 2] = clamped;
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve(e.target?.result as string);
                  reader.onerror = () => reject(new Error('Failed to convert canvas to data URL'));
                  reader.readAsDataURL(blob);
                } else {
                  reject(new Error('Failed to create blob from canvas'));
                }
              },
              'image/png'
            );
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const extractTextFromImage = async (file: File, type: 'batting' | 'bowling'): Promise<string> => {
    try {
      setError(`Processing ${file.name}... Please wait.`);
      
      let imageSource: File | string = file;
      try {
        const preprocessedDataUrl = await preprocessImage(file);
        imageSource = preprocessedDataUrl;
      } catch (err) {
        console.warn('Image preprocessing failed, using original:', err);
      }
      
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setError(`Processing ${type} image... ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      
      return result.data.text || '';
    } catch (err) {
      console.error('OCR Error:', err);
      throw new Error(`Failed to parse ${type} image. Please try with a clearer image.`);
    }
  };

  const parseBattingScorecard = (text: string): BattingRow[] => {
    const rows: BattingRow[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      if (line.match(/^(Batsman|Player|R\s+B|EXTRAS|Jmcc|Overs|Second|Innings|BATTING|Name|---|===|Second Innings)/i)) continue;
      if (line.length < 3) continue;

      let parts = line.split(/\s+/);
      let firstNumericIdx = -1;
      
      for (let i = 0; i < parts.length; i++) {
        if (/^[\d.]+$/.test(parts[i])) {
          firstNumericIdx = i;
          break;
        }
      }

      if (firstNumericIdx > 0 && firstNumericIdx + 6 <= parts.length) {
        const playerName = parts[0];
        const dismissalPart = parts.slice(1, firstNumericIdx).join(' ').toLowerCase();
        
        const runs = parseFloat(parts[firstNumericIdx]) || 0;
        const balls = parseFloat(parts[firstNumericIdx + 1]) || 0;
        const fours = parseFloat(parts[firstNumericIdx + 3]) || 0;
        const sixes = parseFloat(parts[firstNumericIdx + 4]) || 0;
        
        const isNotOut = dismissalPart.includes('not out') || dismissalPart === '' || dismissalPart === 'no';

        const hasValidName = playerName && playerName.length > 0 && !/^\d+$/.test(playerName);
        const hasValidStats = !isNaN(runs) && !isNaN(balls) && balls >= 1 && runs >= 0;
        
        if (hasValidName && hasValidStats) {
          const rosterMatch = findRosterPlayer(playerName);
          rows.push({
            playerId: rosterMatch?.playerId,
            playerName: rosterMatch?.playerName || playerName,
            runs,
            balls,
            fours: !isNaN(fours) ? fours : 0,
            sixes: !isNaN(sixes) ? sixes : 0,
            dismissed: !isNotOut,
          });
        }
      }
    }
    return rows;
  };

  const parseBowlingScorecard = (text: string): BowlingRow[] => {
    const rows: BowlingRow[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    for (const line of lines) {
      if (line.match(/^(Bowler|Player|O\s+R|EXTRAS|Overs|Maiden|Economy|BOWLING|Name|W|---|M|ECO|WD|NB)/i)) continue;
      if (line.length < 2) continue;

      let playerName = '';
      let overs = 0, runs = 0, wickets = 0;
      let foundData = false;

      let match = line.match(/^([A-Za-z\s]+?)\s*-\s*(\d+\.?\d*)\s*ovr[s]?\s*\/\s*(\d+)\s*run[s]?\s*\/\s*(\d+)\s*w[ick]*/i);
      
      if (match) {
        playerName = match[1].trim();
        overs = parseFloat(match[2]);
        runs = parseInt(match[3], 10);
        wickets = parseInt(match[4], 10);
        foundData = true;
      }

      if (!foundData) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const isFormat2 = /^[\d.]+$/.test(parts[1]) && /^[\d.]+$/.test(parts[2]) && /^[\d.]+$/.test(parts[3]);
          if (isFormat2) {
            playerName = parts[0];
            overs = parseFloat(parts[1]);
            runs = parseInt(parts[2], 10);
            wickets = parseInt(parts[3], 10);
            foundData = true;
          }
        }
      }

      if (foundData && playerName && !playerName.match(/^(Bowler|Player|O|R|W|M|ECO)$/i) && overs > 0) {
        const rosterMatch = findRosterPlayer(playerName);
        rows.push({
          playerId: rosterMatch?.playerId,
          playerName: rosterMatch?.playerName || playerName,
          overs: overs.toString(),
          runs,
          wickets,
          maidens: 0,
        });
      }
    }
    return rows;
  };

  const handleParseBatting = async () => {
    if (!battingImage) return;
    try {
      setIsParsingBatting(true);
      setError('');
      const text = await extractTextFromImage(battingImage, 'batting');
      const parsedRows = parseBattingScorecard(text);
      if (parsedRows.length === 0) {
        setError('No batters found in the image.');
      } else {
        setBattingRows(prev => [...parsedRows, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse batting scorecard');
    } finally {
      setIsParsingBatting(false);
      setError('');
    }
  };

  const handleParseBowling = async () => {
    if (!bowlingImage) return;
    try {
      setIsParsingBowling(true);
      setError('');
      const text = await extractTextFromImage(bowlingImage, 'bowling');
      const parsedRows = parseBowlingScorecard(text);
      if (parsedRows.length === 0) {
        setError('No bowlers found in the image.');
      } else {
        setBowlingRows(prev => [...parsedRows, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse bowling scorecard');
    } finally {
      setIsParsingBowling(false);
      setError('');
    }
  };

  // Row management logic
  const addBattingRow = () => {
    setBattingRows([{ playerName: '', runs: '', balls: '', fours: '', sixes: '', dismissed: false }, ...battingRows]);
  };

  const removeBattingRow = (index: number) => {
    setBattingRows(battingRows.filter((_, i) => i !== index));
  };

  const updateBattingRow = (index: number, field: keyof BattingRow, value: any) => {
    const newRows = [...battingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBattingRows(newRows);
  };

  const addBowlingRow = () => {
    setBowlingRows([{ playerName: '', overs: '', runs: '', maidens: '', wickets: '' }, ...bowlingRows]);
  };

  const removeBowlingRow = (index: number) => {
    setBowlingRows(bowlingRows.filter((_, i) => i !== index));
  };

  const updateBowlingRow = (index: number, field: keyof BowlingRow, value: any) => {
    const newRows = [...bowlingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBowlingRows(newRows);
  };

  const handleCombineAndSubmit = () => {
    const performances: Partial<Performance>[] = [];

    const perfMap = new Map<string, Partial<Performance>>();

    const getOrCreatePerf = (name: string, selectedPlayerId?: string) => {
      const normalizedName = normalizePlayerName(name);
      if (!perfMap.has(normalizedName)) {
        const existingPlayer = allPlayers.find(
          (p) => normalizePlayerName(p.playerName) === normalizedName
        );
        let playerId = selectedPlayerId;
        let playerName = name.trim();

        if (existingPlayer) {
          playerId = existingPlayer.playerId;
          playerName = existingPlayer.playerName;
        } else if (selectedPlayerId) {
          const rosterEntry = allPlayers.find((p) => p.playerId === selectedPlayerId);
          if (rosterEntry) {
            playerName = rosterEntry.playerName;
          }
        }

        if (!playerId) {
          const existingNames = new Set(allPlayers.map((p) => normalizePlayerName(p.playerName)));
          const newPlayer = createNewPlayer(playerName, existingNames);
          playerId = newPlayer.id;
          playerName = newPlayer.name;
        }

        perfMap.set(normalizedName, {
          playerName,
          playerId,
          batting: {
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
          bowling: {
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
            zeros: 0,
          }
        });
      }
      return perfMap.get(normalizedName)!;
    };

    battingRows.forEach(row => {
      if (!row.playerName.trim()) return;
      const perf = getOrCreatePerf(row.playerName, row.playerId);
      
      const runs = typeof row.runs === 'number' ? row.runs : 0;
      const balls = typeof row.balls === 'number' ? row.balls : 0;
      const fours = typeof row.fours === 'number' ? row.fours : 0;
      const sixes = typeof row.sixes === 'number' ? row.sixes : 0;
      const sr = balls > 0 ? (runs / balls) * 100 : 0;
      
      perf.batting = {
        didBat: true,
        innings: 1,
        runs: runs,
        balls: balls,
        zeros: 0,
        fours: fours,
        sixes: sixes,
        dismissed: row.dismissed,
        isDuck: runs === 0 && balls > 0,
        isThirty: runs >= 30 && runs < 50,
        isFifty: runs >= 50 && runs < 100,
        isHundred: runs >= 100,
        strikeRate: Number(sr.toFixed(2)),
      };
    });

    bowlingRows.forEach(row => {
      if (!row.playerName.trim()) return;
      const perf = getOrCreatePerf(row.playerName, row.playerId);
      
      const overs = parseFloat(row.overs) || 0;
      const runs = typeof row.runs === 'number' ? row.runs : 0;
      const wickets = typeof row.wickets === 'number' ? row.wickets : 0;
      const maidens = typeof row.maidens === 'number' ? row.maidens : 0;
      
      const completeOvers = Math.floor(overs);
      const partialBalls = Math.round((overs - completeOvers) * 10);
      const totalBalls = (completeOvers * 6) + partialBalls;
      const validOvers = totalBalls / 6;
      const economy = validOvers > 0 ? runs / validOvers : 0;

      perf.bowling = {
        didBowl: true,
        innings: 1,
        overs: overs,
        balls: totalBalls,
        runs: runs,
        wickets: wickets,
        maidens: maidens,
        isThreeFer: wickets >= 3 && wickets < 4,
        isFourFer: wickets >= 4 && wickets < 5,
        isFiveFer: wickets >= 5,
        economy: Number(economy.toFixed(2)),
        zeros: 0,
      };
    });


    const teamPerformances = Array.from(perfMap.values()).filter(perf => {
      return allPlayers.some(p => p.playerName.toLowerCase().trim() === perf.playerName?.toLowerCase().trim());
    });

    performances.push(...teamPerformances);

    // Calculate top 2 batters and bowlers
    const topBatters = [...performances]
      .sort((a, b) => {
        if ((b.batting?.runs || 0) !== (a.batting?.runs || 0)) {
          return (b.batting?.runs || 0) - (a.batting?.runs || 0);
        }
        return (a.batting?.balls || 0) - (b.batting?.balls || 0);
      })
      .slice(0, 2)
      .map(perf => ({
        playerId: perf.playerId || '',
        playerName: perf.playerName || '',
        runs: perf.batting?.runs || 0,
        balls: perf.batting?.balls || 0,
      }));

    const topBowlers = [...performances]
      .sort((a, b) => {
        if ((b.bowling?.wickets || 0) !== (a.bowling?.wickets || 0)) {
          return (b.bowling?.wickets || 0) - (a.bowling?.wickets || 0);
        }
        return (a.bowling?.runs || 0) - (b.bowling?.runs || 0);
      })
      .slice(0, 2)
      .map(perf => ({
        playerId: perf.playerId || '',
        playerName: perf.playerName || '',
        wickets: perf.bowling?.wickets || 0,
        runs: perf.bowling?.runs || 0,
      }));

    const matchData: Partial<Match> = {
      date: new Date().toISOString(),
      opponent: '',
      venue: 'Home',
      tossWonBy: 'Us',
      tossDecision: 'bat',
      result: 'won',
      topBatters,
      topBowlers,
      bestBatterId: topBatters[0]?.playerId || '',
      bestBatterName: topBatters[0]?.playerName || '',
      bestBatterRuns: topBatters[0]?.runs || 0,
      bestBatterBalls: topBatters[0]?.balls || 0,
      bestBowlerId: topBowlers[0]?.playerId || '',
      bestBowlerName: topBowlers[0]?.playerName || '',
      bestBowlerWickets: topBowlers[0]?.wickets || 0,
      bestBowlerRuns: topBowlers[0]?.runs || 0,
    };

    onDataParsed({
      match: matchData,
      performances
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasData = battingRows.length > 0 || bowlingRows.length > 0;
  const hasBoth = battingRows.length > 0 && bowlingRows.length > 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Parse Images Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Batting Image */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6 flex flex-col">
          <h3 className="card-title mb-2">📸 Parse Batting Image</h3>
          
          <input ref={battingInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'batting')} className="hidden" />
          <button
            onClick={() => battingInputRef.current?.click()}
            className="w-full py-3 px-4 border-2 border-dashed border-green-500 rounded-lg hover:bg-green-900/20 transition-colors text-green-300 hover:text-green-200 font-medium text-sm"
          >
            {battingImage ? '✓ Change Batting Image' : '+ Upload Batting Image'}
          </button>

          {battingPreview && (
            <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-gray-900 mt-3 border border-gray-600">
              <Image src={battingPreview} alt="Batting" fill className="object-cover" />
            </div>
          )}

          {battingImage && (
            <button onClick={handleParseBatting} disabled={isParsingBatting} className="mt-3 sm:mt-4 w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold text-sm sm:text-base transition-colors">
              {isParsingBatting ? 'Parsing...' : 'Parse & Add Batters'}
            </button>
          )}
        </div>

        {/* Bowling Image */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6 flex flex-col">
          <h3 className="card-title text-white mb-2">📸 Parse Bowling Image</h3>
          
          <input ref={bowlingInputRef} type="file" accept="image/*" onChange={(e) => handleImageSelect(e, 'bowling')} className="hidden" />
          <button
            onClick={() => bowlingInputRef.current?.click()}
            className="w-full py-3 px-4 border-2 border-dashed border-green-500 rounded-lg hover:bg-green-900/20 transition-colors text-green-300 hover:text-green-200 font-medium text-sm"
          >
            {bowlingImage ? '✓ Change Bowling Image' : '+ Upload Bowling Image'}
          </button>

          {bowlingPreview && (
            <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-gray-900 mt-3 border border-gray-600">
              <Image src={bowlingPreview} alt="Bowling" fill className="object-cover" />
            </div>
          )}

          {bowlingImage && (
            <button onClick={handleParseBowling} disabled={isParsingBowling} className="mt-3 sm:mt-4 w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold text-sm sm:text-base transition-colors">
              {isParsingBowling ? 'Parsing...' : 'Parse & Add Bowlers'}
            </button>
          )}
        </div>
      </div>

      {/* Batting Performances */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h4 className="card-title text-green-400">Batting Performances</h4>
          <button 
            onClick={addBattingRow} 
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs sm:text-sm font-medium transition-colors"
          >
            + Add Batter
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-hide">
          {battingRows.length === 0 && (
            <p className="text-gray-500 text-sm italic text-center py-4">No batters added yet.</p>
          )}
          {battingRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-end bg-background p-3 rounded-lg border border-border">
              <div className="col-span-2 sm:w-44 sm:flex-shrink-0">
                <label className="label-text mb-1 block">Player</label>
                <CustomSelect
                  id={`batting-player-${idx}`}
                  label=""
                  value={getSelectedPlayerValue(row)}
                  placeholder="Select or enter player"
                  options={playerOptionsForRow(row)}
                  onChange={(value) => handlePlayerSelection(idx, true, value)}
                  className="w-full"
                  allowCustom
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Runs</label>
                <input 
                  type="number" 
                  value={row.runs} 
                  placeholder="0"
                  onChange={(e) => updateBattingRow(idx, 'runs', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Balls</label>
                <input 
                  type="number" 
                  value={row.balls} 
                  placeholder="0"
                  onChange={(e) => updateBattingRow(idx, 'balls', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">4s</label>
                <input 
                  type="number" 
                  value={row.fours} 
                  placeholder="0"
                  onChange={(e) => updateBattingRow(idx, 'fours', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">6s</label>
                <input 
                  type="number" 
                  value={row.sixes} 
                  placeholder="0"
                  onChange={(e) => updateBattingRow(idx, 'sixes', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div className="flex items-center space-x-2 h-8 px-2 bg-gray-700/50 rounded border border-gray-600">
                <input 
                  type="checkbox" 
                  id={`out-${idx}`} 
                  checked={row.dismissed} 
                  onChange={(e) => updateBattingRow(idx, 'dismissed', e.target.checked)} 
                  className="rounded border-gray-400 text-green-600 focus:ring-green-500" 
                />
                <label htmlFor={`out-${idx}`} className="text-[10px] text-gray-300 font-medium">OUT</label>
              </div>
              <button 
                onClick={() => removeBattingRow(idx)} 
                className="h-8 px-2 flex items-center justify-center bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded border border-red-500/20 transition-colors text-sm" 
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bowling Performances */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h4 className="card-title text-green-400">Bowling Performances</h4>
          <button 
            onClick={addBowlingRow} 
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs sm:text-sm font-medium transition-colors"
          >
            + Add Bowler
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-hide">
          {bowlingRows.length === 0 && (
            <p className="text-gray-500 text-sm italic text-center py-4">No bowlers added yet.</p>
          )}
          {bowlingRows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-end bg-background p-3 rounded-lg border border-border">
              <div className="col-span-2 sm:w-44 sm:flex-shrink-0">
                <label className="label-text mb-1 block">Player</label>
                <CustomSelect
                  id={`bowling-player-${idx}`}
                  label=""
                  value={getSelectedPlayerValue(row)}
                  placeholder="Select or enter player"
                  options={playerOptionsForRow(row)}
                  onChange={(value) => handlePlayerSelection(idx, false, value)}
                  className="w-full"
                  allowCustom
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Overs</label>
                <input 
                  type="text" 
                  value={row.overs || ''} 
                  placeholder="0"
                  onChange={(e) => updateBowlingRow(idx, 'overs', e.target.value)} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Runs</label>
                <input 
                  type="number" 
                  value={row.runs === '' ? '' : row.runs} 
                  placeholder="0"
                  onChange={(e) => updateBowlingRow(idx, 'runs', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Mdns</label>
                <input 
                  type="number" 
                  value={row.maidens === '' ? '' : row.maidens} 
                  placeholder="0"
                  onChange={(e) => updateBowlingRow(idx, 'maidens', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <div>
                <label className="label-text mb-1 block">Wkts</label>
                <input 
                  type="number" 
                  value={row.wickets === '' ? '' : row.wickets} 
                  placeholder="0"
                  onChange={(e) => updateBowlingRow(idx, 'wickets', e.target.value === '' ? '' : parseInt(e.target.value))} 
                  className="input-base py-1.5 text-xs text-center" 
                />
              </div>
              <button 
                onClick={() => removeBowlingRow(idx)} 
                className="h-8 px-2 flex items-center justify-center bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white rounded border border-red-500/20 transition-colors text-sm" 
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Section */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="hint-text">
          {!hasBoth 
            ? 'Add both batting and bowling data to proceed.' 
            : 'Data ready. Proceed to final review.'}
        </p>
        <button
          onClick={handleCombineAndSubmit}
          disabled={!hasBoth}
          className="btn-primary w-full sm:w-auto"
        >
          Combine & Review Match Data
        </button>
      </div>

    </div>
  );
}
