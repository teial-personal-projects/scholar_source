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
      <div className="results-table-empty">
        <div className="results-table-empty-content">
          <div className="results-table-empty-icon">📭</div>
          <h3 className="results-table-empty-title">No resources found</h3>
          <p className="results-table-empty-text">
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
      <div className="results-table-header">
        <div className="results-table-header-content">
          <div className="results-table-title-section">
            <h2 className="results-table-title">
              Discovered Resources
              <span className="count-badge ml-2">
                {totalCount}
              </span>
              <span className="text-sm font-semibold text-slate-600 ml-1">
                {totalCount} total • {selectedCount} selected
              </span>
            </h2>

            {searchTitle && <p className="results-table-subtitle">{searchTitle}</p>}
          </div>

          {onClear && (
            <button
              onClick={onClear}
              className="results-table-clear-btn"
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
      <div className="results-table-content">
        <div
          ref={scrollRef}
          className={`
            relative max-h-[600px] overflow-y-auto pr-2
            scroll-container
            ${!isScrolledToBottom ? 'show-scroll-indicator' : ''}
          `}
        >
          {/* Sticky selection controls */}
          <div className="results-table-sticky-controls">
            <div className="results-table-controls-group">
              <span className="results-table-selection-badge">
                {selectedCount} of {totalCount} selected
              </span>

              <button
                onClick={copySelectedAndOpenNotebookLM}
                disabled={nothingSelected}
                className="results-table-notebooklm-btn"
                title={nothingSelected ? 'Select at least one URL to copy' : 'Copy selected URLs and open NotebookLM'}
              >
                {copiedSelectedAndOpened ? '✓ Copied + Opened' : 'Copy Selected + NotebookLM'}
              </button>

              <button
                onClick={copySelected}
                disabled={nothingSelected}
                className="results-table-copy-btn"
                title={nothingSelected ? 'Select at least one URL to copy' : 'Copy selected URLs'}
              >
                {copiedSelected ? '✓ Copied!' : '📋 Copy Selected'}
              </button>

              <div className="results-table-control-divider" />

              <button
                type="button"
                onClick={handleSelectAll}
                className="results-table-control-link"
                title="Select all URLs"
              >
                Select all
              </button>

              <button
                type="button"
                onClick={handleClearSelection}
                className="results-table-control-link"
                title="Clear selection"
              >
                Clear selection
              </button>

              <span className="results-table-help-text">
                Click "Copy Selected + NotebookLM", then paste into{' '}
                <a
                  href="https://notebooklm.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="results-table-help-link"
                >
                  NotebookLM
                </a>{' '}
                to create flashcards, study guides, and quizzes.
              </span>
            </div>
          </div>

          {/* Grid of cards */}
          <div className="results-table-grid">
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
    </div>
  );
}
