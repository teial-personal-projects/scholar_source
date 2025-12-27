/**
 * ResultsTable Component
 *
 * Displays discovered resources in a clean list format with copy functionality.
 */

import { useState, useRef, useEffect } from 'react';

export default function ResultsTable({ resources, searchTitle, textbookInfo, onClear }) {
  const [copiedUrl, setCopiedUrl] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const listRef = useRef(null);

  const copyToClipboard = async (text, identifier = null) => {
    try {
      await navigator.clipboard.writeText(text);

      if (identifier) {
        setCopiedUrl(identifier);
        setTimeout(() => setCopiedUrl(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const copyAllUrls = async () => {
    const urls = resources.map(r => r.url).join('\n');
    await copyToClipboard(urls);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Handle scroll to hide/show scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      if (listRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
        setIsScrolledToBottom(scrolledToBottom);
      }
    };

    const listElement = listRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      // Check initial scroll state
      handleScroll();
    }

    return () => {
      if (listElement) {
        listElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [resources]);

  if (!resources || resources.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg border-2 border-green-200 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(34,197,94,0.05)_0%,transparent_70%)] before:animate-[pulseGreen_4s_ease-in-out_infinite] before:pointer-events-none hover:border-green-300 hover:shadow-xl">
        <div className="p-12 text-center">
          <div className="text-6xl mb-6 opacity-50">📭</div>
          <h3 className="m-0 mb-4 text-xl font-bold text-gray-800">No resources found</h3>
          <p className="m-0 text-base text-gray-600 leading-relaxed">Try adjusting your search criteria or selecting a different search type.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-lg border-2 border-green-200 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(34,197,94,0.05)_0%,transparent_70%)] before:animate-[pulseGreen_4s_ease-in-out_infinite] before:pointer-events-none hover:border-green-300 hover:shadow-xl">
      <div className="flex justify-between items-start mb-8 gap-4 flex-wrap pb-4 border-b-2 border-gray-100">
        <div>
          <h2 className="m-0 text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            Discovered Resources
            <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-bold shadow-sm ml-2">{resources.length}</span>
          </h2>
          {searchTitle && <p className="mt-1 mb-0 text-sm text-gray-600 font-medium">{searchTitle}</p>}
        </div>
        <div className="flex gap-2 flex-wrap max-md:w-full">
          <button
            onClick={copyAllUrls}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 max-md:flex-1"
            title="Copy all URLs for NotebookLM"
          >
            {copiedAll ? '✓ Copied!' : '📋 Copy All URLs'}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="px-5 py-2.5 bg-gray-50 text-gray-600 border-2 border-gray-200 rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-gray-100 hover:border-primary-light hover:-translate-y-px active:translate-y-0 max-md:flex-1"
              title="Clear results"
            >
              🗑️ Clear Results
            </button>
          )}
        </div>
      </div>

      {/* Course and Book Information - Display under Discovered Resources */}
      {(textbookInfo?.course_name || textbookInfo?.book_title || textbookInfo?.book_author ||
        textbookInfo?.title || textbookInfo?.author) && (
        <div className="py-2 px-4 mb-4 flex flex-wrap gap-4 items-center bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 border-l-4 border-l-primary rounded-lg shadow-sm">
          {textbookInfo?.course_name && (
            <span className="m-0 text-xs text-blue-900 leading-snug whitespace-nowrap"><strong className="font-bold text-blue-950">Course:</strong> {textbookInfo.course_name}</span>
          )}
          {(textbookInfo?.book_title || textbookInfo?.title) && (
            <span className="m-0 text-sm text-blue-900 leading-snug font-semibold">
              <strong className="font-bold text-blue-950">Textbook:</strong> <span className="text-sm text-blue-950 font-bold">{textbookInfo.book_title || textbookInfo.title}</span>
            </span>
          )}
          {(textbookInfo?.book_author || textbookInfo?.author) && (
            <span className="m-0 text-xs text-blue-900 leading-snug whitespace-nowrap"><strong className="font-bold text-blue-950">Author(s):</strong> {textbookInfo.book_author || textbookInfo.author}</span>
          )}
          {textbookInfo?.source && (
            <span className="m-0 text-xs text-blue-900 leading-snug whitespace-nowrap"><strong className="font-bold text-blue-950">Source:</strong> {textbookInfo.source}</span>
          )}
        </div>
      )}

      <div
        ref={listRef}
        className={`relative flex flex-col gap-6 max-h-[600px] overflow-y-auto pr-2 after:content-['↓_Scroll_for_more'] after:sticky after:bottom-0 after:left-0 after:right-0 after:flex after:items-center after:justify-center after:p-4 after:bg-gradient-to-t after:from-white/95 after:via-white/80 after:to-transparent after:text-primary after:text-xs after:font-bold after:text-center after:pointer-events-none after:opacity-0 after:transition-opacity after:backdrop-blur-sm ${isScrolledToBottom ? '' : 'after:opacity-100'} [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-primary [&::-webkit-scrollbar-thumb]:to-primary-dark [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:transition-all hover:[&::-webkit-scrollbar-thumb]:from-primary-dark hover:[&::-webkit-scrollbar-thumb]:to-indigo-800`}
      >
        {resources.map((resource, index) => (
          <div key={index} className="relative p-8 border-2 border-gray-100 rounded-xl bg-gradient-to-br from-white to-gray-50 transition-all overflow-visible shadow-sm hover:border-primary-light hover:shadow-lg hover:-translate-y-1 hover:from-white hover:to-gray-100">
            <div className="flex items-start gap-4 mb-6 flex-wrap">
              <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${
                resource.type?.toUpperCase().includes('PDF') || resource.type?.toUpperCase().includes('TEXTBOOK')
                  ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-900'
                  : resource.type?.toUpperCase().includes('VIDEO') || resource.type?.toUpperCase().includes('YOUTUBE')
                  ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-900'
                  : resource.type?.toUpperCase().includes('COURSE')
                  ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-900'
                  : resource.type?.toUpperCase().includes('WEBSITE') || resource.type?.toUpperCase().includes('WEB')
                  ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {resource.type}
              </span>
              <h3 className="m-0 text-xl font-bold text-gray-800 flex-1 tracking-tight leading-snug">{resource.title}</h3>
            </div>

            <div className="flex items-center gap-2 mb-4 py-3 px-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-gray-100 transition-all min-h-[50px] overflow-visible hover:from-slate-100 hover:to-slate-200 hover:border-primary-light">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs text-primary no-underline break-all font-medium transition-colors leading-relaxed hover:text-primary-dark hover:underline focus:outline-2 focus:outline-primary focus:outline-offset-2 focus:rounded"
              >
                {resource.url}
              </a>
              <button
                onClick={() => copyToClipboard(resource.url, index)}
                className="px-3 py-1.5 bg-white border-2 border-gray-300 rounded text-sm font-semibold flex-shrink-0 cursor-pointer transition-all hover:bg-primary hover:text-white hover:border-primary hover:scale-105 active:scale-95"
                title="Copy URL"
              >
                {copiedUrl === index ? '✓' : '📋'}
              </button>
            </div>

          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t-2 border-gray-100">
        <div className="py-4 px-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-primary rounded-lg text-sm text-blue-900 leading-relaxed shadow-sm">
          💡 <strong className="font-bold">Tip:</strong> Click "Copy All URLs" above, then paste them into{' '}
          <a
            href="https://notebooklm.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-950 font-bold underline transition-colors hover:text-primary-dark"
          >
            Google NotebookLM
          </a>{' '}
          to create flashcards, study guides, and quizzes from these resources.
        </div>
      </div>
    </div>
  );
}
