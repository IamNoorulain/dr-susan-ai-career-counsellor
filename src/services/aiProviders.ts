/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { COUNSELOR_SYSTEM_INSTRUCTION } from '../constants/counselorPersona';
import {
  AIErrorCode,
  AIProviderId,
  ChatMessage,
  ProviderConfig,
  QuestionnaireAnswers,
} from '../types';

export class AIError extends Error {
  code: AIErrorCode;
  providerId?: AIProviderId;
  originalError?: unknown;

  constructor(
    message: string,
    code: AIErrorCode = 'UNKNOWN',
    providerId?: AIProviderId,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.providerId = providerId;
    this.originalError = originalError;
  }
}

// Retain GeminiError as subclass of AIError for full backwards compatibility
export class GeminiError extends AIError {
  constructor(
    message: string,
    code: AIErrorCode = 'UNKNOWN',
    originalError?: unknown
  ) {
    super(message, code, 'gemini', originalError);
    this.name = 'GeminiError';
  }
}

export const PROVIDER_DEFAULT_MODELS: Record<AIProviderId, string[]> = {
  gemini: ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  grok: ['grok-2-latest', 'grok-2', 'grok-2-1212'],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

export const PROVIDER_ENDPOINTS: Record<Exclude<AIProviderId, 'gemini'>, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  grok: 'https://api.x.ai/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
};

let lastUsedProviderName: string | null = null;

export function getLastUsedProviderName(): string | null {
  return lastUsedProviderName;
}

export function setLastUsedProviderName(name: string | null): void {
  lastUsedProviderName = name;
}

export type ConnectionTestResult = {
  success: boolean;
  message: string;
  state: 'connected' | 'invalid_key' | 'quota' | 'unavailable' | 'failed';
};

/**
 * Mask stored API key to protect user privacy (e.g. ••••••••••1234)
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 4) return '••••';
  const last4 = trimmed.slice(-4);
  return `••••••••••${last4}`;
}

/**
 * Fetch available models dynamically for supported providers
 */
export async function fetchProviderModels(
  providerId: AIProviderId,
  apiKey: string
): Promise<string[]> {
  const trimmed = apiKey ? apiKey.trim() : '';
  if (!trimmed) return PROVIDER_DEFAULT_MODELS[providerId];

  try {
    if (providerId === 'grok') {
      const res = await fetch('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.data || [])
          .map((m: { id?: string }) => m.id as string)
          .filter(
            (id: string) =>
              typeof id === 'string' &&
              !id.includes('embedding') &&
              !id.includes('image')
          );
        if (models.length > 0) {
          return Array.from(new Set(['grok-2-latest', ...models]));
        }
      }
    } else if (providerId === 'deepseek') {
      const res = await fetch('https://api.deepseek.com/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.data || [])
          .map((m: { id?: string }) => m.id as string)
          .filter((id: string) => typeof id === 'string');
        if (models.length > 0) {
          return Array.from(new Set(['deepseek-chat', 'deepseek-reasoner', ...models]));
        }
      }
    } else if (providerId === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
      if (res.ok) {
        const data = await res.json();
        const chatModels = (data.data || [])
          .map((m: { id?: string }) => m.id as string)
          .filter(
            (id: string) =>
              typeof id === 'string' &&
              (id.startsWith('gpt-4') ||
                id.startsWith('gpt-3.5') ||
                id.startsWith('o1') ||
                id.startsWith('o3'))
          );
        if (chatModels.length > 0) {
          return Array.from(new Set(['gpt-4o-mini', 'gpt-4o', ...chatModels]));
        }
      }
    }
  } catch {
    // Return fallback list on network or permission failure
  }
  return PROVIDER_DEFAULT_MODELS[providerId];
}

/**
 * Normalizes HTTP and SDK errors into unified AIError classification
 */
export function classifyProviderError(
  err: unknown,
  provider: ProviderConfig
): AIError {
  const errStr = String(err ?? '');
  const errMsg = (err as { message?: string })?.message || errStr;
  const status = (err as { status?: number })?.status;
  const lower = errMsg.toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('incorrect api key') ||
    lower.includes('authentication') ||
    lower.includes('unauthorized') ||
    lower.includes('invalid_api_key')
  ) {
    return new AIError(
      `Invalid API key or unauthorized for ${provider.name}.`,
      'INVALID_KEY',
      provider.id,
      err
    );
  }

  if (
    status === 402 ||
    status === 429 ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('insufficient') ||
    lower.includes('balance') ||
    lower.includes('credits')
  ) {
    return new AIError(
      `Rate limit or usage credits exhausted on ${provider.name}.`,
      'QUOTA_EXCEEDED',
      provider.id,
      err
    );
  }

  if (
    status === 404 ||
    lower.includes('model_not_found') ||
    lower.includes('model unavailable') ||
    lower.includes('requested entity was not found') ||
    lower.includes('not supported')
  ) {
    return new AIError(
      `Model '${provider.model}' is currently unavailable on ${provider.name}.`,
      'MODEL_UNAVAILABLE',
      provider.id,
      err
    );
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('offline')
  ) {
    return new AIError(
      `Network connection to ${provider.name} failed.`,
      'NETWORK_ERROR',
      provider.id,
      err
    );
  }

  if (status && status >= 500) {
    return new AIError(
      `${provider.name} service is temporarily unavailable (status ${status}).`,
      'PROVIDER_ERROR',
      provider.id,
      err
    );
  }

  return new AIError(
    errMsg || `An error occurred while communicating with ${provider.name}.`,
    'UNKNOWN',
    provider.id,
    err
  );
}

/**
 * Lightweight connection test for each provider returning explicit statuses:
 * - "Connected"
 * - "Invalid API key"
 * - "API connected, but this account currently has no available usage/credits."
 * - "API connected, but the selected model is unavailable."
 * - "Provider configuration error."
 */
export async function testProviderConnection(
  provider: ProviderConfig
): Promise<ConnectionTestResult> {
  const key = provider.apiKey.trim();
  if (!key) {
    return {
      success: false,
      message: 'Invalid API key',
      state: 'invalid_key',
    };
  }

  const model = provider.model || PROVIDER_DEFAULT_MODELS[provider.id][0];

  // Gemini Provider test
  if (provider.id === 'gemini') {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const resp = await ai.models.generateContent({
        model,
        contents: 'Reply with OK.',
      });
      if (resp && resp.text) {
        return {
          success: true,
          message: 'Connected',
          state: 'connected',
        };
      }
      return {
        success: false,
        message: 'Provider configuration error.',
        state: 'failed',
      };
    } catch (err: unknown) {
      const errMsg = String((err as { message?: string })?.message || err || '').toLowerCase();
      const status = (err as { status?: number })?.status;

      if (
        status === 401 ||
        status === 403 ||
        errMsg.includes('api_key_invalid') ||
        errMsg.includes('api key not valid') ||
        errMsg.includes('unauthorized') ||
        errMsg.includes('permission_denied')
      ) {
        return {
          success: false,
          message: 'Invalid API key',
          state: 'invalid_key',
        };
      }
      if (
        status === 429 ||
        errMsg.includes('resource_exhausted') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit')
      ) {
        return {
          success: false,
          message: 'API connected, but this account currently has no available usage/credits.',
          state: 'quota',
        };
      }
      if (
        status === 404 ||
        errMsg.includes('not found') ||
        errMsg.includes('model')
      ) {
        return {
          success: false,
          message: 'API connected, but the selected model is unavailable.',
          state: 'unavailable',
        };
      }
      return {
        success: false,
        message: 'Provider configuration error.',
        state: 'failed',
      };
    }
  }

  // OpenAI, xAI / Grok, and DeepSeek test
  const endpoint = PROVIDER_ENDPOINTS[provider.id as keyof typeof PROVIDER_ENDPOINTS];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with OK.' }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return {
        success: true,
        message: 'Connected',
        state: 'connected',
      };
    }

    let errorDetail = '';
    try {
      const data = await res.json();
      errorDetail =
        data?.error?.message || data?.message || (typeof data === 'string' ? data : JSON.stringify(data));
    } catch {
      errorDetail = res.statusText || '';
    }
    const lower = errorDetail.toLowerCase();

    // 1. Invalid API key
    if (
      res.status === 401 ||
      res.status === 403 ||
      lower.includes('invalid_api_key') ||
      lower.includes('api key not valid') ||
      lower.includes('incorrect api key') ||
      lower.includes('authentication') ||
      lower.includes('unauthorized')
    ) {
      return {
        success: false,
        message: 'Invalid API key',
        state: 'invalid_key',
      };
    }

    // 2. Account usage/credits exhausted (DeepSeek 402, 429, or messages about balance/credits)
    if (
      res.status === 402 ||
      res.status === 429 ||
      lower.includes('insufficient') ||
      lower.includes('balance') ||
      lower.includes('credits') ||
      lower.includes('quota') ||
      lower.includes('rate limit')
    ) {
      return {
        success: false,
        message: 'API connected, but this account currently has no available usage/credits.',
        state: 'quota',
      };
    }

    // 3. Selected model unavailable
    if (
      res.status === 404 ||
      (lower.includes('model') &&
        (lower.includes('not found') ||
          lower.includes('unavailable') ||
          lower.includes('does not exist')))
    ) {
      return {
        success: false,
        message: 'API connected, but the selected model is unavailable.',
        state: 'unavailable',
      };
    }

    // 4. Other configuration error
    return {
      success: false,
      message: 'Provider configuration error.',
      state: 'failed',
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: 'Provider configuration error.',
      state: 'failed',
    };
  }
}

/**
 * Universal call to OpenAI-compatible Chat Completions API (OpenAI, xAI/Grok, DeepSeek)
 */
async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  systemInstruction: string,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  temperature: number
): Promise<string> {
  const fullMessages = [
    { role: 'system' as const, content: systemInstruction },
    ...messages,
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        errMsg = data?.error?.message || data?.message || errMsg;
      } catch {
        errMsg = res.statusText || errMsg;
      }
      const err = new Error(errMsg);
      (err as unknown as { status?: number }).status = res.status;
      throw err;
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new Error('Model returned an empty response.');
    }
    return content;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if ((err as { name?: string })?.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out while waiting for AI response.');
      (timeoutErr as unknown as { code?: string }).code = 'NETWORK_ERROR';
      throw timeoutErr;
    }
    throw err;
  }
}

/**
 * Executes a function with automatic priority-ordered fallback across enabled providers
 */
export async function executeWithFallback<T>(
  configuredProviders: ProviderConfig[],
  execute: (provider: ProviderConfig) => Promise<T>
): Promise<{ result: T; usedProvider: ProviderConfig }> {
  // Filter for enabled providers with non-empty API keys
  const eligible = configuredProviders
    .filter((p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0)
    .sort((a, b) => a.priority - b.priority);

  if (eligible.length === 0) {
    throw new AIError(
      'Please configure at least one AI provider to continue.',
      'INVALID_KEY'
    );
  }

  const errors: Array<{ provider: string; error: AIError }> = [];

  for (const provider of eligible) {
    try {
      const result = await execute(provider);
      setLastUsedProviderName(provider.name);
      return { result, usedProvider: provider };
    } catch (err) {
      const classified = classifyProviderError(err, provider);
      console.warn(
        `[Multi-Provider Fallback] Provider "${provider.name}" failed: ${classified.message}. Attempting next configured provider if available...`
      );
      errors.push({ provider: provider.name, error: classified });
    }
  }

  // All enabled providers failed
  const errorDetails = errors
    .map((e) => `${e.provider}: ${e.error.message}`)
    .join(' | ');
  console.error('[Multi-Provider Fallback] All providers failed:', errorDetails);

  throw new AIError(
    'All configured AI providers are currently unavailable. Please check your API keys, quotas, or provider settings.',
    'PROVIDER_ERROR'
  );
}

/**
 * Dispatch initial questionnaire analysis to a specific provider
 */
export async function generateInitialAssessmentWithProvider(
  provider: ProviderConfig,
  batchPrompt: string
): Promise<string> {
  const model = provider.model || PROVIDER_DEFAULT_MODELS[provider.id][0];

  if (provider.id === 'gemini') {
    const ai = new GoogleGenAI({
      apiKey: provider.apiKey.trim(),
    });

    const response = await ai.models.generateContent({
      model,
      contents: batchPrompt,
      config: {
        systemInstruction: COUNSELOR_SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    });

    const text = response.text;
    if (!text || !text.trim()) {
      throw new Error('Empty response returned by Gemini.');
    }
    return text;
  }

  // OpenAI, Grok, DeepSeek
  const endpoint = PROVIDER_ENDPOINTS[provider.id as keyof typeof PROVIDER_ENDPOINTS];
  return callOpenAICompatible(
    endpoint,
    provider.apiKey,
    model,
    COUNSELOR_SYSTEM_INSTRUCTION,
    [{ role: 'user', content: batchPrompt }],
    0.6
  );
}

const FOLLOW_UP_GUARDRAILS = `
STRICT TOPIC & RELEVANCE GUARDRAIL (CRITICAL):
You are Dr. Susan Black's AI Career Counseling Assistant.
You ONLY answer questions directly related to careers, education, college/university degrees, academic studies, professional skills development, learning roadmaps, job searching, certifications, and balancing study with personal constraints.
If the student asks about ANYTHING ELSE (including but not limited to general coding/debugging unrelated to career choice, recipes, weather, gaming, movies, jokes, math homework, general trivia, politics, relationships, or casual chit-chat):
You MUST IMMEDIATELY AND STRICTLY RESPOND WITH EXACTLY:
"I am sorry, Please ask career related questions"
(Do NOT answer the non-career question, do NOT provide solutions to off-topic prompts, and do NOT engage in unrelated conversation).

RESPONSE FORMATTING & LENGTH RULES (CRITICAL):
1. Keep your response CONCISE, SHORT, and focused (strictly between 70 and 160 words maximum). Avoid long walls of text.
2. Answer the student's specific career or study question directly. Do not repeat their entire profile summary.
3. NEVER use hashtag titles like "# Heading" or "## Heading" or "### Heading". Use clear, clean bullet points or bold labels instead.
4. Format lists with clean bullet points so they are effortless to read on mobile screens.
5. Provide practical, high-value next steps grounded in Dr. Sue Black OBE's philosophy.`;

/**
 * Dispatch follow-up chat message to a specific provider
 */
export async function generateFollowUpWithProvider(
  provider: ProviderConfig,
  answers: QuestionnaireAnswers,
  previousMessages: ChatMessage[],
  newMessage: string
): Promise<string> {
  const model = provider.model || PROVIDER_DEFAULT_MODELS[provider.id][0];
  const langInstruction = 'LANGUAGE REQUIREMENT: Respond in clear, professional English.';

  const compactProfile = `Student Profile Context:
- Academic Level: ${answers.educationLevel || 'N/A'}
- Enjoyed Subjects: ${answers.enjoyedSubjects || 'N/A'}
- Strengths: ${answers.strengths || 'N/A'}
- Career Values: ${answers.careerValues || 'N/A'}
- Constraints: ${answers.practicalConstraints || 'N/A'}`;

  const currentTurnPrompt = `[System Context: ${compactProfile} | ${langInstruction}]
Student Question: ${newMessage}`;

  const fullSystemInstruction = `${COUNSELOR_SYSTEM_INSTRUCTION}\n${FOLLOW_UP_GUARDRAILS}`;

  if (provider.id === 'gemini') {
    const ai = new GoogleGenAI({
      apiKey: provider.apiKey.trim(),
    });

    const recentHistory = previousMessages.slice(-6).map((msg) => ({
      role: msg.role === 'user' ? ('user' as const) : ('model' as const),
      parts: [{ text: msg.content }],
    }));

    const contents = [
      ...recentHistory,
      {
        role: 'user' as const,
        parts: [{ text: currentTurnPrompt }],
      },
    ];

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: fullSystemInstruction,
        temperature: 0.5,
      },
    });

    const text = response.text;
    if (!text || !text.trim()) {
      throw new Error('Empty response returned by Gemini.');
    }
    return text;
  }

  // OpenAI, Grok, DeepSeek
  const endpoint = PROVIDER_ENDPOINTS[provider.id as keyof typeof PROVIDER_ENDPOINTS];

  const recentHistory = previousMessages.slice(-6).map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: msg.content,
  }));

  const chatMessages = [
    ...recentHistory,
    {
      role: 'user' as const,
      content: currentTurnPrompt,
    },
  ];

  return callOpenAICompatible(
    endpoint,
    provider.apiKey,
    model,
    fullSystemInstruction,
    chatMessages,
    0.5
  );
}
