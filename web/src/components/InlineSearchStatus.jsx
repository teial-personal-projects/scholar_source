/**
 * InlineSearchStatus Component
 *
 * Compact inline status strip for search progress.
 * Displays inside the Search Parameters card for better visual integration.
 */

import { useEffect, useState } from 'react';
import { getJobStatus, cancelJob } from '../api/client';

export default function InlineSearchStatus({ jobId, onComplete, onError }) {
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

        // Check if job is complete or failed
        if (data.status === 'completed') {
          clearInterval(intervalId);

          const textbookInfo = data.metadata?.textbook_info || null;
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
    } catch (error) {
      onError(error.message || 'Failed to cancel job');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="mt-4 w-full rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-blue-50 px-4 py-3 shadow-sm">
      {/* Header row: spinner + title + cancel */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h4 className="m-0 text-sm sm:text-base font-semibold text-slate-900">
              Finding resources
            </h4>
            <p
              className="mt-1 mb-0 text-sm text-slate-700"
              aria-live="polite"
            >
              {statusMessage}
            </p>
          </div>
        </div>

        {(status === 'pending' || status === 'running') && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            type="button"
            className="min-h-[44px] flex-shrink-0 rounded-lg border-2 border-red-500 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 hover:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancel this search"
          >
            {isCancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-3 mb-0 text-xs text-slate-600">
        Our AI agents are analyzing your course, searching for resources, and validating quality. Usually takes <span className="font-medium text-slate-700">1–5 minutes</span>.
      </p>
    </div>
  );
}
