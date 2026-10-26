/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isThinking?: boolean;
  isSpeaking?: boolean;
  customImageSrc?: string;
  className?: string;
}

export const CounselorAvatar: React.FC<AvatarProps> = ({
  size = 'md',
  isThinking = false,
  isSpeaking = false,
  customImageSrc,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-lg',
    '2xl': 'w-32 h-32 sm:w-36 sm:h-36 text-xl',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Outer pulsing ring when thinking or speaking */}
      {(isThinking || isSpeaking) && (
        <span
          className={`absolute -inset-1.5 rounded-full animate-ping opacity-35 ${
            isSpeaking ? 'bg-emerald-500' : 'bg-indigo-500'
          }`}
        />
      )}

      {/* Main circular avatar container */}
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/10 flex items-center justify-center transition-transform hover:scale-102`}
      >
        <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden relative">
          {customImageSrc ? (
            <img
              src={customImageSrc}
              alt="Dr. Susan Black | Career Counselor"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            /* Clean, intentional CSS/SVG vector illustration of Dr. Susan Black (counselor placeholder) */
            <svg
              viewBox="0 0 64 64"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Background gradient aura */}
              <circle cx="32" cy="32" r="32" className="fill-indigo-950/60" />

              {/* Hair / Head silhouette */}
              <path
                d="M18 30C18 20 23 12 32 12C41 12 46 20 46 30C46 36 43 38 43 40C43 40 40 43 32 43C24 43 21 40 21 40C21 38 18 36 18 30Z"
                className="fill-indigo-400"
              />

              {/* Face */}
              <ellipse cx="32" cy="31" rx="10" ry="12" className="fill-amber-100" />

              {/* Hair bangs / style */}
              <path
                d="M22 26C25 21 30 20 35 22C39 23 41 21 42 25C40 23 37 22 34 22C28 22 25 24 22 26Z"
                className="fill-indigo-700"
              />

              {/* Professional Glasses */}
              <rect
                x="25"
                y="28"
                width="5"
                height="4"
                rx="1.5"
                className="stroke-slate-800 stroke-[1.2] fill-white/40"
              />
              <rect
                x="34"
                y="28"
                width="5"
                height="4"
                rx="1.5"
                className="stroke-slate-800 stroke-[1.2] fill-white/40"
              />
              <path d="M30 30H34" className="stroke-slate-800 stroke-[1.2]" />

              {/* Friendly smile */}
              <path
                d="M29 36C30.5 37.5 33.5 37.5 35 36"
                className="stroke-amber-900 stroke-[1.4] stroke-linecap-round"
              />

              {/* Professional Collar / Blazer */}
              <path
                d="M16 54C16 46 23 43 32 43C41 43 48 46 48 54V60H16V54Z"
                className="fill-indigo-600"
              />
              <path d="M29 43L32 49L35 43H29Z" className="fill-pink-200" />

              {/* Star badge of empowerment */}
              <circle cx="39" cy="48" r="2.5" className="fill-amber-400" />
            </svg>
          )}
        </div>
      </div>

      {/* Status indicator pip */}
      {isSpeaking ? (
        <span
          title="Speaking"
          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse"
        />
      ) : isThinking ? (
        <span
          title="Processing"
          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-indigo-500 border-2 border-slate-900 rounded-full animate-bounce"
        />
      ) : (
        <span
          title="Counselor Online"
          className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"
        />
      )}
    </div>
  );
};
