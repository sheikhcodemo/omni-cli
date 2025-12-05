/**
 * Omni CLI - Library Export
 * Universal AI Coding Agent
 *
 * Combines the best features from:
 * - Google Gemini CLI
 * - OpenAI Codex CLI
 * - Anthropic Claude Code
 *
 * With multi-provider support via Vercel AI SDK
 */

// ============================================================================
// Core Exports
// ============================================================================

// Agent
export { Agent, createAgent } from './agent.js';
export type { AgentOptions, AgentResponse } from './agent.js';

// Providers
export {
  createProvider,
  getAvailableProviders,
  getProviderModels,
  getDefaultModel,
  getProvidersStatus,
  parseProviderModel,
  getProviderDisplayName,
  PROVIDER_CONFIGS,
  generateText,
  streamText,
} from './providers/index.js';
export type { ProviderStatus } from './providers/index.js';

// Configuration
export {
  loadConfig,
  saveConfig,
  getConfigPath,
  loadContextFiles,
  formatContextForPrompt,
  applyProfile,
  saveProfile,
  deleteProfile,
  getMCPServers,
  setMCPServer,
  removeMCPServer,
  validateConfig,
  DEFAULT_CONFIG,
} from './config/index.js';

// ============================================================================
// Tools
// ============================================================================

export {
  registerTool,
  getTool,
  getAllTools,
  getToolsByCategory,
  executeTool,
  getToolsForAISDK,
  createToolExecutor,
  fileTools,
  shellTools,
  webTools,
  killAllProcesses,
} from './tools/index.js';

export {
  readFile,
  writeFile,
  editFile,
  deleteFile,
  listDirectory,
  createDirectory,
  searchFiles,
  grepFiles,
  checkSandboxPermission,
} from './tools/file.js';

export {
  executeCommand,
  executeCommands,
  startBackgroundProcess,
  getProcessOutput,
  killProcess,
  listProcesses,
  isCommandDangerous,
  validateCommand,
} from './tools/shell.js';

export {
  fetchUrl,
  fetchAndExtract,
  webSearch,
  searchGoogle,
  searchDuckDuckGo,
  extractTextFromHtml,
} from './tools/web.js';

// ============================================================================
// Commands
// ============================================================================

export {
  registerCommand,
  getCommand,
  getAllCommands,
  executeSlashCommand,
} from './commands/index.js';

// ============================================================================
// MCP
// ============================================================================

export {
  MCPClient,
  MCPManager,
  mcpManager,
} from './mcp/index.js';
export type { MCPTool, MCPResource } from './mcp/index.js';

// ============================================================================
// Platform Utilities
// ============================================================================

export {
  isTermux,
  getPlatform,
  getPlatformInfo,
  getHomeDir,
  getConfigDir,
  getDataDir,
  getCacheDir,
  getTempDir,
  getDefaultShell,
  ensureDirectories,
  normalizePath,
  isWithinWorkspace,
  getRelativePath,
  getShellPrefix,
  commandExists,
  getEnv,
  getProviderApiKey,
  getTermuxPrefix,
  hasTermuxStorageAccess,
  getTermuxPaths,
} from './utils/platform.js';

// ============================================================================
// Types
// ============================================================================

export type {
  // Provider types
  ProviderName,
  ProviderConfig,
  ProviderInstance,

  // Sandbox types
  SandboxMode,
  NetworkAccess,
  SandboxConfig,

  // Approval types
  ApprovalPolicy,
  ApprovalRequest,

  // Context types
  ContextFilesConfig,
  LoadedContextFile,

  // Session types
  SessionCheckpoint,
  SessionStats,
  Session,

  // Profile types
  Profile,

  // UI types
  UIConfig,
  UIController,
  SpinnerController,

  // Tool types
  ToolCategory,
  ToolDefinition,
  ToolParameter,
  ToolResult,

  // MCP types
  MCPServerConfig,
  MCPConnection,

  // Hook/Plugin types
  HookEvent,
  Hook,
  HookContext,
  HookResult,
  Plugin,

  // Command types
  SlashCommand,
  CommandArgument,
  CommandContext,
  CommandResult,

  // Config types
  OmniConfig,

  // CLI types
  CLIOptions,
  ExecOptions,

  // Platform types
  Platform,
  PlatformInfo,

  // Event types
  OmniEvents,
} from './types.js';

// ============================================================================
// Version
// ============================================================================

export const VERSION = '1.0.0';
export const NAME = 'omni-cli';
