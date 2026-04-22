'use client';

import { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { formLabelClass, inputClass, primaryButtonClass, selectSurfaceClass } from './dialogTheme';

interface BowlerDropdownSelectProps {
  label?: string;
  placeholder?: string;
  selectedBowler: TeamPlayer | null;
  bowlers: TeamPlayer[];
  excludeIds?: string[];
  onSelect: (bowler: TeamPlayer) => void;
  allowNew?: boolean;
  onCreateNew?: (name: string) => void;
  newPlayerName?: string;
  onNewPlayerNameChange?: (name: string) => void;
  previousBowlerId?: string | null;
}

/**
 * Shared Bowler Dropdown Component
 * Single source of truth for selecting bowlers from the bowling team (opponent)
 * Prevents the same bowler from bowling consecutive overs
 * Used across multiple dialogs for consistent UI and behavior
 */
export function BowlerDropdownSelect({
  label = 'Select Bowler',
  placeholder = 'Select Bowler',
  selectedBowler,
  bowlers,
  excludeIds = [],
  onSelect,
  allowNew = false,
  onCreateNew,
  newPlayerName = '',
  onNewPlayerNameChange,
  previousBowlerId,
}: BowlerDropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableBowlers = bowlers.filter((b) => !excludeIds.includes(b.id));

  return (
    <div className="space-y-2">
      {label && <label className={formLabelClass}>{label}</label>}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`${inputClass} flex items-center justify-between text-left`}
          aria-expanded={isOpen}
          aria-label={placeholder}
        >
          <span className={selectedBowler ? 'text-white' : 'text-slate-400'}>
            {selectedBowler?.name || placeholder}
          </span>
          <span className="text-xs text-slate-300">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-600 bg-slate-900 shadow-2xl shadow-black/60">
            <div className={`${selectSurfaceClass} max-h-60 rounded-none border-0 bg-transparent p-2 shadow-none`}>
              {availableBowlers.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-gray-400">No bowlers available</div>
              ) : (
                availableBowlers.map((bowler) => {
                  const isDisabled = previousBowlerId && bowler.id === previousBowlerId;
                  const isSelected = selectedBowler?.id === bowler.id;

                  return (
                    <button
                      key={bowler.id}
                      type="button"
                      onClick={() => {
                        if (!isDisabled) {
                          onSelect(bowler);
                          setIsOpen(false);
                        }
                      }}
                      disabled={isDisabled || false}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/50 text-white shadow-sm'
                          : isDisabled
                            ? 'cursor-not-allowed border-slate-800 bg-slate-900 text-slate-500 opacity-60'
                            : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{bowler.name}</div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {bowler.jerseyNumber && !isDisabled && (
                            <span className="rounded-full border border-slate-500 px-2 py-0.5 text-[11px] text-slate-200">
                              #{bowler.jerseyNumber}
                            </span>
                          )}
                          {isDisabled ? (
                            <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                              Last Over
                            </span>
                          ) : isSelected ? (
                            <span className="rounded-full border border-blue-400/60 bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-100">
                              Selected
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {allowNew && onCreateNew && onNewPlayerNameChange && (
              <div className="border-t border-slate-600 bg-slate-800 p-2 space-y-2">
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => onNewPlayerNameChange(e.target.value)}
                  placeholder="New bowler name"
                  className={inputClass}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newPlayerName.trim()) {
                      onCreateNew(newPlayerName);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newPlayerName.trim()) {
                      onCreateNew(newPlayerName);
                    }
                  }}
                  disabled={!newPlayerName.trim()}
                  className={`w-full px-2 py-2 disabled:bg-slate-600 disabled:cursor-not-allowed ${primaryButtonClass}`}
                >
                  Create Bowler
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
