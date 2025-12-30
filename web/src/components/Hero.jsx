/**
 * Hero Component
 *
 * Compact, collapsible hero that explains the workflow using styled step pills.
 * No images. No “rail” mode.
 */

import { useState } from 'react';

export default function Hero() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="relative rounded-lg bg-white border border-slate-200 border-l-4 border-l-amber-500 shadow-sm overflow-hidden">
      {/* Collapsed */}
      {isCollapsed ? (
        <div className="px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold text-slate-900">
              Supply course or book URL → Find resources → Copy to NotebookLM → Generate study kit
            </p>
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="flex-shrink-0 p-1 hover:bg-slate-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Expand hero section"
          >
            <svg className="w-4 h-4 text-slate-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Title */}
          <h1 className="m-0 text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Turn your course page into a complete study kit
          </h1>

          {/* Styled flow */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <div className="step-pill">
              <span className="step-number">1</span>
              <span className="text-xs font-semibold text-slate-900">
                Supply course or book URL
              </span>
            </div>

            <span className="text-slate-400 text-xs">→</span>

            <div className="step-pill">
              <span className="step-number">2</span>
              <span className="text-xs font-semibold text-slate-900">Discover resources</span>
              <span className="text-xs text-slate-600 hidden sm:inline">
                (textbooks, practice problems, videos)
              </span>
            </div>

            <span className="text-slate-400 text-xs">→</span>

            <div className="step-pill highlighted">
              <span className="step-number">3</span>
              <span className="text-xs font-semibold text-slate-900">Copy URLs to NotebookLM</span>
            </div>

            <span className="text-slate-400 text-xs">→</span>

            <div className="step-pill">
              <span className="step-number">4</span>
              <span className="text-xs font-semibold text-slate-900">Generate</span>
              <span className="text-xs text-slate-600 hidden sm:inline">
                summaries, flashcards, quizzes
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex flex-col sm:flex-row gap-1.5">
            <a
              href="https://notebooklm.google.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open NotebookLM in a new tab"
              className="min-h-[32px] border border-slate-300 bg-white text-blue-700 rounded px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              Open NotebookLM
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Collapse control */}
          <div className="flex justify-end pt-1.5 border-t border-slate-200 mt-2">
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Collapse hero section"
            >
              <span>Collapse</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
