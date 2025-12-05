/**
 * Omni CLI - Platform Detection & Utilities
 * Includes full Termux (Android) support
 */

import { homedir, tmpdir, platform as osPlatform, arch as osArch } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Platform, PlatformInfo } from '../types.js';

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Detect if running in Termux (Android terminal emulator)
 */
export function isTermux(): boolean {
  // Check for Termux-specific environment variables
  if (process.env.TERMUX_VERSION) return true;
  if (process.env.PREFIX?.includes('com.termux')) return true;

  // Check for Termux-specific paths
  const termuxPaths = [
    '/data/data/com.termux/files/usr',
    '/data/data/com.termux/files/home',
  ];

  for (const p of termuxPaths) {
    if (existsSync(p)) return true;
  }

  return false;
}

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  if (isTermux()) return 'android';

  const p = osPlatform();
  switch (p) {
    case 'darwin': return 'darwin';
    case 'linux': return 'linux';
    case 'win32': return 'win32';
    default: return 'unknown';
  }
}

// ============================================================================
// Directory Helpers
// ============================================================================

/**
 * Get home directory (Termux-aware)
 */
export function getHomeDir(): string {
  if (isTermux()) {
    return process.env.HOME || '/data/data/com.termux/files/home';
  }
  return homedir();
}

/**
 * Get config directory following XDG spec
 */
export function getConfigDir(): string {
  const home = getHomeDir();

  if (isTermux()) {
    return join(home, '.config', 'omni-cli');
  }

  const p = osPlatform();
  switch (p) {
    case 'darwin':
      return join(home, '.config', 'omni-cli');
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'omni-cli');
    default:
      return process.env.XDG_CONFIG_HOME
        ? join(process.env.XDG_CONFIG_HOME, 'omni-cli')
        : join(home, '.config', 'omni-cli');
  }
}

/**
 * Get data directory for sessions, checkpoints, etc.
 */
export function getDataDir(): string {
  const home = getHomeDir();

  if (isTermux()) {
    return join(home, '.local', 'share', 'omni-cli');
  }

  const p = osPlatform();
  switch (p) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'omni-cli');
    case 'win32':
      return join(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'omni-cli');
    default:
      return process.env.XDG_DATA_HOME
        ? join(process.env.XDG_DATA_HOME, 'omni-cli')
        : join(home, '.local', 'share', 'omni-cli');
  }
}

/**
 * Get cache directory
 */
export function getCacheDir(): string {
  const home = getHomeDir();

  if (isTermux()) {
    return join(home, '.cache', 'omni-cli');
  }

  const p = osPlatform();
  switch (p) {
    case 'darwin':
      return join(home, 'Library', 'Caches', 'omni-cli');
    case 'win32':
      return join(process.env.LOCALAPPDATA || join(home, 'AppData', 'Local'), 'omni-cli', 'cache');
    default:
      return process.env.XDG_CACHE_HOME
        ? join(process.env.XDG_CACHE_HOME, 'omni-cli')
        : join(home, '.cache', 'omni-cli');
  }
}

/**
 * Get temp directory
 */
export function getTempDir(): string {
  if (isTermux()) {
    const termuxTmp = join(getHomeDir(), '.tmp');
    return existsSync(termuxTmp) ? termuxTmp : tmpdir();
  }
  return tmpdir();
}

/**
 * Get the default shell
 */
export function getDefaultShell(): string {
  if (process.env.SHELL) return process.env.SHELL;

  if (isTermux()) return '/data/data/com.termux/files/usr/bin/bash';

  const p = osPlatform();
  switch (p) {
    case 'win32': return process.env.COMSPEC || 'cmd.exe';
    case 'darwin': return '/bin/zsh';
    default: return '/bin/bash';
  }
}

// ============================================================================
// Platform Info
// ============================================================================

/**
 * Get comprehensive platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const platform = getPlatform();
  const termux = isTermux();

  return {
    platform,
    isTermux: termux,
    homeDir: getHomeDir(),
    configDir: getConfigDir(),
    dataDir: getDataDir(),
    cacheDir: getCacheDir(),
    tempDir: getTempDir(),
    shell: getDefaultShell(),
    arch: osArch(),
  };
}

// ============================================================================
// Directory Initialization
// ============================================================================

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [
    getConfigDir(),
    getDataDir(),
    getCacheDir(),
    join(getDataDir(), 'sessions'),
    join(getDataDir(), 'checkpoints'),
    join(getCacheDir(), 'mcp'),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Normalize path for the current platform
 */
export function normalizePath(p: string): string {
  // Expand ~ to home directory
  if (p.startsWith('~')) {
    p = join(getHomeDir(), p.slice(1));
  }

  // Handle Termux $PREFIX
  if (isTermux() && p.startsWith('$PREFIX')) {
    const prefix = process.env.PREFIX || '/data/data/com.termux/files/usr';
    p = p.replace('$PREFIX', prefix);
  }

  return p;
}

/**
 * Check if a path is within the workspace (for sandbox enforcement)
 */
export function isWithinWorkspace(filePath: string, workspaceDir: string): boolean {
  const normalizedFile = normalizePath(filePath);
  const normalizedWorkspace = normalizePath(workspaceDir);

  return normalizedFile.startsWith(normalizedWorkspace);
}

/**
 * Get workspace-relative path
 */
export function getRelativePath(filePath: string, workspaceDir: string): string {
  const normalizedFile = normalizePath(filePath);
  const normalizedWorkspace = normalizePath(workspaceDir);

  if (normalizedFile.startsWith(normalizedWorkspace)) {
    return normalizedFile.slice(normalizedWorkspace.length).replace(/^[\/\\]/, '');
  }

  return filePath;
}

// ============================================================================
// Process Utilities
// ============================================================================

/**
 * Get shell command prefix for the current platform
 */
export function getShellPrefix(): string[] {
  const shell = getDefaultShell();

  if (osPlatform() === 'win32') {
    return [shell, '/c'];
  }

  return [shell, '-c'];
}

/**
 * Check if a command exists on the system
 */
export async function commandExists(cmd: string): Promise<boolean> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const whichCmd = osPlatform() === 'win32' ? 'where' : 'which';
    await execAsync(`${whichCmd} ${cmd}`);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Environment Utilities
// ============================================================================

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] || fallback;
}

/**
 * Get API key for a provider from environment
 */
export function getProviderApiKey(provider: string): string | undefined {
  const envKeys: Record<string, string[]> = {
    openai: ['OPENAI_API_KEY'],
    anthropic: ['ANTHROPIC_API_KEY'],
    google: ['GOOGLE_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GEMINI_API_KEY'],
    mistral: ['MISTRAL_API_KEY'],
    groq: ['GROQ_API_KEY'],
    ollama: ['OLLAMA_HOST'],
    openrouter: ['OPENROUTER_API_KEY'],
  };

  const keys = envKeys[provider.toLowerCase()] || [];
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

// ============================================================================
// Termux-Specific Utilities
// ============================================================================

/**
 * Get Termux $PREFIX directory
 */
export function getTermuxPrefix(): string | undefined {
  if (!isTermux()) return undefined;
  return process.env.PREFIX || '/data/data/com.termux/files/usr';
}

/**
 * Check if running with storage permissions in Termux
 */
export function hasTermuxStorageAccess(): boolean {
  if (!isTermux()) return true;

  const storagePath = '/storage/emulated/0';
  try {
    return existsSync(storagePath);
  } catch {
    return false;
  }
}

/**
 * Get recommended paths for Termux
 */
export function getTermuxPaths(): { home: string; storage?: string; downloads?: string } {
  const home = getHomeDir();

  if (!isTermux()) {
    return { home };
  }

  const result: { home: string; storage?: string; downloads?: string } = { home };

  if (hasTermuxStorageAccess()) {
    result.storage = '/storage/emulated/0';
    result.downloads = '/storage/emulated/0/Download';
  }

  return result;
}
