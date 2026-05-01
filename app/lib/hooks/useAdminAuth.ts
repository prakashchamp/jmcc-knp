'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useAdminAuth() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const authenticated = window.sessionStorage.getItem('adminAuthenticated');
    if (!authenticated) {
      router.replace('/admin');
    }
  }, [router]);
}
