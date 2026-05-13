'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useTeamName } from '@/app/lib/hooks/useTeamName';
import { useTheme } from './ThemeProvider';

/**
 * Header Component
 * Displays team logo (left), team name (centered), and hamburger menu (right)
 * On larger screens, shows a horizontal navbar below the header
 */
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const teamName = useTeamName();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    { label: 'Live Scorer', value: 'scorer' },
    { label: 'Monthly Stats', value: 'monthly' },
    { label: 'Yearly Stats', value: 'yearly' },
    { label: 'All Time Stats', value: 'all-time' },
    { label: 'Team Stats', value: 'team-stats' },
    { label: 'Player Stats', value: 'player' },
    { label: 'Review Stats', value: 'review-stats' },
    { label: 'Admin', value: 'admin' },
  ];

  const handleMenuClick = (value: string) => {
    setIsMenuOpen(false);

    switch (value) {
      case 'home':
        router.push('/');
        break;
      case 'scorer':
        router.push('/scorer');
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
      case 'review-stats':
        router.push('/review-stats');
        break;
      case 'admin':
        router.push('/admin');
        break;
      default:
        break;
    }
  };

  const isActive = (value: string): boolean => {
    if (value === 'home') {
      return pathname === '/';
    }
    if (value === 'admin') {
      return pathname === '/admin';
    }
    if (value === 'review-stats') {
      return pathname === '/review-stats';
    }
    if (value === 'scorer') {
      return pathname === '/scorer';
    }
    if (value === 'team-setup') {
      return pathname === '/admin/team-setup';
    }
    return pathname.includes(value);
  };

  return (
    <header className="w-full bg-gradient-to-r from-green-900 to-green-800 text-white shadow-lg">
      {/* Top Header Section */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-3 max-w-7xl mx-auto">
        {/* Logo */}
        <button
          onClick={() => router.push('/scorer')}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Go to Live Scorer"
        >
          <Image
            src="/jmcc.jpg"
            alt="JMCC KNP Logo"
            width={38}
            height={38}
            className="sm:w-12 sm:h-12 rounded-full object-cover shadow-md aspect-square"
            priority
          />
        </button>

        {/* Team Name - Centered */}
        <div className="flex-1 text-center">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">{teamName}</h1>
          <p className="text-green-100 text-xs sm:text-sm mt-0.5">Cricket Team</p>
        </div>

        {/* Hamburger Menu - Mobile Only */}
        <div className="flex items-center md:hidden">
          {(pathname.startsWith('/scorer') || pathname.startsWith('/pwa-scorer')) && (
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors mr-1"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card text-foreground rounded-lg shadow-xl z-50 overflow-hidden border border-border">
                {menuItems.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleMenuClick(item.value)}
                    className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 border-border font-medium text-sm ${
                      isActive(item.value)
                        ? 'bg-green-600 text-white border-l-4 border-l-green-300 pl-3'
                        : 'hover:bg-green-600/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navbar - Desktop Only */}
      <nav className="hidden md:block bg-green-800/50 border-t border-green-700">
        <div className="max-w-7xl mx-auto px-6 flex items-center h-12">
          <div className="flex space-x-1 h-full">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleMenuClick(item.value)}
                className={`px-3 h-full flex items-center transition-colors text-sm font-medium border-b-2 ${
                  isActive(item.value)
                    ? 'border-green-300 bg-white/10 text-white'
                    : 'border-transparent text-green-100 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {(pathname.startsWith('/scorer') || pathname.startsWith('/pwa-scorer')) && (
            <button
              onClick={toggleTheme}
              className="ml-auto w-10 h-10 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-100" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
