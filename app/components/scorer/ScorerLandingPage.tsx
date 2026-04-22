'use client';

import { useState, useEffect } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { validateAndClearCorruptedState } from '@/app/lib/redux/store';
import { inputClass, primaryButtonClass, secondaryButtonClass } from './dialogs/dialogTheme';

// Constant opponent player list
const OPPONENT_PLAYERS: TeamPlayer[] = Array.from({ length: 11 }, (_, i) => ({
  id: `opponent-${i + 1}`,
  name: `Opp Player ${i + 1}`,
  role: 'batsman' as const,
}));

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
  }) => void;
  onResumeMatch: () => void;
  hasMatchToResume: boolean;
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
      <label className="mb-2 block text-sm font-semibold text-slate-300">{label}</label>
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
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-300 disabled:cursor-not-allowed disabled:text-slate-500"
          aria-label={`Toggle ${label} options`}
        >
          <span className="text-xs">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60">
            <div className="max-h-60 space-y-2 overflow-y-auto p-2">
              {allowCreate && !readOnly && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-2">
                  <p className="mb-2 text-xs font-medium text-slate-300">Custom {label}</p>
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
                        ? 'border-blue-500 bg-blue-900/50 text-white shadow-sm'
                        : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
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
                <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-300">
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

export function ScorerLandingPage({ onStartNewMatch, onResumeMatch, hasMatchToResume, teamPlayers = [] }: ScorerLandingPageProps) {
  // Navigation states: 'landing' | 'match' | 'players'
  const [step, setStep] = useState<'landing' | 'match' | 'players'>('landing');
  
  // Validate and clear corrupted state on component mount
  useEffect(() => {
    const result = validateAndClearCorruptedState();
    if (result === 'cleared') {
      console.log('🔄 Corrupted state was cleared. Starting fresh.');
    }
  }, []);
  
  const [formData, setFormData] = useState({
    opponent: '',
    venue: '',
    tossWonBy: '' as '' | 'Us' | 'Them',
    tossDecision: '' as '' | 'bat' | 'field',
    totalOvers: '20',
  });

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
  const teamAName = 'JMCC';
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
  const handleCreateNewStriker = () => {
    if (newStrikerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: `striker-${Date.now()}`,
        name: newStrikerName.trim(),
        role: 'batsman',
      };
      setStriker(newPlayer);
      setNewStrikerName('');
      setStrikerOpen(false);
    }
  };

  const handleCreateNewNonStriker = () => {
    if (newNonStrikerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: `non-striker-${Date.now()}`,
        name: newNonStrikerName.trim(),
        role: 'batsman',
      };
      setNonStriker(newPlayer);
      setNewNonStrikerName('');
      setNonStrikerOpen(false);
    }
  };

  const handleCreateNewBowler = () => {
    if (newBowlerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: `bowler-${Date.now()}`,
        name: newBowlerName.trim(),
        role: 'bowler',
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

    // Proceed to player selection
    setStep('players');
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
    });
  };

  // Landing page
  if (step === 'landing') {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-12">Cricket Live Scorer</h1>

          <div className="space-y-4 max-w-sm">
            {/* Start New Match Button */}
            <button
              onClick={handleStartNewMatch}
              className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold rounded-lg transition-colors"
            >
              Start New Match
            </button>

            {/* Resume Match Button */}
            {hasMatchToResume && (
              <button
                onClick={onResumeMatch}
                className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold rounded-lg transition-colors"
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
          </div>
        </div>
      </div>
    );
  }

  // Match setup form
  if (step === 'match') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xl my-8 rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Live Scorer</p>
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-white">Match Details</h1>
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
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-xl my-8 rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-sm sm:p-8">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Live Scorer</p>
            <div className="mt-2">
              <h1 className="text-2xl font-bold text-white">Player Selection</h1>
            </div>
          </div>

          <form onSubmit={handlePlayerSelection} className="space-y-5">
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-100/80">Batting Team</p>
              <p className="mt-1 text-lg font-semibold text-white">🏏 JMCC</p>
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-slate-300">Striker</label>
              <button
                type="button"
                onClick={() => setStrikerOpen(!strikerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{striker ? striker.name : 'Select Striker'}</span>
                <span className="text-xs text-slate-300">{strikerOpen ? '▲' : '▼'}</span>
              </button>
              {strikerOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60">
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
                            ? 'border-blue-500 bg-blue-900/50 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-700 bg-slate-800/70 p-3">
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
                </div>
              )}
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-slate-300">Non-Striker</label>
              <button
                type="button"
                onClick={() => setNonStrikerOpen(!nonStrikerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{nonStriker ? nonStriker.name : 'Select Non-Striker'}</span>
                <span className="text-xs text-slate-300">{nonStrikerOpen ? '▲' : '▼'}</span>
              </button>
              {nonStrikerOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60">
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
                            ? 'border-blue-500 bg-blue-900/50 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-700 bg-slate-800/70 p-3">
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
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Bowling Team</p>
              <p className="mt-1 text-lg font-semibold text-white">🎯 {formData.opponent}</p>
            </div>

            <div className="relative">
              <label className="mb-2 block text-sm font-semibold text-slate-300">Opening Bowler</label>
              <button
                type="button"
                onClick={() => setBowlerOpen(!bowlerOpen)}
                className={`${inputClass} flex items-center justify-between text-left`}
              >
                <span>{bowler ? bowler.name : 'Select Bowler'}</span>
                <span className="text-xs text-slate-300">{bowlerOpen ? '▲' : '▼'}</span>
              </button>
              {bowlerOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60">
                  <div className="space-y-2 p-2">
                    {OPPONENT_PLAYERS.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => {
                          setBowler(player);
                          setBowlerOpen(false);
                        }}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition-all ${
                          bowler?.id === player.id
                            ? 'border-blue-500 bg-blue-900/50 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-700 bg-slate-800/70 p-3">
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
