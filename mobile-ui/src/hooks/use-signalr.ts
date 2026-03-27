import { useContext } from 'react';
import { SignalRContext, SignalRContextValue } from '@/src/contexts/signalr-context';

export function useSignalR(): SignalRContextValue {
  const context = useContext(SignalRContext);
  if (!context) {
    throw new Error('useSignalR must be used within a SignalRProvider');
  }
  return context;
}
