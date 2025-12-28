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
  <div className="bg-transparent rounded-2xl p-0">
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-6 py-6 sm:px-8 sm:py-7 shadow-sm">
      {/* Header row: inline spinner + title + subtle cancel */}
      <div className="flex items-start gap-4">
        <div
          className="mt-1 h-5 w-5 rounded-full border-2 border-slate-200 border-t-primary animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="m-0 text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
              Finding resources
            </h3>

            {(status === 'pending' || status === 'running') && (
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                type="button"
                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Cancel this search"
              >
                {isCancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
          </div>

          {/* aria-live status line */}
          <p
            className="mt-2 mb-0 text-sm sm:text-base text-slate-700 font-medium"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        </div>
      </div>

      {/* Optional context (book/course) */}
      {textbookInfo && (textbookInfo.book_title || textbookInfo.book_author) && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Searching for resources matching
          </p>
          <p className="mt-1 mb-0 text-sm sm:text-base font-semibold text-slate-900 break-words">
            {textbookInfo.book_title}
            {textbookInfo.book_author && ` by ${textbookInfo.book_author}`}
          </p>
        </div>
      )}

      {/* Stepper row (compact) */}
      <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-3">
        {/* Step 1 - active when pending/running */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold">
            1
          </div>
          <span className="text-sm font-semibold text-slate-900">Analyzing</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full border-2 border-slate-300 text-slate-500 flex items-center justify-center text-sm font-semibold">
            2
          </div>
          <span className="text-sm font-medium text-slate-500">Discovering</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full border-2 border-slate-300 text-slate-500 flex items-center justify-center text-sm font-semibold">
            3
          </div>
          <span className="text-sm font-medium text-slate-500">Validating</span>
        </div>
      </div>

      {/* Divider + expectations (compact) */}
      <div className="my-5 h-px w-full bg-slate-200" />

      <p className="m-0 text-sm text-slate-700 font-medium">
        Usually takes <span className="font-semibold text-slate-900">1–5 minutes</span>.
      </p>
      <p className="mt-2 mb-0 text-sm text-slate-600">
        We prioritize high-quality, up-to-date materials.
      </p>
    </div>
  </div>
);

}
