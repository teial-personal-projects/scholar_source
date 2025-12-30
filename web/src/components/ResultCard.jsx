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

  const getSiteName = (url) => {
    const hostname = getHostname(url);
    const lower = hostname.toLowerCase();

    // Map common educational domains to friendly names
    if (lower.includes('mit.edu') || lower.includes('ocw.mit.edu')) return 'MIT';
    if (lower.includes('stanford.edu')) return 'Stanford';
    if (lower.includes('berkeley.edu') || lower.includes('ucb.edu')) return 'UC Berkeley';
    if (lower.includes('openstax.org')) return 'OpenStax';
    if (lower.includes('libretexts.org')) return 'LibreTexts';
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube';
    if (lower.includes('khanacademy.org')) return 'Khan Academy';
    if (lower.includes('coursera.org')) return 'Coursera';
    if (lower.includes('edx.org')) return 'edX';

    // Extract a clean site name from the hostname
    const parts = hostname.split('.');
    
    // For .edu sites, extract university name (skip subdomains like "ocw", "www")
    if (lower.endsWith('.edu')) {
      // Handle subdomains: "ocw.mit.edu" -> "MIT"
      if (parts.length > 2) {
        const subdomain = parts[parts.length - 3].toLowerCase();
        if (subdomain === 'ocw' || subdomain === 'www' || subdomain === 'web') {
          const universityName = parts[parts.length - 2];
          return universityName.charAt(0).toUpperCase() + universityName.slice(1);
        }
      }
      // Standard .edu domain: "mit.edu" -> "MIT"
      if (parts.length >= 2) {
        const name = parts[parts.length - 2];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }

    // For other domains, extract the main domain name (part before TLD)
    // e.g., "example.com" -> "Example", "some-site.org" -> "Some Site"
    if (parts.length >= 2) {
      const mainName = parts[parts.length - 2];
      // Convert to title case, handling hyphens (e.g., "some-site" -> "Some Site")
      return mainName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }

    // Fallback: use first part of hostname
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
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
      {/* Left side checkbox */}
      <div className="absolute left-2 top-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
          aria-label={isSelected ? 'Deselect resource' : 'Select resource'}
        />
      </div>

      {/* Header row */}
      <div className="flex items-center gap-2 mb-1.5 pl-7">
        <span className={getBadgeClass(resource.type)}>
          {resource.type}
        </span>

        <span className="ml-auto text-xs text-slate-500">{getSiteName(resource.url)}</span>
      </div>

      {/* Title */}
      <h3 className="m-0 mb-1.5 pl-7">
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
        <p className="m-0 mb-2 text-sm text-slate-700 line-clamp-2 pl-7">{resource.description}</p>
      )}

      {/* Actions row */}
      <div className="flex items-center gap-2 pl-7">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 rounded inline-flex items-center gap-1"
        >
          Visit Resource ↗
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
