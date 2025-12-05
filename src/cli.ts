#!/usr/bin/env node
/**
 * Omni CLI - Main Entry Point
 * Universal AI Coding Agent for the Terminal
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { createAgent, Agent } from './agent.js';
import { loadConfig, saveConfig } from './config/index.js';
import { executeSlashCommand, getAllCommands } from './commands/index.js';
import { getPlatformInfo, ensureDirectories } from './utils/platform.js';
import { getAvailableProviders, getProvidersStatus } from './providers/index.js';
import { killAllProcesses } from './tools/shell.js';
import type { OmniConfig, CLIOptions, CommandContext, Session, SessionStats, UIController } from './types.js';

// ============================================================================
// Version & Package Info
// ============================================================================

const VERSION = '1.0.0';
const NAME = 'omni';

// ============================================================================
// UI Controller
// ============================================================================

function createUIController(): UIController {
  return {
    print: (message: string) => console.log(message),
    printError: (message: string) => console.error(chalk.red(message)),
    printSuccess: (message: string) => console.log(chalk.green(message)),
    printWarning: (message: string) => console.log(chalk.yellow(message)),
    prompt: async (question: string): Promise<string> => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise(resolve => {
        rl.question(question, answer => {
          rl.close();
          resolve(answer);
        });
      });
    },
    confirm: async (question: string): Promise<boolean> => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise(resolve => {
        rl.question(`${question} (y/n) `, answer => {
          rl.close();
          resolve(answer.toLowerCase().startsWith('y'));
        });
      });
    },
    spinner: (message: string) => {
      const spinner = ora(message);
      return {
        start: () => spinner.start(),
        stop: () => spinner.stop(),
        succeed: (msg?: string) => spinner.succeed(msg),
        fail: (msg?: string) => spinner.fail(msg),
        update: (msg: string) => { spinner.text = msg; },
      };
    },
    clear: () => {
      process.stdout.write('\x1B[2J\x1B[0f');
    },
  };
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function runInteractive(config: OmniConfig, options: CLIOptions): Promise<void> {
  const ui = createUIController();
  const workspaceDir = options.cwd || process.cwd();

  // Show banner
  console.log(chalk.cyan(`
╭─────────────────────────────────────╮
│         ${chalk.bold('Omni CLI')} v${VERSION}            │
│   Universal AI Coding Agent         │
╰─────────────────────────────────────╯
`));

  // Show platform info
  const platform = getPlatformInfo();
  if (platform.isTermux) {
    console.log(chalk.dim('Running on Termux (Android)\n'));
  }

  // Initialize agent
  const spinner = ui.spinner('Initializing agent...');
  spinner.start();

  let agent: Agent;
  try {
    agent = await createAgent({
      config,
      workspaceDir,
      onToken: (token) => {
        process.stdout.write(token);
      },
      onToolCall: (name, args) => {
        console.log(chalk.dim(`\n🔧 ${name}(${JSON.stringify(args).slice(0, 100)}...)`));
      },
      onToolResult: (name, result) => {
        if (result.success) {
          console.log(chalk.dim(`✓ ${name} completed`));
        } else {
          console.log(chalk.red(`✗ ${name} failed: ${result.error}`));
        }
      },
      onApprovalRequest: async (request) => {
        console.log(chalk.yellow(`\n⚠ Approval required: ${request.description}`));
        return ui.confirm('Allow this action?');
      },
      onError: (error) => {
        console.error(chalk.red(`Error: ${error.message}`));
      },
    });

    spinner.succeed(`Ready! Using ${config.provider}/${config.model}`);
  } catch (error) {
    spinner.fail(`Failed to initialize: ${(error as Error).message}`);
    process.exit(1);
  }

  // Show help hint
  console.log(chalk.dim('Type /help for commands, or start chatting. Press Ctrl+C to exit.\n'));

  // Create session for command context
  const session: Session = agent.getSession();

  // Create command context
  const commandContext: CommandContext = {
    session,
    config,
    provider: null as any, // Will be set
    ui,
  };

  // Main input loop
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue('> '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle shell mode (! prefix)
    if (input.startsWith('!')) {
      const cmd = input.slice(1).trim();
      if (cmd) {
        const { executeCommand } = await import('./tools/shell.js');
        const result = await executeCommand(cmd, { cwd: workspaceDir });
        console.log(result.output || result.error);
      }
      rl.prompt();
      return;
    }

    // Handle slash commands
    if (input.startsWith('/')) {
      const result = await executeSlashCommand(input, commandContext);
      if (result) {
        if (result.message) {
          if (result.success) {
            console.log(result.message);
          } else {
            console.log(chalk.red(result.message));
          }
        }
        if (result.shouldExit) {
          rl.close();
          return;
        }
      }
      rl.prompt();
      return;
    }

    // Handle @ file references
    let processedInput = input;
    const fileRefs = input.match(/@[\w./\-]+/g);
    if (fileRefs) {
      const { readFile } = await import('./tools/file.js');
      for (const ref of fileRefs) {
        const filePath = ref.slice(1);
        const result = await readFile(filePath);
        if (result.success) {
          processedInput = processedInput.replace(
            ref,
            `[File: ${filePath}]\n\`\`\`\n${result.output}\n\`\`\``
          );
        }
      }
    }

    // Send to agent
    try {
      console.log(''); // New line before response
      const response = await agent.chat(processedInput);
      console.log(''); // New line after response

      // Show token usage
      if (config.ui.showTokenCount) {
        console.log(chalk.dim(`[${response.usage.totalTokens} tokens]`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.dim('\nGoodbye!'));
    killAllProcesses();
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.dim('\nInterrupted. Type /quit to exit.'));
    rl.prompt();
  });
}

// ============================================================================
// Non-Interactive Mode (exec)
// ============================================================================

async function runExec(prompt: string, config: OmniConfig, options: CLIOptions): Promise<void> {
  const workspaceDir = options.cwd || process.cwd();

  const agent = await createAgent({
    config,
    workspaceDir,
    onToken: options.quiet ? undefined : (token) => {
      process.stdout.write(token);
    },
    onToolCall: options.verbose ? (name, args) => {
      console.error(chalk.dim(`🔧 ${name}`));
    } : undefined,
    onApprovalRequest: async () => {
      // In full-auto mode, approve everything
      if (options.fullAuto) return true;
      // Otherwise, deny (non-interactive)
      console.error(chalk.yellow('Action requires approval but running in non-interactive mode'));
      return false;
    },
  });

  try {
    const response = await agent.chat(prompt);

    if (!options.quiet) {
      console.log(''); // New line after streaming
    }

    if (options.json) {
      console.log(JSON.stringify({
        content: response.content,
        toolCalls: response.toolCalls,
        usage: response.usage,
      }, null, 2));
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${(error as Error).message}`));
    process.exit(1);
  }
}

// ============================================================================
// Main CLI
// ============================================================================

async function main(): Promise<void> {
  // Ensure directories exist
  ensureDirectories();

  // Load configuration
  let config = loadConfig();

  // Create CLI program
  const program = new Command();

  program
    .name(NAME)
    .version(VERSION)
    .description('Universal AI Coding Agent - The best of Gemini CLI, Codex, and Claude Code')
    .option('-p, --provider <provider>', 'AI provider (openai, anthropic, google, mistral, groq, ollama)')
    .option('-m, --model <model>', 'Model to use')
    .option('--profile <profile>', 'Use a named profile')
    .option('--sandbox <mode>', 'Sandbox mode (read-only, workspace-write, full-access)')
    .option('--approval <policy>', 'Approval policy (untrusted, on-failure, on-request, never)')
    .option('-q, --quiet', 'Minimal output')
    .option('-v, --verbose', 'Verbose output')
    .option('--config <path>', 'Path to config file')
    .option('--cwd <path>', 'Working directory');

  // Default command: interactive mode
  program
    .action(async (options: CLIOptions) => {
      // Apply CLI options to config
      if (options.provider) config.provider = options.provider as any;
      if (options.model) config.model = options.model;
      if (options.sandbox) config.sandbox.mode = options.sandbox as any;
      if (options.approval) config.approvalPolicy = options.approval as any;

      // Check for available providers
      const available = getAvailableProviders();
      if (available.length === 0) {
        console.error(chalk.red('No AI providers configured!'));
        console.error(chalk.yellow('Set an API key:'));
        console.error('  export OPENAI_API_KEY="sk-..."');
        console.error('  export ANTHROPIC_API_KEY="sk-ant-..."');
        console.error('  export GOOGLE_API_KEY="..."');
        process.exit(1);
      }

      // If configured provider not available, switch to first available
      if (!available.includes(config.provider as any)) {
        config.provider = available[0];
        console.log(chalk.yellow(`Switching to available provider: ${config.provider}`));
      }

      await runInteractive(config, options);
    });

  // exec command: non-interactive
  program
    .command('exec <prompt>')
    .description('Run a single prompt and exit')
    .option('--full-auto', 'Automatically approve all actions')
    .option('--json', 'Output response as JSON')
    .option('-o, --output <file>', 'Write output to file')
    .action(async (prompt: string, cmdOptions: any) => {
      const options = { ...program.opts(), ...cmdOptions };

      // Apply CLI options to config
      if (options.provider) config.provider = options.provider;
      if (options.model) config.model = options.model;
      if (options.sandbox) config.sandbox.mode = options.sandbox;
      if (options.approval) config.approvalPolicy = options.approval;
      if (options.fullAuto) config.approvalPolicy = 'never';

      await runExec(prompt, config, options);
    });

  // config command
  program
    .command('config')
    .description('Show or edit configuration')
    .option('--show', 'Show current configuration')
    .option('--set <key=value>', 'Set a configuration value')
    .option('--path', 'Show config file path')
    .action(async (options: any) => {
      if (options.path) {
        const { getConfigPath } = await import('./config/index.js');
        console.log(getConfigPath());
        return;
      }

      if (options.set) {
        const [key, value] = options.set.split('=');
        console.log(`Setting ${key} = ${value}`);
        // TODO: Implement config setting
        return;
      }

      // Default: show config
      console.log(JSON.stringify(config, null, 2));
    });

  // providers command
  program
    .command('providers')
    .description('List available AI providers')
    .action(async () => {
      const status = getProvidersStatus();
      console.log(chalk.bold('\nAvailable Providers:\n'));
      for (const p of status) {
        const indicator = p.available ? chalk.green('✓') : chalk.red('✗');
        console.log(`${indicator} ${chalk.bold(p.displayName)}`);
        console.log(`  Default model: ${p.defaultModel}`);
        console.log(`  Models: ${p.modelCount}`);
        if (!p.hasApiKey && p.name !== 'ollama') {
          console.log(chalk.yellow(`  ⚠ No API key configured`));
        }
        console.log('');
      }
    });

  // Parse and run
  await program.parseAsync(process.argv);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});
