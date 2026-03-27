import { useContext } from 'react';
import { LocaleContext, LocaleContextType } from '@/src/contexts/locale-context';

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
