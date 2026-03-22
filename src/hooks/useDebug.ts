/**
 * Hook to consume DebugContext.
 * Separated from DebugContext.tsx to satisfy react-refresh fast-refresh rules
 * (a file should only export components, not mixed components + hooks).
 */
import { useContext } from 'react';
import { DebugContext } from '../contexts/DebugContext';

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
