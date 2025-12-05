/**
 * Omni CLI - Tools Index
 * Unified tool registry for all available tools
 */

import type { ToolResult, SandboxConfig, ToolDefinition, ApprovalRequest } from '../types.js';
import { fileTools } from './file.js';
import { shellTools } from './shell.js';
import { webTools } from './web.js';

// ============================================================================
// Tool Registry
// ============================================================================

export interface RegisteredTool {
  name: string;
  category: 'file' | 'shell' | 'web' | 'mcp' | 'memory' | 'system';
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  requiresApproval: boolean;
  execute: (args: any) => Promise<ToolResult>;
}

const toolRegistry: Map<string, RegisteredTool> = new Map();

/**
 * Register a tool
 */
export function registerTool(tool: RegisteredTool): void {
  toolRegistry.set(tool.name, tool);
}

/**
 * Get a tool by name
 */
export function getTool(name: string): RegisteredTool | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools
 */
export function getAllTools(): RegisteredTool[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: RegisteredTool['category']): RegisteredTool[] {
  return getAllTools().filter(t => t.category === category);
}

// ============================================================================
// Initialize Built-in Tools
// ============================================================================

function initializeBuiltInTools(): void {
  // File tools
  for (const [name, tool] of Object.entries(fileTools)) {
    registerTool({
      name,
      category: 'file',
      description: tool.description,
      parameters: tool.parameters as any,
      requiresApproval: name.includes('write') || name.includes('edit') || name.includes('delete'),
      execute: tool.execute,
    });
  }

  // Shell tools
  for (const [name, tool] of Object.entries(shellTools)) {
    registerTool({
      name,
      category: 'shell',
      description: tool.description,
      parameters: tool.parameters as any,
      requiresApproval: true, // All shell commands require approval by default
      execute: tool.execute,
    });
  }

  // Web tools
  for (const [name, tool] of Object.entries(webTools)) {
    registerTool({
      name,
      category: 'web',
      description: tool.description,
      parameters: tool.parameters as any,
      requiresApproval: false, // Web tools don't modify local state
      execute: tool.execute,
    });
  }

  // System tools
  registerTool({
    name: 'think',
    category: 'system',
    description: 'Use this tool to think through complex problems step by step',
    parameters: {
      type: 'object',
      properties: {
        thought: { type: 'string', description: 'Your thought process' },
      },
      required: ['thought'],
    },
    requiresApproval: false,
    execute: async (args: { thought: string }) => ({
      success: true,
      output: `Thought: ${args.thought}`,
    }),
  });
}

// Initialize tools on module load
initializeBuiltInTools();

// ============================================================================
// Tool Execution with Approval
// ============================================================================

export interface ToolExecutionContext {
  sandbox: SandboxConfig;
  workspaceDir: string;
  approvalPolicy: 'untrusted' | 'on-failure' | 'on-request' | 'never';
  onApprovalRequest?: (request: ApprovalRequest) => Promise<boolean>;
}

/**
 * Execute a tool with sandbox and approval checks
 */
export async function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const tool = getTool(toolName);

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  // Check if approval is needed
  const needsApproval =
    tool.requiresApproval &&
    context.approvalPolicy !== 'never' &&
    (context.approvalPolicy === 'untrusted' || context.approvalPolicy === 'on-request');

  if (needsApproval && context.onApprovalRequest) {
    const request: ApprovalRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: tool.category === 'file' && toolName.includes('write')
        ? 'file-write'
        : tool.category === 'shell'
        ? 'shell-command'
        : 'mcp-call',
      description: `${tool.name}: ${JSON.stringify(args)}`,
      details: args,
      timestamp: new Date(),
    };

    const approved = await context.onApprovalRequest(request);

    if (!approved) {
      return {
        success: false,
        error: 'Operation was not approved by user',
      };
    }
  }

  try {
    // Execute the tool
    const result = await tool.execute(args);

    // Handle on-failure approval policy
    if (!result.success && context.approvalPolicy === 'on-failure' && context.onApprovalRequest) {
      // This would be where we might ask for retry approval
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Tool execution failed: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// AI SDK Tool Format
// ============================================================================

/**
 * Get tools formatted for AI SDK
 */
export function getToolsForAISDK(): Record<string, any> {
  const tools: Record<string, any> = {};

  for (const tool of getAllTools()) {
    tools[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
    };
  }

  return tools;
}

/**
 * Create tool executor for AI SDK
 */
export function createToolExecutor(context: ToolExecutionContext) {
  return async (toolName: string, args: Record<string, any>): Promise<string> => {
    const result = await executeTool(toolName, args, context);

    if (result.success) {
      return result.output || 'Success';
    } else {
      return `Error: ${result.error}`;
    }
  };
}

// ============================================================================
// Re-exports
// ============================================================================

export { fileTools } from './file.js';
export { shellTools, killAllProcesses } from './shell.js';
export { webTools } from './web.js';
