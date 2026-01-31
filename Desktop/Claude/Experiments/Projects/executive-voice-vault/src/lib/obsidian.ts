import { invoke } from '@tauri-apps/api/core';

export function openInObsidian(filePath: string) {
  const url = `obsidian://open?path=${encodeURIComponent(filePath)}`;
  // Use window.__TAURI__ shell open if available, fallback to window.open
  try {
    invoke('plugin:shell|open', { path: url });
  } catch {
    window.open(url, '_blank');
  }
}
