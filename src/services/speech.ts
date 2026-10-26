/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppLanguage } from '../types';

export interface SpeechRecognitionSupport {
  isSupported: boolean;
  message?: string;
}

export interface SpeechSynthesisSupport {
  isSupported: boolean;
  message?: string;
}

// Browser SpeechRecognition interface
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWindowSpeechRecognition;
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
  }
}

export function checkSpeechRecognitionSupport(): SpeechRecognitionSupport {
  if (typeof window === 'undefined') {
    return { isSupported: false, message: 'Speech recognition requires a browser environment.' };
  }
  const hasRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  if (!hasRecognition) {
    return {
      isSupported: false,
      message: 'Speech recognition is not supported in this browser. Chrome or Edge is recommended for voice input.',
    };
  }
  return { isSupported: true };
}

export function checkSpeechSynthesisSupport(): SpeechSynthesisSupport {
  if (typeof window === 'undefined') {
    return { isSupported: false, message: 'Speech synthesis requires a browser environment.' };
  }
  const hasSynthesis = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  if (!hasSynthesis) {
    return {
      isSupported: false,
      message: 'Speech readout is not supported in this browser.',
    };
  }
  return { isSupported: true };
}

export function getRecognitionLanguageCode(_lang?: AppLanguage): string {
  return 'en-US';
}

// Cache and async voice loader
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const fresh = window.speechSynthesis.getVoices();
    if (fresh.length > 0) {
      cachedVoices = fresh;
    }
  }
  return cachedVoices;
}

export function selectBestVoice(voices: SpeechSynthesisVoice[], _lang?: AppLanguage): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  return (
    voices.find((v) => v.lang === 'en-GB' || v.lang === 'en-US') ||
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
    voices.find((v) => v.default) ||
    voices[0]
  );
}

export function cleanTextForSpeech(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links but keep anchor text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italics
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove bullet characters
    .replace(/^[\s*•\-–—]+\s+/gm, '')
    // Replace horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Replace markdown table separators
    .replace(/\|/g, ', ')
    // Normalize newlines to sentence pauses
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export class VoiceRecognitionController {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening = false;
  private language: AppLanguage = 'en';
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private currentTranscript = '';

  constructor(lang: AppLanguage = 'en') {
    this.language = lang;
  }

  setLanguage(lang: AppLanguage) {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = getRecognitionLanguageCode(lang);
    }
  }

  /**
   * Continuous listening with optional automatic silence detection for hands-free answering
   */
  startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onStatusChange: (listening: boolean) => void,
    onError: (err: string) => void,
    onSpeechComplete?: (finalAnswer: string) => void,
    silenceThresholdMs = 4500
  ): boolean {
    const support = checkSpeechRecognitionSupport();
    if (!support.isSupported) {
      onError(support.message || 'Speech recognition not available.');
      return false;
    }

    try {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        onError('Speech recognition not available.');
        return false;
      }

      this.stopListening();
      this.currentTranscript = '';

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = getRecognitionLanguageCode(this.language);

      rec.onstart = () => {
        this.isListening = true;
        onStatusChange(true);
      };

      rec.onresult = (event: SpeechRecognitionEvent) => {
        let totalFinalTranscript = '';
        let interimTranscript = '';

        // Iterate through all results to preserve full sentences and not truncate earlier speech
        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            totalFinalTranscript += (totalFinalTranscript ? ' ' : '') + item[0].transcript.trim();
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + item[0].transcript.trim();
          }
        }

        const fullText = (totalFinalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        if (fullText.length > 0) {
          this.currentTranscript = fullText;
          onResult(fullText, Boolean(totalFinalTranscript));

          // If automated completion callback is registered, start silence countdown (4500ms default)
          if (onSpeechComplete) {
            if (this.silenceTimer) {
              clearTimeout(this.silenceTimer);
            }
            this.silenceTimer = setTimeout(() => {
              if (this.isListening && this.currentTranscript.trim().length > 0) {
                const answer = this.currentTranscript.trim();
                this.stopListening();
                onSpeechComplete(answer);
              }
            }, silenceThresholdMs);
          }
        }
      };

      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed') {
          onError('Microphone access was denied. Please allow microphone permissions in your browser.');
        } else if (event.error !== 'no-speech') {
          onError(`Voice recognition notice: ${event.error}`);
        }
        // Don't kill listening on transient no-speech events
        if (event.error === 'not-allowed') {
          this.isListening = false;
          onStatusChange(false);
        }
      };

      rec.onend = () => {
        // If still marked as listening and not explicitly stopped, automatically restart to avoid cutoffs
        if (this.isListening && this.recognition) {
          try {
            this.recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        this.isListening = false;
        onStatusChange(false);
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      onError('Could not start microphone recording. Please check browser microphone permissions.');
      this.isListening = false;
      onStatusChange(false);
      return false;
    }
  }

  stopListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  getIsListening() {
    return this.isListening;
  }

  getCurrentTranscript() {
    return this.currentTranscript;
  }
}

function splitIntoSpokenChunks(text: string, maxChunkLength = 160): string[] {
  // Split on sentence boundaries (., !, ?, or newlines)
  const segments = text
    .split(/([.!?\n]+)/)
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (let i = 0; i < segments.length; i++) {
    const part = segments[i];
    if (current.length + part.length <= maxChunkLength) {
      current += part;
    } else {
      if (current.trim()) {
        chunks.push(current.trim());
      }
      current = part;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

export class SpeechSynthesisController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speechQueue: string[] = [];
  private currentChunkIndex = 0;
  private isCancelled = false;
  private isSpeakingFlag = false;

  speak(
    text: string,
    _lang: AppLanguage = 'en',
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ): boolean {
    const support = checkSpeechSynthesisSupport();
    if (!support.isSupported) {
      onError?.(support.message || 'Speech synthesis not supported');
      return false;
    }

    try {
      this.stop(); // Stop any currently speaking audio and clear queue
      this.isCancelled = false;

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) {
        onEnd?.();
        return false;
      }

      // Check available voices
      const voices = getAvailableVoices();
      const targetVoice = selectBestVoice(voices, 'en');
      const targetLangCode = targetVoice?.lang || 'en-US';

      // Split text into coherent chunks for smooth playback without browser cutoffs
      const chunks = splitIntoSpokenChunks(cleaned);
      this.speechQueue = chunks;
      this.currentChunkIndex = 0;

      // Unpause if synthesis was stuck in paused state
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      this.playNextChunk(targetVoice, targetLangCode, onStart, onEnd, onError);
      return true;
    } catch (e) {
      console.error('Speech synthesis failure:', e);
      onError?.('Speech playback failed.');
      return false;
    }
  }

  private playNextChunk(
    voice: SpeechSynthesisVoice | undefined,
    langCode: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void
  ) {
    if (this.isCancelled || this.currentChunkIndex >= this.speechQueue.length) {
      this.isSpeakingFlag = false;
      this.currentUtterance = null;
      onEnd?.();
      return;
    }

    const chunkText = this.speechQueue[this.currentChunkIndex];
    if (!chunkText || !chunkText.trim()) {
      this.currentChunkIndex++;
      this.playNextChunk(voice, langCode, onStart, onEnd, onError);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunkText);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      this.isSpeakingFlag = true;
      if (this.currentChunkIndex === 0) {
        onStart?.();
      }
    };

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.playNextChunk(voice, langCode, onStart, onEnd, onError);
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis chunk warning:', e);
      this.currentChunkIndex++;
      this.playNextChunk(voice, langCode, onStart, onEnd, onError);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    this.isCancelled = true;
    this.speechQueue = [];
    this.currentChunkIndex = 0;
    this.isSpeakingFlag = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeaking(): boolean {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return this.isSpeakingFlag || window.speechSynthesis.speaking;
    }
    return false;
  }
}
