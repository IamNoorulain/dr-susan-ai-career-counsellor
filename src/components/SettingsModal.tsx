/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Trash2,
  Check,
  Volume2,
  AlertTriangle,
  Sun,
  Moon,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
  Edit2,
} from 'lucide-react';
import { AppSettings, ProviderConfig } from '../types';
import {
  ConnectionTestResult,
  maskApiKey,
  PROVIDER_DEFAULT_MODELS,
  testProviderConnection,
} from '../services/aiProviders';
import { getStoredProviders } from '../services/db';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onClearAllData: () => void;
}

const PROVIDER_KEY_LINKS: Record<string, { label: string; url: string }> = {
  gemini: { label: 'Get Gemini Key', url: 'https://aistudio.google.com/apikey' },
  openai: { label: 'Get OpenAI Key', url: 'https://platform.openai.com/api-keys' },
  grok: { label: 'Get xAI Key', url: 'https://console.x.ai/' },
  deepseek: { label: 'Get DeepSeek Key', url: 'https://platform.deepseek.com/' },
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllData,
}) => {
  const [providers, setProviders] = useState<ProviderConfig[]>(() => {
    if (settings.providers && settings.providers.length > 0) {
      return settings.providers;
    }
    return getStoredProviders();
  });

  const [editingKey, setEditingKey] = useState<Record<string, boolean>>({});
  const [keyDrafts, setKeyDrafts] = useState<Record<string, string>>({});
  const [showDrafts, setShowDrafts] = useState<Record<string, boolean>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});

  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme === 'light' ? 'light' : 'dark');
  const [autoSpeak, setAutoSpeak] = useState(settings.autoSpeakAssistant);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleStartEditKey = (id: string) => {
    setEditingKey((prev) => ({ ...prev, [id]: true }));
    setKeyDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const handleCancelEditKey = (id: string) => {
    setEditingKey((prev) => ({ ...prev, [id]: false }));
    setKeyDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const handleApplyDraftKey = (id: string) => {
    const draft = (keyDrafts[id] || '').trim();
    if (draft) {
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, apiKey: draft, enabled: true } : p))
      );
    }
    setEditingKey((prev) => ({ ...prev, [id]: false }));
    setKeyDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  const handleRemoveKey = (id: string, name: string) => {
    if (window.confirm(`Remove saved API key for ${name}?`)) {
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, apiKey: '' } : p))
      );
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEditingKey((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleToggleEnabled = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleModelChange = (id: string, model: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, model: model.trim() } : p))
    );
  };

  const handleMovePriority = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= providers.length) return;

    const updated = [...providers];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Resequence 1..N priorities
    const resequenced = updated.map((p, idx) => ({ ...p, priority: idx + 1 }));
    setProviders(resequenced);
  };

  const handleTestConnection = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    try {
      const isDrafting = editingKey[provider.id] && (keyDrafts[provider.id] || '').trim();
      const testTarget = isDrafting
        ? { ...provider, apiKey: keyDrafts[provider.id].trim() }
        : provider;

      const result = await testProviderConnection(testTarget);
      setTestResults((prev) => ({ ...prev, [provider.id]: result }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: {
          success: false,
          message: 'Provider configuration error.',
          state: 'failed',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = () => {
    // If any drafts are currently being typed, apply them first
    let updatedProviders = [...providers];
    Object.entries(keyDrafts).forEach(([pid, draft]) => {
      const trimmed = draft.trim();
      if (editingKey[pid] && trimmed) {
        updatedProviders = updatedProviders.map((p) =>
          p.id === pid ? { ...p, apiKey: trimmed, enabled: true } : p
        );
      }
    });

    const gemini = updatedProviders.find((p) => p.id === 'gemini');
    onSaveSettings({
      providers: updatedProviders,
      apiKey: gemini?.apiKey || '',
      language: 'en',
      theme,
      autoSpeakAssistant: autoSpeak,
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full p-4 sm:p-6 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 sm:top-5 right-4 sm:right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl transition cursor-pointer"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-1">
          Settings &amp; Preferences
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Multi-Provider AI Architecture &amp; Application Configuration
        </p>

        {/* SECTION 1: AI Providers & Automatic Fallback */}
        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" /> AI Providers &amp; Fallback Chain
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Configure keys for any provider(s). The counselor tries enabled providers in priority order and automatically falls back if quota or rate limits occur.
              </p>
            </div>
            <div className="shrink-0 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Auto-Fallback
            </div>
          </div>

          <div className="space-y-3.5 mt-4">
            {providers.map((provider, index) => {
              const hasKey = Boolean(provider.apiKey && provider.apiKey.trim().length > 0);
              const isEditing = Boolean(editingKey[provider.id]);
              const draftValue = keyDrafts[provider.id] || '';
              const showDraft = Boolean(showDrafts[provider.id]);
              const testResult = testResults[provider.id];
              const isTesting = testingId === provider.id;
              const link = PROVIDER_KEY_LINKS[provider.id];
              const defaultModels = PROVIDER_DEFAULT_MODELS[provider.id] || [];

              return (
                <div
                  key={provider.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    provider.enabled && hasKey
                      ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-90'
                  }`}
                >
                  {/* Card Header: Priority order, Title, Active dot, Priority arrows, Enable toggle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {provider.name}
                      </span>
                      {hasKey ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Key configured" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No key</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Priority Up / Down */}
                      <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <button
                          type="button"
                          onClick={() => handleMovePriority(index, 'up')}
                          disabled={index === 0}
                          title="Increase Priority (move up)"
                          className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMovePriority(index, 'down')}
                          disabled={index === providers.length - 1}
                          title="Decrease Priority (move down)"
                          className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Enable/Disable Toggle */}
                      <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={provider.enabled}
                          onChange={() => handleToggleEnabled(provider.id)}
                          className="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>{provider.enabled ? 'Enabled' : 'Disabled'}</span>
                      </label>
                    </div>
                  </div>

                  {/* API Key Row: Masked view with Change/Remove buttons OR Input view */}
                  <div className="mb-2.5">
                    {hasKey && !isEditing ? (
                      /* Masked Stored Key View */
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300 tracking-wider pl-1">
                          {maskApiKey(provider.apiKey)}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditKey(provider.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Change API Key
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveKey(provider.id, provider.name)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remove API Key
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Key Input with Show/Hide Toggle */
                      <div className="space-y-1.5">
                        <div className="relative">
                          <input
                            type={showDraft ? 'text' : 'password'}
                            value={draftValue}
                            onChange={(e) =>
                              setKeyDrafts((prev) => ({ ...prev, [provider.id]: e.target.value }))
                            }
                            placeholder={`Enter ${provider.name} API key...`}
                            className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowDrafts((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))
                            }
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                            title={showDraft ? 'Hide key' : 'Show key'}
                          >
                            {showDraft ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                          {hasKey && (
                            <button
                              type="button"
                              onClick={() => handleCancelEditKey(provider.id)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleApplyDraftKey(provider.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Save Key
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Model Selector & Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Model:
                      </span>
                      <select
                        value={provider.model}
                        onChange={(e) => handleModelChange(provider.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {defaultModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Connection Test Button */}
                      <button
                        type="button"
                        onClick={() => handleTestConnection(provider)}
                        disabled={(!hasKey && !draftValue.trim()) || isTesting}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                          !hasKey && !draftValue.trim()
                            ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-400'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-indigo-500' : ''}`} />
                        <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                      </button>

                      {/* Official Key Link */}
                      {link && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                        >
                          {link.label} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Test Result Feedback Banner */}
                  {testResult && (
                    <div
                      className={`mt-2 p-2 rounded-xl text-[11px] font-medium flex items-center gap-2 animate-in fade-in ${
                        testResult.state === 'connected'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          : testResult.state === 'quota' || testResult.state === 'unavailable'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                      }`}
                    >
                      {testResult.state === 'connected' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Voice Settings */}
        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> Auto-Read Counselor Answers
              </span>
              <p className="text-[11px] text-slate-500">
                Speaks assistant responses aloud using speech synthesis
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="w-4 h-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 3: Appearance / Theme */}
        <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2.5">
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-500" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />} Appearance &amp; Theme
          </h3>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`py-2.5 px-3 rounded-2xl border text-center font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'dark'
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-200" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`py-2.5 px-3 rounded-2xl border text-center font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </button>
          </div>
        </div>

        {/* SECTION 4: Data & Local Storage Disclosure */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
            <Shield className="w-3.5 h-3.5 text-indigo-500" /> Privacy &amp; Local Storage
          </h3>
          <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 mb-4 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Your API keys are stored locally in this browser and are used directly from this application. Only enter keys you are comfortable using in a client-side application.
            </p>
          </div>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-500 hover:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Local Sessions &amp; Storage
            </button>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <p className="text-rose-400 font-bold mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Delete all local data?
              </p>
              <p className="text-slate-400 mb-3 text-[11px]">
                This will delete all saved sessions, questionnaires, and stored keys.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllData();
                    setShowClearConfirm(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Confirm Delete All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            {savedNotice ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" /> Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
