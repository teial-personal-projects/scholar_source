/**
 * HomePage Component (v3 - Vertical Layout)
 *
 * Vertical layout with compact toolbar-style search panel above full-width results.
 * - Search panel: compact card with all filters
 * - Optional sections: collapsible accordions
 * - Results: full-width cards below
 * - Mobile-first, responsive design
 */

import { useState } from 'react';
import { submitJob } from '../api/client';
import LoadingStatus from '../components/LoadingStatus';
import ResultCard from '../components/ResultCard';

export default function HomePage() {
  const [jobId, setJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchTitle, setSearchTitle] = useState(null);
  const [textbookInfo, setTextbookInfo] = useState(null);
  const [error, setError] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Form state
  const [searchParamType, setSearchParamType] = useState('');
  const [formData, setFormData] = useState({
    course_url: '',
    book_url: '',
    book_title: '',
    book_author: '',
    isbn: '',
    topics_list: '',
    desired_resource_types: [],
    force_refresh: false
  });
  const [validationError, setValidationError] = useState('');
  const [isResourceTypesExpanded, setIsResourceTypesExpanded] = useState(false);
  const [isFocusTopicsExpanded, setIsFocusTopicsExpanded] = useState(false);

  // Form handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (validationError) setValidationError('');
  };

  const handleResourceTypeChange = (resourceType) => {
    setFormData(prev => {
      const currentTypes = prev.desired_resource_types || [];
      const newTypes = currentTypes.includes(resourceType)
        ? currentTypes.filter(type => type !== resourceType)
        : [...currentTypes, resourceType];
      return { ...prev, desired_resource_types: newTypes };
    });
    if (validationError) setValidationError('');
  };

  const handleSearchParamChange = (e) => {
    const value = e.target.value;
    setSearchParamType(value);
    if (validationError) setValidationError('');
    setFormData({
      course_url: '',
      book_url: '',
      book_title: '',
      book_author: '',
      isbn: '',
      topics_list: formData.topics_list,
      desired_resource_types: formData.desired_resource_types,
      force_refresh: formData.force_refresh
    });
  };

  const isFormValid = () => {
    if (!searchParamType) return false;
    switch (searchParamType) {
      case 'course_url': return formData.course_url.trim() !== '';
      case 'book_url': return formData.book_url.trim() !== '';
      case 'book_title_author': return formData.book_title.trim() !== '' && formData.book_author.trim() !== '';
      case 'isbn': return formData.isbn.trim() !== '';
      default: return false;
    }
  };

  const handleReset = () => {
    setSearchParamType('');
    setFormData({
      course_url: '',
      book_url: '',
      book_title: '',
      book_author: '',
      isbn: '',
      topics_list: '',
      desired_resource_types: [],
      force_refresh: false
    });
    setValidationError('');
    setIsResourceTypesExpanded(false);
    setIsFocusTopicsExpanded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!searchParamType) {
      setValidationError('Please select a search parameter type');
      return;
    }
    switch (searchParamType) {
      case 'course_url':
        if (formData.course_url.trim() === '') {
          setValidationError('Please provide a Course URL');
          return;
        }
        break;
      case 'book_url':
        if (formData.book_url.trim() === '') {
          setValidationError('Please provide a Book URL');
          return;
        }
        break;
      case 'book_title_author':
        if (formData.book_title.trim() === '' || formData.book_author.trim() === '') {
          setValidationError('Please provide both Book Title and Author');
          return;
        }
        break;
      case 'isbn':
        if (formData.isbn.trim() === '') {
          setValidationError('Please provide a Book ISBN');
          return;
        }
        break;
      default:
        setValidationError('Please select a valid search parameter type');
        return;
    }

    try {
      setError(null);
      setResults(null);
      setSearchTitle(null);
      setTextbookInfo(null);
      setJobId(null);
      setIsLoading(true);

      const response = await submitJob(formData);
      setJobId(response.job_id);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleComplete = (resources, rawOutput, title, textbook) => {
    setResults(resources);
    setSearchTitle(title);
    setTextbookInfo(textbook);
    setIsLoading(false);
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setIsLoading(false);
  };

  const handleClearResults = () => {
    setResults(null);
    setSearchTitle(null);
    setTextbookInfo(null);
    setJobId(null);
  };

  const copyAllUrls = async () => {
    if (!results) return;
    try {
      const urls = results.map(r => r.url).join('\n');
      await navigator.clipboard.writeText(urls);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <span className="text-3xl sm:text-4xl flex-shrink-0" aria-hidden="true">📚</span>
            <h1 className="m-0 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
              Student Study Resource Finder
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* Search Toolbar Panel */}
        <section className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔍</span>
            Search Parameters
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primary Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search Type Dropdown */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="search_param_type" className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Search Type <span className="text-red-600">*</span>
                </label>
                <select
                  id="search_param_type"
                  name="search_param_type"
                  value={searchParamType}
                  onChange={handleSearchParamChange}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white text-gray-900 cursor-pointer transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select type...</option>
                  <option value="course_url">Course URL</option>
                  <option value="book_url">Book URL</option>
                  <option value="book_title_author">Book Title + Author</option>
                  <option value="isbn">Book ISBN</option>
                </select>
              </div>

              {/* Dynamic Input Field */}
              {searchParamType === 'course_url' && (
                <div className="sm:col-span-2 lg:col-span-2">
                  <label htmlFor="course_url" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Course URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    id="course_url"
                    name="course_url"
                    value={formData.course_url}
                    onChange={handleChange}
                    placeholder="https://ocw.mit.edu/courses/..."
                    disabled={isLoading}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                  />
                </div>
              )}

              {searchParamType === 'book_url' && (
                <div className="sm:col-span-2 lg:col-span-2">
                  <label htmlFor="book_url" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Book URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="url"
                    id="book_url"
                    name="book_url"
                    value={formData.book_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    disabled={isLoading}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                  />
                </div>
              )}

              {searchParamType === 'book_title_author' && (
                <>
                  <div className="sm:col-span-1">
                    <label htmlFor="book_title" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Book Title <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="book_title"
                      name="book_title"
                      value={formData.book_title}
                      onChange={handleChange}
                      placeholder="e.g., Intro to Algorithms"
                      disabled={isLoading}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label htmlFor="book_author" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Author(s) <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      id="book_author"
                      name="book_author"
                      value={formData.book_author}
                      onChange={handleChange}
                      placeholder="e.g., Cormen"
                      disabled={isLoading}
                      required
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                    />
                  </div>
                </>
              )}

              {searchParamType === 'isbn' && (
                <div className="sm:col-span-2 lg:col-span-2">
                  <label htmlFor="isbn" className="block text-xs font-semibold text-gray-700 mb-1.5">
                    ISBN <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="978-0262046305"
                    disabled={isLoading}
                    required
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                  />
                </div>
              )}

              {/* Action Buttons - Desktop: inline with force refresh */}
              <div className={`flex flex-col sm:flex-row gap-2 ${searchParamType ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2 lg:col-span-3'}`}>
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid()}
                  className="sm:flex-1 lg:flex-initial lg:min-w-[140px] px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg text-sm font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap"
                >
                  {isLoading ? '🔍 Finding...' : '🔍 Find Resources'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="sm:w-auto px-5 py-2 bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg text-sm font-semibold transition-all hover:bg-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 whitespace-nowrap"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Force Refresh Toggle - Mobile: separate row, Desktop: inline with buttons */}
            <div className="lg:hidden flex items-center gap-2 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-200/50">
              <input
                type="checkbox"
                id="force_refresh_mobile"
                name="force_refresh"
                checked={formData.force_refresh}
                onChange={handleChange}
                disabled={isLoading}
                className="w-4 h-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
              <label htmlFor="force_refresh_mobile" className="flex-1 text-sm font-medium text-gray-800 cursor-pointer select-none">
                🔄 Force refresh (bypass cache)
              </label>
            </div>

            {/* Force Refresh Toggle - Desktop only: inline */}
            <div className="hidden lg:flex items-center gap-3 -mt-2">
              <input
                type="checkbox"
                id="force_refresh"
                name="force_refresh"
                checked={formData.force_refresh}
                onChange={handleChange}
                disabled={isLoading}
                className="w-4 h-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
              />
              <label htmlFor="force_refresh" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                🔄 Force refresh (bypass cache)
              </label>
            </div>

            {/* Optional Sections - Side-by-side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Resource Types Accordion */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsResourceTypesExpanded(!isResourceTypesExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-gray-900">🎯 Resource Types (Optional)</span>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isResourceTypesExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isResourceTypesExpanded && (
                  <div className="px-4 py-3 bg-white border-t border-gray-200 grid grid-cols-2 gap-2">
                    {['textbooks', 'practice_problem_sets', 'practice_exams_tests', 'lecture_videos'].map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.desired_resource_types?.includes(type) || false}
                          onChange={() => handleResourceTypeChange(type)}
                          disabled={isLoading}
                          className="w-4 h-4 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className="text-xs text-gray-700 capitalize leading-tight">{type.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Focus Topics Accordion */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsFocusTopicsExpanded(!isFocusTopicsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-sm font-semibold text-gray-900">🎯 Focus Topics (Optional)</span>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isFocusTopicsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isFocusTopicsExpanded && (
                  <div className="px-4 py-3 bg-white border-t border-gray-200">
                    <label htmlFor="topics_list" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Topics List
                    </label>
                    <textarea
                      id="topics_list"
                      name="topics_list"
                      value={formData.topics_list}
                      onChange={handleChange}
                      placeholder="e.g., Midterm review, Chapter 4, Dynamic programming"
                      rows="2"
                      disabled={isLoading}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white resize-y transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100"
                    />
                    <p className="mt-2 text-xs text-gray-600">
                      💡 Add 3–6 topics for better matches
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-r text-red-700 text-sm font-medium">
                {validationError}
              </div>
            )}
          </form>
        </section>

        {/* Results Section */}
        <section>
          {/* Empty State */}
          {!isLoading && !results && !error && (
            <div className="bg-white rounded-xl p-12 shadow-lg border-2 border-gray-100 text-center">
              <h2 className="m-0 mb-3 text-xl font-bold text-gray-900">
                Your study resources will appear here
              </h2>
              <p className="m-0 text-sm text-gray-600 max-w-md mx-auto">
                Select a search type, enter your course or book information, and click "Find" to discover personalized study materials.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && jobId && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 shadow-lg border-2 border-blue-200">
              <LoadingStatus
                jobId={jobId}
                onComplete={handleComplete}
                onError={handleError}
              />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-white rounded-xl p-8 shadow-lg border-l-4 border-red-500 text-center">
              <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
              <h2 className="m-0 mb-3 text-xl font-bold text-red-600">Something went wrong</h2>
              <p className="m-0 mb-6 text-sm text-gray-700">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setJobId(null);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white rounded-lg font-semibold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Results State */}
          {results && !isLoading && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="bg-white rounded-xl p-4 sm:p-6 shadow-md border-2 border-green-200 sticky top-20 z-10 backdrop-blur-md bg-white/95">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="m-0 text-xl sm:text-2xl font-bold text-gray-900">
                        Discovered Resources
                      </h2>
                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-bold shadow-sm">
                        {results.length}
                      </span>
                    </div>
                    {searchTitle && (
                      <p className="m-0 mt-1 text-sm text-gray-600 font-medium">{searchTitle}</p>
                    )}
                  </div>

                  {/* Desktop Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={copyAllUrls}
                      className="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    >
                      {copiedAll ? '✓ Copied!' : '📋 Copy All URLs'}
                    </button>
                    <button
                      onClick={handleClearResults}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold border-2 border-gray-200 transition-all hover:bg-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    >
                      🗑️ Clear
                    </button>
                  </div>
                </div>

                {/* Textbook Info */}
                {(textbookInfo?.course_name || textbookInfo?.book_title || textbookInfo?.book_author ||
                  textbookInfo?.title || textbookInfo?.author) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-700">
                    {textbookInfo?.course_name && (
                      <span><strong className="font-semibold text-gray-900">Course:</strong> {textbookInfo.course_name}</span>
                    )}
                    {(textbookInfo?.book_title || textbookInfo?.title) && (
                      <span><strong className="font-semibold text-gray-900">Textbook:</strong> {textbookInfo.book_title || textbookInfo.title}</span>
                    )}
                    {(textbookInfo?.book_author || textbookInfo?.author) && (
                      <span><strong className="font-semibold text-gray-900">Author:</strong> {textbookInfo.book_author || textbookInfo.author}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Results Grid - Full Width */}
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {results.map((resource, index) => (
                  <ResultCard
                    key={index}
                    resource={resource}
                    index={index}
                  />
                ))}
              </div>

              {/* NotebookLM Tip */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 sm:p-6 border-l-4 border-primary shadow-sm">
                <p className="m-0 text-sm leading-relaxed text-blue-900">
                  <span className="font-bold">💡 Tip:</span> Click "Copy All URLs" to paste into{' '}
                  <a
                    href="https://notebooklm.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-blue-950 transition-colors hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
                  >
                    Google NotebookLM
                  </a>
                  {' '}for AI-powered study guides and flashcards.
                </p>
              </div>

              {/* Mobile Sticky Bottom Actions */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg z-20">
                <div className="flex gap-2">
                  <button
                    onClick={copyAllUrls}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-bold shadow-md transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {copiedAll ? '✓ Copied All!' : '📋 Copy All'}
                  </button>
                  <button
                    onClick={handleClearResults}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold border-2 border-gray-200 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
