import { useState } from 'react';
import { Save, Eye, EyeOff, Loader2, CheckCircle, Key, Palette, FolderOpen } from 'lucide-react';
import { useExecutive } from '../contexts/ExecutiveContext';

interface SettingsProps {
  apiKey: string | null;
  openaiApiKey?: string | null;
  theme: string;
  onUpdateApiKey: (key: string) => Promise<void>;
  onUpdateOpenaiApiKey?: (key: string) => Promise<void>;
  onUpdateTheme: (theme: string) => Promise<void>;
  onUpdateVaultPath: (path: string) => Promise<void>;
}

export function Settings({
  apiKey,
  openaiApiKey,
  theme,
  onUpdateApiKey,
  onUpdateOpenaiApiKey,
  onUpdateTheme,
  onUpdateVaultPath,
}: SettingsProps) {
  const { vaultPath } = useExecutive();
  const [activeTab, setActiveTab] = useState<'vault' | 'api' | 'appearance'>('vault');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your application settings</p>
      </div>

      <div className="flex gap-2 border-b">
        <TabButton
          active={activeTab === 'vault'}
          onClick={() => setActiveTab('vault')}
          icon={<FolderOpen className="w-4 h-4" />}
          label="Vault"
        />
        <TabButton
          active={activeTab === 'api'}
          onClick={() => setActiveTab('api')}
          icon={<Key className="w-4 h-4" />}
          label="API Key"
        />
        <TabButton
          active={activeTab === 'appearance'}
          onClick={() => setActiveTab('appearance')}
          icon={<Palette className="w-4 h-4" />}
          label="Appearance"
        />
      </div>

      <div className="bg-white rounded-lg shadow">
        {activeTab === 'vault' && (
          <VaultSettings vaultPath={vaultPath} onUpdate={onUpdateVaultPath} />
        )}
        {activeTab === 'api' && (
          <ApiKeySettings
            apiKey={apiKey}
            openaiApiKey={openaiApiKey ?? null}
            onUpdate={onUpdateApiKey}
            onUpdateOpenai={onUpdateOpenaiApiKey}
          />
        )}
        {activeTab === 'appearance' && (
          <AppearanceSettings theme={theme} onUpdate={onUpdateTheme} />
        )}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface ApiKeySettingsProps {
  apiKey: string | null;
  openaiApiKey: string | null;
  onUpdate: (key: string) => Promise<void>;
  onUpdateOpenai?: (key: string) => Promise<void>;
}

function ApiKeySettings({ apiKey, openaiApiKey, onUpdate, onUpdateOpenai }: ApiKeySettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [key, setKey] = useState(apiKey || '');
  const [openaiKey, setOpenaiKey] = useState(openaiApiKey || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await onUpdate(key);
      if (onUpdateOpenai) await onUpdateOpenai(openaiKey);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anthropic API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Used for Claude AI features (derivations, drafts, voice parsing).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          OpenAI API Key
        </label>
        <div className="relative">
          <input
            type={showOpenaiKey ? 'text' : 'password'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showOpenaiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Used for Whisper audio transcription (Voice Intake).
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save API Keys
        </button>
        {success && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Saved!
          </span>
        )}
      </div>
    </form>
  );
}

interface VaultSettingsProps {
  vaultPath: string | null;
  onUpdate: (path: string) => Promise<void>;
}

function VaultSettings({ vaultPath, onUpdate }: VaultSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [path, setPath] = useState(vaultPath || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await onUpdate(path);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Obsidian Vault Path
        </label>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="/Users/you/obsidian-workspace/vault"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-2 text-sm text-gray-500">
          Absolute path to your Obsidian vault folder. The app will scan for Voice folders within
          this vault.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || !path}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Vault Path
        </button>
        {success && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Saved! Executives discovered.
          </span>
        )}
      </div>
    </form>
  );
}

interface AppearanceSettingsProps {
  theme: string;
  onUpdate: (theme: string) => Promise<void>;
}

function AppearanceSettings({ theme, onUpdate }: AppearanceSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(theme);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await onUpdate(selectedTheme);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
        <div className="grid grid-cols-2 gap-4">
          <label
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedTheme === 'light'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="theme"
              value="light"
              checked={selectedTheme === 'light'}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="sr-only"
            />
            <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg" />
            <span className="font-medium text-gray-900">Light</span>
          </label>

          <label
            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              selectedTheme === 'dark'
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="theme"
              value="dark"
              checked={selectedTheme === 'dark'}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="sr-only"
            />
            <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-lg" />
            <span className="font-medium text-gray-900">Dark</span>
          </label>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Dark mode support coming soon.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || selectedTheme === theme}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Theme
        </button>
        {success && (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Saved!
          </span>
        )}
      </div>
    </form>
  );
}
