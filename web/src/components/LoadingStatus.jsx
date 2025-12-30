/**
 * LoadingStatus Component
 *
 * Polls job status and shows progress updates while crew is running.
 */

import { useEffect, useState } from 'react';
import { getJobStatus, cancelJob } from '../api/client';

export default function LoadingStatus({ jobId, onComplete, onError }) {
  const [status, setStatus] = useState('pending');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isCancelling, setIsCancelling] = useState(false);
  const [textbookInfo, setTextbookInfo] = useState(null);

  useEffect(() => {
    let intervalId;

    const pollStatus = async () => {
      try {
        const data = await getJobStatus(jobId);

        setStatus(data.status);
        setStatusMessage(data.status_message || getDefaultMessage(data.status));
        
        // Update textbook info if available
        if (data.book_title || data.book_author || data.metadata?.textbook_info) {
          setTextbookInfo({
            book_title: data.book_title || data.metadata?.textbook_info?.title,
            book_author: data.book_author || data.metadata?.textbook_info?.author,
            course_name: data.course_name
          });
        }

        // Check if job is complete or failed
        if (data.status === 'completed') {
          clearInterval(intervalId);

          const textbookInfo = data.metadata?.textbook_info || null;
          // Pass course and book info for display
          const courseInfo = {
            course_name: data.course_name,
            book_title: data.book_title,
            book_author: data.book_author,
            ...textbookInfo
          };
          onComplete(data.results, data.raw_output, data.search_title, courseInfo);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(intervalId);
          const errorMsg = data.status === 'cancelled' 
            ? 'Job was cancelled' 
            : (data.error || 'Job failed with unknown error');
          onError(errorMsg);
        }
      } catch (error) {
        clearInterval(intervalId);
        onError(error.message);
      }
    };

    // Start polling immediately
    pollStatus();

    // Then poll every 2 seconds
    intervalId = setInterval(pollStatus, 2000);

    // Cleanup on unmount
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [jobId, onComplete, onError]);

  const getDefaultMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Job queued, waiting to start...';
      case 'running':
        return 'Analyzing course and discovering resources...';
      default:
        return 'Processing...';
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this job? The search will be stopped.')) {
      return;
    }

    setIsCancelling(true);
    try {
      await cancelJob(jobId);
      // The status will update on the next poll, which will trigger the error handler
    } catch (error) {
      onError(error.message || 'Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

return (
  <div className="loading-status-container">
    <div className="loading-status-card">
      {/* Header row: inline spinner + title + subtle cancel */}
      <div className="loading-status-header">
        <div
          className="loading-status-spinner"
          aria-hidden="true"
        />
        <div className="loading-status-content">
          <div className="loading-status-title-section">
            <h3 className="loading-status-title">
              Finding resources
            </h3>

            {(status === 'pending' || status === 'running') && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                type="button"
                className="btn-cancel"
                title="Cancel this search"
              >
                {isCancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
          </div>

          {/* aria-live status line */}
          <p
            className="loading-status-message"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        </div>
      </div>

      {/* Optional context (book/course) */}
      {textbookInfo && (textbookInfo.book_title || textbookInfo.book_author) && (
        <div className="loading-status-textbook-info">
          <p className="loading-status-textbook-label">
            Searching for resources matching
          </p>
          <p className="loading-status-textbook-title">
            {textbookInfo.book_title}
            {textbookInfo.book_author && ` by ${textbookInfo.book_author}`}
          </p>
        </div>
      )}

      {/* Stepper row (compact) */}
      <div className="loading-status-stepper">
        {/* Step 1 - active when pending/running */}
        <div className="loading-status-step">
          <div className="loading-status-step-circle-active">
            1
          </div>
          <span className="loading-status-step-label-active">Analyzing</span>
        </div>

        <div className="loading-status-step">
          <div className="loading-status-step-circle-inactive">
            2
          </div>
          <span className="loading-status-step-label-inactive">Discovering</span>
        </div>

        <div className="loading-status-step">
          <div className="loading-status-step-circle-inactive">
            3
          </div>
          <span className="loading-status-step-label-inactive">Validating</span>
        </div>
      </div>

      {/* Divider + expectations (compact) */}
      <div className="loading-status-divider" />

      <p className="loading-status-footer-text">
        Usually takes <span className="loading-status-footer-text-bold">1–5 minutes</span>.
      </p>
      <p className="loading-status-footer-text-secondary">
        We prioritize high-quality, up-to-date materials.
      </p>
    </div>
  </div>
);

}
