/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Compass,
  Award,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Lightbulb,
  BookOpen,
} from 'lucide-react';
import { AppLanguage, StructuredAssessment } from '../types';

interface StructuredAssessmentCardProps {
  assessment: StructuredAssessment;
  language?: AppLanguage;
  onAskQuestion: (question: string) => void;
}

export const StructuredAssessmentCard: React.FC<StructuredAssessmentCardProps> = ({
  assessment,
  onAskQuestion,
}) => {
  const topList = assessment.topRecommendations || [];
  const additionalList = assessment.additionalRecommendations || [];
  const bullets = assessment.profileSummaryBullets || [];

  const top1 = topList[0];

  const suggestedQuestions = [
    `Why is #${top1?.rank || 1} (${top1?.title || 'Direction 1'}) suitable for me?`,
    `How can I start learning this step-by-step?`,
    `Which degree or courses would help most?`,
    `What are the real-world challenges of this career?`,
    `How can I pursue this career in my country?`,
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir="ltr">
      {/* Assessment Header */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/50 dark:via-purple-950/30 dark:to-slate-900 p-5 sm:p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
        <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>Personalized Career Assessment</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
          Personalized Career Direction Report
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
          Inspired by Dr. Sue Black OBE’s skills-first, non-linear career principles.
        </p>
      </div>

      {/* SECTION A: Student Profile Summary */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
          <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 shrink-0">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              A. Student Profile Summary
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Key takeaways from your 12-question submission
            </span>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {bullets.map((bullet, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/60"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* SECTION B: Top Career Recommendations */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 shrink-0">
              <Award className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                B. Top Career Recommendations
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Top three ranked pathways with tailored fit explanations
              </p>
            </div>
          </div>
        </div>

        {/* Top 3 Cards */}
        <div className="grid grid-cols-1 gap-3.5">
          {topList.map((rec) => {
            const isRank1 = rec.rank === 1;
            const isRank2 = rec.rank === 2;

            const badgeColor = isRank1
              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700/70'
              : isRank2
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/70'
              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700/70';

            const rankLabel = isRank1
              ? '#1 — Primary Match'
              : isRank2
              ? '#2 — Secondary Direction'
              : '#3 — Alternative Path';

            return (
              <div
                key={rec.rank}
                className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border transition shadow-sm ${
                  isRank1
                    ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-500/50 ring-2 ring-indigo-500/15'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${badgeColor}`}
                  >
                    {rankLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onAskQuestion(
                        `Please provide a detailed learning roadmap and practical next steps for '${rec.title}'.`
                      )
                    }
                    className="text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Request Roadmap</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h5 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {rec.title}
                </h5>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {rec.fitExplanation}
                </p>
              </div>
            );
          })}
        </div>

        {/* Additional Recommendations (Up to 2) */}
        {additionalList.length > 0 && (
          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-3">
              Additional Suitable Options to Keep in Mind:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {additionalList.map((add, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-xs shadow-xs"
                >
                  <p className="font-bold text-slate-900 dark:text-white mb-1">{add.title}</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {add.fitExplanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empowering Closing Thought */}
        {assessment.closingThought && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <span className="italic leading-relaxed font-medium">{assessment.closingThought}</span>
          </div>
        )}
      </div>

      {/* SECTION C: Further Details on Request */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            C. Further Details on Request
          </h4>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
          Detailed roadmaps, course recommendations, degree requirements, or local career pathways are available on request. Click any question below to explore further:
        </p>

        {/* Interactive follow-up prompt chips */}
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((qText, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onAskQuestion(qText)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-800 dark:text-slate-200 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-300 dark:border-slate-700 shadow-xs transition active:scale-98 text-left cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{qText}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
