/**
 * CourseForm Component
 *
 * Form for entering course and book information to find resources.
 */

import { useState } from 'react';
import './CourseForm.css';

export default function CourseForm({ onJobSubmitted, isLoading }) {
  const [formData, setFormData] = useState({
    course_url: '',
    book_url: '',
    book_title: '',
    book_author: '',
    isbn: '',
    topics_list: '',
    email: ''
  });

  const [validationError, setValidationError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear validation error when user types
    if (validationError) {
      setValidationError('');
    }
  };

  const validateForm = () => {
    // Must provide either Course URL, Book URL, or (Book Title + Author), or Book ISBN
    const hasCourseUrl = formData.course_url.trim() !== '';
    const hasBookUrl = formData.book_url.trim() !== '';
    const hasBookTitleAndAuthor = formData.book_title.trim() !== '' && formData.book_author.trim() !== '';
    const hasIsbn = formData.isbn.trim() !== '';

    if (!hasCourseUrl && !hasBookUrl && !hasBookTitleAndAuthor && !hasIsbn) {
      setValidationError('Please provide one of the following: Course URL, Book URL, Book Title + Author, or Book ISBN');
      return false;
    }

    return true;
  };

  const handleReset = () => {
    setFormData({
      course_url: '',
      book_url: '',
      book_title: '',
      book_author: '',
      isbn: '',
      topics_list: '',
      email: ''
    });
    setValidationError('');
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

      <div className="requirements-info">
        <strong>Required:</strong> Provide at least one of the following:
        <ul>
          <li>Course URL</li>
          <li>Book URL</li>
          <li>Book Title + Author</li>
          <li>Book ISBN</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="course-form">
        {/* Course URL */}
        <div className="form-group">
          <label htmlFor="course_url">Course URL <span className="optional">(optional)</span></label>
          <input
            type="url"
            id="course_url"
            name="course_url"
            value={formData.course_url}
            onChange={handleChange}
            placeholder="https://..."
            disabled={isLoading}
          />
        </div>

        {/* Book URL */}
        <div className="form-group">
          <label htmlFor="book_url">Book URL <span className="optional">(optional)</span></label>
          <input
            type="url"
            id="book_url"
            name="book_url"
            value={formData.book_url}
            onChange={handleChange}
            placeholder="https://..."
            disabled={isLoading}
          />
        </div>

        {/* Book Title */}
        <div className="form-group">
          <label htmlFor="book_title">Book Title</label>
          <input
            type="text"
            id="book_title"
            name="book_title"
            value={formData.book_title}
            onChange={handleChange}
            placeholder="e.g., Introduction to Algorithms"
            disabled={isLoading}
          />
        </div>

        {/* Book Author */}
        <div className="form-group">
          <label htmlFor="book_author">Book Author(s)</label>
          <input
            type="text"
            id="book_author"
            name="book_author"
            value={formData.book_author}
            onChange={handleChange}
            placeholder="e.g., Cormen, Leiserson, Rivest, Stein"
            disabled={isLoading}
          />
        </div>

        {/* ISBN */}
        <div className="form-group">
          <label htmlFor="isbn">Book ISBN <span className="optional">(optional)</span></label>
          <input
            type="text"
            id="isbn"
            name="isbn"
            value={formData.isbn}
            onChange={handleChange}
            placeholder="e.g., 978-0262046305"
            disabled={isLoading}
          />
        </div>

        {/* Topics List */}
        <div className="form-group">
          <label htmlFor="topics_list">Topics List <span className="optional">(optional)</span></label>
          <textarea
            id="topics_list"
            name="topics_list"
            value={formData.topics_list}
            onChange={handleChange}
            placeholder="e.g., Sorting, Graph Algorithms, Dynamic Programming"
            rows="3"
            disabled={isLoading}
          />
        </div>

        {/* Email Address */}
        <div className="form-group">
          <label htmlFor="email">
            📧 Email Address <span className="optional">(optional - receive results when complete)</span>
          </label>
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

        {/* Validation Error */}
        {validationError && (
          <div className="validation-error">
            {validationError}
          </div>
        )}

        {/* Submit and Reset Buttons */}
        <div className="button-group">
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Finding Resources...' : 'Find Resources'}
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
      </form>
    </div>
  );
}
