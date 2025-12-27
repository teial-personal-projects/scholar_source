/**
 * CourseForm Component
 *
 * Form for entering course and book information to find resources.
 */

import { useState } from 'react';
import './CourseForm.css';

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
  const [isEmailExpanded, setIsEmailExpanded] = useState(false);

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
    setIsEmailExpanded(false);
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
    <div className="course-form-card">
      <h2>Find Study Resources</h2>

      <form onSubmit={handleSubmit} className="course-form">
        {/* Submit and Reset Buttons - Moved to top */}
        <div className="button-group button-group-top">
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading || !isFormValid()}
          >
            {isLoading ? '🔍 Finding Resources...' : '🔍 Find Resources'}
          </button>
          <button
            type="button"
            className="reset-button"
            onClick={handleReset}
            disabled={isLoading}
          >
            Reset
          </button>
        </div>

        {/* Force Refresh Option */}
        <div className="form-group force-refresh-group">
          <label htmlFor="force_refresh" className="checkbox-label">
            <input
              type="checkbox"
              id="force_refresh"
              name="force_refresh"
              checked={formData.force_refresh}
              onChange={handleChange}
              disabled={isLoading}
            />
            <span>🔄 Force refresh (bypass cache and get fresh results)</span>
          </label>
          <p className="form-hint">Check this to ignore cached results and search for the latest resources. This may take longer but ensures you get the most up-to-date results.</p>
        </div>

        {/* Search Parameters Section */}
        <div className="form-section">
          <div className="section-header">
            <h3>📚 Course Details <span className="required">*</span></h3>
          </div>

          <div className="section-content">
              <div className="form-group">
                <label htmlFor="search_param_type">Search Parameters <span className="required">*</span></label>
                <select
                  id="search_param_type"
                  name="search_param_type"
                  value={searchParamType}
                  onChange={handleSearchParamChange}
                  disabled={isLoading}
                  className="search-param-select"
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
                <div className="form-group">
                  <label htmlFor="course_url">Course URL <span className="required">*</span></label>
                  <input
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
              )}

              {/* Book URL - shown when "Book URL" is selected */}
              {searchParamType === 'book_url' && (
                <div className="form-group">
                  <label htmlFor="book_url">Book URL <span className="required">*</span></label>
                  <input
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
              )}

              {/* Book Title and Author - shown when "Book Title and Author" is selected */}
              {searchParamType === 'book_title_author' && (
                <>
                  <div className="form-group">
                    <label htmlFor="book_title">Book Title <span className="required">*</span></label>
                    <input
                      type="text"
                      id="book_title"
                      name="book_title"
                      value={formData.book_title}
                      onChange={handleChange}
                      placeholder="e.g., Introduction to Algorithms"
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="book_author">Book Author(s) <span className="required">*</span></label>
                    <input
                      type="text"
                      id="book_author"
                      name="book_author"
                      value={formData.book_author}
                      onChange={handleChange}
                      placeholder="e.g., Cormen, Leiserson, Rivest, Stein"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </>
              )}

              {/* ISBN - shown when "Book ISBN" is selected */}
              {searchParamType === 'isbn' && (
                <div className="form-group">
                  <label htmlFor="isbn">Book ISBN <span className="required">*</span></label>
                  <input
                    type="text"
                    id="isbn"
                    name="isbn"
                    value={formData.isbn}
                    onChange={handleChange}
                    placeholder="e.g., 978-0262046305"
                    disabled={isLoading}
                    required
                  />
                </div>
              )}
            </div>
        </div>

        {/* Desired Resources Section */}
        <div className="form-section">
          <div className="section-header" onClick={() => setIsDesiredResourcesExpanded(!isDesiredResourcesExpanded)}>
            <h3>🎯 Resource Types <span className="optional-label">(Optional)</span></h3>
            <button type="button" className="collapse-toggle" aria-label="Toggle section">
              {isDesiredResourcesExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isDesiredResourcesExpanded && (
            <div className="section-content">
              <div className="form-group">
                <label>Filter by resource type (leave empty to find all types):</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('textbooks') || false}
                      onChange={() => handleResourceTypeChange('textbooks')}
                      disabled={isLoading}
                    />
                    <span>📚 Textbooks</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_problem_sets') || false}
                      onChange={() => handleResourceTypeChange('practice_problem_sets')}
                      disabled={isLoading}
                    />
                    <span>📐 Practice Problem Sets</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('practice_exams_tests') || false}
                      onChange={() => handleResourceTypeChange('practice_exams_tests')}
                      disabled={isLoading}
                    />
                    <span>📋 Practice Exams/Tests</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.desired_resource_types?.includes('lecture_videos') || false}
                      onChange={() => handleResourceTypeChange('lecture_videos')}
                      disabled={isLoading}
                    />
                    <span>🎥 Lecture Videos</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Focus Topics Section */}
        <div className="form-section">
          <div className="section-header" onClick={() => setIsFocusTopicsExpanded(!isFocusTopicsExpanded)}>
            <h3>🎯 Focus Topics <span className="optional-label">(Optional)</span></h3>
            <button type="button" className="collapse-toggle" aria-label="Toggle section">
              {isFocusTopicsExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isFocusTopicsExpanded && (
            <div className="section-content">
              {/* Topics List */}
              <div className="form-group">
                <label htmlFor="topics_list">Topics List</label>
                <textarea
                  id="topics_list"
                  name="topics_list"
                  value={formData.topics_list}
                  onChange={handleChange}
                  placeholder="e.g., Midterm review, Chapter 4, Dynamic programming, Sorting algorithms"
                  rows="2"
                  disabled={isLoading}
                />
                <div className="tip-callout">
                  <p>
                    <strong>💡 Tip:</strong> Add 3–6 topics like 'Midterm review', 'Chapter 4', or 'Dynamic programming' for better matches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Email Section */}
        <div className="form-section">
          <div className="section-header" onClick={() => setIsEmailExpanded(!isEmailExpanded)}>
            <h3>📧 Get Results by Email <span className="optional-label">(Optional)</span></h3>
            <button type="button" className="collapse-toggle" aria-label="Toggle section">
              {isEmailExpanded ? '▼' : '▶'}
            </button>
          </div>

          {isEmailExpanded && (
            <div className="section-content">
              {/* Email Address */}
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
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="validation-error">
            {validationError}
          </div>
        )}
      </form>
    </div>
  );
}
