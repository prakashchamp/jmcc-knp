'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

/**
 * Header Component
 * Displays team logo (left), team name (centered), and hamburger menu (right)
 * On larger screens, shows a horizontal navbar below the header
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
    { label: 'Monthly Stats', value: 'monthly' },
    { label: 'Yearly Stats', value: 'yearly' },
    { label: 'All Time Stats', value: 'all-time' },
    { label: 'Team Stats', value: 'team-stats' },
    { label: 'Player Stats', value: 'player' },
    { label: 'Review Stats', value: 'review-stats' },
    { label: 'Live Scorer', value: 'scorer' },
    { label: 'Team Setup', value: 'team-setup' },
    { label: 'Admin', value: 'admin' },
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
      case 'review-stats':
        router.push('/review-stats');
        break;
      case 'scorer':
        router.push('/scorer');
        break;
      case 'team-setup':
        router.push('/admin/team-setup');
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
    <header className="w-full bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
      {/* Top Header Section */}
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image
            src="/jmcc.jpg"
            alt="JMCC Spartans Logo"
            width={48}
            height={48}
            className="rounded-full object-cover shadow-md"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>

        {/* Team Name - Centered */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-bold tracking-tight">JMCC Spartans</h1>
          <p className="text-blue-100 text-sm mt-1">Cricket Team</p>
        </div>

        {/* Hamburger Menu - Mobile Only */}
        <div className="flex-shrink-0 relative md:hidden" ref={menuRef}>
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
                      ? 'bg-blue-600 text-white border-l-4 border-l-blue-300 pl-3'
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

      {/* Navbar - Desktop Only */}
      <nav className="hidden md:block bg-blue-800/50 border-t border-blue-700">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center space-x-8">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleMenuClick(item.value)}
                className={`py-3 px-1 text-sm font-medium transition-all border-b-2 ${
                  isActive(item.value)
                    ? 'text-white border-b-2 border-blue-300'
                    : 'text-blue-100 border-b-2 border-transparent hover:text-white hover:border-b-blue-400'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
