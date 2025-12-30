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
    excluded_sites: '',
    bypass_cache: false
  });

  const [validationError, setValidationError] = useState('');
  const [isDesiredResourcesExpanded, setIsDesiredResourcesExpanded] = useState(false);
  const [isFocusTopicsExpanded, setIsFocusTopicsExpanded] = useState(false);
  const [isExcludeSitesExpanded, setIsExcludeSitesExpanded] = useState(false);
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
      desired_resource_types: formData.desired_resource_types, // Keep desired_resource_types
      excluded_sites: formData.excluded_sites // Keep excluded_sites
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
      excluded_sites: '',
      bypass_cache: false
    });
    setValidationError('');
    setIsDesiredResourcesExpanded(false);
    setIsFocusTopicsExpanded(false);
    setIsExcludeSitesExpanded(false);
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
    <div className="course-form-container">
      <h2 className="course-form-title">Search Parameters</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Submit and Reset Buttons */}
        <div className="course-form-button-group">
          <button
            type="submit"
            className="course-form-submit-btn"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? '🔍 Finding...' : '🔍 Find Resources'}
          </button>
          <button
            type="button"
            className="course-form-reset-btn"
            onClick={handleReset}
            disabled={isLoading}
          >
            Clear Search Results
          </button>
        </div>

        {/* Force Refresh Option */}
        <div className="course-form-bypass-cache">
          <label htmlFor="bypass_cache" className="course-form-bypass-cache-label">
            <input
              type="checkbox"
              id="bypass_cache"
              name="bypass_cache"
              checked={formData.bypass_cache}
              onChange={handleChange}
              disabled={isLoading}
              className="course-form-bypass-cache-input"
            />
            <span className="course-form-bypass-cache-text">🔄 Force refresh</span>
          </label>
          <p className="course-form-bypass-cache-hint">Bypass cache for latest results (takes longer)</p>
        </div>

        {/* Search Parameters Section */}
        <div className="course-form-search-section">
          <div className="course-form-search-header">
            <h3 className="course-form-search-title">
              📚 Course Details <span className="text-red-600">*</span>
            </h3>
          </div>

          <div className="course-form-search-content">
              <div className="course-form-field-group">
                <label htmlFor="search_param_type" className="course-form-label">
                  Search Parameters <span className="text-red-600">*</span>
                </label>
                <select
                  id="search_param_type"
                  name="search_param_type"
                  value={searchParamType}
                  onChange={handleSearchParamChange}
                  disabled={isLoading}
                  className="course-form-select"
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
                <div className="course-form-field-group">
                  <label htmlFor="course_url" className="course-form-label">Course URL <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="url"
                    id="course_url"
                    name="course_url"
                    value={formData.course_url}
                    onChange={handleChange}
                    placeholder="https://ocw.mit.edu/courses/..."
                    disabled={isLoading}
                    required
                    className="course-form-input"
                  />
                </div>
              )}

              {/* Book URL - shown when "Book URL" is selected */}
              {searchParamType === 'book_url' && (
                <div className="course-form-field-group">
                  <label htmlFor="book_url" className="course-form-label">Book URL <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="url"
                    id="book_url"
                    name="book_url"
                    value={formData.book_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    disabled={isLoading}
                    required
                    className="course-form-input"
                  />
                </div>
              )}

              {/* Book Title and Author - shown when "Book Title and Author" is selected */}
              {searchParamType === 'book_title_author' && (
                <>
                  <div className="course-form-field-group">
                    <label htmlFor="book_title" className="course-form-label">Book Title <span className="text-red-600 font-bold">*</span></label>
                    <input
                      type="text"
                      id="book_title"
                      name="book_title"
                      value={formData.book_title}
                      onChange={handleChange}
                      placeholder="e.g., Introduction to Algorithms"
                      disabled={isLoading}
                      required
                      className="course-form-input"
                    />
                  </div>

                  <div className="course-form-field-group">
                    <label htmlFor="book_author" className="course-form-label">Book Author(s) <span className="text-red-600 font-bold">*</span></label>
                    <input
                      type="text"
                      id="book_author"
                      name="book_author"
                      value={formData.book_author}
                      onChange={handleChange}
                      placeholder="e.g., Cormen, Leiserson, Rivest, Stein"
                      disabled={isLoading}
                      required
                      className="course-form-input"
                    />
                  </div>
                </>
              )}

              {/* ISBN - shown when "Book ISBN" is selected */}
              {searchParamType === 'isbn' && (
                <div className="course-form-field-group">
                  <label htmlFor="isbn" className="course-form-label">Book ISBN <span className="text-red-600 font-bold">*</span></label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="e.g., 978-0262046305"
                    disabled={isLoading}
                    required
                    className="course-form-input"
                  />
                </div>
              )}
            </div>
        </div>

        {/* Desired Resources Section */}
        <div className="form-section">
          <div className="form-section-header" onClick={() => setIsDesiredResourcesExpanded(!isDesiredResourcesExpanded)}>
            <h3 className="form-section-title">🎯 Resource Types <span className="font-normal text-gray-500 text-sm ml-1">(Optional)</span></h3>
            <button type="button" className="form-section-toggle" aria-label="Toggle section">
              {isDesiredResourcesExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isDesiredResourcesExpanded && (
            <div className="form-section-content">
              <div className="flex flex-col gap-1 mb-0">
                <label className="text-xs font-semibold text-slate-700 mb-1">Filter by resource type (leave empty to find all types):</label>
                <div className="flex flex-col gap-1 mt-1 mb-0">
                  <label className="course-form-resource-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('textbooks') || false}
                      onChange={() => handleResourceTypeChange('textbooks')}
                      disabled={isLoading}
                      className="course-form-resource-checkbox"
                    />
                    <span className="course-form-resource-checkbox-text">📚 Textbooks</span>
                  </label>
                  <label className="course-form-resource-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_problem_sets') || false}
                      onChange={() => handleResourceTypeChange('practice_problem_sets')}
                      disabled={isLoading}
                      className="course-form-resource-checkbox"
                    />
                    <span className="course-form-resource-checkbox-text">📐 Practice Problem Sets</span>
                  </label>
                  <label className="course-form-resource-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_exams_tests') || false}
                      onChange={() => handleResourceTypeChange('practice_exams_tests')}
                      disabled={isLoading}
                      className="course-form-resource-checkbox"
                    />
                    <span className="course-form-resource-checkbox-text">📋 Practice Exams/Tests</span>
                  </label>
                  <label className="course-form-resource-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('lecture_videos') || false}
                      onChange={() => handleResourceTypeChange('lecture_videos')}
                      disabled={isLoading}
                      className="course-form-resource-checkbox"
                    />
                    <span className="course-form-resource-checkbox-text">🎥 Lecture Videos</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus Topics Section */}
        <div className="form-section">
          <div className="form-section-header" onClick={() => setIsFocusTopicsExpanded(!isFocusTopicsExpanded)}>
            <h3 className="form-section-title">🎯 Focus Topics <span className="font-normal text-gray-500 text-sm ml-1">(Optional)</span></h3>
            <button type="button" className="form-section-toggle" aria-label="Toggle section">
              {isFocusTopicsExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isFocusTopicsExpanded && (
            <div className="form-section-content">
              {/* Topics List */}
              <div className="course-form-field-group">
                <label htmlFor="topics_list" className="course-form-label">Topics List</label>
                <textarea
                  id="topics_list"
                  name="topics_list"
                  value={formData.topics_list}
                  onChange={handleChange}
                  placeholder="e.g., Midterm review, Chapter 4, Dynamic programming, Sorting algorithms"
                  rows="2"
                  disabled={isLoading}
                  className="course-form-textarea"
                />
                <div className="course-form-tip-box">
                  <p className="course-form-tip-text">
                    <strong className="course-form-tip-bold">💡 Tip:</strong> Add 3–6 topics like 'Midterm review', 'Chapter 4', or 'Dynamic programming' for better matches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Exclude Sites Section */}
        <div className="form-section">
          <div className="form-section-header" onClick={() => setIsExcludeSitesExpanded(!isExcludeSitesExpanded)}>
            <h3 className="form-section-title">🚫 Exclude Sites <span className="font-normal text-gray-500 text-sm ml-1">(Optional)</span></h3>
            <button type="button" className="form-section-toggle" aria-label="Toggle section">
              {isExcludeSitesExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isExcludeSitesExpanded && (
            <div className="form-section-content">
              {/* Excluded Sites */}
              <div className="course-form-field-group">
                <label htmlFor="excluded_sites" className="course-form-label">Exclude Domains</label>
                <textarea
                  id="excluded_sites"
                  name="excluded_sites"
                  value={formData.excluded_sites}
                  onChange={handleChange}
                  placeholder="e.g., khanacademy.org, coursera.org, udemy.com"
                  rows="2"
                  disabled={isLoading}
                  className="course-form-textarea"
                />
                <div className="course-form-exclude-tip-box">
                  <p className="course-form-exclude-tip-text">
                    <strong className="course-form-exclude-tip-bold">💡 Tip:</strong> Enter domain names (e.g., 'khanacademy.org') separated by commas to exclude them from results. Useful if your institution blocks certain sites or they require login.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="course-form-validation-error">
            {validationError}
          </div>
        )}
      </form>
    </div>
  );
}
