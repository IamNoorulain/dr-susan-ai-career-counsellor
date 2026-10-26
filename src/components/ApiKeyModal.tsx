/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Edit2,
  Trash2,
  Check,
} from 'lucide-react';
import { AIProviderId, ProviderConfig } from '../types';
import {
  ConnectionTestResult,
  fetchProviderModels,
  maskApiKey,
  PROVIDER_DEFAULT_MODELS,
  testProviderConnection,
} from '../services/aiProviders';
import { getStoredProviders, saveStoredProviders } from '../services/db';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (apiKey: string, providerId?: AIProviderId) => void;
  onProvidersUpdated?: (providers: ProviderConfig[]) => void;
  isFirstLaunch?: boolean;
}

const PROVIDER_METADATA: Record<
  AIProviderId,
  { name: string; placeholder: string; getKeyUrl: string; keyLabel: string; order: number }
> = {
  gemini: {
    name: 'Google Gemini',
    placeholder: 'AIzaSy...',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    keyLabel: 'Google AI Studio',
    order: 1,
  },
  openai: {
    name: 'OpenAI',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    keyLabel: 'OpenAI Platform',
    order: 2,
  },
  grok: {
    name: 'xAI / Grok',
    placeholder: 'xai-...',
    getKeyUrl: 'https://console.x.ai/',
    keyLabel: 'xAI Console',
    order: 3,
  },
  deepseek: {
    name: 'DeepSeek',
    placeholder: 'sk-...',
    getKeyUrl: 'https://platform.deepseek.com/',
    keyLabel: 'DeepSeek Platform',
    order: 4,
  },
};

const PROVIDER_ORDER: AIProviderId[] = ['gemini', 'openai', 'grok', 'deepseek'];

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onProvidersUpdated,
  isFirstLaunch = false,
}) => {
  const [providers, setProviders] = useState<ProviderConfig[]>(() => getStoredProviders());
  const [selectedProviderId, setSelectedProviderId] = useState<AIProviderId>('gemini');
  const [showPassword, setShowPassword] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const [editingKey, setEditingKey] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dynamicModels, setDynamicModels] = useState<Record<string, string[]>>({});

  // Reset or load state when modal opens
  useEffect(() => {
    if (isOpen) {
      const stored = getStoredProviders();
      setProviders(stored);
      setValidationError(null);
      // Gemini is default provider
      setSelectedProviderId('gemini');
      setEditingKey({});
      setKeyDraft('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentProvider =
    providers.find((p) => p.id === selectedProviderId) || providers[0];
  const currentMeta = PROVIDER_METADATA[selectedProviderId];
  const hasSavedKey = Boolean(
    currentProvider.apiKey && currentProvider.apiKey.trim().length > 0
  );
  const isEditingThisKey = Boolean(editingKey[selectedProviderId]);
  const currentTestResult = testResults[selectedProviderId];
  const isTestingCurrent = testingId === selectedProviderId;

  const configuredCount = providers.filter(
    (p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0
  ).length;

  const handleSelectProvider = (pid: AIProviderId) => {
    setSelectedProviderId(pid);
    setValidationError(null);
    setShowPassword(false);
    setKeyDraft('');
  };

  const handleStartEditKey = (pid: string) => {
    setEditingKey((prev) => ({ ...prev, [pid]: true }));
    setKeyDraft('');
    setValidationError(null);
  };

  const handleCancelEditKey = (pid: string) => {
    setEditingKey((prev) => ({ ...prev, [pid]: false }));
    setKeyDraft('');
    setValidationError(null);
  };

  const handleSaveDraftKey = (pid: string) => {
    const trimmed = keyDraft.trim();
    if (!trimmed) {
      setValidationError(`Please enter a valid key for ${PROVIDER_METADATA[pid as AIProviderId].name}.`);
      return;
    }
    const updated = providers.map((p) =>
      p.id === pid ? { ...p, apiKey: trimmed, enabled: true } : p
    );
    setProviders(updated);
    saveStoredProviders(updated);
    setEditingKey((prev) => ({ ...prev, [pid]: false }));
    setKeyDraft('');
    setValidationError(null);

    // Fetch dynamic models in background if available
    fetchProviderModels(pid as AIProviderId, trimmed).then((models) => {
      if (models && models.length > 0) {
        setDynamicModels((prev) => ({ ...prev, [pid]: models }));
      }
    });
  };

  const handleRemoveKey = (pid: string, name: string) => {
    if (window.confirm(`Remove saved API key for ${name}?`)) {
      const updated = providers.map((p) =>
        p.id === pid ? { ...p, apiKey: '' } : p
      );
      setProviders(updated);
      saveStoredProviders(updated);
      setTestResults((prev) => {
        const next = { ...prev };
        delete next[pid];
        return next;
      });
      setEditingKey((prev) => ({ ...prev, [pid]: false }));
      setValidationError(null);
    }
  };

  const handleToggleEnabled = (pid: string) => {
    const updated = providers.map((p) =>
      p.id === pid ? { ...p, enabled: !p.enabled } : p
    );
    setProviders(updated);
    saveStoredProviders(updated);
  };

  const handleModelChange = (pid: string, model: string) => {
    const updated = providers.map((p) =>
      p.id === pid ? { ...p, model: model.trim() } : p
    );
    setProviders(updated);
    saveStoredProviders(updated);
  };

  const handleTestConnection = async (provider: ProviderConfig) => {
    setTestingId(provider.id);
    setValidationError(null);
    try {
      // If currently drafting a key, test with the draft key
      const testTarget =
        isEditingThisKey && keyDraft.trim()
          ? { ...provider, apiKey: keyDraft.trim() }
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

  const handleContinue = () => {
    // If currently editing key with content, save it first
    let currentProviderList = [...providers];
    if (isEditingThisKey && keyDraft.trim()) {
      currentProviderList = providers.map((p) =>
        p.id === selectedProviderId ? { ...p, apiKey: keyDraft.trim(), enabled: true } : p
      );
      setProviders(currentProviderList);
      saveStoredProviders(currentProviderList);
    }

    const hasAtLeastOne = currentProviderList.some(
      (p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0
    );

    if (!hasAtLeastOne) {
      setValidationError('Please configure at least one AI provider to continue.');
      return;
    }

    saveStoredProviders(currentProviderList);
    if (onProvidersUpdated) {
      onProvidersUpdated(currentProviderList);
    }
    onClose();
  };

  const availableModels =
    dynamicModels[selectedProviderId] ||
    PROVIDER_DEFAULT_MODELS[selectedProviderId] ||
    [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => {
        if (!isFirstLaunch && configuredCount > 0) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-5 sm:p-6 text-slate-800 dark:text-slate-100 max-h-[92vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button (only if not first-launch or at least one provider is configured) */}
        {!isFirstLaunch && configuredCount > 0 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl cursor-pointer transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              AI Provider Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure your preferred AI model(s) with automatic fallback
            </p>
          </div>
        </div>

        {/* Informative Guidance */}
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          Configure at least ONE provider to begin counseling. You can configure multiple providers anytime to enable automatic failover.
        </p>

        {/* Provider Tabs in EXACT Priority Order */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Available Providers (Priority Order)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PROVIDER_ORDER.map((pid) => {
              const meta = PROVIDER_METADATA[pid];
              const pData = providers.find((p) => p.id === pid);
              const isConfigured = Boolean(pData?.apiKey && pData.apiKey.trim().length > 0);
              const isSelected = selectedProviderId === pid;

              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => handleSelectProvider(pid)}
                  className={`p-2.5 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="w-4 h-4 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
                      {meta.order}
                    </span>
                    {isConfigured ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Key configured" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" title="Not configured" />
                    )}
                  </div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {meta.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {isConfigured ? 'Ready' : 'Not set'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Provider Card */}
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 mb-4 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{currentMeta.name}</span>
                {hasSavedKey && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Saved
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Priority #{currentMeta.order} in failover chain
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={currentProvider.enabled}
                onChange={() => handleToggleEnabled(currentProvider.id)}
                className="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>{currentProvider.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>

          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Model:
              </label>
              <a
                href={currentMeta.getKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Get {currentMeta.name} key <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <select
              value={currentProvider.model}
              onChange={(e) => handleModelChange(currentProvider.id, e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input / Masked Display */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              API Key:
            </label>

            {hasSavedKey && !isEditingThisKey ? (
              /* MASKED STORED KEY DISPLAY */
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div className="font-mono text-xs text-slate-700 dark:text-slate-300 tracking-wider">
                  {maskApiKey(currentProvider.apiKey)}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEditKey(currentProvider.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" /> Change API Key
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveKey(currentProvider.id, currentMeta.name)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove API Key
                  </button>
                </div>
              </div>
            ) : (
              /* KEY INPUT & SHOW/HIDE TOGGLE */
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={keyDraft}
                    onChange={(e) => {
                      setKeyDraft(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder={`Paste ${currentMeta.name} API key (${currentMeta.placeholder})`}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide key' : 'Show key'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {hasSavedKey && (
                    <button
                      type="button"
                      onClick={() => handleCancelEditKey(currentProvider.id)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveDraftKey(currentProvider.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
                  >
                    <Check className="w-3 h-3" /> Save Key
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Test Connection Button & Status */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleTestConnection(currentProvider)}
              disabled={(!hasSavedKey && !keyDraft.trim()) || isTestingCurrent}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                !hasSavedKey && !keyDraft.trim()
                  ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-400'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingCurrent ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{isTestingCurrent ? 'Testing connection...' : 'Test Connection'}</span>
            </button>

            {currentTestResult && (
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 animate-in fade-in ${
                  currentTestResult.state === 'connected'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : currentTestResult.state === 'quota' || currentTestResult.state === 'unavailable'
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {currentTestResult.state === 'connected' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{currentTestResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Validation Warning Notice */}
        {validationError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Required Privacy & Local Storage Disclosure */}
        <div className="bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3 mb-5 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Your API keys are stored locally in this browser and are used directly from this application. Only enter keys you are comfortable using in a client-side application.
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {configuredCount === 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                No provider configured yet
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                {configuredCount} provider{configuredCount > 1 ? 's' : ''} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstLaunch && configuredCount > 0 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            )}
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isFirstLaunch ? 'Enter Career Counselor' : 'Done'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
