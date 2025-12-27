/**
 * CourseForm Component
 *
 * Form for entering course and book information to find resources.
 */

import { useState } from 'react';

export default function CourseForm({ onJobSubmitted, isLoading }) {
  const [searchParamType, setSearchParamType] = useState('');
  const [formData, setFormData] = useState({
    course_url: '',
    book_url: '',
    book_title: '',
    book_author: '',
    isbn: '',
    topics_list: '',
    email: '',
    desired_resource_types: [],
    force_refresh: false
  });

  const [validationError, setValidationError] = useState('');
  const [isDesiredResourcesExpanded, setIsDesiredResourcesExpanded] = useState(false);
  const [isFocusTopicsExpanded, setIsFocusTopicsExpanded] = useState(false);
  // Email section - COMMENTED OUT
  // const [isEmailExpanded, setIsEmailExpanded] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const handleResourceTypeChange = (resourceType) => {
    setFormData(prev => {
      const currentTypes = prev.desired_resource_types || [];
      const newTypes = currentTypes.includes(resourceType)
        ? currentTypes.filter(type => type !== resourceType)
        : [...currentTypes, resourceType];
      return {
        ...prev,
        desired_resource_types: newTypes
      };
    });
    // Clear validation error when user changes selection
    if (validationError) {
      setValidationError('');
    }
  };

  const handleSearchParamChange = (e) => {
    const value = e.target.value;
    setSearchParamType(value);
    // Clear validation error when selection changes
    if (validationError) {
      setValidationError('');
    }
    // Clear form data when switching search types
    setFormData({
      course_url: '',
      book_url: '',
      book_title: '',
      book_author: '',
      isbn: '',
      topics_list: formData.topics_list, // Keep topics_list
      email: formData.email, // Keep email
      desired_resource_types: formData.desired_resource_types // Keep desired_resource_types
    });
  };

  const isFormValid = () => {
    if (!searchParamType) {
      return false;
    }

    // Check if required fields are filled based on selected search parameter type
    switch (searchParamType) {
      case 'course_url':
        return formData.course_url.trim() !== '';
      case 'book_url':
        return formData.book_url.trim() !== '';
      case 'book_title_author':
        return formData.book_title.trim() !== '' && formData.book_author.trim() !== '';
      case 'isbn':
        return formData.isbn.trim() !== '';
      default:
        return false;
    }
  };

  const validateForm = () => {
    if (!searchParamType) {
      setValidationError('Please select a search parameter type');
      return false;
    }

    // Validate based on selected search parameter type
    switch (searchParamType) {
      case 'course_url':
        if (formData.course_url.trim() === '') {
          setValidationError('Please provide a Course URL');
          return false;
        }
        break;
      case 'book_url':
        if (formData.book_url.trim() === '') {
          setValidationError('Please provide a Book URL');
          return false;
        }
        break;
      case 'book_title_author':
        if (formData.book_title.trim() === '' || formData.book_author.trim() === '') {
          setValidationError('Please provide both Book Title and Author');
          return false;
        }
        break;
      case 'isbn':
        if (formData.isbn.trim() === '') {
          setValidationError('Please provide a Book ISBN');
          return false;
        }
        break;
      default:
        setValidationError('Please select a valid search parameter type');
        return false;
    }

    return true;
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
      email: '',
      desired_resource_types: [],
      force_refresh: false
    });
    setValidationError('');
    setIsDesiredResourcesExpanded(false);
    setIsFocusTopicsExpanded(false);
    // Email section - COMMENTED OUT
    // setIsEmailExpanded(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Call parent callback with form data
    onJobSubmitted(formData);
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-lg border-2 border-gray-200 transition-all hover:shadow-xl">
      <h2 className="m-0 mb-4 text-lg font-bold text-gray-900 tracking-tight">Search Parameters</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Submit and Reset Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg text-sm font-bold transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? '🔍 Finding...' : '🔍 Find Resources'}
          </button>
          <button
            type="button"
            className="px-4 py-2.5 bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg text-sm font-semibold transition-all hover:bg-gray-200 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>

        {/* Force Refresh Option */}
        <div className="px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-200/50">
          <label htmlFor="force_refresh" className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="force_refresh"
              name="force_refresh"
              checked={formData.force_refresh}
              onChange={handleChange}
              disabled={isLoading}
              className="w-4 h-4 cursor-pointer accent-primary flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <span className="text-sm font-medium text-gray-800 flex-1">🔄 Force refresh</span>
          </label>
          <p className="mt-1 mb-0 text-xs text-gray-600 leading-relaxed pl-6">Bypass cache for latest results (takes longer)</p>
        </div>

        {/* Search Parameters Section */}
        <div className="flex flex-col gap-0 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3 py-2.5 bg-gradient-to-r from-gray-100 to-gray-50">
            <h3 className="m-0 text-sm font-bold text-gray-900 flex items-center gap-1.5">
              📚 Course Details <span className="text-red-600">*</span>
            </h3>
          </div>

          <div className="px-3 py-3 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="search_param_type" className="text-xs font-semibold text-gray-700">
                  Search Parameters <span className="text-red-600">*</span>
                </label>
                <select
                  id="search_param_type"
                  name="search_param_type"
                  value={searchParamType}
                  onChange={handleSearchParamChange}
                  disabled={isLoading}
                  className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm bg-white text-gray-900 cursor-pointer transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <option value="">-- Select a search type --</option>
                  <option value="course_url">Course URL</option>
                  <option value="book_url">Book URL</option>
                  <option value="book_title_author">Book Title and Author</option>
                  <option value="isbn">Book ISBN</option>
                </select>
              </div>

              {/* Course URL - shown when "Course URL" is selected */}
              {searchParamType === 'course_url' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="course_url" className="text-xs font-semibold text-gray-700">Course URL <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="url"
                    id="course_url"
                    name="course_url"
                    value={formData.course_url}
                    onChange={handleChange}
                    placeholder="https://ocw.mit.edu/courses/..."
                    disabled={isLoading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              )}

              {/* Book URL - shown when "Book URL" is selected */}
              {searchParamType === 'book_url' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="book_url" className="text-xs font-semibold text-gray-700">Book URL <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="url"
                    id="book_url"
                    name="book_url"
                    value={formData.book_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    disabled={isLoading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              )}

              {/* Book Title and Author - shown when "Book Title and Author" is selected */}
              {searchParamType === 'book_title_author' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="book_title" className="text-xs font-semibold text-gray-700">Book Title <span className="text-red-600 font-bold">*</span></label>
                    <input
                      type="text"
                      id="book_title"
                      name="book_title"
                      value={formData.book_title}
                      onChange={handleChange}
                      placeholder="e.g., Introduction to Algorithms"
                      disabled={isLoading}
                      required
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="book_author" className="text-xs font-semibold text-gray-700">Book Author(s) <span className="text-red-600 font-bold">*</span></label>
                    <input
                      type="text"
                      id="book_author"
                      name="book_author"
                      value={formData.book_author}
                      onChange={handleChange}
                      placeholder="e.g., Cormen, Leiserson, Rivest, Stein"
                      disabled={isLoading}
                      required
                      className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>
                </>
              )}

              {/* ISBN - shown when "Book ISBN" is selected */}
              {searchParamType === 'isbn' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="isbn" className="text-xs font-semibold text-gray-700">Book ISBN <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="e.g., 978-0262046305"
                    disabled={isLoading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                  />
                </div>
              )}
            </div>
        </div>

        {/* Desired Resources Section */}
        <div className="flex flex-col gap-0 p-0 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden transition-all hover:border-primary-light">
          <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none bg-gradient-to-r from-gray-100 to-gray-50" onClick={() => setIsDesiredResourcesExpanded(!isDesiredResourcesExpanded)}>
            <h3 className="m-0 text-sm font-bold text-gray-900 flex items-center gap-1.5">🎯 Resource Types <span className="font-normal text-gray-500 text-sm ml-1">(Optional)</span></h3>
            <button type="button" className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-primary text-sm font-bold cursor-pointer transition-all p-0 leading-none hover:bg-primary hover:text-white hover:border-primary hover:scale-110" aria-label="Toggle section">
              {isDesiredResourcesExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isDesiredResourcesExpanded && (
            <div className="px-3 pb-3 flex flex-col gap-3 animate-[slideDown_0.2s_ease-out]">
              <div className="flex flex-col gap-1 mb-0">
                <label className="text-xs font-semibold text-gray-700 mb-1">Filter by resource type (leave empty to find all types):</label>
                <div className="flex flex-col gap-1 mt-1 mb-0">
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-l-[3px] has-[:checked]:border-primary">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('textbooks') || false}
                      onChange={() => handleResourceTypeChange('textbooks')}
                      disabled={isLoading}
                      className="w-4 h-4 cursor-pointer accent-primary flex-shrink-0 m-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">📚 Textbooks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-l-[3px] has-[:checked]:border-primary">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_problem_sets') || false}
                      onChange={() => handleResourceTypeChange('practice_problem_sets')}
                      disabled={isLoading}
                      className="w-4 h-4 cursor-pointer accent-primary flex-shrink-0 m-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">📐 Practice Problem Sets</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-l-[3px] has-[:checked]:border-primary">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_exams_tests') || false}
                      onChange={() => handleResourceTypeChange('practice_exams_tests')}
                      disabled={isLoading}
                      className="w-4 h-4 cursor-pointer accent-primary flex-shrink-0 m-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">📋 Practice Exams/Tests</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md transition-all select-none hover:bg-gray-50 has-[:checked]:bg-primary/10 has-[:checked]:border-l-[3px] has-[:checked]:border-primary">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('lecture_videos') || false}
                      onChange={() => handleResourceTypeChange('lecture_videos')}
                      disabled={isLoading}
                      className="w-4 h-4 cursor-pointer accent-primary flex-shrink-0 m-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">🎥 Lecture Videos</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus Topics Section */}
        <div className="flex flex-col gap-0 p-0 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden transition-all hover:border-primary-light">
          <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none bg-gradient-to-r from-gray-100 to-gray-50" onClick={() => setIsFocusTopicsExpanded(!isFocusTopicsExpanded)}>
            <h3 className="m-0 text-sm font-bold text-gray-900 flex items-center gap-1.5">🎯 Focus Topics <span className="font-normal text-gray-500 text-sm ml-1">(Optional)</span></h3>
            <button type="button" className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-primary text-sm font-bold cursor-pointer transition-all p-0 leading-none hover:bg-primary hover:text-white hover:border-primary hover:scale-110" aria-label="Toggle section">
              {isFocusTopicsExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isFocusTopicsExpanded && (
            <div className="px-3 pb-3 flex flex-col gap-3 animate-[slideDown_0.2s_ease-out]">
              {/* Topics List */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="topics_list" className="text-xs font-semibold text-gray-700">Topics List</label>
                <textarea
                  id="topics_list"
                  name="topics_list"
                  value={formData.topics_list}
                  onChange={handleChange}
                  placeholder="e.g., Midterm review, Chapter 4, Dynamic programming, Sorting algorithms"
                  rows="2"
                  disabled={isLoading}
                  className="resize-y min-h-[55px] px-3 py-2 border-2 border-gray-200 rounded-lg text-sm transition-all bg-white text-gray-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <div className="px-2 py-2 bg-gradient-to-r from-amber-100 to-amber-200 border-l-4 border-amber-500 rounded-lg mt-1">
                  <p className="m-0 text-xs text-amber-900 leading-relaxed">
                    <strong className="text-amber-950 font-semibold">💡 Tip:</strong> Add 3–6 topics like 'Midterm review', 'Chapter 4', or 'Dynamic programming' for better matches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Section - COMMENTED OUT */}
        {/* <div className="form-section">
          <div className="section-header" onClick={() => setIsEmailExpanded(!isEmailExpanded)}>
            <h3>📧 Get Results by Email <span className="optional-label">(Optional)</span></h3>
            <button type="button" className="collapse-toggle" aria-label="Toggle section">
              {isEmailExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isEmailExpanded && (
            <div className="section-content">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
                <p className="field-hint">
                  We'll email you the results when your search completes (usually 1-5 minutes)
                </p>
              </div>
            </div>
          )}
        </div> */}

        {/* Validation Error */}
        {validationError && (
          <div className="px-4 py-4 bg-red-50 border-2 border-red-200 border-l-4 border-l-red-600 rounded-lg text-red-600 text-sm font-medium">
            {validationError}
          </div>
        )}
      </form>
    </div>
  );
}
