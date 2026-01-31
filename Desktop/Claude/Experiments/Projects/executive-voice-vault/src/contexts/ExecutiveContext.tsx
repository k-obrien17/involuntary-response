import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { VaultExecutive } from '../lib/types';
import * as api from '../lib/api';

interface ExecutiveContextValue {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  setSelectedExecutive: (exec: VaultExecutive) => void;
  refreshExecutives: () => Promise<void>;
  vaultConfigured: boolean;
  vaultPath: string | null;
  vaultError: string | null;
  setVaultError: (err: string | null) => void;
  updateVaultPath: (path: string) => void;
}

const ExecutiveContext = createContext<ExecutiveContextValue | null>(null);

export function ExecutiveProvider({
  children,
  initialVaultPath,
}: {
  children: ReactNode;
  initialVaultPath: string | null;
}) {
  const [executives, setExecutives] = useState<VaultExecutive[]>([]);
  const [selectedExecutive, setSelectedExecutive] = useState<VaultExecutive | null>(null);
  const [vaultPath, setVaultPath] = useState<string | null>(initialVaultPath);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const vaultConfigured = !!vaultPath;

  const refreshExecutives = useCallback(async () => {
    if (!vaultPath) return;
    try {
      const execs = await api.listExecutives();
      setExecutives(execs);
      if (execs.length > 0 && !selectedExecutive) {
        setSelectedExecutive(execs[0]);
      }
    } catch (err: any) {
      setVaultError(err?.message || 'Failed to discover executives from vault');
    }
  }, [vaultPath, selectedExecutive]);

  useEffect(() => {
    if (vaultPath) {
      refreshExecutives();
    }
  }, [vaultPath]);

  // Allow updating vault path from settings
  useEffect(() => {
    setVaultPath(initialVaultPath);
  }, [initialVaultPath]);

  return (
    <ExecutiveContext.Provider
      value={{
        executives,
        selectedExecutive,
        setSelectedExecutive,
        refreshExecutives,
        vaultConfigured,
        vaultPath,
        vaultError,
        setVaultError,
        updateVaultPath: setVaultPath,
      }}
    >
      {children}
    </ExecutiveContext.Provider>
  );
}

export function useExecutive() {
  const ctx = useContext(ExecutiveContext);
  if (!ctx) throw new Error('useExecutive must be used within ExecutiveProvider');
  return ctx;
}
