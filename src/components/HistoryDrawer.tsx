/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  Download,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ConversationSession } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onStartNewSession: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onStartNewSession,
}) => {
  if (!isOpen) return null;

  const handleExportSession = (session: ConversationSession, format: 'json' | 'markdown') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'json') {
      content = JSON.stringify(session, null, 2);
      filename = `career-counseling-session-${session.id}.json`;
      mimeType = 'application/json';
    } else {
      // Markdown format
      const dateStr = new Date(session.createdAt).toLocaleDateString();
      const messagesMd = session.messages
        .map((m) => `### ${m.role === 'assistant' ? '🤖 Counselor' : '👤 Student'} (${new Date(m.timestamp).toLocaleTimeString()}):\n\n${m.content}\n`)
        .join('\n---\n\n');

      content = `# AI Career Counseling Session Report
Date: ${dateStr}
Education Track: ${session.answers.educationLevel || 'Not specified'}

## Student Answers:
- Enjoyed Subjects: ${session.answers.enjoyedSubjects || 'N/A'}
- Strengths: ${session.answers.strengths || 'N/A'}
- Career Values: ${session.answers.careerValues || 'N/A'}
- Constraints: ${session.answers.practicalConstraints || 'N/A'}
- Five-Year Vision: ${session.answers.fiveYearVision || 'N/A'}

---

## Counseling Discussion:

${messagesMd}
`;
      filename = `career-counseling-session-${session.id}.md`;
      mimeType = 'text/markdown';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col p-6 shadow-2xl relative animate-in slide-in-from-right duration-250">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-500" /> Past Sessions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {sessions.length} saved counseling sessions in IndexedDB
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            aria-label="Close past sessions"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Start New Session Action */}
        <div className="py-4">
          <button
            type="button"
            onClick={() => {
              onStartNewSession();
              onClose();
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition active:scale-98"
          >
            <Plus className="w-4 h-4" /> Start New Counseling Session
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sessions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4">
              <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                No previous sessions saved yet
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Complete a questionnaire to start your first counseling journey.
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const dateFormatted = new Date(session.updatedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={session.id}
                  className={`rounded-2xl p-4 border transition ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                      className="text-left flex-1"
                    >
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {session.title || 'Career Counseling Session'}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" /> {dateFormatted}
                      </p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Export Dropdown / Quick Button */}
                      <button
                        type="button"
                        onClick={() => handleExportSession(session, 'markdown')}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                        title="Download Markdown Report"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this counseling session?')) {
                            onDeleteSession(session.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-800"
                        title="Delete session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    Track: {session.answers.educationLevel || 'General'} • Values:{' '}
                    {session.answers.careerValues || 'Growth'}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">{session.messages.length} messages</span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSession(session.id);
                        onClose();
                      }}
                      className="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1 hover:underline"
                    >
                      Resume <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
