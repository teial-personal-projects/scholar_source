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
import { TextLabel, HelperText, OptionalBadge, TextInput, Button } from '../components/ui';

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
    <div className="min-h-screen bg-blue-50">
      {/* Header - Professional blue gradient */}
      <header className="sticky top-0 z-20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-center gap-3">
            <span className="text-4xl sm:text-5xl flex-shrink-0" aria-hidden="true">📚</span>
            <h1 className="m-0 text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-tight">
              Student Study Resource Finder
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">

        {/* Search Toolbar Panel */}
        <section className="rounded-xl bg-white shadow-lg border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 m-0">
                Search Parameters
              </h2>
              <div className="mt-3 border-t border-slate-200" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                form="search-form"
                variant="primary"
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? '🔍 Finding...' : '🔍 Find Resources'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                disabled={isLoading}
              >
                Clear Search Fields
              </Button>
            </div>
          </div>

          <form id="search-form" onSubmit={handleSubmit}>
            {/* Primary Controls Row */}
            <div className="grid grid-cols-1 gap-5 mb-5">
              {/* Search Type Dropdown */}
              <div>
                <TextLabel htmlFor="search_param_type" required>
                  Search Type
                </TextLabel>
                <div className="mt-2">
                  <TextInput
                    as="select"
                    id="search_param_type"
                    name="search_param_type"
                    value={searchParamType}
                    onChange={handleSearchParamChange}
                    disabled={isLoading}
                    aria-describedby="search-type-helper"
                  >
                    <option value="">Select type...</option>
                    <option value="course_url">Course URL</option>
                    <option value="book_url">Book URL</option>
                    <option value="book_title_author">Book Title + Author</option>
                    <option value="isbn">Book ISBN</option>
                  </TextInput>
                </div>
                <p id="search-type-helper" className="mt-2 text-sm leading-5 text-slate-700">
                  {!searchParamType && "Selecting a search type will show required fields below."}
                  {searchParamType === 'course_url' && "Enter the URL of the course page you want to search."}
                  {searchParamType === 'book_url' && "Enter the URL of the book page you want to search."}
                  {searchParamType === 'book_title_author' && (
                    <>Enter both the <span className="font-medium">book title</span> and at least one <span className="font-medium">author</span>.</>
                  )}
                  {searchParamType === 'isbn' && "Enter the ISBN of the book you want to search."}
                </p>
              </div>

              {/* Dynamic Input Field */}
              {searchParamType === 'course_url' && (
                <div>
                  <TextLabel htmlFor="course_url" required>
                    Course URL
                  </TextLabel>
                  <div className="mt-2">
                    <TextInput
                      type="url"
                      id="course_url"
                      name="course_url"
                      value={formData.course_url}
                      onChange={handleChange}
                      placeholder="https://ocw.mit.edu/courses/..."
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              )}

              {searchParamType === 'book_url' && (
                <div>
                  <TextLabel htmlFor="book_url" required>
                    Book URL
                  </TextLabel>
                  <div className="mt-2">
                    <TextInput
                      type="url"
                      id="book_url"
                      name="book_url"
                      value={formData.book_url}
                      onChange={handleChange}
                      placeholder="https://..."
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              )}

              {searchParamType === 'book_title_author' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <TextLabel htmlFor="book_title" required>
                      Book Title
                    </TextLabel>
                    <div className="mt-2">
                      <TextInput
                        type="text"
                        id="book_title"
                        name="book_title"
                        value={formData.book_title}
                        onChange={handleChange}
                        placeholder="e.g., Intro to Algorithms"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <TextLabel htmlFor="book_author" required>
                      Author(s)
                    </TextLabel>
                    <div className="mt-2">
                      <TextInput
                        type="text"
                        id="book_author"
                        name="book_author"
                        value={formData.book_author}
                        onChange={handleChange}
                        placeholder="e.g., Cormen"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {searchParamType === 'isbn' && (
                <div>
                  <TextLabel htmlFor="isbn" required>
                    ISBN
                  </TextLabel>
                  <div className="mt-2">
                    <TextInput
                      type="text"
                      id="isbn"
                      name="isbn"
                      value={formData.isbn}
                      onChange={handleChange}
                      placeholder="978-0262046305"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Force Refresh Toggle - Mobile: separate row, Desktop: inline with buttons */}
            <div className="mb-5 lg:hidden">
              <label htmlFor="force_refresh_mobile" className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  id="force_refresh_mobile"
                  name="force_refresh"
                  checked={formData.force_refresh}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="text-sm sm:text-base text-slate-800 select-none">
                  🔄 Force refresh (bypass cache)
                </span>
              </label>
            </div>

            {/* Force Refresh Toggle - Desktop only: inline */}
            <div className="hidden lg:flex items-center gap-3 mb-5">
              <label htmlFor="force_refresh" className="flex items-center gap-2 py-1 cursor-pointer">
                <input
                  type="checkbox"
                  id="force_refresh"
                  name="force_refresh"
                  checked={formData.force_refresh}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span className="text-sm sm:text-base text-slate-800 select-none">
                  🔄 Force refresh (bypass cache)
                </span>
              </label>
            </div>

            {/* Optional Sections - Side-by-side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
              {/* Resource Types Accordion */}
              <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
                <button
                  type="button"
                  onClick={() => setIsResourceTypesExpanded(!isResourceTypesExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="block text-[17px] leading-6 font-semibold text-slate-900">🎯 Resource Types</span>
                    <OptionalBadge />
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isResourceTypesExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isResourceTypesExpanded && (
                  <div className="px-4 py-3 bg-blue-50/20 border-t border-blue-200 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-4 gap-y-2">
                    {['textbooks', 'practice_problem_sets', 'practice_exams_tests', 'lecture_videos'].map(type => (
                      <label key={type} className="flex items-start gap-2 py-1 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={formData.desired_resource_types?.includes(type) || false}
                          onChange={() => handleResourceTypeChange(type)}
                          disabled={isLoading}
                          className="w-4 h-4 mt-0.5 flex-shrink-0 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className="text-sm sm:text-base text-slate-800 capitalize leading-snug break-words">{type.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Focus Topics Accordion */}
              <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
                <button
                  type="button"
                  onClick={() => setIsFocusTopicsExpanded(!isFocusTopicsExpanded)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="block text-[17px] leading-6 font-semibold text-slate-900">🎯 Focus Topics</span>
                    <OptionalBadge />
                  </div>
                  <svg className={`w-4 h-4 text-gray-600 transition-transform ${isFocusTopicsExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isFocusTopicsExpanded && (
                  <div className="px-4 py-3 bg-blue-50/20 border-t border-blue-200">
                    <TextLabel htmlFor="topics_list">
                      Topics List
                    </TextLabel>
                    <div className="mt-2">
                      <TextInput
                        as="textarea"
                        id="topics_list"
                        name="topics_list"
                        value={formData.topics_list}
                        onChange={handleChange}
                        placeholder="e.g., Midterm review, Chapter 4, Dynamic programming"
                        rows="2"
                        disabled={isLoading}
                      />
                    </div>
                    <HelperText>
                      💡 Add 3–6 topics for better matches
                    </HelperText>
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

        {/* Results Section - Only show after search is initiated */}
        {(jobId !== null || results !== null || error !== null) && (
          <section>
            {/* Loading State */}
            {isLoading && jobId && (
              <div className="bg-blue-50 rounded-xl p-8 shadow-sm border border-blue-200">
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
              <h2 className="m-0 mb-3 text-xl font-semibold text-red-600">Something went wrong</h2>
              <p className="m-0 mb-6 text-sm text-gray-700">{error}</p>
              <Button
                variant="primary"
                onClick={() => {
                  setError(null);
                  setJobId(null);
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Results State */}
          {results && !isLoading && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className="rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 bg-white sticky top-20 z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="m-0 text-xl sm:text-2xl font-semibold text-slate-900">
                        Discovered Resources
                      </h2>
                      <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-3 bg-blue-600 text-white rounded-full text-sm font-bold shadow-sm">
                        {results.length}
                      </span>
                    </div>
                    {searchTitle && (
                      <p className="m-0 mt-1 text-sm text-gray-600 font-medium">{searchTitle}</p>
                    )}
                  </div>

                  {/* Desktop Action Buttons */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="primary"
                      onClick={copyAllUrls}
                    >
                      {copiedAll ? '✓ Copied!' : '📋 Copy All URLs'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleClearResults}
                    >
                      <span className="hidden sm:inline">Clear</span>
                      <span className="sm:hidden text-xl">⟲</span>
                    </Button>
                  </div>
                </div>

                {/* Textbook Info */}
                {(textbookInfo?.course_name || textbookInfo?.book_title || textbookInfo?.book_author ||
                  textbookInfo?.title || textbookInfo?.author) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-3 text-xs sm:text-sm text-slate-700">
                    {textbookInfo?.course_name && (
                      <span><strong className="font-semibold text-slate-900">Course:</strong> {textbookInfo.course_name}</span>
                    )}
                    {(textbookInfo?.book_title || textbookInfo?.title) && (
                      <span><strong className="font-semibold text-slate-900">Textbook:</strong> {textbookInfo.book_title || textbookInfo.title}</span>
                    )}
                    {(textbookInfo?.book_author || textbookInfo?.author) && (
                      <span><strong className="font-semibold text-slate-900">Author:</strong> {textbookInfo.book_author || textbookInfo.author}</span>
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
              <div className="bg-blue-50 rounded-xl p-4 sm:p-6 border-l-4 border-blue-600 shadow-sm">
                <p className="m-0 text-sm leading-relaxed text-gray-800">
                  <span className="font-bold">💡 Tip:</span> Click "Copy All URLs" to paste into{' '}
                  <a
                    href="https://notebooklm.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline text-slate-900 transition-colors hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:rounded"
                  >
                    Google NotebookLM
                  </a>
                  {' '}for AI-powered study guides and flashcards.
                </p>
              </div>

              {/* Mobile Sticky Bottom Actions */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-slate-200 shadow-lg z-20">
                <div className="flex gap-2">
                  <button
                    onClick={copyAllUrls}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {copiedAll ? '✓ Copied All!' : '📋 Copy All'}
                  </button>
                  <button
                    onClick={handleClearResults}
                    className="px-4 py-3 bg-transparent text-blue-600 border-2 border-blue-600 rounded-lg font-semibold transition-all hover:bg-blue-50 hover:border-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-xl"
                  >
                    ⟲
                  </button>
                </div>
              </div>
            </div>
          )}
          </section>
        )}
      </main>
    </div>
  );
}
