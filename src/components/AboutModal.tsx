/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Award, BookOpen, HeartHandshake, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { CounselorAvatar } from './Avatar';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-xl w-full p-6 text-slate-800 dark:text-slate-100 max-h-[88vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-5">
          <CounselorAvatar size="lg" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              About the Career Counselor
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Inspired by Dr. Sue Black OBE&apos;s Principles
            </p>
          </div>
        </div>

        {/* Identity & Non-Impersonation Disclosure */}
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-5">
          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
            Counselor Attribution &amp; Role:
          </span>{' '}
          This assistant does not impersonate Dr. Susan Black. Instead, it embeds and applies the
          empowering, pragmatic career guidance philosophy documented in her public initiatives,
          interviews, and writing.
        </div>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5">
              <Award className="w-4 h-4 text-amber-500" /> About Dr. Sue Black OBE
            </h3>
            <p>
              Dr. Sue Black OBE is a Professor of Computer Science and Technology Evangelist at Durham
              University, honorary professor at UCL, and award-winning digital skills advocate. She
              founded <strong>BCSWomen</strong>, <strong>#techmums</strong>, and the acclaimed{' '}
              <strong>TechUPWomen</strong> retraining program at Durham University. She also led the
              campaign to save Bletchley Park and was awarded an OBE in 2016 for services to technology.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1.5">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Core Counseling Philosophy
            </h3>
            <ul className="space-y-2 pl-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Skills over prestige:</strong> Practical education and digital capabilities
                  are the strongest engine out of limited circumstances and financial hardship.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Practical brain &amp; cognitive fit:</strong> Match paths to how a student&apos;s
                  mind actually operates. Applied, hands-on problem solving is just as valuable as
                  abstract theory.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Never judge on grades alone:</strong> An academic setback or non-linear path
                  is an obstacle to hurdle, never a permanent dead end.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Shape careers around real life:</strong> Acknowledge family obligations,
                  remote requirements, and financial constraints rather than forcing an impractical path.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Apply before feeling 100% &ldquo;ready&rdquo;:</strong> Champion your own
                  achievements, persist through waves of doubt, and build supportive networks.
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Guidance Notice
            </h3>
            <p>
              Recommendations provided by this assistant represent exploratory guidance and career
              avenues, not a guaranteed prediction or legal advisory. Specific institutional
              admissions and regional credential requirements should be verified locally.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
