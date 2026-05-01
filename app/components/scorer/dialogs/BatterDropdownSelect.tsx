'use client';

import { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { formLabelClass, inputClass, primaryButtonClass, selectItemClass, selectItemSelectedClass, selectSurfaceClass } from './dialogTheme';

interface BatterDropdownSelectProps {
  label?: string;
  placeholder?: string;
  selectedBatter: TeamPlayer | null;
  batters: TeamPlayer[];
  excludeIds?: string[];
  onSelect: (batter: TeamPlayer) => void;
  allowNew?: boolean;
  onCreateNew?: (name: string) => void;
  newPlayerName?: string;
  onNewPlayerNameChange?: (name: string) => void;
}

/**
 * Shared Batter/Batsman Dropdown Component
 * Single source of truth for selecting batters from the batting team
 * Used across multiple dialogs for consistent UI and behavior
 */
export function BatterDropdownSelect({
  label = 'Select Batter',
  placeholder = 'Select Batter',
  selectedBatter,
  batters,
  excludeIds = [],
  onSelect,
  allowNew = false,
  onCreateNew,
  newPlayerName = '',
  onNewPlayerNameChange,
}: BatterDropdownSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const availableBatters = batters.filter(
    (b) => !excludeIds.includes(b.id) && b.id !== selectedBatter?.id
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
          <span className={selectedBatter ? 'text-foreground' : 'text-foreground/40'}>
            {selectedBatter?.name || placeholder}
          </span>
          <span className="text-xs opacity-60">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border-2 border-border bg-card shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={selectSurfaceClass}>
              {availableBatters.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm opacity-40">No batters available</div>
              ) : (
                availableBatters.map((batter) => {
                  const isSelected = selectedBatter?.id === batter.id;

                  return (
                    <button
                      key={batter.id}
                      type="button"
                      onClick={() => {
                        onSelect(batter);
                        setIsOpen(false);
                      }}
                      className={`${selectItemClass} ${isSelected ? selectItemSelectedClass : ''}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{batter.name}</div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {batter.jerseyNumber && (
                            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] opacity-60">
                              #{batter.jerseyNumber}
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
                  placeholder="New batter name"
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
                  Create Batter
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
