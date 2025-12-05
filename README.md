# Omni CLI - Universal AI Coding Agent

> **The best of Gemini CLI + OpenAI Codex + Claude Code in one universal CLI**

Omni CLI is a terminal-based AI coding agent that combines the best features from Google's Gemini CLI, OpenAI's Codex, and Anthropic's Claude Code. It supports **multiple AI providers** through the Vercel AI SDK and works everywhere - including **Termux on Android**.

## Features

### Multi-Provider Support (AI SDK)

Switch between AI providers seamlessly:

| Provider | Package | Models |
|----------|---------|--------|
| OpenAI | `@ai-sdk/openai` | GPT-4o, GPT-4, o1, o3 |
| Anthropic | `@ai-sdk/anthropic` | Claude 3.5 Sonnet, Claude 3 Opus |
| Google | `@ai-sdk/google` | Gemini 2.5 Pro, Gemini 2.5 Flash |
| Mistral | `@ai-sdk/mistral` | Mistral Large, Codestral |
| Groq | `@ai-sdk/groq` | Llama 3.3, Mixtral |
| Ollama | Community | Local models |

### Best Features Combined

| Feature | From | Description |
|---------|------|-------------|
| **Context Files** | All | `OMNI.md` / `AGENTS.md` / `GEMINI.md` support |
| **MCP Support** | All | Model Context Protocol for extensions |
| **Sandbox Modes** | Codex | read-only, workspace-write, full-access |
| **Checkpointing** | Gemini | Save/restore conversation states |
| **Session Resume** | All | Resume previous conversations |
| **Vim Mode** | Gemini | Vim keybindings in input |
| **Plugins/Hooks** | Claude | Extensible plugin system |
| **Non-Interactive** | Codex | `omni exec` for automation |
| **Google Search** | Gemini | Web search grounding |
| **Profiles** | Codex | Named configuration presets |
| **Shell Mode** | Gemini | `!` prefix for shell commands |

### Cross-Platform Support

- macOS (Intel & Apple Silicon)
- Linux (x64, ARM64)
- Windows (x64, ARM64)
- **Termux (Android)** - Full support!

## Installation

### npm (All Platforms)

```bash
npm install -g omni-ai-cli
```

### Termux (Android)

```bash
# Install Node.js in Termux
pkg install nodejs-lts

# Install Omni CLI
npm install -g omni-ai-cli

# Set up your API key
export OPENAI_API_KEY="your-key"
# Or for other providers:
export ANTHROPIC_API_KEY="your-key"
export GOOGLE_API_KEY="your-key"
```

### Homebrew (macOS/Linux)

```bash
brew install omni-cli
```

## Quick Start

```bash
# Start interactive mode
omni

# Use a specific provider/model
omni --provider anthropic --model claude-3-5-sonnet-20241022

# Non-interactive mode
omni exec "explain this codebase"

# With full auto mode (allows edits)
omni exec --full-auto "fix the type errors in src/"
```

## Configuration

### Config File Location

- **Linux/macOS**: `~/.config/omni-cli/config.json`
- **Windows**: `%APPDATA%\omni-cli\config.json`
- **Termux**: `~/.config/omni-cli/config.json`

### Example Configuration

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "sandbox": {
    "mode": "workspace-write",
    "networkAccess": false
  },
  "approvalPolicy": "on-request",
  "contextFiles": {
    "primary": "OMNI.md",
    "fallbacks": ["AGENTS.md", "GEMINI.md", "CLAUDE.md"]
  },
  "ui": {
    "vimMode": true,
    "theme": "default"
  },
  "profiles": {
    "fast": {
      "provider": "groq",
      "model": "llama-3.3-70b-versatile"
    },
    "smart": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022"
    }
  }
}
```

### Environment Variables

```bash
# Provider API Keys
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
export MISTRAL_API_KEY="..."
export GROQ_API_KEY="gsk_..."

# Configuration
export OMNI_PROVIDER="anthropic"
export OMNI_MODEL="claude-3-5-sonnet-20241022"
export OMNI_SANDBOX="workspace-write"
```

## Slash Commands

| Command | Description |
|---------|-------------|
| `/help` | Show all commands |
| `/model` | Switch model/provider |
| `/provider` | Switch AI provider |
| `/chat save <tag>` | Save conversation checkpoint |
| `/chat resume <tag>` | Resume saved conversation |
| `/chat list` | List saved checkpoints |
| `/memory show` | Show loaded context files |
| `/memory refresh` | Reload context files |
| `/tools` | List available tools |
| `/mcp list` | List MCP servers |
| `/mcp auth <server>` | Authenticate with MCP server |
| `/settings` | Open settings editor |
| `/sandbox` | Change sandbox mode |
| `/profile <name>` | Switch to a profile |
| `/stats` | Show session statistics |
| `/clear` | Clear screen |
| `/compact` | Compress conversation context |
| `/undo` | Undo last action |
| `/diff` | Show git diff |
| `/vim` | Toggle vim mode |
| `/quit` | Exit |

## Shell Mode

Use `!` to execute shell commands directly:

```bash
> !ls -la
> !git status
> !npm test
```

Toggle shell mode with just `!`.

## At Commands (@)

Reference files directly in your prompt:

```bash
> @src/index.ts explain this file
> @package.json what dependencies do we have?
> @src/ summarize the code in this directory
```

## Context Files

Create an `OMNI.md` (or `AGENTS.md`, `GEMINI.md`) in your project:

```markdown
# Project Context

## Coding Style
- Use TypeScript strict mode
- Prefer functional patterns
- Write comprehensive tests

## Project Structure
- src/ - Source code
- tests/ - Test files
- docs/ - Documentation
```

## MCP Server Integration

Configure MCP servers in `~/.config/omni-cli/config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  }
}
```

## Termux-Specific Notes

Omni CLI is fully compatible with Termux on Android:

1. **No root required** - Works in Termux's sandboxed environment
2. **No Docker needed** - Uses process-level isolation instead
3. **Full feature set** - All features work including MCP servers
4. **Optimized for mobile** - Respects Termux's file paths and limitations

### Termux Setup

```bash
# Update packages
pkg update && pkg upgrade

# Install dependencies
pkg install nodejs-lts git

# Install Omni CLI
npm install -g omni-ai-cli

# Configure (create config directory)
mkdir -p ~/.config/omni-cli

# Add API key to shell profile
echo 'export OPENAI_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc

# Start using
omni
```

## Comparison with Other CLIs

| Feature | Omni CLI | Gemini CLI | OpenAI Codex | Claude Code |
|---------|----------|------------|--------------|-------------|
| Multi-Provider | All | Google only | OpenAI only | Anthropic only |
| Termux Support | Full | Partial | Limited | Limited |
| MCP Support | Full | Full | Full | Full |
| Sandbox | Full | Full | Full | Basic |
| Context Files | All formats | GEMINI.md | AGENTS.md | .claude/ |
| Plugins | Full | Extensions | Limited | Full |
| Vim Mode | Yes | Yes | No | No |
| Session Resume | Yes | Yes | Yes | Yes |
| Non-Interactive | Yes | Yes | Yes | Yes |
| Open Source | Apache 2.0 | Apache 2.0 | Apache 2.0 | Proprietary |

## License

MIT - See [LICENSE](./LICENSE)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

Built with the [Vercel AI SDK](https://ai-sdk.dev/)
