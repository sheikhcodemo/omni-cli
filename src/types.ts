/**
 * Omni CLI - Universal AI Coding Agent
 * Type Definitions
 */

import type { LanguageModel, CoreMessage } from 'ai';

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderName =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'
  | 'groq'
  | 'ollama'
  | 'openrouter';

export interface ProviderConfig {
  name: ProviderName;
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  models: string[];
}

export interface ProviderInstance {
  name: ProviderName;
  model: LanguageModel;
  modelId: string;
}

// ============================================================================
// Sandbox Types (from Codex)
// ============================================================================

export type SandboxMode =
  | 'read-only'           // No writes allowed
  | 'workspace-write'     // Writes only in workspace
  | 'full-access';        // Full filesystem access (danger)

export type NetworkAccess = boolean | 'localhost-only';

export interface SandboxConfig {
  mode: SandboxMode;
  networkAccess: NetworkAccess;
  allowedPaths?: string[];
  deniedPaths?: string[];
  maxFileSize?: number;     // bytes
  timeout?: number;         // ms
}

// ============================================================================
// Approval Policy Types (from Codex)
// ============================================================================

export type ApprovalPolicy =
  | 'untrusted'    // Approve everything
  | 'on-failure'   // Approve only on failures
  | 'on-request'   // Approve when AI requests
  | 'never';       // Never require approval (auto mode)

export interface ApprovalRequest {
  id: string;
  type: 'file-write' | 'file-delete' | 'shell-command' | 'network-request' | 'mcp-call';
  description: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Context Files Types (combined from all CLIs)
// ============================================================================

export interface ContextFilesConfig {
  primary: string;                    // Default: OMNI.md
  fallbacks: string[];                // [AGENTS.md, GEMINI.md, CLAUDE.md]
  maxSize?: number;                   // Max file size to load
  recursive?: boolean;                // Load from parent dirs
}

export interface LoadedContextFile {
  path: string;
  content: string;
  type: 'project' | 'user' | 'global';
}

// ============================================================================
// Session & Checkpoint Types (from Gemini CLI)
// ============================================================================

export interface SessionCheckpoint {
  id: string;
  tag?: string;
  timestamp: Date;
  messages: CoreMessage[];
  context: {
    provider: ProviderName;
    model: string;
    workingDir: string;
  };
  stats: SessionStats;
}

export interface SessionStats {
  startTime: Date;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  toolCalls: number;
  fileReads: number;
  fileWrites: number;
  shellCommands: number;
}

export interface Session {
  id: string;
  checkpoints: SessionCheckpoint[];
  currentCheckpoint: number;
  stats: SessionStats;
}

// ============================================================================
// Profile Types (from Codex)
// ============================================================================

export interface Profile {
  name: string;
  provider?: ProviderName;
  model?: string;
  sandbox?: Partial<SandboxConfig>;
  approvalPolicy?: ApprovalPolicy;
  contextFiles?: Partial<ContextFilesConfig>;
  ui?: Partial<UIConfig>;
}

// ============================================================================
// UI Types
// ============================================================================

export interface UIConfig {
  vimMode: boolean;
  theme: 'default' | 'minimal' | 'colorful';
  showTokenCount: boolean;
  showTimestamp: boolean;
  compactMode: boolean;
  maxOutputHeight?: number;
}

// ============================================================================
// Tool Types
// ============================================================================

export type ToolCategory =
  | 'file'      // File operations
  | 'shell'     // Shell/command execution
  | 'web'       // Web search/fetch
  | 'mcp'       // MCP server tools
  | 'memory'    // Context/memory management
  | 'system';   // System operations

export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiresApproval: boolean;
  sandboxRestrictions?: SandboxMode[];
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  autoConnect?: boolean;
}

export interface MCPConnection {
  name: string;
  config: MCPServerConfig;
  status: 'connected' | 'disconnected' | 'error';
  tools: string[];
  resources: string[];
}

// ============================================================================
// Hook/Plugin Types (from Claude Code)
// ============================================================================

export type HookEvent =
  | 'beforePrompt'
  | 'afterResponse'
  | 'beforeToolCall'
  | 'afterToolCall'
  | 'onError'
  | 'onSessionStart'
  | 'onSessionEnd';

export interface Hook {
  name: string;
  event: HookEvent;
  handler: (context: HookContext) => Promise<HookResult>;
  priority?: number;
}

export interface HookContext {
  event: HookEvent;
  session: Session;
  data: Record<string, unknown>;
}

export interface HookResult {
  continue: boolean;
  modifiedData?: Record<string, unknown>;
  message?: string;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  hooks?: Hook[];
  tools?: ToolDefinition[];
  commands?: SlashCommand[];
  init?: (config: OmniConfig) => Promise<void>;
  cleanup?: () => Promise<void>;
}

// ============================================================================
// Command Types
// ============================================================================

export interface SlashCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  args?: CommandArgument[];
  handler: (args: string[], context: CommandContext) => Promise<CommandResult>;
}

export interface CommandArgument {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  choices?: string[];
}

export interface CommandContext {
  session: Session;
  config: OmniConfig;
  provider: ProviderInstance;
  ui: UIController;
}

export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
  shouldExit?: boolean;
}

export interface UIController {
  print(message: string): void;
  printError(message: string): void;
  printSuccess(message: string): void;
  printWarning(message: string): void;
  prompt(question: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
  spinner(message: string): SpinnerController;
  clear(): void;
}

export interface SpinnerController {
  start(): void;
  stop(): void;
  succeed(message?: string): void;
  fail(message?: string): void;
  update(message: string): void;
}

// ============================================================================
// Main Configuration Type
// ============================================================================

export interface OmniConfig {
  // Provider settings
  provider: ProviderName;
  model: string;

  // Security
  sandbox: SandboxConfig;
  approvalPolicy: ApprovalPolicy;

  // Context
  contextFiles: ContextFilesConfig;

  // UI
  ui: UIConfig;

  // Profiles
  profiles: Record<string, Profile>;
  activeProfile?: string;

  // MCP
  mcpServers: Record<string, MCPServerConfig>;

  // Plugins
  plugins: string[];

  // Session
  sessionDir?: string;
  maxCheckpoints?: number;

  // Advanced
  debug: boolean;
  telemetry: boolean;
  googleSearch?: {
    enabled: boolean;
    apiKey?: string;
  };
}

// ============================================================================
// CLI Argument Types
// ============================================================================

export interface CLIOptions {
  provider?: ProviderName;
  model?: string;
  profile?: string;
  sandbox?: SandboxMode;
  approval?: ApprovalPolicy;
  fullAuto?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  config?: string;
  cwd?: string;
  json?: boolean;
  output?: string;
}

export interface ExecOptions extends CLIOptions {
  prompt: string;
  outputFile?: string;
  json?: boolean;
}

// ============================================================================
// Platform Types
// ============================================================================

export type Platform =
  | 'darwin'      // macOS
  | 'linux'       // Linux
  | 'win32'       // Windows
  | 'android'     // Termux
  | 'unknown';

export interface PlatformInfo {
  platform: Platform;
  isTermux: boolean;
  homeDir: string;
  configDir: string;
  dataDir: string;
  cacheDir: string;
  tempDir: string;
  shell: string;
  arch: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface OmniEvents {
  'message': (message: CoreMessage) => void;
  'tool-call': (tool: string, args: Record<string, unknown>) => void;
  'tool-result': (tool: string, result: ToolResult) => void;
  'error': (error: Error) => void;
  'token': (token: string) => void;
  'stream-start': () => void;
  'stream-end': () => void;
  'approval-request': (request: ApprovalRequest) => void;
  'approval-response': (id: string, approved: boolean) => void;
}
