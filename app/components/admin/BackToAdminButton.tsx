'use client';

import { useRouter } from 'next/navigation';

export function BackToAdminButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push('/admin')}
      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
    >
      Back to Admin
    </button>
  );
}