/**
 * ResultsTable Component
 *
 * Displays discovered resources in a clean list format with copy functionality.
 */

import { useState, useRef, useEffect } from 'react';
import ResultCard from './ResultCard';

export default function ResultsTable({ resources, searchTitle, textbookInfo, onClear }) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const listRef = useRef(null);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
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
      <div className="relative rounded-2xl bg-white/80 backdrop-blur p-6 sm:p-8 border border-slate-200 shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] border border-indigo-200/70 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(79,70,229,0.06)_0%,transparent_70%)] before:pointer-events-none hover:border-indigo-300 hover:shadow-xl">
        <div className="p-12 text-center">
          <div className="text-6xl mb-6 opacity-50">📭</div>
          <h3 className="m-0 mb-4 text-xl font-bold text-slate-800">No resources found</h3>
          <p className="m-0 text-base text-slate-600 leading-relaxed">Try adjusting your search criteria or selecting a different search type.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl bg-white/80 backdrop-blur p-6 sm:p-8 border border-slate-200 shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] border border-indigo-200/70 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(79,70,229,0.06)_0%,transparent_70%)] before:pointer-events-none hover:border-indigo-300 hover:shadow-xl">
      <div className="flex justify-between items-start mb-8 gap-4 flex-wrap pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="m-0 text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Discovered Resources
            <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-full text-sm font-bold shadow-sm ml-2">{resources.length}</span>
          </h2>
          {searchTitle && <p className="mt-1 mb-0 text-sm text-slate-600 font-medium">{searchTitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap max-md:w-full">
          <button
            onClick={copyAllUrls}
            className="px-4 py-2.5 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-blue-700 hover:shadow-md active:translate-y-0 max-md:flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Copy all URLs for NotebookLM"
          >
            {copiedAll ? '✓ Copied!' : '📋 Copy All URLs'}
          </button>
          {onClear && (
            <button
              onClick={onClear}
              className="px-4 py-2.5 bg-cyan-500 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-cyan-600 hover:shadow-md active:translate-y-0 max-md:flex-1 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
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
        className={`relative flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 after:content-['↓_Scroll_for_more'] after:sticky after:bottom-0 after:left-0 after:right-0 after:flex after:items-center after:justify-center after:p-4 after:bg-gradient-to-t after:from-white/95 after:via-white/80 after:to-transparent after:text-primary after:text-xs after:font-bold after:text-center after:pointer-events-none after:opacity-0 after:transition-opacity after:backdrop-blur-sm ${isScrolledToBottom ? '' : 'after:opacity-100'} [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-primary [&::-webkit-scrollbar-thumb]:to-primary-dark [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:transition-all hover:[&::-webkit-scrollbar-thumb]:from-primary-dark hover:[&::-webkit-scrollbar-thumb]:to-indigo-800`}
      >
        {resources.map((resource, index) => (
          <ResultCard
            key={index}
            resource={resource}
            index={index}
            onCopy={copyToClipboard}
          />
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200/60">
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
