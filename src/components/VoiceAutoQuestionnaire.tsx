/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  RotateCcw,
  Pause,
  Play,
  SkipForward,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Keyboard,
  Loader2,
} from 'lucide-react';
import { CAREER_QUESTIONS, getQuestionText } from '../constants/questions';
import { AppLanguage, QuestionnaireAnswers } from '../types';
import { CounselorAvatar } from './Avatar';
import {
  SpeechSynthesisController,
  VoiceRecognitionController,
  checkSpeechRecognitionSupport,
  checkSpeechSynthesisSupport,
} from '../services/speech';
import { AudioRecorder } from '../services/audioRecorder';
import { transcribeAudioWithGemini } from '../services/gemini';

interface VoiceAutoQuestionnaireProps {
  initialAnswers: QuestionnaireAnswers;
  language?: AppLanguage;
  apiKey?: string;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onSwitchToTextMode: () => void;
  onExit: () => void;
}

type CounselorState = 'speaking' | 'listening' | 'processing' | 'paused';

export const VoiceAutoQuestionnaire: React.FC<VoiceAutoQuestionnaireProps> = ({
  initialAnswers,
  apiKey,
  onSubmit,
  onSwitchToTextMode,
  onExit,
}) => {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counselorState, setCounselorState] = useState<CounselorState>('speaking');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isEditingManually, setIsEditingManually] = useState(false);
  const [manualText, setManualText] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isReviewScreen, setIsReviewScreen] = useState(false);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [isAiTranscribing, setIsAiTranscribing] = useState(false);

  // Controllers & references
  const voiceRecRef = useRef<VoiceRecognitionController | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisController | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const isComponentMounted = useRef(true);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const latestTranscriptRef = useRef('');
  const isProcessingAnswerRef = useRef(false);

  const totalQuestions = CAREER_QUESTIONS.length;
  const currentQ = CAREER_QUESTIONS[currentIndex];
  const qDetails = getQuestionText(currentQ, 'en');

  // Initialize Speech Services in English
  useEffect(() => {
    isComponentMounted.current = true;
    const recSupport = checkSpeechRecognitionSupport();
    const synthSupport = checkSpeechSynthesisSupport();

    if (!recSupport.isSupported && !AudioRecorder.isSupported()) {
      setErrorNotice(
        'Automatic speech recognition is not supported in this browser. You can type answers below or use Chrome/Edge.'
      );
    }

    voiceRecRef.current = new VoiceRecognitionController('en');
    speechSynthRef.current = new SpeechSynthesisController();

    return () => {
      isComponentMounted.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      voiceRecRef.current?.stopListening();
      speechSynthRef.current?.stop();
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
      }
    };
  }, []);

  // Scroll to bottom as conversation progresses
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentIndex, liveTranscript, counselorState, isAiTranscribing]);

  // Clean-up and start speaking the question
  const speakCurrentQuestion = useCallback(() => {
    if (!speechSynthRef.current || !isComponentMounted.current) return;

    // Stop listening before speaking to prevent recording the counselor's own voice
    voiceRecRef.current?.stopListening();
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setCounselorState('speaking');
    setErrorNotice(null);
    isProcessingAnswerRef.current = false;

    const questionToSpeak = `${qDetails.question}. ${qDetails.subtitle}`;

    speechSynthRef.current.speak(
      questionToSpeak,
      'en',
      () => {
        if (isComponentMounted.current) {
          setCounselorState('speaking');
        }
      },
      () => {
        // Callback after speaking finishes:
        if (!isComponentMounted.current) return;

        // Add 450ms silence buffer to guarantee speech synthesizer audio has fully exited
        setTimeout(() => {
          if (!isComponentMounted.current) return;
          startListeningForAnswer();
        }, 450);
      },
      (err) => {
        console.warn('Speech readout notice:', err);
        if (isComponentMounted.current) {
          startListeningForAnswer();
        }
      }
    );
  }, [currentIndex, qDetails]);

  // Trigger question speech whenever currentIndex changes (if not in review mode)
  useEffect(() => {
    if (!isReviewScreen && counselorState !== 'paused') {
      speakCurrentQuestion();
    }
  }, [currentIndex, isReviewScreen]);

  // Start speech recognition & high-quality audio recording for the user's answer
  const startListeningForAnswer = async () => {
    if (!isComponentMounted.current) return;

    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setCounselorState('listening');
    setErrorNotice(null);
    isProcessingAnswerRef.current = false;

    // Start background audio recorder for high-accuracy Gemini transcription
    if (AudioRecorder.isSupported()) {
      try {
        if (audioRecorderRef.current) {
          audioRecorderRef.current.cancel();
        }
        const recorder = new AudioRecorder();
        audioRecorderRef.current = recorder;
        await recorder.start();
      } catch (recErr) {
        console.warn('High-accuracy audio recorder could not start:', recErr);
      }
    }

    // Start real-time browser speech recognition for instant visual transcript on screen
    if (voiceRecRef.current) {
      const started = voiceRecRef.current.startListening(
        (transcript) => {
          if (!isComponentMounted.current) return;
          latestTranscriptRef.current = transcript;
          setLiveTranscript(transcript);
          setManualText(transcript);
        },
        (listening) => {
          if (!isComponentMounted.current) return;
        },
        (err) => {
          if (!isComponentMounted.current) return;
          console.warn('Voice recognition note:', err);
          if (!AudioRecorder.isSupported()) {
            setErrorNotice(err);
            setCounselorState('paused');
          }
        },
        (finalAnswer) => {
          // Automatic 4.5s natural pause detection triggered
          if (!isComponentMounted.current) return;
          if (finalAnswer && finalAnswer.trim().length > 0) {
            handleStopAndSubmitSpeech(finalAnswer.trim());
          }
        },
        4500 // 4.5s generous natural silence threshold so user can pause naturally
      );

      if (!started && !AudioRecorder.isSupported()) {
        setCounselorState('paused');
      }
    }
  };

  // Stop recording, run Gemini high-accuracy STT with fallback, and save answer
  const handleStopAndSubmitSpeech = async (fallbackText?: string) => {
    if (isProcessingAnswerRef.current || !isComponentMounted.current) return;
    isProcessingAnswerRef.current = true;

    setCounselorState('processing');
    voiceRecRef.current?.stopListening();

    let recognizedText = (fallbackText || latestTranscriptRef.current || liveTranscript).trim();

    // If audio was captured, transcribe with Gemini multimodal AI for maximum conversational accuracy
    if (audioRecorderRef.current && audioRecorderRef.current.getIsRecording()) {
      try {
        const recordResult = await audioRecorderRef.current.stop();
        if (apiKey && apiKey.trim() && recordResult.base64 && recordResult.durationMs > 700) {
          setIsAiTranscribing(true);
          try {
            const aiTranscript = await transcribeAudioWithGemini(
              apiKey,
              recordResult.base64,
              recordResult.mimeType,
              'en'
            );
            if (aiTranscript && aiTranscript.trim().length > 0) {
              recognizedText = aiTranscript.trim();
              setLiveTranscript(recognizedText);
            }
          } catch (aiErr) {
            console.warn('Gemini audio transcription fallback to browser transcript:', aiErr);
          } finally {
            if (isComponentMounted.current) {
              setIsAiTranscribing(false);
            }
          }
        }
      } catch (err) {
        console.warn('Could not retrieve recorded audio blob:', err);
      }
    }

    if (recognizedText.length > 0) {
      handleSaveAndNext(recognizedText);
    } else {
      // Empty utterance: return to listening
      isProcessingAnswerRef.current = false;
      setCounselorState('listening');
    }
  };

  // Save current answer and advance or return to review
  const handleSaveAndNext = (answerText: string) => {
    setCounselorState('processing');
    voiceRecRef.current?.stopListening();
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    const cleanAnswer = answerText.trim();
    const updatedAnswers = {
      ...answers,
      [currentQ.id]: cleanAnswer,
    };
    setAnswers(updatedAnswers);
    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setManualText('');
    setIsEditingManually(false);
    isProcessingAnswerRef.current = false;

    // IF EDITING FROM REVIEW: Return immediately to Review screen without resetting or re-asking subsequent questions!
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setIsReviewScreen(true);
      setCounselorState('paused');
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => {
        if (isComponentMounted.current) {
          setCurrentIndex((prev) => prev + 1);
        }
      }, 500);
    } else {
      // Reached end of questions -> Go to Review & Confirmation
      setIsReviewScreen(true);
    }
  };

  // Skip question
  const handleSkipQuestion = () => {
    voiceRecRef.current?.stopListening();
    speechSynthRef.current?.stop();
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    const updatedAnswers = {
      ...answers,
      [currentQ.id]: '', // Skipped
    };
    setAnswers(updatedAnswers);
    setLiveTranscript('');
    latestTranscriptRef.current = '';
    setManualText('');
    setIsEditingManually(false);
    isProcessingAnswerRef.current = false;

    // IF EDITING FROM REVIEW: Return immediately to Review screen
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setIsReviewScreen(true);
      setCounselorState('paused');
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsReviewScreen(true);
    }
  };

  // Repeat question
  const handleRepeatQuestion = () => {
    speakCurrentQuestion();
  };

  // Pause / Resume
  const handleTogglePause = () => {
    if (counselorState === 'paused') {
      speakCurrentQuestion();
    } else {
      speechSynthRef.current?.stop();
      voiceRecRef.current?.stopListening();
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
      }
      setCounselorState('paused');
    }
  };

  // Back to previous question
  const handleBackQuestion = () => {
    speechSynthRef.current?.stop();
    voiceRecRef.current?.stopListening();
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setIsReviewScreen(true);
      return;
    }

    if (isReviewScreen) {
      setIsReviewScreen(false);
      setCurrentIndex(totalQuestions - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Insert suggested chip into answer
  const handleChipClick = (chip: string) => {
    setLiveTranscript((prev) => {
      const updated = prev ? `${prev.trim()}, ${chip}` : chip;
      latestTranscriptRef.current = updated;
      setManualText(updated);
      return updated;
    });
  };

  // Manual text submission for current question
  const handleManualSubmit = () => {
    if (manualText.trim()) {
      handleSaveAndNext(manualText.trim());
    }
  };

  // Final submit to Gemini
  const handleFinalSubmit = () => {
    onSubmit(answers);
  };

  // Review Screen at the end of questionnaire
  if (isReviewScreen) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-300" dir="ltr">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                12 Questions Completed
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Review Your Career Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                All 12 answers are saved independently. Editing any answer will keep all your other answers intact.
              </p>
            </div>
            <button
              type="button"
              onClick={handleBackQuestion}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* List of answers */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 my-6 max-h-96 overflow-y-auto pr-2">
            {CAREER_QUESTIONS.map((q, idx) => {
              const details = getQuestionText(q, 'en');
              const val = answers[q.id];
              return (
                <div key={q.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {q.number}. {details.question}
                    </p>
                    <p className="mt-1 text-slate-800 dark:text-slate-100 font-medium pl-3">
                      {val && val.trim() ? (
                        val
                      ) : (
                        <span className="text-slate-400 italic">
                          (Skipped)
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingFromReview(true);
                      setCurrentIndex(idx);
                      setIsReviewScreen(false);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onExit}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Submit &amp; Get Recommendations
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Voice Flow View
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex-1 flex flex-col justify-between min-h-[calc(100vh-5rem)]" dir="ltr">
      {/* Editing from Review Banner (Ensures user knows edits won't erase other questions) */}
      {isEditingFromReview && (
        <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
            <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong className="text-indigo-900 dark:text-white font-semibold">
                Editing Question {currentQ.number}
              </strong>{' '}
              — Saving or speaking your updated answer will return directly to Review. All other answers remain saved.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              speechSynthRef.current?.stop();
              voiceRecRef.current?.stopListening();
              if (audioRecorderRef.current) {
                audioRecorderRef.current.cancel();
              }
              setIsEditingFromReview(false);
              setIsReviewScreen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
          >
            Cancel &amp; Return to Review
          </button>
        </div>
      )}

      {/* Top Header with Progress and Controls */}
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
              Guided Voice Counseling
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ({currentIndex + 1} of {totalQuestions})
            </span>
          </div>

          {/* Counselor State Indicator Badge */}
          <div className="flex items-center gap-1.5">
            {counselorState === 'speaking' && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                Counselor speaking...
              </span>
            )}
            {counselorState === 'listening' && (
              <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <Mic className="w-3.5 h-3.5" />
                Listening to you...
              </span>
            )}
            {counselorState === 'processing' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                {isAiTranscribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Transcribing with AI...</span>
                  </>
                ) : (
                  <span>Saving answer...</span>
                )}
              </span>
            )}
            {counselorState === 'paused' && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                <Pause className="w-3 h-3" />
                Paused
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Interactive Conversation Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {/* Past Questions in Conversation (only during sequential progression) */}
        {!isEditingFromReview &&
          CAREER_QUESTIONS.slice(0, currentIndex).map((prevQ) => {
            const prevDetails = getQuestionText(prevQ, 'en');
            const ans = answers[prevQ.id];
            return (
              <div key={prevQ.id} className="space-y-2 opacity-75 hover:opacity-100 transition">
                {/* Counselor question bubble */}
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <CounselorAvatar size="sm" />
                  <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200">
                    <span className="font-semibold text-indigo-500 mr-1.5">Q{prevQ.number}:</span>
                    {prevDetails.question}
                  </div>
                </div>
                {/* User answer bubble */}
                <div className="flex justify-end">
                  <div className="p-3 rounded-2xl bg-indigo-600 text-white text-xs max-w-[80%] rounded-br-xs">
                    {ans && ans.trim() ? (
                      ans
                    ) : (
                      <span className="italic opacity-70">
                        (Skipped)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {/* Current Active Question (Prominent) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 dark:border-indigo-500/50 rounded-3xl p-5 sm:p-6 shadow-xl animate-in fade-in">
          <div className="flex items-start gap-3.5 mb-4">
            <CounselorAvatar
              size="lg"
              isSpeaking={counselorState === 'speaking'}
              isThinking={counselorState === 'processing'}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                  Question {currentQ.number} of {totalQuestions}
                </span>
                {qDetails.helperText && (
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold hidden sm:inline">
                    • {qDetails.helperText}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                {qDetails.question}
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed font-normal">
                {qDetails.subtitle}
              </p>
            </div>
          </div>

          {/* Error notice if speech recognition had permission or engine trouble */}
          {errorNotice && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button
                type="button"
                onClick={startListeningForAnswer}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
              >
                Retry Mic
              </button>
            </div>
          )}

          {/* User Spoken Live Transcript Container */}
          <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[90px] flex flex-col justify-between">
            <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                Your Answer (Live Transcript):
                {isAiTranscribing && (
                  <span className="text-indigo-700 dark:text-indigo-300 font-semibold inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> High-Accuracy AI STT...
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsEditingManually(!isEditingManually)}
                className="text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold capitalize cursor-pointer"
              >
                <Keyboard className="w-3 h-3" />
                {isEditingManually ? 'Back to Voice' : 'Type / Edit Instead'}
              </button>
            </div>

            {isEditingManually ? (
              <div className="my-2">
                <textarea
                  rows={2}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder={qDetails.placeholder}
                  dir="ltr"
                  className="w-full text-xs sm:text-sm p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleManualSubmit}
                    disabled={!manualText.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
                  >
                    {isEditingFromReview ? 'Save & Return to Review' : 'Save Answer & Next'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {liveTranscript ? (
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed" dir="ltr">
                    &ldquo;{liveTranscript}&rdquo;
                  </p>
                ) : counselorState === 'speaking' ? (
                  <p className="text-xs text-slate-400 italic">
                    Counselor is speaking the question... Microphone will open right after.
                  </p>
                ) : counselorState === 'listening' ? (
                  <p className="text-xs text-indigo-400 animate-pulse font-medium">
                    🎙️ Microphone listening! Speak naturally in complete sentences; pauses are respected, auto-saves when finished...
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Waiting for answer...
                  </p>
                )}
              </div>
            )}

            {/* Quick action buttons if student spoke something */}
            {!isEditingManually && counselorState === 'listening' && (
              <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-[11px] text-slate-400">
                  {liveTranscript ? 'Complete sentence captured' : 'Speak at natural conversational speed'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStopAndSubmitSpeech()}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isEditingFromReview ? 'Done & Return to Review' : 'Done Speaking & Next'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips (User can click to insert/speak) */}
          {qDetails.chips.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-2">
                Quick options (click to speak or add):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {qDetails.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={conversationEndRef} />
      </div>

      {/* Persistent Bottom Voice Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          <button
            type="button"
            onClick={handleTogglePause}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title={counselorState === 'paused' ? 'Resume voice counseling' : 'Pause counseling'}
          >
            {counselorState === 'paused' ? (
              <>
                <Play className="w-4 h-4 text-emerald-400" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 text-amber-400" /> Pause
              </>
            )}
          </button>

          {/* Repeat Question */}
          <button
            type="button"
            onClick={handleRepeatQuestion}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Repeat current question"
          >
            <RotateCcw className="w-4 h-4 text-indigo-400" /> Repeat
          </button>

          {/* Back Question */}
          <button
            type="button"
            onClick={handleBackQuestion}
            disabled={!isEditingFromReview && currentIndex === 0}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title={isEditingFromReview ? 'Return to review screen' : 'Go to previous question'}
          >
            <ArrowLeft className="w-4 h-4" /> {isEditingFromReview ? 'Review' : 'Back'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Skip Button */}
          <button
            type="button"
            onClick={handleSkipQuestion}
            className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl flex items-center gap-1 transition cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" /> Skip
          </button>

          {/* Switch to standard Text Mode */}
          <button
            type="button"
            onClick={onSwitchToTextMode}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition cursor-pointer"
            title="Switch to typing text questionnaire"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Text Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
