/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLanguage, AppSettings, ConversationSession, ProviderConfig, QuestionnaireAnswers } from '../types';

const DB_NAME = 'CareerCounselorDB';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const STORE_QUESTIONNAIRES = 'questionnaires';

const SETTINGS_KEY = 'career_counselor_settings';
const API_KEY_STORAGE = 'gemini_user_api_key';
const PROVIDERS_STORAGE = 'career_counselor_ai_providers';

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    apiKey: '',
    enabled: true,
    model: 'gemini-3.8-flash',
    priority: 1,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    apiKey: '',
    enabled: true,
    model: 'gpt-4o-mini',
    priority: 2,
  },
  {
    id: 'grok',
    name: 'xAI / Grok',
    apiKey: '',
    enabled: true,
    model: 'grok-2-latest',
    priority: 3,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    apiKey: '',
    enabled: true,
    model: 'deepseek-chat',
    priority: 4,
  },
];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convStore = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
        convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_QUESTIONNAIRES)) {
        db.createObjectStore(STORE_QUESTIONNAIRES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllConversations(): Promise<ConversationSession[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const index = store.index('updatedAt');
      const request = index.openCursor(null, 'prev'); // sort descending
      const results: ConversationSession[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get conversations from IndexedDB:', error);
    return [];
  }
}

export async function getConversation(id: string): Promise<ConversationSession | undefined> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
      const store = tx.objectStore(STORE_CONVERSATIONS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get conversation from IndexedDB:', error);
    return undefined;
  }
}

export async function saveConversation(session: ConversationSession): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONVERSATIONS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllConversations(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CONVERSATIONS, STORE_QUESTIONNAIRES], 'readwrite');
    tx.objectStore(STORE_CONVERSATIONS).clear();
    tx.objectStore(STORE_QUESTIONNAIRES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveQuestionnaire(id: string, answers: QuestionnaireAnswers): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUESTIONNAIRES, 'readwrite');
    const store = tx.objectStore(STORE_QUESTIONNAIRES);
    const request = store.put({ id, answers, savedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLatestQuestionnaire(): Promise<{ id: string; answers: QuestionnaireAnswers } | undefined> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_QUESTIONNAIRES, 'readonly');
      const store = tx.objectStore(STORE_QUESTIONNAIRES);
      const request = store.openCursor(null, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(cursor.value);
        } else {
          resolve(undefined);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get latest questionnaire:', err);
    return undefined;
  }
}

export function getEnvKey(providerId: string): string {
  try {
    const metaEnv = (import.meta as any).env || {};
    if (providerId === 'gemini') {
      return (
        metaEnv.VITE_GEMINI_API_KEY ||
        metaEnv.GEMINI_API_KEY ||
        (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY : '') ||
        ''
      );
    }
    if (providerId === 'openai') {
      return (
        metaEnv.VITE_OPENAI_API_KEY ||
        metaEnv.OPENAI_API_KEY ||
        (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY || process.env?.VITE_OPENAI_API_KEY : '') ||
        ''
      );
    }
    if (providerId === 'grok') {
      return (
        metaEnv.VITE_XAI_API_KEY ||
        metaEnv.VITE_GROK_API_KEY ||
        metaEnv.XAI_API_KEY ||
        metaEnv.GROK_API_KEY ||
        (typeof process !== 'undefined' ? process.env?.XAI_API_KEY || process.env?.GROK_API_KEY : '') ||
        ''
      );
    }
    if (providerId === 'deepseek') {
      return (
        metaEnv.VITE_DEEPSEEK_API_KEY ||
        metaEnv.DEEPSEEK_API_KEY ||
        (typeof process !== 'undefined' ? process.env?.DEEPSEEK_API_KEY || process.env?.VITE_DEEPSEEK_API_KEY : '') ||
        ''
      );
    }
  } catch {
    return '';
  }
  return '';
}

// LocalStorage helpers for Settings & Providers
export function getStoredProviders(): ProviderConfig[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_STORAGE);
    let list: ProviderConfig[] = raw ? JSON.parse(raw) : [];

    // Fallback: If no providers saved yet, seed with DEFAULT_PROVIDERS
    if (!Array.isArray(list) || list.length === 0) {
      const legacyKey = localStorage.getItem(API_KEY_STORAGE) || '';
      list = DEFAULT_PROVIDERS.map((p) => ({
        ...p,
        apiKey: p.id === 'gemini' && legacyKey ? legacyKey : '',
      }));
      localStorage.setItem(PROVIDERS_STORAGE, JSON.stringify(list));
      return list;
    }

    // Ensure all 4 providers are present in the exact order
    const merged: ProviderConfig[] = DEFAULT_PROVIDERS.map((def, idx) => {
      const found = list.find((p) => p.id === def.id);
      if (found) {
        return {
          ...def,
          ...found,
          apiKey: found.apiKey || '',
          priority: typeof found.priority === 'number' ? found.priority : idx + 1,
        };
      }
      return { ...def, apiKey: '', priority: idx + 1 };
    });

    // If Gemini key is empty in list but exists in legacy storage, populate it
    const legacyKey = localStorage.getItem(API_KEY_STORAGE) || '';
    const gemini = merged.find((p) => p.id === 'gemini');
    if (gemini && !gemini.apiKey && legacyKey) {
      gemini.apiKey = legacyKey;
    }

    return merged.sort((a, b) => a.priority - b.priority);
  } catch (err) {
    console.error('Failed to load stored providers:', err);
    return [...DEFAULT_PROVIDERS];
  }
}

export function saveStoredProviders(providers: ProviderConfig[]): void {
  try {
    localStorage.setItem(PROVIDERS_STORAGE, JSON.stringify(providers));
    const gemini = providers.find((p) => p.id === 'gemini');
    if (gemini && gemini.apiKey) {
      setStoredApiKey(gemini.apiKey);
    }
  } catch (err) {
    console.error('Failed to save providers:', err);
  }
}

export function hasAnyConfiguredProvider(): boolean {
  const providers = getStoredProviders();
  return providers.some((p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0);
}

export function getStoredApiKey(): string {
  try {
    const providers = getStoredProviders();
    const active = providers.find((p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0);
    if (active) return active.apiKey;
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE, key.trim());
    const providers = getStoredProviders();
    const gemini = providers.find((p) => p.id === 'gemini');
    if (gemini && gemini.apiKey !== key.trim()) {
      gemini.apiKey = key.trim();
      localStorage.setItem(PROVIDERS_STORAGE, JSON.stringify(providers));
    }
  } catch (e) {
    console.error('Could not save API key to localStorage', e);
  }
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE);
    const providers = getStoredProviders();
    const gemini = providers.find((p) => p.id === 'gemini');
    if (gemini) {
      gemini.apiKey = '';
      localStorage.setItem(PROVIDERS_STORAGE, JSON.stringify(providers));
    }
  } catch (e) {
    console.error('Could not remove API key from localStorage', e);
  }
}

export function getStoredSettings(): AppSettings {
  const providers = getStoredProviders();
  const gemini = providers.find((p) => p.id === 'gemini');
  const defaults: AppSettings = {
    apiKey: gemini?.apiKey || getStoredApiKey(),
    providers,
    theme: 'dark',
    language: 'en',
    autoSpeakAssistant: true,
  };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
      providers: getStoredProviders(),
      language: 'en',
      apiKey: gemini?.apiKey || getStoredApiKey(),
    };
  } catch {
    return defaults;
  }
}

export function saveStoredSettings(settings: Partial<AppSettings>): void {
  try {
    const current = getStoredSettings();
    const updated = { ...current, ...settings };
    if (settings.providers !== undefined) {
      saveStoredProviders(settings.providers);
    }
    if (settings.apiKey !== undefined) {
      setStoredApiKey(settings.apiKey);
    }
    // Omit sensitive data from the general settings payload
    const toSave = { ...updated };
    delete (toSave as { apiKey?: string }).apiKey;
    delete (toSave as { providers?: ProviderConfig[] }).providers;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Could not save settings to localStorage', e);
  }
}
