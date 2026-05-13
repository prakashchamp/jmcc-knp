'use client';

import { useState, useRef, useEffect } from 'react';

export interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  label?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function CustomSelect({ id, label, options, value, onChange, className = '', placeholder, disabled = false, allowCustom = false }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const customValue = value.startsWith('custom:') ? value.replace('custom:', '') : '';

  const customLabel = !selected && customValue ? customValue : undefined;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  useEffect(() => {
    setCustomText(customValue);
  }, [customValue]);

  const selectCustomValue = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onChange(`custom:${trimmed}`);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={() => { if (!disabled) setIsOpen((o) => !o); }}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`w-full flex items-center justify-between px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white font-medium shadow-sm transition-colors ${disabled ? 'cursor-not-allowed opacity-70' : 'hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500'}`}
      >
        <span className="truncate">{selected?.label ?? customLabel ?? placeholder ?? 'Select...'}</span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Options panel — absolutely positioned so it never goes out of view */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-[70vh] flex flex-col overflow-hidden rounded-lg border border-gray-600 bg-gray-800 shadow-xl shadow-black/40">
          {allowCustom && (
            <div className="border-b border-gray-700 px-4 py-3 shrink-0">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    selectCustomValue();
                  }
                }}
                placeholder={placeholder || 'Enter custom value'}
                className="w-full rounded border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-green-500"
              />
              <button
                type="button"
                onClick={selectCustomValue}
                className="mt-2 w-full rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-500"
              >
                Create new player
              </button>
            </div>
          )}
          <ul
            role="listbox"
            className="overflow-y-auto"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors select-none ${
                    isSelected
                      ? 'bg-green-600 text-white'
                      : 'text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
