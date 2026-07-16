import React, { createContext, useCallback, useContext, useState } from 'react';
import { Dimensions } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/** Sidebar genişliği: AppSidebar ve onu parmakla süren dış jestler aynı değeri görsün. */
export const SIDEBAR_WIDTH = Math.min(Dimensions.get('window').width * 0.8, 330);

interface ShellContextType {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  /**
   * Sidebar animasyonunun tek kaynağı [0=kapalı, 1=açık]. AppSidebar bunu
   * render eder; ana sayfa feed'i gibi dış yüzeyler jestle sürebilir
   * (X'in "ekranın her yerinden çek-aç" davranışı).
   */
  sidebarProgress: SharedValue<number>;
}

export const ShellContext = createContext<ShellContextType | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const sidebarProgress = useSharedValue(0);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <ShellContext.Provider value={{ isSidebarOpen, openSidebar, closeSidebar, sidebarProgress }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell(): ShellContextType {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within ShellProvider');
  }
  return context;
}
