/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Key,
  Compass,
} from 'lucide-react';
import { AppLanguage, ChatMessage, QuestionnaireAnswers } from '../types';
import { CounselorAvatar } from './Avatar';
import { StructuredAssessmentCard } from './StructuredAssessmentCard';
import { MarkdownContent } from './MarkdownContent';
import { GeminiError } from '../services/gemini';
import { SpeechSynthesisController, VoiceRecognitionController } from '../services/speech';

interface ChatViewProps {
  answers: QuestionnaireAnswers;
  messages: ChatMessage[];
  isLoading: boolean;
  error: GeminiError | null;
  onSendMessage: (text: string) => void;
  onRetry: () => void;
  onOpenApiKeyModal: () => void;
  onOpenQuestionnaireReview: () => void;
  language?: AppLanguage;
  autoSpeakAssistant: boolean;
  onNewSession: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  answers,
  messages,
  isLoading,
  error,
  onSendMessage,
  onRetry,
  onOpenApiKeyModal,
  onOpenQuestionnaireReview,
  autoSpeakAssistant,
}) => {
  const [inputText, setInputText] = useState('');
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Speech controllers
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<VoiceRecognitionController | null>(null);
  const synthesisRef = useRef<SpeechSynthesisController | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Speech Services in English
  useEffect(() => {
    recognitionRef.current = new VoiceRecognitionController('en');
    synthesisRef.current = new SpeechSynthesisController();

    return () => {
      recognitionRef.current?.stopListening();
      synthesisRef.current?.stop();
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-speak new assistant message if setting enabled
  useEffect(() => {
    if (autoSpeakAssistant && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === 'assistant' && !isLoading) {
        // Speak the complete counselor response
        const textToSpeak =
          last.content ||
          (last.structuredAssessment
            ? `${last.structuredAssessment.closingThought || ''} ${
                last.structuredAssessment.topRecommendations?.[0]
                  ? 'Top career recommendation: ' +
                    last.structuredAssessment.topRecommendations[0].title
                  : ''
              }`
            : '');

        if (textToSpeak.trim()) {
          handleSpeak(last.id, textToSpeak);
        }
      }
    }
  }, [messages.length, autoSpeakAssistant, isLoading]);

  const handleSpeak = (messageId: string, content: string) => {
    if (!synthesisRef.current) return;

    if (speakingMessageId === messageId) {
      synthesisRef.current.stop();
      setSpeakingMessageId(null);
      return;
    }

    synthesisRef.current.speak(
      content,
      'en',
      () => setSpeakingMessageId(messageId),
      () => setSpeakingMessageId(null),
      (err) => {
        console.warn('TTS error:', err);
        setSpeakingMessageId(null);
      }
    );
  };

  const handleMicToggle = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stopListening();
      setIsListening(false);
    } else {
      const started = recognitionRef.current.startListening(
        (transcript) => {
          setInputText((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + transcript;
          });
        },
        (status) => setIsListening(status),
        (err) => {
          console.warn('Speech recognition notice:', err);
          setIsListening(false);
        }
      );
      if (started) setIsListening(true);
    }
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stopListening();
      setIsListening(false);
    }
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    'Draft a 6-month step-by-step learning roadmap for #1',
    'Recommend free courses and portfolio project ideas',
    'How should I schedule study time around my constraints?',
    'Degree vs Certifications: which matters more for this?',
    'How do I land my first entry-level role or internship?',
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 flex-1 flex flex-col h-[calc(100dvh-4rem)] max-h-[calc(100dvh-4rem)] min-h-0 overflow-hidden pb-1 sm:pb-2" dir="ltr">
      {/* Collapsible Profile Context Header - Mobile Optimized */}
      <div className="shrink-0 my-1 sm:my-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-xs transition">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="p-1 sm:p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 shrink-0">
              <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="truncate">Student Profile</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px] sm:max-w-none">
                  {answers.educationLevel || 'General Profile'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {answers.strengths || 'Hands-on'} • {answers.careerValues || 'Growth & Security'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenQuestionnaireReview}
              className="px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => setIsProfileExpanded(!isProfileExpanded)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              aria-label={isProfileExpanded ? 'Collapse' : 'Expand'}
            >
              {isProfileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isProfileExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] sm:text-xs grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-slate-600 dark:text-slate-300 animate-in fade-in">
            <div className="truncate">
              <span className="font-semibold text-slate-900 dark:text-white">Education:</span>{' '}
              {answers.educationLevel || 'N/A'}
            </div>
            <div className="truncate">
              <span className="font-semibold text-slate-900 dark:text-white">Enjoyed Subjects:</span>{' '}
              {answers.enjoyedSubjects || 'N/A'}
            </div>
            <div className="truncate">
              <span className="font-semibold text-slate-900 dark:text-white">Constraints:</span>{' '}
              {answers.practicalConstraints || 'None'}
            </div>
            <div className="truncate">
              <span className="font-semibold text-slate-900 dark:text-white">5-Year Vision:</span>{' '}
              {answers.fiveYearVision || 'N/A'}
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area - Pure Flex Containment */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1 sm:px-2 py-2 sm:py-3 space-y-4 sm:space-y-5 overscroll-contain">
        {messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          const isSpeaking = speakingMessageId === message.id;

          // If this is the initial assessment with structured data, render the rich StructuredAssessmentCard
          if (isAssistant && message.structuredAssessment) {
            return (
              <div key={message.id} className="animate-in fade-in duration-200 min-w-0">
                <StructuredAssessmentCard
                  assessment={message.structuredAssessment}
                  onAskQuestion={(qText) => onSendMessage(qText)}
                />
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3.5 ${
                isAssistant ? 'justify-start' : 'justify-end'
              } animate-in fade-in duration-200 min-w-0`}
            >
              {isAssistant && (
                <div className="shrink-0 mt-0.5">
                  <CounselorAvatar size="sm" isSpeaking={isSpeaking} />
                </div>
              )}

              <div
                className={`min-w-0 break-words ${
                  isAssistant
                    ? 'flex-1 max-w-[92%] sm:max-w-[85%] rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                    : 'max-w-[85%] sm:max-w-[78%] rounded-2xl sm:rounded-3xl p-3 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-sm bg-indigo-600 text-white rounded-br-xs'
                }`}
                dir="ltr"
              >
                {/* Assistant Label & Actions Header */}
                {isAssistant && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 text-xs min-w-0">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 truncate text-[11px] sm:text-xs">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Dr. Susan Black Assistant</span>
                    </span>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0" dir="ltr">
                      <button
                        type="button"
                        onClick={() => handleSpeak(message.id, message.content)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          isSpeaking
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud with speech synthesis'}
                        aria-label={isSpeaking ? 'Stop speech' : 'Read aloud'}
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(message.id, message.content)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                        title="Copy text"
                        aria-label="Copy message"
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {isAssistant ? (
                  <MarkdownContent content={message.content} />
                ) : (
                  <div className="whitespace-pre-wrap font-normal leading-relaxed text-white text-xs sm:text-sm text-left">
                    {message.content}
                  </div>
                )}

                {/* Message Timestamp */}
                <div
                  className={`mt-2 text-[10px] ${
                    isAssistant ? 'text-slate-400 dark:text-slate-500' : 'text-indigo-200'
                  } text-right`}
                  dir="ltr"
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2 sm:gap-3.5 justify-start animate-in fade-in min-w-0">
            <div className="shrink-0 mt-0.5">
              <CounselorAvatar size="sm" isThinking={true} />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 shadow-xs max-w-[90%] sm:max-w-md">
              <div className="flex gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
              <span className="truncate leading-snug">
                Counselor is preparing concise advice...
              </span>
            </div>
          </div>
        )}

        {/* Inline Error Banner */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3 sm:p-4 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-rose-900 dark:text-rose-100">
                  {error.code === 'INVALID_KEY'
                    ? 'Gemini API Key Issue'
                    : error.code === 'QUOTA_EXCEEDED'
                    ? 'Rate Limit Reached'
                    : 'Counseling Service Notice'}
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 break-words">{error.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 text-rose-800 dark:text-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" /> Change Key
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Follow-Up Chips - Touch-friendly swipe carousel */}
      {!isLoading && messages.length > 0 && (
        <div className="shrink-0 pt-1.5 pb-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 sm:gap-2 touch-pan-x px-0.5" dir="ltr">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSendMessage(prompt)}
              className="px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-300 dark:border-slate-800 shadow-xs whitespace-nowrap transition active:scale-95 cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input Box Area - Mobile optimized with guaranteed non-overflow */}
      <div className="shrink-0 pt-1 pb-1">
        <div className="relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-sm p-1.5 sm:p-2 flex flex-col focus-within:ring-2 focus-within:ring-indigo-500 transition">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            dir="ltr"
            placeholder={
              isListening
                ? 'Listening... (your speech appears here)'
                : 'Ask a career or study question... (Enter to send)'
            }
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-hidden px-2 py-1 resize-none placeholder:text-slate-400 leading-relaxed min-h-[38px] max-h-[90px]"
          />

          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 px-1 gap-2" dir="ltr">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400 min-w-0 truncate">
              {isListening ? (
                <span className="flex items-center gap-1.5 text-rose-500 font-semibold truncate">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="truncate">Recording speech...</span>
                </span>
              ) : (
                <span className="truncate">
                  Ask about roadmaps, degrees, courses
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0" dir="ltr">
              {/* Mic Dictation Button */}
              <button
                type="button"
                onClick={handleMicToggle}
                className={`p-2 rounded-xl transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isListening ? 'Stop recording voice' : 'Dictate with microphone'}
                aria-label={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputText.trim() || isLoading}
                className={`inline-flex items-center justify-center p-2 rounded-xl transition shadow-xs cursor-pointer min-w-[36px] min-h-[36px] ${
                  !inputText.trim() || isLoading
                    ? 'opacity-40 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
