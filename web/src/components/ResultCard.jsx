/**
 * ResultCard Component
 *
 * Reusable card component for displaying individual resource results.
 * Mobile-first design with accessible focus and hover states.
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
      return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900 border-blue-300';
    }
    if (upperType.includes('VIDEO') || upperType.includes('YOUTUBE')) {
      return 'bg-gradient-to-br from-red-100 to-red-200 text-red-900 border-red-300';
    }
    if (upperType.includes('COURSE')) {
      return 'bg-gradient-to-br from-green-100 to-green-200 text-green-900 border-green-300';
    }
    if (upperType.includes('WEBSITE') || upperType.includes('WEB')) {
      return 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 border-amber-300';
    }
    if (upperType.includes('PRACTICE') || upperType.includes('PROBLEM')) {
      return 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-900 border-purple-300';
    }
    return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-900 border-gray-300';
  };

  // Check if title is just the URL (to avoid redundancy)
  const isTitleUrl = resource.title === resource.url;

  return (
    <article
      className="group relative rounded-2xl bg-white/80 backdrop-blur p-4 sm:p-6 border border-slate-200 shadow-sm transition-all duration-200 hover:border-primary-light hover:shadow-md hover:-translate-y-1 focus-within:ring-4 focus-within:ring-primary/20 focus-within:ring-offset-2"
    >
      {/* Type Badge & Title */}
      <div className="flex items-start gap-3 mb-4 flex-wrap">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getBadgeClasses(resource.type)} flex-shrink-0`}>
          {resource.type}
        </span>
        {!isTitleUrl && (
          <h3 className="m-0 text-lg sm:text-xl font-bold text-slate-900 flex-1 min-w-0 tracking-tight leading-snug">
            {resource.title}
          </h3>
        )}
      </div>

      {/* Source Information (if available) */}
      {resource.source && (
        <p className="text-sm text-slate-600 mb-3">
          <span className="font-medium">{resource.source}</span>
        </p>
      )}

      {/* Description (if available) */}
      {resource.description && (
        <p className="text-sm text-slate-700 mb-4 leading-relaxed line-clamp-2 sm:line-clamp-none">
          {resource.description}
        </p>
      )}

      {/* URL Section with Copy Button */}
      <div className="flex items-center gap-2 p-3 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 transition-all hover:from-slate-100 hover:to-slate-200 hover:border-primary-light">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-xs sm:text-sm text-primary font-medium no-underline break-all leading-relaxed transition-colors hover:text-primary-dark hover:underline focus:outline-none focus:ring-4 focus:ring-primary/20 focus:ring-offset-2 focus:rounded"
          aria-label={`Visit ${resource.title}`}
        >
          {resource.url}
        </a>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold transition-all hover:bg-primary hover:text-white hover:border-primary hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/20 focus:ring-offset-2"
          title="Copy URL to clipboard"
          aria-label={`Copy URL for ${resource.title}`}
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
    </article>
  );
}
