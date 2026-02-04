import { open } from '@tauri-apps/plugin-shell';

export async function openInObsidian(filePath: string) {
  const url = `obsidian://open?path=${encodeURIComponent(filePath)}`;
  try {
    await open(url);
  } catch (err) {
    console.error('Failed to open in Obsidian:', err);
    window.open(url, '_blank');
  }
}
