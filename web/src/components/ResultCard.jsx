/**
 * ResultCard Component
 *
 * Compact search result card with title-first design
 */

import { useState } from 'react';

export default function ResultCard({ resource, index, onCopy, isSelected, onToggleSelect }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resource.url);
      setCopied(true);
      if (onCopy) onCopy(resource.url, index);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getBadgeClass = (type) => {
    const upperType = type?.toUpperCase() || '';
    if (upperType.includes('PDF') || upperType.includes('TEXTBOOK')) return 'badge badge-pdf';
    if (upperType.includes('VIDEO') || upperType.includes('YOUTUBE')) return 'badge badge-video';
    if (upperType.includes('COURSE')) return 'badge badge-course';
    if (upperType.includes('WEBSITE') || upperType.includes('WEB')) return 'badge badge-website';
    if (upperType.includes('PRACTICE') || upperType.includes('PROBLEM')) return 'badge badge-practice';
    return 'badge badge-default';
  };

  const getHostname = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const getDisplayTitle = () => {
    if (resource.title && resource.title !== resource.url) return resource.title;
    return `${getHostname(resource.url)} resource`;
  };

  const handleCardClick = (e) => {
    // Do NOT toggle when clicking interactive elements inside the card.
    // (Visit link, Copy URL button, etc.)
    const interactive = e.target.closest('a,button,input,textarea,select,label');
    if (interactive) return;
    onToggleSelect?.();
  };

  const handleCardKeyDown = (e) => {
    // Keyboard accessibility: Space/Enter toggles selection when the card has focus.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggleSelect?.();
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`result-card ${isSelected ? 'selected' : ''}`}
      title={isSelected ? 'Selected for copy to NotebookLM' : 'Click to select for copy to NotebookLM'}
    >
      {/* Corner selected indicator */}
      <div className="absolute left-3 top-3">
        <div
          className={`result-card-checkbox ${isSelected ? 'selected' : ''}`}
          aria-hidden="true"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5A1 1 0 015.704 9.29l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5 pl-10">
        <span className={getBadgeClass(resource.type)}>
          {resource.type}
        </span>

        {/* Subtle "Selected" chip */}
        {isSelected && (
          <span className="badge badge-selected">
            Selected
          </span>
        )}

        <span className="ml-auto text-xs text-slate-500">{getHostname(resource.url)}</span>
      </div>

      {/* Title */}
      <h3 className="m-0 mb-1.5 pl-10">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base sm:text-lg font-semibold text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
        >
          {getDisplayTitle()}
        </a>
      </h3>

      {/* Description */}
      {resource.description && (
        <p className="m-0 mb-2 text-sm text-slate-700 line-clamp-2 pl-10">{resource.description}</p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 pl-10">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded inline-flex items-center gap-1"
        >
          Visit →
        </a>

        <button
          onClick={handleCopy}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 min-h-[40px]"
          title="Copy URL"
          type="button"
        >
          {copied ? '✓ Copied' : 'Copy URL'}
        </button>
      </div>
    </article>
  );
}
