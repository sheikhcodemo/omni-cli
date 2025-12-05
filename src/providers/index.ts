/**
 * Omni CLI - Multi-Provider System
 * Uses Vercel AI SDK for unified provider access
 */

import type { LanguageModel } from 'ai';
import type { ProviderName, ProviderConfig, ProviderInstance } from '../types.js';
import { getProviderApiKey } from '../utils/platform.js';

// ============================================================================
// Provider Configurations
// ============================================================================

export const PROVIDER_CONFIGS: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: 'openai',
    defaultModel: 'gpt-4o',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1-preview',
      'o1-mini',
      'o3-mini',
    ],
  },
  anthropic: {
    name: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  google: {
    name: 'google',
    defaultModel: 'gemini-2.5-pro-preview-06-05',
    models: [
      'gemini-2.5-pro-preview-06-05',
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ],
  },
  mistral: {
    name: 'mistral',
    defaultModel: 'mistral-large-latest',
    models: [
      'mistral-large-latest',
      'mistral-medium-latest',
      'mistral-small-latest',
      'codestral-latest',
      'open-mistral-nemo',
    ],
  },
  groq: {
    name: 'groq',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ],
  },
  ollama: {
    name: 'ollama',
    defaultModel: 'llama3.2',
    models: [
      'llama3.2',
      'llama3.1',
      'codellama',
      'mistral',
      'mixtral',
      'phi3',
      'qwen2.5-coder',
    ],
  },
  openrouter: {
    name: 'openrouter',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    models: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-405b-instruct',
    ],
  },
};

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Create a provider instance with the specified model
 */
export async function createProvider(
  providerName: ProviderName,
  modelId?: string,
  options?: { apiKey?: string; baseURL?: string }
): Promise<ProviderInstance> {
  const config = PROVIDER_CONFIGS[providerName];
  if (!config) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  const finalModelId = modelId || config.defaultModel!;
  const apiKey = options?.apiKey || getProviderApiKey(providerName);

  let model: LanguageModel;

  switch (providerName) {
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const openai = createOpenAI({
        apiKey,
        baseURL: options?.baseURL,
      });
      model = openai(finalModelId);
      break;
    }

    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic');
      const anthropic = createAnthropic({
        apiKey,
        baseURL: options?.baseURL,
      });
      model = anthropic(finalModelId);
      break;
    }

    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
      const google = createGoogleGenerativeAI({
        apiKey,
        baseURL: options?.baseURL,
      });
      model = google(finalModelId);
      break;
    }

    case 'mistral': {
      const { createMistral } = await import('@ai-sdk/mistral');
      const mistral = createMistral({
        apiKey,
        baseURL: options?.baseURL,
      });
      model = mistral(finalModelId);
      break;
    }

    case 'groq': {
      const { createGroq } = await import('@ai-sdk/groq');
      const groq = createGroq({
        apiKey,
        baseURL: options?.baseURL,
      });
      model = groq(finalModelId);
      break;
    }

    case 'ollama': {
      const { createOllama } = await import('ollama-ai-provider');
      const ollama = createOllama({
        baseURL: options?.baseURL || process.env.OLLAMA_HOST || 'http://localhost:11434/api',
      });
      model = ollama(finalModelId);
      break;
    }

    case 'openrouter': {
      const { createOpenRouter } = await import('@openrouter/ai-sdk-provider');
      const openrouter = createOpenRouter({
        apiKey,
      });
      model = openrouter(finalModelId);
      break;
    }

    default:
      throw new Error(`Provider ${providerName} not implemented`);
  }

  return {
    name: providerName,
    model,
    modelId: finalModelId,
  };
}

// ============================================================================
// Provider Utilities
// ============================================================================

/**
 * Get list of available providers (those with API keys configured)
 */
export function getAvailableProviders(): ProviderName[] {
  const providers: ProviderName[] = [];

  for (const [name] of Object.entries(PROVIDER_CONFIGS)) {
    const providerName = name as ProviderName;
    // Ollama doesn't require an API key
    if (providerName === 'ollama' || getProviderApiKey(providerName)) {
      providers.push(providerName);
    }
  }

  return providers;
}

/**
 * Get models for a provider
 */
export function getProviderModels(providerName: ProviderName): string[] {
  const config = PROVIDER_CONFIGS[providerName];
  return config?.models || [];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerName: ProviderName): string {
  const config = PROVIDER_CONFIGS[providerName];
  return config?.defaultModel || config?.models[0] || '';
}

/**
 * Validate a model exists for a provider
 */
export function isValidModel(providerName: ProviderName, modelId: string): boolean {
  const models = getProviderModels(providerName);
  // Allow any model (for custom/fine-tuned models)
  return models.length === 0 || models.includes(modelId) || true;
}

/**
 * Parse provider:model string
 */
export function parseProviderModel(input: string): { provider: ProviderName; model: string } | null {
  // Format: provider:model or provider/model
  const separators = [':', '/'];

  for (const sep of separators) {
    if (input.includes(sep)) {
      const [provider, ...modelParts] = input.split(sep);
      const model = modelParts.join(sep);

      if (provider && model && provider in PROVIDER_CONFIGS) {
        return { provider: provider as ProviderName, model };
      }
    }
  }

  return null;
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(providerName: ProviderName): string {
  const names: Record<ProviderName, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    mistral: 'Mistral',
    groq: 'Groq',
    ollama: 'Ollama',
    openrouter: 'OpenRouter',
  };
  return names[providerName] || providerName;
}

// ============================================================================
// Provider Status
// ============================================================================

export interface ProviderStatus {
  name: ProviderName;
  displayName: string;
  available: boolean;
  hasApiKey: boolean;
  defaultModel: string;
  modelCount: number;
}

/**
 * Get status of all providers
 */
export function getProvidersStatus(): ProviderStatus[] {
  return Object.entries(PROVIDER_CONFIGS).map(([name, config]) => {
    const providerName = name as ProviderName;
    const hasApiKey = providerName === 'ollama' || !!getProviderApiKey(providerName);

    return {
      name: providerName,
      displayName: getProviderDisplayName(providerName),
      available: hasApiKey,
      hasApiKey,
      defaultModel: config.defaultModel || '',
      modelCount: config.models.length,
    };
  });
}

// ============================================================================
// Re-export AI SDK utilities
// ============================================================================

export { generateText, streamText } from 'ai';
export type { CoreMessage, LanguageModel, ToolExecutionOptions } from 'ai';
