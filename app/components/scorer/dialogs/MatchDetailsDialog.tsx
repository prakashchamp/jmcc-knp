'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, updateMatchDetails } from '@/app/lib/redux/slices/scorerSlice';
import {
  inputClass,
  modalOverlayClass,
  modalPanelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

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
            <div className="max-h-52 space-y-2 overflow-y-auto p-2">
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

export function MatchDetailsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch } = useSelector((state: RootState) => state.scorer);

  const [opponent, setOpponent] = useState(liveMatch?.opponent || '');
  const [totalOvers, setTotalOvers] = useState(liveMatch?.totalOvers?.toString() || '20');
  const [toss, setToss] = useState<'Us' | 'Them'>(liveMatch?.tossWonBy || 'Us');
  const [tossDec, setTossDec] = useState<'bat' | 'field'>(liveMatch?.tossDecision || 'bat');
  const [venue, setVenue] = useState(liveMatch?.venue || 'Neutral');
  const [openDropdown, setOpenDropdown] = useState<'venue' | 'toss' | 'decision' | null>(null);

  if (!liveMatch) return null;

  const venueOptions: DropdownOption[] = ['Home', 'Away', 'Neutral'].map((option) => ({
    value: option,
    label: option,
  }));
  const teamAName = 'JMCC';
  const teamBName = opponent.trim() || liveMatch.opponent || 'Team B';
  const tossOptions: DropdownOption[] = [
    { value: 'Us', label: teamAName },
    { value: 'Them', label: teamBName },
  ];
  const decisionOptions: DropdownOption[] = [
    { value: 'bat', label: 'Bat' },
    { value: 'field', label: 'Bowl' },
  ];

  const handleSave = () => {
    dispatch(
      updateMatchDetails({
        opponent: opponent.trim() || liveMatch.opponent,
        totalOvers: parseInt(totalOvers, 10) || liveMatch.totalOvers,
        tossWonBy: toss,
        tossDecision: tossDec,
        venue: venue.trim() || liveMatch.venue,
      })
    );
    dispatch(closeDialog());
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 sm:p-6`}>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">Live Scorer</p>
          <h2 className="mt-2 text-xl font-bold text-white">Change Match Details</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">Opponent Team Name</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className={inputClass}
              placeholder="e.g., Delhi"
            />
          </div>

          <DropdownInputField
            label="Venue"
            value={venue}
            selectedValue={venue}
            placeholder="Select or create venue"
            options={venueOptions}
            isOpen={openDropdown === 'venue'}
            onOpenChange={(open) => setOpenDropdown(open ? 'venue' : null)}
            onSelect={setVenue}
            onChange={setVenue}
            allowCreate={true}
            createText="Create venue"
            emptyText="Type a venue name to create it"
          />

          <DropdownInputField
            label="Toss Won By"
            value={toss === 'Us' ? teamAName : teamBName}
            selectedValue={toss}
            placeholder="Select team"
            options={tossOptions}
            isOpen={openDropdown === 'toss'}
            onOpenChange={(open) => setOpenDropdown(open ? 'toss' : null)}
            onSelect={(value) => setToss(value as 'Us' | 'Them')}
            readOnly={true}
          />

          <DropdownInputField
            label="Toss Decision"
            value={tossDec === 'bat' ? 'Bat' : 'Bowl'}
            selectedValue={tossDec}
            placeholder="Select decision"
            options={decisionOptions}
            isOpen={openDropdown === 'decision'}
            onOpenChange={(open) => setOpenDropdown(open ? 'decision' : null)}
            onSelect={(value) => setTossDec(value as 'bat' | 'field')}
            readOnly={true}
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">Total Overs</label>
            <input
              type="number"
              value={totalOvers}
              onChange={(e) => setTotalOvers(e.target.value)}
              className={inputClass}
              placeholder="20"
              min="1"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSave}
            className={`${primaryButtonClass} flex-1 px-4 py-2.5 text-sm`}
          >
            Save
          </button>
          <button
            onClick={() => dispatch(closeDialog())}
            className={`${secondaryButtonClass} flex-1 px-4 py-2.5 text-sm`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
