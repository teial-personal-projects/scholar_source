/**
 * MobileFilterToggle Component
 *
 * Collapsible filter section for mobile devices.
 * Shows/hides the course form on smaller screens.
 */

import { useState } from 'react';

export default function MobileFilterToggle({ children, isLoading }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="lg:hidden mb-6">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm transition-all hover:border-primary-light hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-expanded={isExpanded}
        aria-controls="mobile-filter-section"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div className="text-left">
            <h2 className="m-0 text-base font-bold text-gray-900">Search Filters</h2>
            <p className="m-0 text-xs text-gray-600">
              {isExpanded ? 'Tap to hide' : 'Tap to show search options'}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div
          id="mobile-filter-section"
          className="mt-4 animate-[slideDown_0.2s_ease-out]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
