/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CentralCounselorHome } from './components/CentralCounselorHome';
import { VoiceAutoQuestionnaire } from './components/VoiceAutoQuestionnaire';
import { Questionnaire } from './components/Questionnaire';
import { ChatView } from './components/ChatView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AboutModal } from './components/AboutModal';
import { PrivacyBanner } from './components/PrivacyBanner';
import {
  AIProviderId,
  AppLanguage,
  AppSettings,
  ChatMessage,
  ConversationSession,
  ProviderConfig,
  QuestionnaireAnswers,
} from './types';
import { INITIAL_ANSWERS } from './constants/questions';
import {
  clearAllConversations,
  deleteConversation,
  getAllConversations,
  getStoredApiKey,
  getStoredProviders,
  getStoredSettings,
  hasAnyConfiguredProvider,
  saveConversation,
  saveQuestionnaire,
  saveStoredProviders,
  saveStoredSettings,
  setStoredApiKey,
} from './services/db';
import { GeminiError, requestInitialCounseling, sendFollowUpMessage } from './services/gemini';

type AppView = 'home' | 'voice-questionnaire' | 'text-questionnaire' | 'chat';

export default function App() {
  // Settings & Theme (Dark Mode default)
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings());
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Application view state
  const [view, setView] = useState<AppView>('home');
  const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<QuestionnaireAnswers>(INITIAL_ANSWERS);

  // Gemini API & chat interaction state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<GeminiError | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<QuestionnaireAnswers | null>(null);

  // Modals & Drawers
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isFirstLaunchModal, setIsFirstLaunchModal] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // Initialize theme from settings with DARK MODE as default
  useEffect(() => {
    const saved = getStoredSettings();
    setSettings(saved);

    // Default to dark mode unless user explicitly chose light
    const activeTheme = saved.theme === 'light' ? 'light' : 'dark';
    setTheme(activeTheme);
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');

    // Check if at least one AI provider is configured
    const hasConfigured = hasAnyConfiguredProvider();
    if (!hasConfigured) {
      setIsFirstLaunchModal(true);
      setIsApiKeyModalOpen(true);
    }

    // Load sessions from IndexedDB
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const all = await getAllConversations();
      setSessions(all);
    } catch (e) {
      console.error('Could not load sessions:', e);
    }
  };

  const handleToggleTheme = () => {
    const nextTheme: 'light' | 'dark' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleLanguageChange = (lang: AppLanguage) => {
    const updated: AppSettings = { ...settings, language: lang };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleToggleAutoSpeak = () => {
    const updated: AppSettings = { ...settings, autoSpeakAssistant: !settings.autoSpeakAssistant };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleSaveSettings = (updated: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updated };
    if (updated.apiKey !== undefined) {
      setStoredApiKey(updated.apiKey);
    }
    if (updated.theme !== undefined) {
      const resolvedTheme: 'light' | 'dark' = updated.theme === 'light' ? 'light' : 'dark';
      setTheme(resolvedTheme);
      if (resolvedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  const handleSaveApiKey = (key: string, providerId: AIProviderId = 'gemini') => {
    const currentProviders = getStoredProviders();
    const updatedProviders = currentProviders.map((p) =>
      p.id === providerId ? { ...p, apiKey: key, enabled: true } : p
    );
    saveStoredProviders(updatedProviders);
    if (providerId === 'gemini') {
      setStoredApiKey(key);
    }
    const updatedSettings: AppSettings = {
      ...settings,
      apiKey: providerId === 'gemini' ? key : settings.apiKey,
      providers: updatedProviders,
    };
    setSettings(updatedSettings);
    setIsFirstLaunchModal(false);

    if (pendingSubmission) {
      const answersToSubmit = pendingSubmission;
      setPendingSubmission(null);
      handleQuestionnaireSubmit(answersToSubmit, updatedProviders);
    }
  };

  // Submit Completed Questionnaire Batch to Multi-Provider AI with Automatic Fallback
  const handleQuestionnaireSubmit = async (
    answers: QuestionnaireAnswers,
    overrideProviders?: ProviderConfig[]
  ) => {
    const activeProviders = overrideProviders || settings.providers || getStoredProviders();
    const hasConfigured = activeProviders.some(
      (p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0
    );

    if (!hasConfigured) {
      setPendingSubmission(answers);
      setIsFirstLaunchModal(true);
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setQuestionnaireAnswers(answers);
    setView('chat');

    const sessionId = `session-${Date.now()}`;
    const userSummaryMessage: ChatMessage = {
      id: `msg-user-init-${Date.now()}`,
      role: 'user',
      content: 'I have submitted my 12-question career profile for personalized analysis.',
      timestamp: Date.now(),
    };

    const initialSession: ConversationSession = {
      id: sessionId,
      title: `${answers.educationLevel || 'Career'} Assessment`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      answers,
      language: settings.language,
      messages: [userSummaryMessage],
    };

    setCurrentSession(initialSession);

    try {
      const { rawText, structured } = await requestInitialCounseling(
        activeProviders,
        answers,
        settings.language
      );

      const assistantMessage: ChatMessage = {
        id: `msg-asst-init-${Date.now()}`,
        role: 'assistant',
        content: rawText,
        structuredAssessment: structured,
        timestamp: Date.now(),
        isInitialAssessment: true,
      };

      const completedSession: ConversationSession = {
        ...initialSession,
        updatedAt: Date.now(),
        structuredAssessment: structured,
        messages: [userSummaryMessage, assistantMessage],
      };

      setCurrentSession(completedSession);
      await saveConversation(completedSession);
      await saveQuestionnaire(sessionId, answers);
      await loadSessions();
    } catch (err) {
      console.error('Initial counseling evaluation error:', err);
      const geminiErr =
        err instanceof GeminiError
          ? err
          : new GeminiError('Failed to generate initial counseling assessment.', 'UNKNOWN', err);
      setError(geminiErr);
    } finally {
      setIsLoading(false);
    }
  };

  // Follow-up Chat Message with Multi-Provider AI and Automatic Fallback
  const handleSendMessage = async (text: string) => {
    if (!currentSession) return;
    const activeProviders = settings.providers || getStoredProviders();
    const hasConfigured = activeProviders.some(
      (p) => p.enabled && p.apiKey && p.apiKey.trim().length > 0
    );

    if (!hasConfigured) {
      setIsApiKeyModalOpen(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...currentSession.messages, userMessage];
    const sessionWithUserMsg: ConversationSession = {
      ...currentSession,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    setCurrentSession(sessionWithUserMsg);
    setIsLoading(true);
    setError(null);

    try {
      const assistantResponse = await sendFollowUpMessage(
        activeProviders,
        currentSession.answers,
        currentSession.messages,
        text,
        settings.language
      );

      const assistantMessage: ChatMessage = {
        id: `msg-asst-${Date.now()}`,
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now(),
      };

      const finalSession: ConversationSession = {
        ...sessionWithUserMsg,
        updatedAt: Date.now(),
        messages: [...updatedMessages, assistantMessage],
      };

      setCurrentSession(finalSession);
      await saveConversation(finalSession);
      await loadSessions();
    } catch (err) {
      console.error('Follow-up message error:', err);
      const geminiErr =
        err instanceof GeminiError
          ? err
          : new GeminiError('Failed to send message to counselor.', 'UNKNOWN', err);
      setError(geminiErr);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry the last action if an error occurred
  const handleRetry = () => {
    if (!currentSession) return;
    setError(null);

    const messages = currentSession.messages;
    const lastMsg = messages[messages.length - 1];

    if (messages.length === 1 && lastMsg.role === 'user') {
      handleQuestionnaireSubmit(currentSession.answers);
    } else if (lastMsg && lastMsg.role === 'user') {
      handleSendMessage(lastMsg.content);
    }
  };

  // Start New Session (Go to Home)
  const handleStartNewSession = () => {
    setCurrentSession(null);
    setQuestionnaireAnswers(INITIAL_ANSWERS);
    setError(null);
    setView('home');
  };

  // Resume Session from History
  const handleSelectSession = (id: string) => {
    const selected = sessions.find((s) => s.id === id);
    if (selected) {
      setCurrentSession(selected);
      setQuestionnaireAnswers(selected.answers);
      if (selected.language) {
        handleLanguageChange(selected.language);
      }
      setError(null);
      setView('chat');
    }
  };

  // Delete Individual Session
  const handleDeleteSession = async (id: string) => {
    try {
      await deleteConversation(id);
      if (currentSession?.id === id) {
        handleStartNewSession();
      }
      await loadSessions();
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  };

  // Clear All Sessions and Data
  const handleClearAllData = async () => {
    try {
      await clearAllConversations();
      setStoredApiKey('');
      setSettings(getStoredSettings());
      setCurrentSession(null);
      setSessions([]);
      setQuestionnaireAnswers(INITIAL_ANSWERS);
      setView('home');
    } catch (e) {
      console.error('Failed to clear all data:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 selection:bg-indigo-500/30">
      <PrivacyBanner />

      <Navbar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        language={settings.language}
        onLanguageChange={handleLanguageChange}
        autoSpeak={settings.autoSpeakAssistant}
        onToggleAutoSpeak={handleToggleAutoSpeak}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        onOpenAbout={() => setIsAboutModalOpen(true)}
        onGoHome={handleStartNewSession}
        sessionCount={sessions.length}
      />

      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        {view === 'home' ? (
          <CentralCounselorHome
            language={settings.language}
            onLanguageChange={handleLanguageChange}
            onStartVoiceCounseling={() => setView('voice-questionnaire')}
            onStartTextCounseling={() => setView('text-questionnaire')}
            onResumeSession={currentSession ? () => setView('chat') : undefined}
            hasActiveSession={Boolean(currentSession)}
          />
        ) : view === 'voice-questionnaire' ? (
          <VoiceAutoQuestionnaire
            initialAnswers={questionnaireAnswers}
            language={settings.language}
            apiKey={settings.apiKey || getStoredApiKey()}
            onSubmit={handleQuestionnaireSubmit}
            onSwitchToTextMode={() => setView('text-questionnaire')}
            onExit={() => setView('home')}
          />
        ) : view === 'text-questionnaire' ? (
          <Questionnaire
            initialAnswers={questionnaireAnswers}
            language={settings.language}
            apiKey={settings.apiKey || getStoredApiKey()}
            onSubmit={handleQuestionnaireSubmit}
            onStartVoiceMode={() => setView('voice-questionnaire')}
          />
        ) : (
          <ChatView
            answers={currentSession?.answers || questionnaireAnswers}
            messages={currentSession?.messages || []}
            isLoading={isLoading}
            error={error}
            onSendMessage={handleSendMessage}
            onRetry={handleRetry}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            onOpenQuestionnaireReview={() => setView('text-questionnaire')}
            language={settings.language}
            autoSpeakAssistant={settings.autoSpeakAssistant}
            onNewSession={handleStartNewSession}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => {
          setIsApiKeyModalOpen(false);
          setIsFirstLaunchModal(false);
        }}
        onSave={handleSaveApiKey}
        onProvidersUpdated={(updatedProviders) => {
          const gemini = updatedProviders.find((p) => p.id === 'gemini');
          setSettings((prev) => ({
            ...prev,
            providers: updatedProviders,
            apiKey: gemini?.apiKey || prev.apiKey,
          }));
          setIsFirstLaunchModal(false);
          if (pendingSubmission) {
            const answersToSubmit = pendingSubmission;
            setPendingSubmission(null);
            handleQuestionnaireSubmit(answersToSubmit, updatedProviders);
          }
        }}
        isFirstLaunch={isFirstLaunchModal}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onClearAllData={handleClearAllData}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        sessions={sessions}
        activeSessionId={currentSession?.id || null}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onStartNewSession={handleStartNewSession}
      />

      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
    </div>
  );
}
