/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Bold + Italic: ***text***
 * - Inline code: `code`
 * - Links: [label](url)
 */
function renderInline(text: string): React.ReactNode[] {
  // Regex to match ***bold italic***, **bold**, *italic*, `code`, and [label](url)
  const tokenRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold + Italic: ***text***
    if (part.startsWith('***') && part.endsWith('***') && part.length >= 6) {
      const inner = part.slice(3, -3);
      return (
        <strong key={index} className="font-bold italic text-slate-900 dark:text-white">
          {inner}
        </strong>
      );
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {inner}
        </strong>
      );
    }

    // Inline code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] sm:text-xs border border-slate-200/80 dark:border-slate-700"
        >
          {inner}
        </code>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={index} className="italic text-slate-700 dark:text-slate-300">
          {inner}
        </em>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, url] = linkMatch;
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 underline font-medium hover:text-indigo-700 dark:hover:text-indigo-300 break-all"
        >
          {label}
          <ExternalLink className="w-3 h-3 inline-block ml-0.5 opacity-70" />
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'codeblock'; language: string; code: string }
  | { type: 'bullet-list'; items: string[] }
  | { type: 'numbered-list'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

function parseMarkdownBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      blocks.push({
        type: 'codeblock',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // Horizontal Rule
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    if (trimmed.startsWith('#')) {
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        if (level === 1) blocks.push({ type: 'h1', text });
        else if (level === 2) blocks.push({ type: 'h2', text });
        else if (level === 3) blocks.push({ type: 'h3', text });
        else blocks.push({ type: 'h4', text });
        i++;
        continue;
      }
    }

    // Blockquote >
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
      continue;
    }

    // Bullet List (- item or * item or + item)
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'bullet-list', items });
      continue;
    }

    // Numbered List (1. item, 2. item, etc.)
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'numbered-list', items });
      continue;
    }

    // Standard Paragraph: combine contiguous non-empty lines that aren't special blocks
    const pLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !/^(?:---|\*\*\*|___)$/.test(lines[i].trim())
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: pLines.join(' ') });
  }

  return blocks;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
}) => {
  if (!content || !content.trim()) {
    return null;
  }

  const blocks = parseMarkdownBlocks(content);

  return (
    <div
      dir="ltr"
      className={`space-y-2.5 text-slate-800 dark:text-slate-100 text-xs sm:text-sm leading-relaxed text-left ${className}`}
    >
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h3
                key={idx}
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-white pt-2 pb-1 border-b border-slate-100 dark:border-slate-800 first:pt-0"
              >
                {renderInline(block.text)}
              </h3>
            );

          case 'h2':
            return (
              <h4
                key={idx}
                className="text-xs sm:text-sm font-bold text-indigo-700 dark:text-indigo-400 pt-2 pb-0.5 first:pt-0 flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block shrink-0" />
                <span>{renderInline(block.text)}</span>
              </h4>
            );

          case 'h3':
          case 'h4':
            return (
              <h5
                key={idx}
                className="text-xs sm:text-xs font-semibold text-slate-900 dark:text-slate-200 pt-1.5 pb-0.5 first:pt-0"
              >
                {renderInline(block.text)}
              </h5>
            );

          case 'bullet-list':
            return (
              <ul key={idx} className="space-y-1.5 my-2 pl-0.5 pr-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2 shrink-0" />
                    <div className="flex-1 leading-relaxed min-w-0 break-words">{renderInline(item)}</div>
                  </li>
                ))}
              </ul>
            );

          case 'numbered-list':
            return (
              <ol key={idx} className="space-y-1.5 my-2 pl-0.5 pr-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] shrink-0 mt-0.5">
                      {itemIdx + 1}
                    </span>
                    <div className="flex-1 leading-relaxed min-w-0 break-words">{renderInline(item)}</div>
                  </li>
                ))}
              </ol>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="py-1.5 my-2 text-slate-600 dark:text-slate-300 italic bg-indigo-50/50 dark:bg-indigo-950/20 text-xs border-l-3 border-indigo-500 dark:border-indigo-400 pl-3 rounded-r-lg"
              >
                {renderInline(block.text)}
              </blockquote>
            );

          case 'codeblock':
            return (
              <div key={idx} className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
                {block.language && (
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    {block.language}
                  </div>
                )}
                <pre className="p-3 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed text-left">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case 'hr':
            return <hr key={idx} className="my-2 border-slate-200 dark:border-slate-800" />;

          case 'paragraph':
          default:
            return (
              <p key={idx} className="leading-relaxed text-slate-700 dark:text-slate-200 break-words">
                {renderInline(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
};
