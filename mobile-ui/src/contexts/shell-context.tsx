import React, { createContext, useCallback, useContext, useState } from 'react';

interface ShellContextType {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

export const ShellContext = createContext<ShellContextType>({
  isSidebarOpen: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  return (
    <ShellContext.Provider value={{ isSidebarOpen, openSidebar, closeSidebar }}>
      {children}
    </ShellContext.Provider>
  );
}

export function useShell(): ShellContextType {
  return useContext(ShellContext);
}
