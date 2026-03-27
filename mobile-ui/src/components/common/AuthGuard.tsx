import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/src/hooks/use-auth';
import { LoadingScreen } from './LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'Admin' | 'User';
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}
