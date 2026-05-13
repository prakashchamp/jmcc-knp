'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { addNewPlayerToTeamAndMatch } from '@/app/lib/redux/thunks/matchThunks';
import { TeamPlayer, LiveMatch } from '@/app/lib/cricket-scorer-types';
import { generatePlayerId } from '@/app/lib/player-utils';
import { validateAndClearCorruptedState } from '@/app/lib/redux/store';
import { useTeamName } from '@/app/lib/hooks/useTeamName';
import { inputClass, primaryButtonClass, secondaryButtonClass } from './dialogs/dialogTheme';
import { useTheme } from '../ThemeProvider';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';

interface ScorerLandingPageProps {
  onStartNewMatch: (matchDetails: {
    opponent: string;
    venue: string;
    tossWonBy: 'Us' | 'Them';
    tossDecision: 'bat' | 'field';
    totalOvers: number;
    striker?: TeamPlayer;
    nonStriker?: TeamPlayer;
    bowler?: TeamPlayer;
    startFromSecondInnings?: boolean;
    firstInningsScore?: number;
  }) => void;
  onResumeMatch: () => void;
  hasMatchToResume: boolean;
  lastCompletedMatch?: LiveMatch | null;
  onViewCompletedMatch?: (match: LiveMatch) => void;
  teamPlayers?: TeamPlayer[];
}

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownInputFieldProps {
  label: string;
  value: string;
  selectedValue?: string;
  placeholder: string;
  options: DropdownOption[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (value: string) => void;
  onChange?: (value: string) => void;
  allowCreate?: boolean;
  createText?: string;
  emptyText?: string;
  readOnly?: boolean;
  disabled?: boolean;
}

function DropdownInputField({
  label,
  value,
  selectedValue,
  placeholder,
  options,
  isOpen,
  onOpenChange,
  onSelect,
  onChange,
  allowCreate = false,
  createText = 'Create',
  emptyText = 'No options found',
  readOnly = false,
  disabled = false,
}: DropdownInputFieldProps) {
  const normalizedValue = value.trim().toLowerCase();
  const exactMatch = options.some((option) => {
    return (
      option.label.trim().toLowerCase() === normalizedValue ||
      option.value.trim().toLowerCase() === normalizedValue
    );
  });

  const filteredOptions = readOnly || !normalizedValue || exactMatch
    ? options
    : options.filter((option) => {
        const optionText = `${option.label} ${option.value}`.toLowerCase();
        return optionText.includes(normalizedValue);
      });

  const showCreate = allowCreate && normalizedValue.length > 0 && !exactMatch;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold opacity-90">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          readOnly={readOnly || disabled}
          disabled={disabled}
          onMouseDown={(e) => {
            if (disabled || !readOnly) return;
            e.preventDefault();
            onOpenChange(!isOpen);
          }}
          onClick={() => {
            if (disabled || readOnly) return;
            onOpenChange(true);
          }}
          onFocus={() => {
            if (disabled || readOnly) return;
            if (!isOpen) onOpenChange(true);
          }}
          onChange={(e) => {
            if (disabled) return;
            onChange?.(e.target.value);
            onOpenChange(true);
          }}
          className={`${inputClass} pr-11 ${readOnly ? 'cursor-pointer' : ''} ${disabled ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-500' : ''}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onOpenChange(!isOpen)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center opacity-60 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={`Toggle ${label} options`}
        >
          <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && !disabled && (
          <div className="mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/60">
            <div className="max-h-60 space-y-2 overflow-y-auto p-2">
              {allowCreate && !readOnly && (
                <div className="rounded-lg border border-border bg-background/80 p-2">
                  <p className="mb-2 text-xs font-medium opacity-60">Custom {label}</p>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      onChange?.(e.target.value);
                      onOpenChange(true);
                    }}
                    placeholder={placeholder}
                    className={`${inputClass} h-10 pr-3 text-sm`}
                  />
                </div>
              )}

              {filteredOptions.map((option) => {
                const isSelected = (selectedValue ?? value) === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onSelect(option.value);
                      onOpenChange(false);
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-500/10 text-green-500 shadow-sm'
                        : 'border-border bg-background text-foreground hover:border-green-500/50 hover:bg-green-500/5'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}

              {showCreate && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(value.trim());
                    onOpenChange(false);
                  }}
                  className={`w-full px-3 py-2.5 text-sm ${primaryButtonClass}`}
                >
                  {createText}: {value.trim()}
                </button>
              )}

              {filteredOptions.length === 0 && !showCreate && (
                <div className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm opacity-60">
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScorerLandingPage({ 
  onStartNewMatch, 
  onResumeMatch, 
  hasMatchToResume, 
  lastCompletedMatch = null,
  onViewCompletedMatch,
  teamPlayers = [] 
}: ScorerLandingPageProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const teamName = useTeamName();
  const { theme, toggleTheme } = useTheme();
  
  // Stored matches from IndexedDB
  const [storedMatches, setStoredMatches] = useState<import('@/app/lib/indexed-db').StoredMatch[]>([]);
  
  // Navigation states: 'landing' | 'match' | 'players'
  const [step, setStep] = useState<'landing' | 'match' | 'players'>('landing');
  
  // Validate and clear corrupted state on component mount
  useEffect(() => {
    const result = validateAndClearCorruptedState();
    if (result === 'cleared') {
      console.log('🔄 Corrupted state was cleared. Starting fresh.');
    }
    
    // Load matches from IndexedDB
    const loadStoredMatches = async () => {
      try {
        const { getAllMatchesFromIndexedDB } = await import('@/app/lib/indexed-db');
        let matches = await getAllMatchesFromIndexedDB();
        
        // Optimistic UI: If we have a lastCompletedMatch in Redux that's not in IndexedDB yet (due to async lag), add it
        if (lastCompletedMatch && lastCompletedMatch.status === 'complete') {
          const isAlreadyInList = matches.some(m => m.id === lastCompletedMatch.id);
          if (!isAlreadyInList) {
            matches.push({
              id: lastCompletedMatch.id,
              match: lastCompletedMatch,
              completedAt: lastCompletedMatch.completedAt || new Date().toISOString(),
            });
          }
        }
        
        setStoredMatches(matches);
      } catch (err) {
        console.warn('Failed to load stored matches:', err);
      }
    };
    
    loadStoredMatches();
  }, [lastCompletedMatch]);
  
  const [formData, setFormData] = useState({
    opponent: '',
    venue: '',
    tossWonBy: '' as '' | 'Us' | 'Them',
    tossDecision: '' as '' | 'bat' | 'field',
    totalOvers: '20',
  });

  // Start from 2nd innings
  const [startFromSecondInnings, setStartFromSecondInnings] = useState(false);
  const [firstInningsScore, setFirstInningsScore] = useState('');

  // Player selections
  const [striker, setStriker] = useState<TeamPlayer | null>(null);
  const [nonStriker, setNonStriker] = useState<TeamPlayer | null>(null);
  const [bowler, setBowler] = useState<TeamPlayer | null>(null);

  // New player creation
  const [newStrikerName, setNewStrikerName] = useState('');
  const [newNonStrikerName, setNewNonStrikerName] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');

  // Dropdown open state
  const [strikerOpen, setStrikerOpen] = useState(false);
  const [nonStrikerOpen, setNonStrikerOpen] = useState(false);
  const [bowlerOpen, setBowlerOpen] = useState(false);
  const [openMatchDropdown, setOpenMatchDropdown] = useState<'venue' | 'toss' | 'decision' | null>(null);

  const strikerOptions = teamPlayers.filter((player) => player.id !== nonStriker?.id);
  const nonStrikerOptions = teamPlayers.filter((player) => player.id !== striker?.id);
  const venueOptions: DropdownOption[] = ['Home', 'Away', 'Neutral'].map((option) => ({ value: option, label: option }));
  const teamAName = teamName;
  const teamBName = formData.opponent.trim() || 'Team B';
  const isOpponentEntered = formData.opponent.trim().length > 0;
  const tossOptions: DropdownOption[] = [
    { value: 'Us', label: teamAName },
    { value: 'Them', label: teamBName },
  ];
  const decisionOptions: DropdownOption[] = [
    { value: 'bat', label: 'Bat' },
    { value: 'field', label: 'Bowl' },
  ];

  const handleStartNewMatch = () => {
    // Reset player selections when starting a new match
    setStriker(null);
    setNonStriker(null);
    setBowler(null);
    setNewStrikerName('');
    setNewNonStrikerName('');
    setNewBowlerName('');
    setStep('match');
  };

  // Create new player handlers
  const handleCreateNewStriker = async () => {
    if (newStrikerName.trim()) {
      const result = await dispatch(addNewPlayerToTeamAndMatch({ name: newStrikerName.trim() })).unwrap();
      setStriker(result);
      setNewStrikerName('');
      setStrikerOpen(false);
    }
  };

  const handleCreateNewNonStriker = async () => {
    if (newNonStrikerName.trim()) {
      const result = await dispatch(addNewPlayerToTeamAndMatch({ name: newNonStrikerName.trim() })).unwrap();
      setNonStriker(result);
      setNewNonStrikerName('');
      setNonStrikerOpen(false);
    }
  };

  const handleCreateNewBowler = () => {
    if (newBowlerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: generatePlayerId(),
        name: newBowlerName.trim(),
      };
      setBowler(newPlayer);
      setNewBowlerName('');
      setBowlerOpen(false);
    }
  };

  const handleMatchSetup = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.opponent.trim()) {
      alert('Please enter opponent team name');
      return;
    }

    if (!formData.venue.trim()) {
      alert('Please select venue');
      return;
    }

    if (!formData.tossWonBy) {
      alert('Please select who won the toss');
      return;
    }

    if (!formData.tossDecision) {
      alert('Please choose the toss decision');
      return;
    }

    if (startFromSecondInnings && (!firstInningsScore.trim() || parseInt(firstInningsScore, 10) < 0)) {
      alert('Please enter a valid 1st innings score');
      return;
    }

    // Proceed to player selection
    setStep('players');

    // Auto-select players for opponent if applicable
    const jmccBattsInnings1 =
      (formData.tossWonBy === 'Us' && formData.tossDecision === 'bat') ||
      (formData.tossWonBy === 'Them' && formData.tossDecision === 'field');
    const jmccBatting = startFromSecondInnings ? !jmccBattsInnings1 : jmccBattsInnings1;

    if (!jmccBatting) {
      // Opponent is batting
      // Sequential: Player 1 and 2
      const striker = OPPONENT_TEAM_PLAYERS[0];
      const nonStriker = OPPONENT_TEAM_PLAYERS[1];
      setStriker(striker);
      setNonStriker(nonStriker);
      
      // We are bowling, no auto-select for us
    } else {
      // We are batting, opponent is bowling
      const bowler = OPPONENT_TEAM_PLAYERS[0];
      setBowler(bowler);
    }
  };

  const handlePlayerSelection = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!striker) {
      alert('Please select striker');
      return;
    }

    if (!nonStriker) {
      alert('Please select non-striker');
      return;
    }

    if (striker.id === nonStriker.id) {
      alert('Striker and non-striker must be different players');
      return;
    }

    if (!bowler) {
      alert('Please select opening bowler');
      return;
    }

    if (!formData.tossWonBy || !formData.tossDecision) {
      alert('Please complete the match details');
      return;
    }

    onStartNewMatch({
      opponent: formData.opponent.trim(),
      venue: formData.venue.trim() || 'Neutral',
      tossWonBy: formData.tossWonBy,
      tossDecision: formData.tossDecision,
      totalOvers: parseInt(formData.totalOvers, 10) || 20,
      striker,
      nonStriker,
      bowler,
      startFromSecondInnings,
      firstInningsScore: startFromSecondInnings ? (parseInt(firstInningsScore, 10) || 0) : undefined,
    });
  };

  // Landing page
  if (step === 'landing') {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center p-4">
        {/* Theme Toggle - Absolute Top Right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shadow-lg transition-all active:scale-90"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-12">Cricket Live Scorer</h1>

          <div className="space-y-4 max-w-sm">
            {/* Start New Match Button */}
            <button
              onClick={handleStartNewMatch}
              className="w-full px-6 py-4 bg-green-700 hover:bg-green-600 text-white text-lg font-bold rounded-lg transition-colors"
            >
              Start New Match
            </button>

            {/* Resume Match Button */}
            {hasMatchToResume && (
              <button
                onClick={onResumeMatch}
                className="w-full px-6 py-4 bg-green-700 hover:bg-green-600 text-white text-lg font-bold rounded-lg transition-colors"
              >
                Resume Match
              </button>
            )}

            {!hasMatchToResume && (
              <button
                disabled
                className="w-full px-6 py-4 bg-gray-700 text-gray-500 text-lg font-bold rounded-lg cursor-not-allowed opacity-50"
              >
                Resume Match
              </button>
            )}

            {/* Completed Matches Button */}
            {/* Completed Matches Section */}
            <div className="pt-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest opacity-40">Recent Matches (5d)</p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {storedMatches.length > 0 ? (
                  storedMatches.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()).map((stored) => (
                    <button
                      key={stored.id}
                      onClick={() => onViewCompletedMatch?.(stored.match)}
                      className="w-full px-4 py-3 bg-emerald-700/20 hover:bg-emerald-700/40 text-emerald-100 rounded-lg transition-all border border-emerald-500/20 flex flex-col items-start"
                    >
                      <div className="flex justify-between w-full items-center">
                        <span className="font-bold text-sm">vs {stored.match.opponent}</span>
                        <span className="text-[10px] opacity-60">{new Date(stored.completedAt).toLocaleDateString()}</span>
                      </div>
                      <span className="text-[10px] opacity-80 mt-0.5">{stored.match.winMargin || 'Result pending'}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-8 bg-gray-800/30 rounded-lg border border-border/50 text-center">
                    <p className="text-sm text-gray-500 font-medium italic">No recent local matches</p>
                  </div>
                )}
              </div>
            </div>



            {/* Back to Home Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-4 bg-card hover:bg-green-600/10 text-foreground text-lg font-bold rounded-lg transition-colors border border-border"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Match setup form
  if (step === 'match') {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xl my-8 rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-500 opacity-80">Live Scorer</p>
            <div className="mt-2">
              <h1 className="text-2xl font-bold">Match Details</h1>
            </div>
          </div>

          <form onSubmit={handleMatchSetup} className="space-y-5">
            {/* Opponent Name */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Opponent Team Name</label>
              <input
                type="text"
                value={formData.opponent}
                onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                className={inputClass}
                placeholder="e.g., Delhi, Mumbai, etc."
              />
            </div>

            <DropdownInputField
              label="Venue"
              value={formData.venue}
              selectedValue={formData.venue}
              placeholder="Venue"
              options={venueOptions}
              isOpen={openMatchDropdown === 'venue'}
              onOpenChange={(open) => setOpenMatchDropdown(open ? 'venue' : null)}
              onSelect={(value) => setFormData({ ...formData, venue: value })}
              readOnly={true}
              disabled={!isOpponentEntered}
            />

            <DropdownInputField
              label="Toss Won By"
              value={formData.tossWonBy === 'Us' ? teamAName : formData.tossWonBy === 'Them' ? teamBName : ''}
              selectedValue={formData.tossWonBy}
              placeholder="Select team"
              options={tossOptions}
              isOpen={openMatchDropdown === 'toss'}
              onOpenChange={(open) => setOpenMatchDropdown(open ? 'toss' : null)}
              onSelect={(value) => setFormData({ ...formData, tossWonBy: value as 'Us' | 'Them' })}
              readOnly={true}
              disabled={!isOpponentEntered}
            />

            <DropdownInputField
              label="Toss Decision"
              value={formData.tossDecision === 'bat' ? 'Bat' : formData.tossDecision === 'field' ? 'Bowl' : ''}
              selectedValue={formData.tossDecision}
              placeholder="Choose"
              options={decisionOptions}
              isOpen={openMatchDropdown === 'decision'}
              onOpenChange={(open) => setOpenMatchDropdown(open ? 'decision' : null)}
              onSelect={(value) => setFormData({ ...formData, tossDecision: value as 'bat' | 'field' })}
              readOnly={true}
              disabled={!isOpponentEntered}
            />

            {/* Total Overs */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Overs Per Innings</label>
              <input
                type="number"
                value={formData.totalOvers}
                onChange={(e) => setFormData({ ...formData, totalOvers: e.target.value })}
                className={`${inputClass} ${!isOpponentEntered ? 'cursor-not-allowed border-slate-700 bg-slate-800/60 text-slate-500' : ''}`}
                placeholder="20"
                min="1"
                disabled={!isOpponentEntered}
              />
            </div>

            {/* Start from 2nd Innings Toggle */}
            <div className={`rounded-xl border p-4 transition-colors ${startFromSecondInnings ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-background/50'} ${!isOpponentEntered ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold">Start from 2nd Innings</p>
                  <p className="text-xs opacity-60 mt-0.5">Skip 1st innings, enter score directly</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={startFromSecondInnings}
                  disabled={!isOpponentEntered}
                  onClick={() => setStartFromSecondInnings(!startFromSecondInnings)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    startFromSecondInnings ? 'bg-amber-500' : 'bg-gray-400'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    startFromSecondInnings ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>

              {startFromSecondInnings && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-amber-600">1st Innings Score</label>
                  <input
                    type="number"
                    value={firstInningsScore}
                    onChange={(e) => setFirstInningsScore(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., 150"
                    min="0"
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('landing')}
                className={`${secondaryButtonClass} flex-1 px-4 py-2.5`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!formData.opponent.trim()}
                className={`flex-1 px-4 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-700 ${primaryButtonClass}`}
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Player selection form
  if (step === 'players') {
    // Derive who bats this innings from toss + decision + innings number
    // innings1: JMCC bats if (tossWonBy=Us & bat) OR (tossWonBy=Them & field)
    // innings2: flip innings1
    const jmccBattsInnings1 =
      (formData.tossWonBy === 'Us' && formData.tossDecision === 'bat') ||
      (formData.tossWonBy === 'Them' && formData.tossDecision === 'field');
    const jmccBatting = startFromSecondInnings ? !jmccBattsInnings1 : jmccBattsInnings1;

    const battingTeamName = jmccBatting ? teamName : formData.opponent;
    const bowlingTeamName = jmccBatting ? formData.opponent : teamName;
    const strikerOptions = jmccBatting
      ? teamPlayers.filter((p) => p.id !== nonStriker?.id)
      : OPPONENT_TEAM_PLAYERS.filter((p) => p.id !== nonStriker?.id);
    const nonStrikerOptions = jmccBatting
      ? teamPlayers.filter((p) => p.id !== striker?.id)
      : OPPONENT_TEAM_PLAYERS.filter((p) => p.id !== striker?.id);
    const bowlerOptions = jmccBatting ? OPPONENT_TEAM_PLAYERS : teamPlayers;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xl my-8 rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-green-500 opacity-80">Live Scorer</p>
            <div className="mt-2">
              <h1 className="text-2xl font-bold">Player Selection</h1>
            </div>
          </div>

          <form onSubmit={handlePlayerSelection} className="space-y-5">
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-500 opacity-80">Batting Team</p>
              <p className="mt-1 text-lg font-semibold">🏏 {battingTeamName}</p>
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold opacity-80">Striker</label>
              <button
                type="button"
                onClick={() => setStrikerOpen(!strikerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{striker ? striker.name : 'Select Striker'}</span>
                <span className="text-xs opacity-60">{strikerOpen ? '▲' : '▼'}</span>
              </button>
              {strikerOpen && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl shadow-black/60">
                  <div className="space-y-2 p-2">
                    {strikerOptions.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setStriker(player);
                          setStrikerOpen(false);
                        }}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                          striker?.id === player.id
                            ? 'border-green-500 bg-green-500/10 text-green-500 shadow-sm'
                            : 'border-border bg-background text-foreground hover:border-green-500/50'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  {jmccBatting && (
                    <div className="border-t border-border bg-card/70 p-3">
                      <input
                        type="text"
                        value={newStrikerName}
                        onChange={(e) => setNewStrikerName(e.target.value)}
                        placeholder="New player name"
                        className={`${inputClass} mb-2`}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateNewStriker()}
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewStriker}
                        disabled={!newStrikerName.trim()}
                        className={`w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-700 ${primaryButtonClass}`}
                      >
                        Create Player
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold opacity-80">Non-Striker</label>
              <button
                type="button"
                onClick={() => setNonStrikerOpen(!nonStrikerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{nonStriker ? nonStriker.name : 'Select Non-Striker'}</span>
                <span className="text-xs opacity-60">{nonStrikerOpen ? '▲' : '▼'}</span>
              </button>
              {nonStrikerOpen && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl shadow-black/60">
                  <div className="space-y-2 p-2">
                    {nonStrikerOptions.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setNonStriker(player);
                          setNonStrikerOpen(false);
                        }}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                          nonStriker?.id === player.id
                            ? 'border-green-500 bg-green-500/10 text-green-500 shadow-sm'
                            : 'border-border bg-background text-foreground hover:border-green-500/50 hover:bg-green-500/5'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  {jmccBatting && (
                    <div className="border-t border-border bg-card/70 p-3">
                      <input
                        type="text"
                        value={newNonStrikerName}
                        onChange={(e) => setNewNonStrikerName(e.target.value)}
                        placeholder="New player name"
                        className={`${inputClass} mb-2`}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateNewNonStriker()}
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewNonStriker}
                        disabled={!newNonStrikerName.trim()}
                        className={`w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-700 ${primaryButtonClass}`}
                      >
                        Create Player
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-60">Bowling Team</p>
              <p className="mt-1 text-lg font-semibold">🎯 {bowlingTeamName}</p>
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold opacity-80">Opening Bowler</label>
              <button
                type="button"
                onClick={() => setBowlerOpen(!bowlerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{bowler ? bowler.name : 'Select Bowler'}</span>
                <span className="text-xs opacity-60">{bowlerOpen ? '▲' : '▼'}</span>
              </button>
              {bowlerOpen && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl shadow-black/60">
                  <div className="space-y-2 p-2">
                    {bowlerOptions.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setBowler(player);
                          setBowlerOpen(false);
                        }}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                          bowler?.id === player.id
                            ? 'border-green-500 bg-green-500/10 text-green-500 shadow-sm'
                            : 'border-border bg-background text-foreground hover:border-green-500/50 hover:bg-green-500/5'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  {!jmccBatting && (
                    <div className="border-t border-border bg-card/70 p-3">
                      <input
                        type="text"
                        value={newBowlerName}
                        onChange={(e) => setNewBowlerName(e.target.value)}
                        placeholder="New bowler name"
                        className={`${inputClass} mb-2`}
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateNewBowler()}
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewBowler}
                        disabled={!newBowlerName.trim()}
                        className={`w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-700 ${primaryButtonClass}`}
                      >
                        Create Bowler
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('match');
                  setStriker(null);
                  setNonStriker(null);
                  setBowler(null);
                }}
                className={`${secondaryButtonClass} flex-1 px-4 py-2.5`}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!striker || !nonStriker || !bowler}
                className={`flex-1 px-4 py-2.5 disabled:cursor-not-allowed disabled:bg-slate-700 ${primaryButtonClass}`}
              >
                Start Match
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
