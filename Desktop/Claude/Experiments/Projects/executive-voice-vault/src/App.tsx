import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  FolderOpen,
  PenTool,
  Plus,
  Home,
} from 'lucide-react';
import * as api from './lib/api';

import { Settings } from './components/Settings';
import { DraftGenerator } from './components/DraftGenerator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QAPanel } from './components/QAPanel';
import { ExecutiveProvider, useExecutive } from './contexts/ExecutiveContext';

// Lazy load components that will be created
import { HomeScreen } from './components/HomeScreen';
import { UnifiedCapture } from './components/UnifiedCapture';
import { Library } from './components/Library';

type View =
  | 'home'
  | 'add'
  | 'write'
  | 'library'
  | 'settings';

function AppContent() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('light');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('write');
  const [draftPrefill, setDraftPrefill] = useState<{ topic: string; format: string; notes: string } | null>(null);

  const {
    executives,
    selectedExecutive,
    setSelectedExecutive,
    updateVaultPath,
    vaultConfigured,
    vaultError,
    setVaultError,
  } = useExecutive();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [apiKeyValue, openaiKeyValue, themeValue] = await Promise.all([
          api.getSetting('api_key'),
          api.getSetting('openai_api_key'),
          api.getSetting('theme'),
        ]);
        setApiKey(apiKeyValue);
        setOpenaiApiKey(openaiKeyValue);
        setTheme(themeValue || 'light');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleUpdateApiKey = async (key: string) => {
    await api.setSetting('api_key', key);
    setApiKey(key);
  };

  const handleUpdateOpenaiApiKey = async (key: string) => {
    await api.setSetting('openai_api_key', key);
    setOpenaiApiKey(key);
  };

  const handleUpdateTheme = async (newTheme: string) => {
    await api.setSetting('theme', newTheme);
    setTheme(newTheme);
  };

  const handleUpdateVaultPath = async (path: string) => {
    await api.setSetting('vault_path', path);
    updateVaultPath(path);
  };

  const navigate = (view: View) => {
    setCurrentView(view);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // If no vault configured, go straight to settings
  if (!vaultConfigured && currentView !== 'settings') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to Voice Vault</h1>
          <p className="text-gray-500">Configure your Obsidian vault path to get started.</p>
          <button
            onClick={() => navigate('settings')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'home' as View, label: 'Home', icon: Home },
    { id: 'add' as View, label: 'Add', icon: Plus },
    { id: 'write' as View, label: 'Write', icon: PenTool },
    { id: 'library' as View, label: 'Library', icon: FolderOpen },
  ];

  const handleQuickDraft = (topic: string, format: string) => {
    setDraftPrefill({ topic, format, notes: '' });
    navigate('write');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeScreen
            onQuickDraft={handleQuickDraft}
            onNavigate={navigate}
          />
        );
      case 'add':
        return (
          <UnifiedCapture
            apiKey={apiKey}
            onNavigateToSettings={() => navigate('settings')}
          />
        );
      case 'write':
        return (
          <DraftGenerator
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            apiKey={apiKey}
            onNavigateToSettings={() => navigate('settings')}
            prefill={draftPrefill}
            onClearPrefill={() => setDraftPrefill(null)}
          />
        );
      case 'library':
        return (
          <Library
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
          />
        );
      case 'settings':
        return (
          <Settings
            apiKey={apiKey}
            openaiApiKey={openaiApiKey}
            theme={theme}
            onUpdateApiKey={handleUpdateApiKey}
            onUpdateOpenaiApiKey={handleUpdateOpenaiApiKey}
            onUpdateTheme={handleUpdateTheme}
            onUpdateVaultPath={handleUpdateVaultPath}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white shadow-lg flex-shrink-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-indigo-600">Voice Vault</h1>
          {executives.length > 0 && (
            <select
              className="mt-2 w-full text-sm px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              value={selectedExecutive?.voice_path || ''}
              onChange={(e) => {
                const exec = executives.find((ex) => ex.voice_path === e.target.value);
                if (exec) setSelectedExecutive(exec);
              }}
            >
              {executives.map((exec) => (
                <option key={exec.voice_path} value={exec.voice_path}>
                  {exec.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <nav className="p-4">
          {vaultConfigured && (
            <div className="space-y-1 mb-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentView === item.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => navigate('settings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === 'settings'
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              Settings
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {vaultError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
              <span>Vault error: {vaultError}</span>
              <button onClick={() => setVaultError(null)} className="text-red-500 hover:text-red-700 font-medium">Dismiss</button>
            </div>
          )}
          <ErrorBoundary fallbackLabel={currentView}>
            {renderView()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.getSetting('vault_path').then((p) => {
      setVaultPath(p);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ExecutiveProvider initialVaultPath={vaultPath}>
      <AppContent />
      <QAPanel />
    </ExecutiveProvider>
  );
}

export default App;
