'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

/**
 * Header Component
 * Displays team logo (left), team name (centered), and hamburger menu (right)
 */
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  const menuItems = [
    { label: 'Home', value: 'home' },
    { label: 'Monthly stats', value: 'monthly' },
    { label: 'Yearly stats', value: 'yearly' },
    { label: 'All time stats', value: 'all-time' },
    { label: 'Team stats', value: 'team-stats' },
    { label: 'Player stats', value: 'player' },
  ];

  const handleMenuClick = (value: string) => {
    setIsMenuOpen(false);

    switch (value) {
      case 'home':
        router.push('/');
        break;
      case 'monthly':
        router.push('/stats/monthly');
        break;
      case 'yearly':
        router.push('/stats/yearly');
        break;
      case 'all-time':
        router.push('/stats/all-time');
        break;
      case 'team-stats':
        router.push('/stats/team-stats');
        break;
      case 'player':
        router.push('/player-stats');
        break;
      default:
        break;
    }
  };

  const isActive = (value: string): boolean => {
    if (value === 'home') {
      return pathname === '/';
    }
    return pathname.includes(value);
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image
            src="/jmcc.jpg"
            alt="JMCC Spartans Logo"
            width={48}
            height={48}
            className="rounded-full object-cover shadow-md"
            priority
          />
        </div>

        {/* Team Name - Centered */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">JMCC Spartans</h1>
          <p className="text-blue-100 text-sm mt-1">Cricket Team</p>
        </div>

        {/* Hamburger Menu */}
        <div className="flex-shrink-0 relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-12 h-12 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Open menu"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-lg shadow-xl z-50 overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleMenuClick(item.value)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 border-gray-700 font-medium text-sm ${
                    isActive(item.value)
                      ? 'bg-blue-800 text-blue-100 border-l-4 border-l-blue-400 pl-3'
                      : 'hover:bg-gray-700 text-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
