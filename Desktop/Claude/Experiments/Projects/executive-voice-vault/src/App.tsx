import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings as SettingsIcon,
  Quote,
  FolderOpen,
  Sparkles,
  PenTool,
  Newspaper,
  ClipboardList,
  Mic,
  Lightbulb,
} from 'lucide-react';
import * as api from './lib/api';
import type { CreateQuoteInput } from './lib/types';

import { Settings } from './components/Settings';
import { QuoteInput } from './components/QuoteInput';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { VoiceBrowser } from './components/VoiceBrowser';
import { DerivationPanel } from './components/DerivationPanel';
import { DraftGenerator } from './components/DraftGenerator';
import { TrendIngestion } from './components/TrendIngestion';
import { ContentTracker } from './components/ContentTracker';
import { VoiceIntake } from './components/VoiceIntake';
import { KeyfactInput } from './components/KeyfactInput';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExecutiveProvider, useExecutive } from './contexts/ExecutiveContext';

type View =
  | 'exec-dashboard'
  | 'quote-input'
  | 'keyfact-input'
  | 'voice-browser'
  | 'derivation'
  | 'draft-generator'
  | 'trends'
  | 'content-tracker'
  | 'voice-intake'
  | 'settings';

function AppContent() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [openaiApiKey, setOpenaiApiKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<string>('light');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('exec-dashboard');
  const [draftPrefill, setDraftPrefill] = useState<{ topic: string; articleText: string; notes: string } | null>(null);

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

  const handleCreateQuote = async (voicePath: string, speaker: string, input: CreateQuoteInput) => {
    return api.createQuote(voicePath, speaker, input);
  };

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
    { id: 'exec-dashboard' as View, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quote-input' as View, label: 'Add Quote', icon: Quote },
    { id: 'keyfact-input' as View, label: 'Key Facts', icon: Lightbulb },
    { id: 'voice-browser' as View, label: 'Browse', icon: FolderOpen },
    { id: 'derivation' as View, label: 'Derive', icon: Sparkles },
    { id: 'draft-generator' as View, label: 'Draft', icon: PenTool },
    { id: 'trends' as View, label: 'Trends', icon: Newspaper },
    { id: 'content-tracker' as View, label: 'Content', icon: ClipboardList },
    { id: 'voice-intake' as View, label: 'Intake', icon: Mic },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'exec-dashboard':
        return (
          <ExecutiveDashboard
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            onNavigate={(view) => navigate(view as View)}
          />
        );
      case 'quote-input':
        return (
          <QuoteInput
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            onSubmit={handleCreateQuote}
            apiKey={apiKey}
          />
        );
      case 'keyfact-input':
        return (
          <KeyfactInput
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
          />
        );
      case 'voice-browser':
        return (
          <VoiceBrowser
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
          />
        );
      case 'derivation':
        return (
          <DerivationPanel
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            apiKey={apiKey}
            onNavigateToSettings={() => navigate('settings')}
          />
        );
      case 'draft-generator':
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
      case 'trends':
        return (
          <TrendIngestion
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            onDraftFromTrend={(prefill) => {
              setDraftPrefill(prefill);
              navigate('draft-generator');
            }}
          />
        );
      case 'content-tracker':
        return (
          <ContentTracker
            executives={executives}
            selectedExecutive={selectedExecutive}
            onSelectExecutive={setSelectedExecutive}
            onWriteDraft={() => navigate('draft-generator')}
          />
        );
      case 'voice-intake':
        return <VoiceIntake executives={executives} />;
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
          {selectedExecutive && (
            <p className="text-sm text-gray-500 mt-1 truncate">{selectedExecutive.name}</p>
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
    </ExecutiveProvider>
  );
}

export default App;
