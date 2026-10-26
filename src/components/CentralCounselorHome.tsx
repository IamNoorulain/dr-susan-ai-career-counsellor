/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mic, Keyboard, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { CounselorAvatar } from './Avatar';
import { AppLanguage } from '../types';

interface CentralCounselorHomeProps {
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
  onStartVoiceCounseling: () => void;
  onStartTextCounseling: () => void;
  onResumeSession?: () => void;
  hasActiveSession?: boolean;
}

export const CentralCounselorHome: React.FC<CentralCounselorHomeProps> = ({
  onStartVoiceCounseling,
  onStartTextCounseling,
  onResumeSession,
  hasActiveSession = false,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-3xl mx-auto w-full text-center animate-in fade-in duration-300">
      {/* Centered Circular Counselor Avatar Placeholder */}
      <div className="relative mb-6">
        <CounselorAvatar size="2xl" />
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 shadow-md whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Ready to Counsel
        </div>
      </div>

      {/* Counselor Title */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        Skills-First • Practical Career Guidance
      </div>

      <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
        Dr. Susan Black
        <span className="block text-indigo-600 dark:text-indigo-400 text-lg sm:text-xl font-bold mt-1">
          Career Counselor Assistant
        </span>
      </h1>

      {/* Short Welcome Message */}
      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-8 font-normal">
        Welcome! I am here to help you navigate your career journey based on practical
        skills, personal strengths, and real-life goals. Let’s discover your ideal career path
        together.
      </p>

      {/* Prominent Action Buttons */}
      <div className="w-full max-w-md flex flex-col gap-3.5">
        {/* One Prominent Button Labeled "Start Voice Counseling" */}
        <button
          type="button"
          onClick={onStartVoiceCounseling}
          className="w-full inline-flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base transition shadow-xl shadow-indigo-600/25 active:scale-98 cursor-pointer"
        >
          <Mic className="w-5 h-5 text-indigo-100 animate-pulse shrink-0" />
          <span>Start Voice Counseling</span>
        </button>

        {/* Secondary Text-Based Option */}
        <button
          type="button"
          onClick={onStartTextCounseling}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-700 transition shadow-xs cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>Prefer typing? Start Text Questionnaire</span>
        </button>

        {/* Resume past active session if present */}
        {hasActiveSession && onResumeSession && (
          <button
            type="button"
            onClick={onResumeSession}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline pt-2 inline-flex items-center justify-center gap-1 font-semibold cursor-pointer"
          >
            <span>Resume active session</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Trust & Principles Highlights */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-left">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Skills First
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            Practical problem solving and aptitudes over rigid grades.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              Real-Life Fit
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            Shaped around your location, budget, and commitments.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              12 Guided Questions
            </span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
            Collected locally first, batch-evaluated in one request.
          </p>
        </div>
      </div>
    </div>
  );
};
