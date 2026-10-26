/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

const PRIVACY_DISMISSED_KEY = 'career_counselor_privacy_dismissed';

export const PrivacyBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(PRIVACY_DISMISSED_KEY) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem(PRIVACY_DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs py-2.5 px-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="leading-tight text-slate-700 dark:text-slate-300">
            <strong className="text-slate-900 dark:text-white font-semibold">Privacy Notice:</strong> Your questionnaire answers and
            conversations remain locally in your browser (IndexedDB). When you submit questions,
            they are transmitted directly to Google&apos;s Gemini API and are subject to Google&apos;s terms
            and privacy practices.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1 rounded-md transition cursor-pointer"
          title="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
