import { useState, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  ExternalLink,
  Search,
  Quote,
  Lightbulb,
  User,
  Trash2,
} from 'lucide-react';
import type { VaultExecutive, VaultFile, VoiceFileType } from '../lib/types';
import { VOICE_FILE_TYPE_LABELS } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';

interface LibraryProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
}

type LibraryTab = 'all' | 'quotes' | 'drafts' | 'facts' | 'voice-profile';

const TAB_CONFIG: { id: LibraryTab; label: string; icon: React.ReactNode; fileTypes: VoiceFileType[] }[] = [
  { id: 'all', label: 'All', icon: <FolderOpen className="w-4 h-4" />, fileTypes: [] },
  { id: 'quotes', label: 'Quotes', icon: <Quote className="w-4 h-4" />, fileTypes: ['voice-quote'] },
  { id: 'drafts', label: 'Drafts', icon: <FileText className="w-4 h-4" />, fileTypes: ['voice-draft'] },
  { id: 'facts', label: 'Facts', icon: <Lightbulb className="w-4 h-4" />, fileTypes: ['voice-keyfact'] },
  {
    id: 'voice-profile',
    label: 'Voice Profile',
    icon: <User className="w-4 h-4" />,
    fileTypes: ['voice-principle', 'voice-lexicon', 'voice-stance', 'voice-narrative', 'voice-kernel', 'voice-antivoice'],
  },
];

export function Library({ executives, selectedExecutive, onSelectExecutive }: LibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!selectedExecutive) return;
    loadFiles();
  }, [selectedExecutive, activeTab]);

  const loadFiles = async () => {
    if (!selectedExecutive) return;
    setLoading(true);
    try {
      const tabConfig = TAB_CONFIG.find((t) => t.id === activeTab);
      if (!tabConfig) return;

      let allFiles: VaultFile[] = [];

      if (tabConfig.fileTypes.length === 0) {
        // All files
        allFiles = await api.listVoiceFiles(selectedExecutive.voice_path);
      } else {
        // Specific file types
        for (const ft of tabConfig.fileTypes) {
          const typeFiles = await api.listVoiceFiles(selectedExecutive.voice_path, ft);
          allFiles.push(...typeFiles);
        }
      }

      // Sort by created date descending
      allFiles.sort((a, b) => {
        const aDate = String(a.frontmatter.created || a.frontmatter.date_spoken || '');
        const bDate = String(b.frontmatter.created || b.frontmatter.date_spoken || '');
        return bDate.localeCompare(aDate);
      });

      setFiles(allFiles);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        f.filename.toLowerCase().includes(searchLower) ||
        f.body.toLowerCase().includes(searchLower) ||
        String(f.frontmatter.draft_topic || '').toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter (for drafts)
    if (statusFilter && f.frontmatter.type === 'voice-draft') {
      if (String(f.frontmatter.status || '') !== statusFilter) return false;
    }

    return true;
  });

  const handleOpenInObsidian = (filePath: string) => {
    openInObsidian(filePath);
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedFiles.size} file(s)?`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      for (const path of selectedFiles) {
        await api.deleteVaultFile(path);
      }
      setSelectedFiles(new Set());
      loadFiles();
    } finally {
      setDeleting(false);
    }
  };

  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-gray-100 text-gray-700',
      draft: 'bg-gray-100 text-gray-700',
      pending_review: 'bg-amber-100 text-amber-700',
      approved: 'bg-green-100 text-green-700',
      published: 'bg-blue-100 text-blue-700',
      unread: 'bg-gray-100 text-gray-700',
      read: 'bg-blue-100 text-blue-700',
      used: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    );
  };

  if (!selectedExecutive) {
    return (
      <div className="text-center text-gray-500 py-12">
        Select an executive to browse their library.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Library</h2>
        <div className="flex items-center gap-3">
          <select
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={selectedExecutive.voice_path}
            onChange={(e) => {
              const exec = executives.find((ex) => ex.voice_path === e.target.value);
              if (exec) onSelectExecutive(exec);
            }}
          >
            {executives.map((exec) => (
              <option key={exec.voice_path} value={exec.voice_path}>
                {exec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters and search */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {activeTab === 'drafts' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>
        )}

        {selectedFiles.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            <Trash2 className="w-4 h-4" />
            Delete ({selectedFiles.size})
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex gap-4">
        {/* File list */}
        <div className="w-1/2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No files found.</p>
          ) : (
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {filteredFiles.map((file) => {
                const status = String(file.frontmatter.status || '');
                const fileType = String(file.frontmatter.type || 'unknown');
                const title =
                  String(file.frontmatter.draft_topic || '') ||
                  String(file.frontmatter.title || '') ||
                  file.filename;

                return (
                  <div
                    key={file.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer group ${
                      selectedFile?.path === file.path
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.path)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleFileSelection(file.path);
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{title}</p>
                      <p className="text-xs text-gray-500">
                        {VOICE_FILE_TYPE_LABELS[fileType as VoiceFileType] || String(fileType)}
                        {file.frontmatter.created ? ` · ${String(file.frontmatter.created)}` : ''}
                      </p>
                    </div>
                    {status && getStatusBadge(status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInObsidian(file.path);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"
                      title="Open in Obsidian"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="w-1/2 bg-white rounded-lg shadow-sm border p-4 overflow-auto max-h-[70vh]">
          {selectedFile ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate">{selectedFile.filename}</h3>
                <button
                  onClick={() => handleOpenInObsidian(selectedFile.path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Obsidian
                </button>
              </div>

              {/* Frontmatter summary */}
              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                {Object.entries(selectedFile.frontmatter)
                  .filter(([k]) => !['body', 'voice_system'].includes(k))
                  .map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-gray-500 font-mono">{k}:</span>
                      <span className="text-gray-700">{String(v)}</span>
                    </div>
                  ))}
              </div>

              {/* Body */}
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {selectedFile.body}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-center py-12">Select a file to preview</p>
          )}
        </div>
      </div>
    </div>
  );
}
