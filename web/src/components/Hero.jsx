/**
 * Hero Component
 *
 * Compact, collapsible hero that explains the workflow using styled step pills.
 * No images. No “rail” mode.
 */

import { useState } from 'react';

export default function Hero() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleStartSearch = () => {
    const searchSection = document.getElementById('search-parameters');
    if (searchSection) {
      searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="relative rounded-2xl bg-white border border-slate-200 border-l-8 border-l-amber-500 shadow-sm overflow-hidden">
      {/* Collapsed */}
      {isCollapsed ? (
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold text-slate-900">
              Supply book link → Find resources → Copy to NotebookLM → Generate study kit
            </p>
            <p className="m-0 mt-1 text-xs text-slate-600">
              Summaries, flashcards, and quizzes in minutes.
            </p>
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Expand hero section"
          >
            <svg className="w-5 h-5 text-slate-600 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {/* Title */}
          <h1 className="m-0 text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Turn your course page into a complete study kit
          </h1>

          {/* Styled flow */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-xs">
                1
              </span>
              <span className="text-sm font-semibold text-slate-900">
                Supply course link / book
              </span>
            </div>

            <span className="text-slate-400">→</span>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-xs">
                2
              </span>
              <span className="text-sm font-semibold text-slate-900">Discover resources</span>
              <span className="text-sm text-slate-600 hidden sm:inline">
                (textbooks, practice problems, videos)
              </span>
            </div>

            <span className="text-slate-400">→</span>

            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-blue-200 text-slate-800 font-semibold text-xs">
                3
              </span>
              <span className="text-sm font-semibold text-slate-900">Copy URLs to NotebookLM</span>
            </div>

            <span className="text-slate-400">→</span>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-800 font-semibold text-xs">
                4
              </span>
              <span className="text-sm font-semibold text-slate-900">Generate</span>
              <span className="text-sm text-slate-600 hidden sm:inline">
                summaries, flashcards, quizzes
              </span>
            </div>
          </div>

          {/* Mobile-only condensed line */}
          <p className="mt-2 mb-0 text-xs text-slate-600 sm:hidden">
            Resources → NotebookLM → summaries • flashcards • quizzes
          </p>

          {/* Actions */}
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleStartSearch}
              className="min-h-[40px] bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors"
            >
              Supply your course link
            </button>

            <a
              href="https://notebooklm.google.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open NotebookLM in a new tab"
              className="min-h-[40px] border border-slate-300 bg-white text-blue-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-colors inline-flex items-center justify-center gap-2"
            >
              Open NotebookLM
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Tip + trust line */}
          <p className="mt-2 mb-0 text-xs text-slate-600">
            <strong className="font-semibold text-slate-700">Tip:</strong> After your search, click{" "}
            <span className="font-semibold">“Copy All URLs”</span> and paste them into NotebookLM.
          </p>
          <p className="mt-1 mb-0 text-xs text-slate-500">
            Curated from open textbooks and academic sources — no random blogs.
          </p>

          {/* Collapse control */}
          <div className="flex justify-end pt-3 border-t border-slate-200 mt-3">
            <button
              onClick={() => setIsCollapsed(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Collapse hero section"
            >
              <span>Collapse</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
