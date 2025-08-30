'use client';

import { useAuthStore } from '@/core/stores/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router, isMounted]);

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}