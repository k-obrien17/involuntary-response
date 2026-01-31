import { useState, useEffect } from 'react';
import { FolderOpen, FileText, ExternalLink, Search } from 'lucide-react';
import type { VaultExecutive, VaultFile, VoiceFileType } from '../lib/types';
import { VOICE_FILE_TYPE_LABELS } from '../lib/types';
import * as api from '../lib/api';
import { openInObsidian } from '../lib/obsidian';

interface VoiceBrowserProps {
  executives: VaultExecutive[];
  selectedExecutive: VaultExecutive | null;
  onSelectExecutive: (exec: VaultExecutive) => void;
}

const FILE_TYPES: VoiceFileType[] = [
  'voice-quote',
  'voice-principle',
  'voice-lexicon',
  'voice-stance',
  'voice-narrative',
  'voice-kernel',
  'voice-antivoice',
];

export function VoiceBrowser({
  executives,
  selectedExecutive,
  onSelectExecutive,
}: VoiceBrowserProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [selectedType, setSelectedType] = useState<VoiceFileType | null>(null);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedExecutive) return;
    setLoading(true);
    api
      .listVoiceFiles(
        selectedExecutive.voice_path,
        selectedType ?? undefined,
      )
      .then(setFiles)
      .finally(() => setLoading(false));
  }, [selectedExecutive, selectedType]);

  const filteredFiles = search
    ? files.filter(
        (f) =>
          f.filename.toLowerCase().includes(search.toLowerCase()) ||
          f.body.toLowerCase().includes(search.toLowerCase()),
      )
    : files;

  // Group files by type
  const groupedFiles: Record<string, VaultFile[]> = {};
  for (const file of filteredFiles) {
    const type = String(file.frontmatter.type || 'unknown');
    if (!groupedFiles[type]) groupedFiles[type] = [];
    groupedFiles[type].push(file);
  }

  const handleOpenInObsidian = (filePath: string) => {
    openInObsidian(filePath);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Voice File Browser</h2>
        <select
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          value={selectedExecutive?.voice_path || ''}
          onChange={(e) => {
            const exec = executives.find((ex) => ex.voice_path === e.target.value);
            if (exec) onSelectExecutive(exec);
          }}
        >
          <option value="">Select executive...</option>
          {executives.map((exec) => (
            <option key={exec.voice_path} value={exec.voice_path}>
              {exec.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedExecutive && (
        <div className="text-center text-gray-500 py-12">
          Select an executive to browse their voice files.
        </div>
      )}

      {selectedExecutive && (
        <div className="flex gap-6">
          {/* Sidebar: type filter */}
          <div className="w-48 flex-shrink-0">
            <button
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 ${
                selectedType === null ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setSelectedType(null)}
            >
              <FolderOpen className="w-4 h-4 inline mr-2" />
              All Files
            </button>
            {FILE_TYPES.map((ft) => (
              <button
                key={ft}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 text-sm ${
                  selectedType === ft ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedType(ft)}
              >
                {VOICE_FILE_TYPE_LABELS[ft]}
              </button>
            ))}

            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* File list + preview */}
          <div className="flex-1 flex gap-4">
            {/* File list */}
            <div className="w-1/2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
                </div>
              ) : filteredFiles.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No files found.</p>
              ) : selectedType ? (
                // Flat list when type is selected
                <div className="space-y-1">
                  {filteredFiles.map((file) => (
                    <FileRow
                      key={file.path}
                      file={file}
                      selected={selectedFile?.path === file.path}
                      onClick={() => setSelectedFile(file)}
                      onOpenInObsidian={() => handleOpenInObsidian(file.path)}
                    />
                  ))}
                </div>
              ) : (
                // Grouped by type
                Object.entries(groupedFiles).map(([type, typeFiles]) => (
                  <div key={type} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                      {VOICE_FILE_TYPE_LABELS[type as VoiceFileType] || type} ({typeFiles.length})
                    </h4>
                    <div className="space-y-1">
                      {typeFiles.map((file) => (
                        <FileRow
                          key={file.path}
                          file={file}
                          selected={selectedFile?.path === file.path}
                          onClick={() => setSelectedFile(file)}
                          onOpenInObsidian={() => handleOpenInObsidian(file.path)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Preview panel */}
            <div className="w-1/2 bg-white rounded-lg shadow p-4 overflow-auto max-h-[70vh]">
              {selectedFile ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{selectedFile.filename}</h3>
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
                    {Object.entries(selectedFile.frontmatter).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-gray-500 font-mono">{key}:</span>
                        <span className="text-gray-700">{String(value)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Body */}
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {selectedFile.body}
                  </div>
                </>
              ) : (
                <p className="text-gray-400 text-center py-12">
                  Select a file to preview
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  selected,
  onClick,
  onOpenInObsidian,
}: {
  file: VaultFile;
  selected: boolean;
  onClick: () => void;
  onOpenInObsidian: () => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer group ${
        selected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 truncate">
        <FileText className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm truncate">{file.filename}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onOpenInObsidian();
        }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600"
        title="Open in Obsidian"
      >
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
}
