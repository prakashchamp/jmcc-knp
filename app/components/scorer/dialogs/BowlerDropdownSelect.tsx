'use client';

import { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { formLabelClass, inputClass, primaryButtonClass, selectItemClass, selectItemSelectedClass, selectSurfaceClass } from './dialogTheme';

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
  const availableBowlers = bowlers.filter(
    (b) => !excludeIds.includes(b.id) && b.id !== selectedBowler?.id && b.id !== previousBowlerId
  );

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
          <span className={selectedBowler ? 'text-foreground' : 'text-foreground/40'}>
            {selectedBowler?.name || placeholder}
          </span>
          <span className="text-xs opacity-60">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="mt-2 overflow-visible rounded-2xl border-2 border-border bg-card shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={selectSurfaceClass}>
              {availableBowlers.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm opacity-40">No bowlers available</div>
              ) : (
                availableBowlers.map((bowler) => {
                  const isSelected = selectedBowler?.id === bowler.id;

                  return (
                    <button
                      key={bowler.id}
                      type="button"
                      onClick={() => {
                        onSelect(bowler);
                        setIsOpen(false);
                      }}
                      className={`${selectItemClass} ${isSelected ? selectItemSelectedClass : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{bowler.name}</div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {bowler.jerseyNumber && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] opacity-60">
                              #{bowler.jerseyNumber}
                            </span>
                          )}
                          {isSelected && (
                            <span className="rounded-full border border-blue-500/50 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-500">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {allowNew && onCreateNew && onNewPlayerNameChange && (
              <div className="border-t border-border bg-background/50 p-2 space-y-2">
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
