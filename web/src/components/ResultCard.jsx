/**
 * ResultCard Component
 *
 * Compact search result card with title-first design.
 * Focus on scannability and clear actions.
 */

import { useState } from 'react';

export default function ResultCard({ resource, index, onCopy }) {
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

  // Determine badge color based on resource type
  const getBadgeClasses = (type) => {
    const upperType = type?.toUpperCase() || '';

    if (upperType.includes('PDF') || upperType.includes('TEXTBOOK')) {
      return 'bg-blue-100 text-blue-900';
    }
    if (upperType.includes('VIDEO') || upperType.includes('YOUTUBE')) {
      return 'bg-red-100 text-red-900';
    }
    if (upperType.includes('COURSE')) {
      return 'bg-green-100 text-green-900';
    }
    if (upperType.includes('WEBSITE') || upperType.includes('WEB')) {
      return 'bg-amber-100 text-amber-900';
    }
    if (upperType.includes('PRACTICE') || upperType.includes('PROBLEM')) {
      return 'bg-purple-100 text-purple-900';
    }
    return 'bg-gray-100 text-gray-900';
  };

  // Get hostname from URL for display
  const getHostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Get friendly title or fallback to hostname
  const getDisplayTitle = () => {
    if (resource.title && resource.title !== resource.url) {
      return resource.title;
    }
    return `${getHostname(resource.url)} resource`;
  };

  const hostname = getHostname(resource.url);
  const displaySource = resource.source || hostname;

  return (
    <article className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition">
      {/* Header: Badge + Title */}
      <div className="flex items-start gap-3 mb-2">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${getBadgeClasses(resource.type)} flex-shrink-0`}>
          {resource.type}
        </span>
      </div>

      {/* Title as clickable link */}
      <h3 className="m-0 mb-2">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-base sm:text-lg font-semibold text-slate-900 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
        >
          {getDisplayTitle()}
        </a>
      </h3>

      {/* Source/hostname line */}
      <p className="m-0 mb-2 text-xs sm:text-sm text-slate-600 truncate">
        {displaySource}
      </p>

      {/* Description (clamped to 2 lines) */}
      {resource.description && (
        <p className="m-0 mb-3 text-sm text-slate-700 line-clamp-2">
          {resource.description}
        </p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded"
        >
          Open
        </a>
        <button
          onClick={handleCopy}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 min-h-[40px]"
          title="Copy link"
        >
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
    </article>
  );
}
