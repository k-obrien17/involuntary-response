import { invoke } from '@tauri-apps/api/core';
import type {
  VaultExecutive,
  VaultFile,
  VoiceScoreboard,
  CreateQuoteInput,
} from './types';

// Settings API
export async function getSetting(key: string): Promise<string | null> {
  return invoke('get_setting', { key });
}

export async function setSetting(key: string, value: string): Promise<void> {
  return invoke('set_setting', { key, value });
}

// --- Vault API ---

export async function listExecutives(): Promise<VaultExecutive[]> {
  return invoke('list_executives');
}

export async function getVoiceScoreboard(voicePath: string): Promise<VoiceScoreboard> {
  return invoke('get_voice_scoreboard', { voicePath });
}

export async function listVoiceFiles(voicePath: string, fileType?: string): Promise<VaultFile[]> {
  return invoke('list_voice_files', { voicePath, fileType: fileType ?? null });
}

export async function getVoiceKernel(voicePath: string): Promise<VaultFile | null> {
  return invoke('get_voice_kernel', { voicePath });
}

export async function createQuote(
  voicePath: string,
  speaker: string,
  input: CreateQuoteInput,
): Promise<VaultFile> {
  return invoke('create_quote', { voicePath, speaker, input });
}

export async function listQuotes(voicePath: string): Promise<VaultFile[]> {
  return invoke('list_quotes', { voicePath });
}

export async function readVaultFile(path: string): Promise<VaultFile> {
  return invoke('read_vault_file', { path });
}

// AI API (calls Claude via Rust backend — API key never leaves the backend process)
export async function generateWithClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
): Promise<string> {
  return invoke('generate_with_claude', { systemPrompt, userMessage, maxTokens: maxTokens ?? null });
}

export async function generateWithClaudeStream(
  systemPrompt: string,
  userMessage: string,
  maxTokens?: number,
): Promise<void> {
  return invoke('generate_with_claude_stream', { systemPrompt, userMessage, maxTokens: maxTokens ?? null });
}

// Anti-voice API
export async function createAntiVoice(
  voicePath: string,
  speaker: string,
  feedback: string,
  summary: string,
): Promise<VaultFile> {
  return invoke('create_anti_voice', { voicePath, speaker, feedback, summary });
}
