'use client';

import { useAuth } from '@core/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && !isAuthenticated) {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
    }
}, [isAuthenticated, router, isMounted]);

  if (!isMounted || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}