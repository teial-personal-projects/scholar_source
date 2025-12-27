/**
 * HomePage Component
 *
 * Main page with form and results display.
 */

import { useState } from 'react';
import { submitJob } from '../api/client';
import CourseForm from '../components/CourseForm';
import LoadingStatus from '../components/LoadingStatus';
import ResultsTable from '../components/ResultsTable';

export default function HomePage() {
  const [jobId, setJobId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [searchTitle, setSearchTitle] = useState(null);
  const [textbookInfo, setTextbookInfo] = useState(null);
  const [error, setError] = useState(null);

  const handleJobSubmitted = async (formData) => {
    try {
      // Clear previous results and errors
      setError(null);
      setResults(null);
      setSearchTitle(null);
      setTextbookInfo(null);
      setJobId(null);
      setIsLoading(true);

      // Submit job to backend
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 p-6 font-sans">
      {/* Header */}
      <header className="text-center mb-4 py-4">
        <div className="flex items-center justify-center gap-4 mb-4">
          <span className="text-[52px] leading-none flex items-center justify-center drop-shadow-md">📚</span>
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-[38px] font-extrabold tracking-tight bg-gradient-to-r from-purple-600 to-cyan-500 bg-clip-text text-transparent leading-tight">Student Study Resource Finder</h1>
          </div>
        </div>

        {/* Welcome Message - Centered */}
        <div className="max-w-[700px] mx-auto text-center">
          <h3 className="m-0 mb-4 text-2xl font-bold text-gray-800 tracking-tight leading-snug">Ready to find your perfect study resources?</h3>
          <p className="m-0 mb-6 text-[15px] text-gray-600 leading-relaxed">
            <strong className="text-primary font-semibold">Enter your course info below</strong> to discover relevant videos, lecture notes, practice problems, and study guides matched to your course or textbook!
          </p>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 gap-8 items-start max-lg:grid-cols-1 max-lg:gap-6">
        {/* Left Column - Form */}
        <div className="min-h-[400px] max-lg:order-1">
          <CourseForm
            onJobSubmitted={handleJobSubmitted}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column - Results/Loading/Error */}
        <div className="min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-green-50 scrollbar-thumb-green-300 hover:scrollbar-thumb-green-400 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-green-50 [&::-webkit-scrollbar-track]:rounded [&::-webkit-scrollbar-thumb]:bg-green-300 [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-green-400 max-lg:order-2">
          {!isLoading && !results && !error && (
            <div className="relative bg-gradient-to-br from-green-50 to-green-200 rounded-2xl p-12 shadow-lg flex items-center justify-center min-h-[400px] border-2 border-green-300 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(34,197,94,0.05)_0%,transparent_70%)] before:animate-[pulseGreen_4s_ease-in-out_infinite] before:pointer-events-none hover:border-green-400 hover:shadow-xl hover:-translate-y-0.5 motion-reduce:hover:-translate-y-0">
              <div className="relative z-10 text-center max-w-[400px]">
                <div className="text-6xl mb-6 opacity-80 drop-shadow-md">📚</div>
                <h3 className="m-0 mb-4 text-2xl font-bold text-green-800 tracking-tight">Your study kit will show up here</h3>
                <p className="m-0 text-base text-green-700 leading-relaxed">Enter your course info and click 'Find resources' to generate videos, notes, practice, and more.</p>
              </div>
            </div>
          )}

          {isLoading && jobId && (
            <div className="relative bg-gradient-to-br from-green-50 to-green-200 rounded-2xl p-12 shadow-lg flex items-center justify-center min-h-[400px] border-2 border-green-300 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(34,197,94,0.05)_0%,transparent_70%)] before:animate-[pulseGreen_4s_ease-in-out_infinite] before:pointer-events-none hover:border-green-400 hover:shadow-xl hover:-translate-y-0.5 motion-reduce:hover:-translate-y-0">
              <LoadingStatus
                jobId={jobId}
                onComplete={handleComplete}
                onError={handleError}
              />
            </div>
          )}

          {error && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center border-l-4 border-red-500">
              <h3 className="m-0 mb-4 text-xl font-semibold text-red-500">Error</h3>
              <p className="m-0 mb-6 text-[15px] text-gray-600">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setJobId(null);
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 text-white border-none rounded-xl text-[15px] font-semibold cursor-pointer transition-all shadow-md hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Try Again
              </button>
            </div>
          )}

          {results && !isLoading && (
            <ResultsTable
              resources={results}
              searchTitle={searchTitle}
              textbookInfo={textbookInfo}
              onClear={handleClearResults}
            />
          )}
        </div>
      </div>
    </div>
  );
}
