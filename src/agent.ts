/**
 * Omni CLI - Agent Core
 * Main AI agent with streaming, tool execution, and session management
 */

import { streamText, generateText, CoreMessage, LanguageModel } from 'ai';
import type {
  OmniConfig,
  Session,
  SessionStats,
  SessionCheckpoint,
  ProviderInstance,
  ToolResult,
  LoadedContextFile,
} from './types.js';
import { createProvider } from './providers/index.js';
import { loadContextFiles, formatContextForPrompt } from './config/index.js';
import { getAllTools, executeTool, getToolsForAISDK, createToolExecutor } from './tools/index.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface AgentOptions {
  config: OmniConfig;
  workspaceDir: string;
  provider?: ProviderInstance;
  onToken?: (token: string) => void;
  onToolCall?: (name: string, args: Record<string, any>) => void;
  onToolResult?: (name: string, result: ToolResult) => void;
  onApprovalRequest?: (request: any) => Promise<boolean>;
  onError?: (error: Error) => void;
}

export interface AgentResponse {
  content: string;
  toolCalls: Array<{ name: string; args: Record<string, any>; result: ToolResult }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(
  config: OmniConfig,
  contextFiles: LoadedContextFile[],
  workspaceDir: string
): string {
  const contextSection = formatContextForPrompt(contextFiles);

  return `You are Omni, a powerful AI coding assistant running in the terminal.

## Capabilities
- Read, write, and edit files
- Execute shell commands
- Search the web for information
- Use MCP (Model Context Protocol) tools
- Help with coding, debugging, and system tasks

## Current Environment
- Working Directory: ${workspaceDir}
- Sandbox Mode: ${config.sandbox.mode}
- Platform: ${process.platform}

## Guidelines
1. Be concise and direct in responses
2. Use tools to accomplish tasks rather than just explaining
3. Always verify file contents before editing
4. Ask for clarification when requirements are unclear
5. Respect sandbox restrictions

## Tool Usage
- Use read_file to examine file contents
- Use write_file to create or overwrite files
- Use edit_file for targeted changes
- Use shell for command execution
- Use web_search for current information

${contextSection ? `\n## Project Context\n${contextSection}` : ''}

When helping with code:
- Write clean, well-documented code
- Follow the project's existing style
- Consider edge cases and error handling
- Test your changes when possible`;
}

// ============================================================================
// Agent Class
// ============================================================================

export class Agent {
  private config: OmniConfig;
  private workspaceDir: string;
  private provider: ProviderInstance | null = null;
  private session: Session;
  private messages: CoreMessage[] = [];
  private contextFiles: LoadedContextFile[] = [];
  private options: AgentOptions;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.workspaceDir = options.workspaceDir;
    this.provider = options.provider || null;
    this.options = options;

    // Initialize session
    this.session = {
      id: uuidv4(),
      checkpoints: [],
      currentCheckpoint: 0,
      stats: this.createInitialStats(),
    };

    // Load context files
    this.contextFiles = loadContextFiles(this.workspaceDir, this.config.contextFiles);
  }

  private createInitialStats(): SessionStats {
    return {
      startTime: new Date(),
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      toolCalls: 0,
      fileReads: 0,
      fileWrites: 0,
      shellCommands: 0,
    };
  }

  /**
   * Initialize the agent with a provider
   */
  async initialize(): Promise<void> {
    if (!this.provider) {
      this.provider = await createProvider(
        this.config.provider,
        this.config.model
      );
    }

    // Add system message
    const systemPrompt = buildSystemPrompt(
      this.config,
      this.contextFiles,
      this.workspaceDir
    );

    this.messages = [
      { role: 'system', content: systemPrompt },
    ];
  }

  /**
   * Send a message and get a streaming response
   */
  async chat(userMessage: string): Promise<AgentResponse> {
    if (!this.provider) {
      throw new Error('Agent not initialized. Call initialize() first.');
    }

    // Add user message
    this.messages.push({ role: 'user', content: userMessage });

    const toolCalls: AgentResponse['toolCalls'] = [];
    let fullContent = '';

    // Get tools for AI SDK
    const tools = this.buildToolDefinitions();

    try {
      // Use streamText for streaming responses
      const response = await streamText({
        model: this.provider.model,
        messages: this.messages,
        tools,
        maxSteps: 10, // Allow multiple tool calls
        onChunk: ({ chunk }) => {
          if (chunk.type === 'text-delta' && this.options.onToken) {
            this.options.onToken(chunk.textDelta);
          }
        },
      });

      // Process the stream
      for await (const part of response.fullStream) {
        switch (part.type) {
          case 'text-delta':
            fullContent += part.textDelta;
            break;

          case 'tool-call':
            const toolName = part.toolName;
            const toolArgs = part.args as Record<string, any>;

            if (this.options.onToolCall) {
              this.options.onToolCall(toolName, toolArgs);
            }

            // Track stats
            this.updateToolStats(toolName);
            break;

          case 'tool-result':
            const result: ToolResult = {
              success: true,
              output: typeof part.result === 'string' ? part.result : JSON.stringify(part.result),
            };

            toolCalls.push({
              name: part.toolName,
              args: part.args as Record<string, any>,
              result,
            });

            if (this.options.onToolResult) {
              this.options.onToolResult(part.toolName, result);
            }
            break;
        }
      }

      // Get final usage stats
      const usage = await response.usage;

      // Update session stats
      this.session.stats.promptTokens += usage.promptTokens;
      this.session.stats.completionTokens += usage.completionTokens;
      this.session.stats.totalTokens += usage.totalTokens;

      // Add assistant message
      this.messages.push({ role: 'assistant', content: fullContent });

      return {
        content: fullContent,
        toolCalls,
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
      };
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Build tool definitions for AI SDK
   */
  private buildToolDefinitions(): Record<string, any> {
    const tools = getAllTools();
    const definitions: Record<string, any> = {};

    for (const tool of tools) {
      definitions[tool.name] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: async (args: Record<string, any>) => {
          const result = await executeTool(tool.name, args, {
            sandbox: this.config.sandbox,
            workspaceDir: this.workspaceDir,
            approvalPolicy: this.config.approvalPolicy,
            onApprovalRequest: this.options.onApprovalRequest,
          });

          return result.success ? result.output : `Error: ${result.error}`;
        },
      };
    }

    return definitions;
  }

  /**
   * Update tool usage stats
   */
  private updateToolStats(toolName: string): void {
    this.session.stats.toolCalls++;

    if (toolName.includes('read_file') || toolName.includes('list_directory')) {
      this.session.stats.fileReads++;
    } else if (toolName.includes('write_file') || toolName.includes('edit_file')) {
      this.session.stats.fileWrites++;
    } else if (toolName === 'shell' || toolName.includes('process')) {
      this.session.stats.shellCommands++;
    }
  }

  /**
   * Save a checkpoint
   */
  saveCheckpoint(tag?: string): SessionCheckpoint {
    const checkpoint: SessionCheckpoint = {
      id: uuidv4(),
      tag,
      timestamp: new Date(),
      messages: [...this.messages],
      context: {
        provider: this.config.provider,
        model: this.config.model,
        workingDir: this.workspaceDir,
      },
      stats: { ...this.session.stats },
    };

    this.session.checkpoints.push(checkpoint);
    this.session.currentCheckpoint = this.session.checkpoints.length - 1;

    // Limit checkpoints
    if (this.session.checkpoints.length > (this.config.maxCheckpoints || 10)) {
      this.session.checkpoints.shift();
      this.session.currentCheckpoint--;
    }

    return checkpoint;
  }

  /**
   * Restore from a checkpoint
   */
  restoreCheckpoint(idOrTag: string): boolean {
    const checkpoint = this.session.checkpoints.find(
      c => c.id === idOrTag || c.tag === idOrTag
    );

    if (!checkpoint) {
      return false;
    }

    this.messages = [...checkpoint.messages];
    this.session.currentCheckpoint = this.session.checkpoints.indexOf(checkpoint);

    return true;
  }

  /**
   * Compact the conversation (summarize older messages)
   */
  async compact(): Promise<void> {
    if (this.messages.length <= 4) {
      return; // Not enough messages to compact
    }

    // Keep system message and last 2 exchanges
    const systemMessage = this.messages[0];
    const recentMessages = this.messages.slice(-4);
    const oldMessages = this.messages.slice(1, -4);

    if (oldMessages.length === 0) {
      return;
    }

    // Summarize old messages
    const summary = oldMessages
      .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content.slice(0, 200) : '[complex content]'}`)
      .join('\n');

    const summaryMessage: CoreMessage = {
      role: 'system',
      content: `[Previous conversation summary]\n${summary}\n[End summary]`,
    };

    this.messages = [systemMessage, summaryMessage, ...recentMessages];
  }

  /**
   * Get session info
   */
  getSession(): Session {
    return this.session;
  }

  /**
   * Get current messages
   */
  getMessages(): CoreMessage[] {
    return this.messages;
  }

  /**
   * Clear the conversation
   */
  clear(): void {
    const systemMessage = this.messages[0];
    this.messages = [systemMessage];
    this.session.stats = this.createInitialStats();
  }

  /**
   * Switch provider/model
   */
  async switchProvider(providerName: string, modelId?: string): Promise<void> {
    this.provider = await createProvider(providerName as any, modelId);
    this.config.provider = providerName as any;
    if (modelId) {
      this.config.model = modelId;
    }
  }

  /**
   * Refresh context files
   */
  refreshContext(): LoadedContextFile[] {
    this.contextFiles = loadContextFiles(this.workspaceDir, this.config.contextFiles);

    // Update system message with new context
    const systemPrompt = buildSystemPrompt(
      this.config,
      this.contextFiles,
      this.workspaceDir
    );

    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0] = { role: 'system', content: systemPrompt };
    }

    return this.contextFiles;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export async function createAgent(options: AgentOptions): Promise<Agent> {
  const agent = new Agent(options);
  await agent.initialize();
  return agent;
}
