/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Edit3,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Mic,
  MicOff,
  Lightbulb,
  Headphones,
  Loader2,
} from 'lucide-react';
import { CAREER_QUESTIONS, getQuestionText } from '../constants/questions';
import { AppLanguage, QuestionnaireAnswers } from '../types';
import { VoiceRecognitionController } from '../services/speech';
import { AudioRecorder } from '../services/audioRecorder';
import { transcribeAudioWithGemini } from '../services/gemini';

interface QuestionnaireProps {
  initialAnswers: QuestionnaireAnswers;
  language?: AppLanguage;
  apiKey?: string;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onStartVoiceMode?: () => void;
}

export const Questionnaire: React.FC<QuestionnaireProps> = ({
  initialAnswers,
  apiKey,
  onSubmit,
  onStartVoiceMode,
}) => {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isReviewMode, setIsReviewMode] = useState<boolean>(false);
  const [isEditingFromReview, setIsEditingFromReview] = useState<boolean>(false);
  const [isAiTranscribing, setIsAiTranscribing] = useState<boolean>(false);

  // Voice recording state for question answering
  const [isListening, setIsListening] = useState(false);
  const [voiceController, setVoiceController] = useState<VoiceRecognitionController | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const recordedSessionSpeechRef = useRef('');

  useEffect(() => {
    const controller = new VoiceRecognitionController('en');
    setVoiceController(controller);
    return () => {
      controller.stopListening();
      if (audioRecorderRef.current) {
        audioRecorderRef.current.cancel();
      }
    };
  }, []);

  const currentQ = CAREER_QUESTIONS[currentIndex];
  const qDetails = getQuestionText(currentQ, 'en');
  const totalQuestions = CAREER_QUESTIONS.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleTextChange = (text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: text,
    }));
  };

  const handleChipClick = (suggestion: string) => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id] || '';
      if (!existing.trim()) {
        return { ...prev, [currentQ.id]: suggestion };
      }
      if (existing.includes(suggestion)) return prev;
      return { ...prev, [currentQ.id]: `${existing.trim()}, ${suggestion}` };
    });
  };

  const handleVoiceToggle = async () => {
    if (!voiceController) return;

    if (isListening) {
      // User tapped to stop recording
      voiceController.stopListening();
      setIsListening(false);

      if (audioRecorderRef.current && audioRecorderRef.current.getIsRecording()) {
        try {
          const recordResult = await audioRecorderRef.current.stop();
          if (apiKey && apiKey.trim() && recordResult.base64 && recordResult.durationMs > 700) {
            setIsAiTranscribing(true);
            try {
              const aiText = await transcribeAudioWithGemini(
                apiKey,
                recordResult.base64,
                recordResult.mimeType,
                'en'
              );
              if (aiText && aiText.trim()) {
                // Replace rough spoken words with high-accuracy, properly punctuated AI transcript
                setAnswers((prev) => {
                  const curr = prev[currentQ.id] || '';
                  const speechChunk = recordedSessionSpeechRef.current;
                  const base = curr.endsWith(speechChunk)
                    ? curr.slice(0, curr.length - speechChunk.length).trim()
                    : curr.trim();
                  const final = base ? `${base} ${aiText.trim()}` : aiText.trim();
                  return {
                    ...prev,
                    [currentQ.id]: final,
                  };
                });
              }
            } catch (aiErr) {
              console.warn('Gemini STT fallback to browser recognition:', aiErr);
            } finally {
              setIsAiTranscribing(false);
            }
          }
        } catch (err) {
          console.warn('Error stopping audio recorder:', err);
        }
      }
    } else {
      // User tapped to start recording
      recordedSessionSpeechRef.current = '';

      if (AudioRecorder.isSupported()) {
        try {
          if (audioRecorderRef.current) {
            audioRecorderRef.current.cancel();
          }
          const rec = new AudioRecorder();
          audioRecorderRef.current = rec;
          await rec.start();
        } catch (recErr) {
          console.warn('High-accuracy recorder failed to start, falling back to speech recognition:', recErr);
        }
      }

      const started = voiceController.startListening(
        (transcript) => {
          recordedSessionSpeechRef.current = transcript;
          setAnswers((prev) => {
            const current = prev[currentQ.id] || '';
            const space = current && !current.endsWith(' ') ? ' ' : '';
            return {
              ...prev,
              [currentQ.id]: current + space + transcript,
            };
          });
        },
        (status) => setIsListening(status),
        (err) => {
          console.warn('Voice error:', err);
          setIsListening(false);
        },
        undefined,
        4500
      );
      if (started) setIsListening(true);
    }
  };

  const handleNext = () => {
    if (isListening && voiceController) {
      voiceController.stopListening();
      setIsListening(false);
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    // IF EDITING FROM REVIEW: Return directly to Review screen without resetting subsequent questions
    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setIsReviewMode(true);
      return;
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsReviewMode(true);
    }
  };

  const handleBack = () => {
    if (isListening && voiceController) {
      voiceController.stopListening();
      setIsListening(false);
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    if (isReviewMode) {
      setIsReviewMode(false);
      setCurrentIndex(totalQuestions - 1);
    } else if (isEditingFromReview) {
      // Cancel edit and return straight to review screen
      setIsEditingFromReview(false);
      setIsReviewMode(true);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (isListening && voiceController) {
      voiceController.stopListening();
      setIsListening(false);
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.cancel();
    }

    if (isEditingFromReview) {
      setIsEditingFromReview(false);
      setIsReviewMode(true);
      return;
    }

    handleNext();
  };

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setIsEditingFromReview(true);
    setIsReviewMode(false);
  };

  const handleReset = () => {
    const confirmMsg = 'Are you sure you want to clear your answers and start from Question 1?';

    if (window.confirm(confirmMsg)) {
      const resetState: QuestionnaireAnswers = {
        educationLevel: '',
        matricResults: '',
        intermediateResults: '',
        enjoyedSubjects: '',
        dislikedSubjects: '',
        hobbies: '',
        strengths: '',
        futureJobActivities: '',
        existingSkills: '',
        careerValues: '',
        practicalConstraints: '',
        fiveYearVision: '',
      };
      setAnswers(resetState);
      setCurrentIndex(0);
      setIsEditingFromReview(false);
      setIsReviewMode(false);
    }
  };

  // Review Screen
  if (isReviewMode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300" dir="ltr">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Step 2: Profile Review
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Review Your Career Profile
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                All 12 answers are saved independently. Editing any answer preserves all your other answers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset All
              </button>
            </div>
          </div>

          {/* List of answers */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 my-6">
            {CAREER_QUESTIONS.map((q, idx) => {
              const details = getQuestionText(q, 'en');
              const val = answers[q.id];
              const hasAnswer = val && val.trim().length > 0;
              return (
                <div
                  key={q.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                        {q.number}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {details.question}
                      </span>
                    </div>
                    <div className="pl-8 text-sm mt-1">
                      {hasAnswer ? (
                        <p className="text-slate-800 dark:text-slate-100 leading-relaxed font-normal">
                          {val}
                        </p>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500 italic text-xs">
                          (Skipped)
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToQuestion(idx)}
                    className="self-end sm:self-start inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              );
            })}
          </div>

          {/* Submission Notice & Action */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-slate-900 dark:text-white">
                Batch Analysis:
              </span>{' '}
              Your answers are sent together in one single request to Gemini to generate your ranked career directions.
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => onSubmit(answers)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-lg shadow-indigo-500/25 active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 1-at-a-time Question Screen
  const currentVal = answers[currentQ.id] || '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-in fade-in duration-300" dir="ltr">
      {/* Editing From Review Banner */}
      {isEditingFromReview && (
        <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
            <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              <strong>Editing Question {currentQ.number}</strong> — After editing, click &ldquo;Save &amp; Return to Review&rdquo;. All other 11 answers remain saved.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isListening && voiceController) {
                voiceController.stopListening();
                setIsListening(false);
              }
              if (audioRecorderRef.current) {
                audioRecorderRef.current.cancel();
              }
              setIsEditingFromReview(false);
              setIsReviewMode(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium shrink-0 cursor-pointer"
          >
            Cancel &amp; Return to Review
          </button>
        </div>
      )}

      {/* Progress header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            Question {currentIndex + 1} of {totalQuestions}
          </span>
          {onStartVoiceMode && (
            <button
              type="button"
              onClick={onStartVoiceMode}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              Switch to Voice Mode
            </button>
          )}
          <span>{progressPercent}% completed</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main question card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-9 shadow-xl relative" dir="ltr">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 font-bold text-sm flex items-center justify-center mb-3.5 shadow-xs">
            {currentQ.number}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
            {qDetails.question}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 leading-relaxed font-normal">
            {qDetails.subtitle}
          </p>

          {qDetails.helperText && (
            <div className="mt-3 inline-flex items-start gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 font-medium">
              <Lightbulb className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{qDetails.helperText}</span>
            </div>
          )}
        </div>

        {/* Text Area with Voice dictation option */}
        <div className="relative mb-5">
          <textarea
            rows={4}
            value={currentVal}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={qDetails.placeholder}
            dir="ltr"
            className="w-full p-4 pr-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm sm:text-base focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition shadow-xs leading-relaxed resize-y"
          />

          {/* Inline Microphone Dictate Button */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            title={isListening ? 'Stop recording voice' : 'Dictate your answer via voice'}
            className={`absolute right-3.5 bottom-4 p-2 rounded-xl transition cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse'
                : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        </div>

        {isListening && (
          <div className="mb-4 flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400 animate-pulse">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Listening to microphone... Speak clearly to dictate.
            </span>
            <button
              type="button"
              onClick={handleVoiceToggle}
              className="text-[11px] underline font-bold text-rose-600 dark:text-rose-300 hover:text-rose-800 cursor-pointer"
            >
              Done Speaking
            </button>
          </div>
        )}

        {isAiTranscribing && (
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Refining speech transcript with high-accuracy AI...</span>
          </div>
        )}

        {/* Quick Suggestion Chips */}
        {qDetails.chips.length > 0 && (
          <div className="mb-8">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Quick suggestions (click to insert):
            </div>
            <div className="flex flex-wrap gap-2">
              {qDetails.chips.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleChipClick(suggestion)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  + {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer controls: Back, Skip, Next */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleBack}
            disabled={!isEditingFromReview && currentIndex === 0}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer ${
              !isEditingFromReview && currentIndex === 0
                ? 'opacity-40 cursor-not-allowed text-slate-400'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> {isEditingFromReview ? 'Review' : 'Back'}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleSkip}
              className="px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
            >
              {isEditingFromReview ? (
                <>Save &amp; Return to Review <ArrowRight className="w-4 h-4" /></>
              ) : currentIndex === totalQuestions - 1 ? (
                <>
                  Review Answers <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
