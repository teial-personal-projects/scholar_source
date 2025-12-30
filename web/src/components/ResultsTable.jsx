/**
 * ResultsTable Component
 *
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import ResultCard from './ResultCard';

export default function ResultsTable({ resources, searchTitle, textbookInfo, onClear }) {
  const [copiedSelected, setCopiedSelected] = useState(false);
  const [copiedSelectedAndOpened, setCopiedSelectedAndOpened] = useState(false);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const scrollRef = useRef(null);

  const totalCount = resources?.length || 0;

  const urlList = useMemo(() => {
    return (resources || []).map((r) => r.url).filter(Boolean);
  }, [resources]);

  // Track the current resources to detect changes
  const resourcesRef = useRef(resources);

  // Selected URLs (default: all) - initialize with current urlList
  const [selectedUrls, setSelectedUrls] = useState(() => new Set(urlList));

  // Synchronize selection with resources changes (this is intentional synchronization with external state)
  useEffect(() => {
    // Only update if resources actually changed (not just re-renders)
    if (resourcesRef.current !== resources) {
      resourcesRef.current = resources;
      setSelectedUrls(new Set(urlList));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources]);

  const selectedCount = selectedUrls.size;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getSelectedUrlsInOrder = () => urlList.filter((u) => selectedUrls.has(u));

  const copySelected = async () => {
    const selected = getSelectedUrlsInOrder();
    await copyToClipboard(selected.join('\n'));
    setCopiedSelected(true);
    setTimeout(() => setCopiedSelected(false), 2000);
  };

  const copySelectedAndOpenNotebookLM = async () => {
    const selected = getSelectedUrlsInOrder();
    await copyToClipboard(selected.join('\n'));
    setCopiedSelectedAndOpened(true);
    setTimeout(() => setCopiedSelectedAndOpened(false), 2000);

    window.open('https://notebooklm.google.com', '_blank', 'noopener,noreferrer');
  };

  const handleSelectAll = () => setSelectedUrls(new Set(urlList));
  const handleClearSelection = () => setSelectedUrls(new Set());

  const toggleSelected = (url) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  // Handle scroll to hide/show scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const scrolledToBottom = scrollHeight - scrollTop - clientHeight < 10;
        setIsScrolledToBottom(scrolledToBottom);
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      handleScroll();
    }

    return () => {
      if (el) el.removeEventListener('scroll', handleScroll);
    };
  }, [resources]);

  if (!resources || resources.length === 0) {
    return (
      <div className="relative rounded-2xl bg-white/80 backdrop-blur p-6 sm:p-8 border border-slate-200 shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] border border-indigo-200/70 transition-all overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(79,70,229,0.06)_0%,transparent_70%)] before:pointer-events-none hover:border-indigo-300 hover:shadow-xl">
        <div className="p-12 text-center">
          <div className="text-6xl mb-6 opacity-50">📭</div>
          <h3 className="m-0 mb-4 text-xl font-bold text-slate-800">No resources found</h3>
          <p className="m-0 text-base text-slate-600 leading-relaxed">
            Try adjusting your search criteria or selecting a different search type.
          </p>
        </div>
      </div>
    );
  }

  const nothingSelected = selectedCount === 0;

  return (
    <div className="results-table-container">
      {/* Header Section */}
      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-4 bg-gradient-to-b from-slate-50/50 to-white/50 border-b border-slate-200">
        <div className="flex justify-between items-start gap-4 flex-wrap mb-4">
          <div className="min-w-0">
            <h2 className="m-0 text-2xl font-bold text-slate-800 tracking-tight flex flex-wrap items-center gap-2">
              Discovered Resources
              <span className="count-badge ml-2">
                {totalCount}
              </span>
              <span className="text-sm font-semibold text-slate-600 ml-1">
                {totalCount} total • {selectedCount} selected
              </span>
            </h2>

            {searchTitle && <p className="mt-1 mb-0 text-sm text-slate-600 font-medium">{searchTitle}</p>}
          </div>

          {onClear && (
            <button
              onClick={onClear}
              className="px-4 py-2.5 bg-cyan-500 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-cyan-600 hover:shadow-md active:translate-y-0 max-md:w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
              title="Clear results"
            >
              Clear results
            </button>
          )}
        </div>

        {/* Textbook Info */}
        {(textbookInfo?.book_title || textbookInfo?.book_author || textbookInfo?.title || textbookInfo?.author) && (
          <div className="textbook-info">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0 mt-0.5">📚</div>
              <div className="min-w-0 flex-1">
                <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Course Textbook</p>
                {(textbookInfo?.book_title || textbookInfo?.title) && (
                  <p className="m-0 mb-1 text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {textbookInfo.book_title || textbookInfo.title}
                  </p>
                )}
                {(textbookInfo?.book_author || textbookInfo?.author) && (
                  <p className="m-0 text-sm text-slate-700 font-medium">by {textbookInfo.book_author || textbookInfo.author}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Section: scroll container now owns sticky selection controls + grid */}
      <div className="px-6 sm:px-8 py-6">
        <div
          ref={scrollRef}
          className={`
            relative max-h-[600px] overflow-y-auto pr-2
            scroll-container
            ${!isScrolledToBottom ? 'show-scroll-indicator' : ''}
          `}
        >
          {/* Sticky selection controls */}
          <div className="sticky top-0 z-20 -mx-1 px-1 pb-3 pt-1 bg-white/80 backdrop-blur border-b border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copySelectedAndOpenNotebookLM}
                disabled={nothingSelected}
                className="px-4 py-2.5 bg-blue-600 text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={nothingSelected ? 'Select at least one URL to copy' : 'Copy selected URLs and open NotebookLM'}
              >
                {copiedSelectedAndOpened ? '✓ Copied + Opened' : 'Copy Selected + NotebookLM'}
              </button>

              <button
                onClick={copySelected}
                disabled={nothingSelected}
                className="px-4 py-2.5 bg-white text-slate-800 border border-slate-300 rounded-lg text-sm font-semibold cursor-pointer transition-all whitespace-nowrap shadow-sm hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title={nothingSelected ? 'Select at least one URL to copy' : 'Copy selected URLs'}
              >
                {copiedSelected ? '✓ Copied!' : '📋 Copy Selected'}
              </button>

              <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-500"
                title="Select all URLs"
              >
                Select all
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-500"
                title="Clear selection"
              >
                Clear selection
              </button>

              <span className="ml-auto text-xs text-slate-600 hidden md:inline">
                Select resources to paste into NotebookLM.
              </span>
            </div>
          </div>

          {/* Grid of cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3">
            {resources.map((resource, index) => (
              <ResultCard
                key={resource.url || index}
                resource={resource}
                index={index}
                onCopy={copyToClipboard}
                isSelected={selectedUrls.has(resource.url)}
                onToggleSelect={() => toggleSelected(resource.url)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="px-6 sm:px-8 pb-6 sm:pb-8">
        <div className="pt-6 border-t border-slate-200/60">
          <div className="py-4 px-6 bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-primary rounded-lg text-sm text-blue-900 leading-relaxed shadow-sm">
            💡 <strong className="font-bold">Tip:</strong> Select the resources you want, click{' '}
            <strong className="font-bold">“Copy Selected + NotebookLM”</strong>, then paste into{' '}
            <a
              href="https://notebooklm.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-950 font-bold underline transition-colors hover:text-primary-dark"
            >
              Google NotebookLM
            </a>{' '}
            to create flashcards, study guides, and quizzes.
          </div>
        </div>
      </div>
    </div>
  );
}
