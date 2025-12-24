/**
 * LoadingStatus Component
 *
 * Polls job status and shows progress updates while crew is running.
 */

import { useEffect, useState } from 'react';
import { getJobStatus, cancelJob } from '../api/client';
import './LoadingStatus.css';

export default function LoadingStatus({ jobId, onComplete, onError }) {
  const [status, setStatus] = useState('pending');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let intervalId;

    const pollStatus = async () => {
      try {
        const data = await getJobStatus(jobId);

        setStatus(data.status);
        setStatusMessage(data.status_message || getDefaultMessage(data.status));
        
        // Debug: log status to help troubleshoot cancel button visibility
        console.log('Job status:', data.status, 'Should show cancel:', data.status === 'pending' || data.status === 'running');

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
    <div className="loading-status-card">
      <div className="loading-spinner-container">
        <div className="loading-spinner"></div>
      </div>

      <div className="loading-content">
        <div className="loading-header">
          <h3>Finding Resources</h3>
          {(status === 'pending' || status === 'running') && (
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="cancel-button"
              title="Cancel this job"
              type="button"
            >
              {isCancelling ? 'Cancelling...' : '✕ Cancel'}
            </button>
          )}
        </div>
        <p className="status-message">{statusMessage}</p>

        <div className="progress-steps">
          <div className={`progress-step ${status !== 'pending' ? 'active' : ''}`}>
            <div className="step-icon">1</div>
            <div className="step-label">Analyzing Course</div>
          </div>
          <div className={`progress-step ${status === 'completed' ? 'active' : ''}`}>
            <div className="step-icon">2</div>
            <div className="step-label">Discovering Resources</div>
          </div>
          <div className={`progress-step ${status === 'completed' ? 'active' : ''}`}>
            <div className="step-icon">3</div>
            <div className="step-label">Validating Quality</div>
          </div>
        </div>

        <p className="loading-hint">This may take 1-5 minutes...</p>
      </div>
    </div>
  );
}
