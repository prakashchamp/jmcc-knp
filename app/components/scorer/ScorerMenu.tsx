'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

interface ScorerMenuProps {
  currentView: 'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details';
  onViewChange: (view: 'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details') => void;
}

export function ScorerMenu({ currentView, onViewChange }: ScorerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { liveMatch } = useSelector((state: RootState) => state.scorer);

  const menuItems = [
    { id: 'details', label: 'Match Info', icon: 'ℹ️' },
    { id: 'batting', label: 'Batting', icon: '🏏' },
    { id: 'bowling', label: 'Bowling', icon: '🎯' },
    { id: 'overs', label: 'Overs', icon: '📊' },
    { id: 'wickets', label: 'Wickets', icon: '💀' },
    { id: 'partnerships', label: 'Partnerships', icon: '🤝' },
  ] as const;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Drawer */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-card text-foreground transform transition-transform duration-300 z-50 border-r border-border ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="bg-background p-4 border-b border-border">
          <h2 className="text-lg font-black uppercase tracking-tight">Menu</h2>
        </div>

        {/* Menu Items */}
        <div className="space-y-1 p-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-black flex items-center gap-3 border-2 shadow-sm active:scale-95 ${
                currentView === item.id
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-background text-foreground border-border hover:bg-green-600/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-foreground hover:bg-green-600/10 p-2 rounded transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-green-500 bg-green-500/10 text-green-600 transition-all hover:bg-green-500/20 active:scale-90"
        title="Menu"
        aria-label="Menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </>
  );
}
