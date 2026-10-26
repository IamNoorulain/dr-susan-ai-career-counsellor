/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  History,
  Moon,
  Sun,
  Info,
  Menu,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CounselorAvatar } from './Avatar';
import { AppLanguage } from '../types';

interface NavbarProps {
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenAbout: () => void;
  onGoHome: () => void;
  sessionCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  theme,
  onToggleTheme,
  language,
  onLanguageChange,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenSettings,
  onOpenHistory,
  onOpenAbout,
  onGoHome,
  sessionCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Prominent Header Identity */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-3 text-left group focus:outline-hidden"
          title="Return to Home"
        >
          <CounselorAvatar size="md" />
          <div className="flex flex-col">
            <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Dr. Susan Black
              <span className="text-slate-400 dark:text-slate-600 font-light">|</span>
              <span className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                Career Counselor
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Empowerment &amp; Skills-First Career Guidance
            </p>
          </div>
        </button>

        {/* Desktop Controls Area (Compact on the right) */}
        <div className="hidden sm:flex items-center gap-2">

          {/* Readout toggle */}
          <button
            type="button"
            onClick={onToggleAutoSpeak}
            className={`p-2 rounded-xl border transition ${
              autoSpeak
                ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
            title={autoSpeak ? 'Counselor voice readout: ON' : 'Counselor voice readout: OFF'}
            aria-label="Toggle counselor voice"
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Past Sessions Drawer Button */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title="Past Sessions"
            aria-label="Past Sessions"
          >
            <History className="w-4 h-4" />
            {sessionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {sessionCount > 9 ? '9+' : sessionCount}
              </span>
            )}
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {/* About Modal */}
          <button
            type="button"
            onClick={onOpenAbout}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title="About Dr. Sue Black OBE's Principles"
            aria-label="About"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Settings Modal */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition"
            title="Settings & API Key"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="flex sm:hidden items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu (Prevents header overflow on mobile) */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Appearance</span>
            <button
              type="button"
              onClick={onToggleTheme}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-medium"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Voice Readout</span>
            <button
              type="button"
              onClick={onToggleAutoSpeak}
              className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium ${
                autoSpeak
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {autoSpeak ? 'Enabled' : 'Muted'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                onOpenHistory();
                setMobileMenuOpen(false);
              }}
              className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center font-medium flex flex-col items-center gap-1"
            >
              <History className="w-4 h-4 text-indigo-500" />
              <span>Sessions ({sessionCount})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenAbout();
                setMobileMenuOpen(false);
              }}
              className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center font-medium flex flex-col items-center gap-1"
            >
              <Info className="w-4 h-4 text-indigo-500" />
              <span>About</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenSettings();
                setMobileMenuOpen(false);
              }}
              className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-center font-medium flex flex-col items-center gap-1"
            >
              <Settings className="w-4 h-4 text-indigo-500" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
