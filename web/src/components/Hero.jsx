/**
 * Hero Component
 *
 * Visually engaging hero section with animated steps, icons, and color-coded cards.
 * Shows the 4-step workflow with visual energy and clear hierarchy.
 */

import { useState } from 'react';

export default function Hero() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      number: 1,
      icon: '📚',
      title: 'Enter Course Details Below',
      description: <>Use <strong>Course Information</strong> below to provide your course URL, textbook info, or ISBN</>,
      gradient: 'bg-gradient-to-br from-orange-100 to-orange-50',
      borderColor: 'border-orange-300',
      iconBg: 'bg-orange-200'
    },
    {
      number: 2,
      icon: '🔍',
      title: 'AI Discovers Resources',
      description: 'We find textbooks, practice problems, video tutorials, and more, from trusted sources',
      gradient: 'bg-gradient-to-br from-emerald-100 to-emerald-50',
      borderColor: 'border-emerald-300',
      iconBg: 'bg-emerald-200'
    },
    {
      number: 3,
      icon: '📋',
      title: 'Copy Resource Links',
      description: <>Copy links from below in the <strong>Discovered Resources</strong> section, after a search, then paste them into your NotebookLM notebook</>,
      gradient: 'bg-gradient-to-br from-pink-100 to-pink-50',
      borderColor: 'border-pink-300',
      iconBg: 'bg-pink-200'
    },
    {
      number: 4,
      icon: '✨',
      title: 'Generate Study Tools',
      description: <><a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:text-indigo-700 underline">In NotebookLM:</a> Create summaries, flashcards, and quizzes tailored to your learning style</>,
      gradient: 'bg-gradient-to-br from-amber-100 to-amber-50',
      borderColor: 'border-amber-300',
      iconBg: 'bg-amber-200'
    }
  ];

  return (
    <div className="hero-container">
      {/* Collapsed */}
      {isCollapsed ? (
        <div className="hero-collapsed">
          <div className="min-w-0">
            <p className="hero-collapsed-text">
              📚 Enter details → 🔍 Discover → 📋 Copy links → ✨ Generate study kit
            </p>
          </div>

          <button
            onClick={() => setIsCollapsed(false)}
            className="hero-expand-btn"
            aria-label="Expand hero section"
          >
            <svg className="w-5 h-5 text-white rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="hero-content">
          {/* Title with controls */}
          <div className="hero-title-section">
            <div className="hero-title-row">
              <div className="hero-title-content">
                <h1 className="hero-title">
                  From Syllabus to Study Superpower
                </h1>
                <p className="hero-subtitle">
                Find trusted study resources that can be used in NotebookLM to generate study guides, flashcards, practice tests, etc.
                </p>
              </div>
              <div className="hero-title-actions">
                <a
                  href="https://notebooklm.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open NotebookLM in a new tab"
                  className="hero-cta-btn-inline"
                >
                  <span className="text-base">✨</span>
                  Open NotebookLM
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hero-collapse-btn-inline"
                  aria-label="Collapse hero section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Steps Grid */}
          <div className="hero-steps-grid">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`hero-step-card ${step.gradient} ${step.borderColor}`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Step number badge */}
                <div className="hero-step-badge">
                  {step.number}
                </div>

                {/* Icon */}
                <div className={`hero-step-icon ${step.iconBg}`}>
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="hero-step-title">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="hero-step-description">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
