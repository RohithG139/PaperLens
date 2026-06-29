import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchPapers } from '../services/api';

// ---------------------------------------------------------------------------
// Mock PaperCard – replace with your real component when available
// ---------------------------------------------------------------------------
function PaperCard({ paper, selected, onToggle }) {
  const fieldColors = {
    'Computer Science': { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', text: '#60a5fa' },
    'Machine Learning': { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.25)', text: '#c084fc' },
    'Biology': { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.25)', text: '#4ade80' },
    'Physics': { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
    'Medicine': { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#f87171' },
    default: { bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8' },
  };

  const fieldStyle = fieldColors[paper.field] || fieldColors.default;

  return (
    <article
      style={{
        position: 'relative',
        background: selected
          ? 'rgba(59,130,246,0.08)'
          : 'rgba(255,255,255,0.04)',
        border: selected
          ? '1px solid rgba(59,130,246,0.45)'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.375rem',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease',
        cursor: 'pointer',
        outline: 'none',
      }}
      tabIndex={0}
      role="checkbox"
      aria-checked={selected}
      onClick={() => onToggle(paper.id)}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onToggle(paper.id)}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4), 0 0 16px rgba(59,130,246,0.08)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        if (!selected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      }}
    >
      {/* Select checkbox indicator */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: '18px',
          height: '18px',
          borderRadius: '4px',
          border: selected ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
          background: selected ? '#3b82f6' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {selected && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Field badge */}
      <div style={{ marginBottom: '0.625rem', paddingRight: '1.75rem' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '0.2rem 0.5rem',
            borderRadius: '9999px',
            background: fieldStyle.bg,
            border: `1px solid ${fieldStyle.border}`,
            color: fieldStyle.text,
          }}
        >
          {paper.field}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          lineHeight: 1.45,
          color: '#ffffff',
          marginBottom: '0.5rem',
          paddingRight: '0.5rem',
        }}
      >
        {paper.title}
      </h3>

      {/* Authors */}
      <p
        style={{
          fontSize: '0.8125rem',
          color: '#64748b',
          marginBottom: '0.75rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {paper.authors.join(', ')}
      </p>

      {/* Abstract excerpt */}
      <p
        style={{
          fontSize: '0.8125rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          marginBottom: '0.875rem',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {paper.abstract}
      </p>

      {/* Footer meta */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.75rem',
          color: '#64748b',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="10" height="9" rx="1" stroke="#64748b" strokeWidth="1.2" />
            <path d="M4 1v2M8 1v2M1 5h10" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          {paper.year}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M6 1l1.4 2.8 3.1.45-2.25 2.19.53 3.1L6 8.1 3.22 9.54l.53-3.1L1.5 4.25l3.1-.45L6 1z" stroke="#64748b" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
          {paper.citations.toLocaleString()} citations
        </span>
        <span style={{ marginLeft: 'auto', color: '#3b82f6', fontWeight: 500 }}>
          {paper.venue}
        </span>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Skeleton card for loading state
// ---------------------------------------------------------------------------
function SkeletonCard() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '0.75rem',
        padding: '1.25rem 1.375rem',
      }}
      aria-hidden="true"
    >
      <div
        className="shimmer"
        style={{ height: '0.875rem', width: '30%', borderRadius: '9999px', marginBottom: '0.75rem', background: 'rgba(255,255,255,0.06)' }}
      />
      <div
        className="shimmer"
        style={{ height: '1rem', width: '90%', borderRadius: '4px', marginBottom: '0.5rem', background: 'rgba(255,255,255,0.06)' }}
      />
      <div
        className="shimmer"
        style={{ height: '1rem', width: '70%', borderRadius: '4px', marginBottom: '0.875rem', background: 'rgba(255,255,255,0.06)' }}
      />
      {[100, 85, 60].map((w, i) => (
        <div
          key={i}
          className="shimmer"
          style={{ height: '0.75rem', width: `${w}%`, borderRadius: '4px', marginBottom: '0.4rem', background: 'rgba(255,255,255,0.05)' }}
        />
      ))}
      <div style={{ height: '1.5rem' }} />
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div className="shimmer" style={{ height: '0.75rem', width: '3rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
        <div className="shimmer" style={{ height: '0.75rem', width: '5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ query }) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 2rem',
        textAlign: 'center',
        animation: 'fadeIn 0.4s ease',
      }}
    >
      {/* Illustration via Canvas-drawn SVG inline */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        style={{ marginBottom: '1.5rem', opacity: 0.5 }}
      >
        <circle cx="52" cy="52" r="32" stroke="#3b82f6" strokeWidth="3" strokeDasharray="8 4" />
        <circle cx="52" cy="52" r="20" stroke="rgba(59,130,246,0.4)" strokeWidth="1.5" />
        <path d="M46 46 L58 58M58 46 L46 58" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M76 76 L95 95" stroke="#a855f7" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="95" cy="95" r="4" fill="#a855f7" opacity="0.7" />
        <path d="M28 20 L32 16 L36 20" stroke="rgba(96,165,250,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 38 L18 34 L22 38" stroke="rgba(168,85,247,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="90" y="18" width="16" height="20" rx="2" stroke="rgba(96,165,250,0.25)" strokeWidth="1.5" />
        <path d="M93 24 h10 M93 28 h7" stroke="rgba(96,165,250,0.25)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <h2
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: '0.5rem',
        }}
      >
        {query ? `No results for "${query}"` : 'Start your search'}
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '26rem', lineHeight: 1.6 }}>
        {query
          ? 'Try broader terms, check spelling, or adjust the filters.'
          : 'Enter a topic, author name, or DOI to find papers across millions of publications.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
function Spinner() {
  return (
    <div
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.15)',
        borderTopColor: '#ffffff',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
      role="status"
      aria-label="Searching…"
    />
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FIELDS_OF_STUDY = [
  'Computer Science',
  'Machine Learning',
  'Biology',
  'Physics',
  'Medicine',
  'Mathematics',
  'Chemistry',
  'Economics',
  'Psychology',
  'Engineering',
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'citations', label: 'Most cited' },
  { value: 'year_desc', label: 'Newest first' },
  { value: 'year_asc', label: 'Oldest first' },
];

const PAGE_SIZE = 12;
const MAX_SELECTED = 5;

// ---------------------------------------------------------------------------
// Transform backend Paper model → PaperCard shape
// ---------------------------------------------------------------------------
const GROWTH_TO_COUNT = { high: 1200, medium: 700, low: 350 };

function transformPaper(p) {
  return {
    id: p.paperId,
    title: p.title,
    authors: (p.authors || []).map((a) => a.name),
    abstract: p.abstract || '',
    year: p.year || '—',
    citations: p.citationCount ?? 0,
    field: (p.fieldsOfStudy && p.fieldsOfStudy[0]) || 'Other',
    venue: '',
  };
}

// ---------------------------------------------------------------------------
// Range slider component
// ---------------------------------------------------------------------------
function RangeSlider({ label, min, max, value, onChange }) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</span>
        <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 500 }}>{localVal}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={localVal}
        onChange={(e) => setLocalVal(Number(e.target.value))}
        onMouseUp={() => onChange(localVal)}
        onTouchEnd={() => onChange(localVal)}
        style={{
          width: '100%',
          height: '3px',
          WebkitAppearance: 'none',
          appearance: 'none',
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((localVal - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) ${((localVal - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
          borderRadius: '9999px',
          outline: 'none',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PaperSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Derive state from URL
  const queryFromURL = searchParams.get('q') || '';
  const sortFromURL = searchParams.get('sort') || 'relevance';
  const yearMinFromURL = Number(searchParams.get('yearMin') || 2000);
  const yearMaxFromURL = Number(searchParams.get('yearMax') || 2025);
  const citMinFromURL = Number(searchParams.get('citMin') || 0);
  const fieldsFromURL = searchParams.get('fields')
    ? searchParams.get('fields').split(',')
    : [];
  const pageFromURL = Number(searchParams.get('page') || 0);

  // Local UI state
  const [inputValue, setInputValue] = useState(queryFromURL);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [compareBarVisible, setCompareBarVisible] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filter state (local, applied on Search or filter change)
  const [yearMin, setYearMin] = useState(yearMinFromURL);
  const [yearMax, setYearMax] = useState(yearMaxFromURL);
  const [citMin, setCitMin] = useState(citMinFromURL);
  const [selectedFields, setSelectedFields] = useState(fieldsFromURL);
  const [sortBy, setSortBy] = useState(sortFromURL);

  const searchInputRef = useRef(null);
  const compareBarRef = useRef(null);

  // Sync input with URL
  useEffect(() => {
    setInputValue(queryFromURL);
  }, [queryFromURL]);

  // Show compare bar when 2+ selected
  useEffect(() => {
    setCompareBarVisible(selectedPapers.length >= 2);
  }, [selectedPapers]);

  // Run search when URL params change (except on initial empty state)
  useEffect(() => {
    if (queryFromURL) {
      runSearch(queryFromURL, pageFromURL, sortFromURL, {
        yearMin: yearMinFromURL,
        yearMax: yearMaxFromURL,
        citMin: citMinFromURL,
        fields: fieldsFromURL,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  async function runSearch(q, page, sort, filters) {
    if (!q.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await searchPapers(q, PAGE_SIZE);
      let papers = (response.data.papers || []).map(transformPaper);

      // Client-side filters
      if (filters.yearMin) papers = papers.filter((p) => p.year === '—' || p.year >= filters.yearMin);
      if (filters.yearMax) papers = papers.filter((p) => p.year === '—' || p.year <= filters.yearMax);
      if (filters.citMin) papers = papers.filter((p) => p.citations >= filters.citMin);
      if (filters.fields && filters.fields.length > 0) {
        papers = papers.filter((p) => filters.fields.includes(p.field));
      }

      if (sort === 'citations') papers.sort((a, b) => b.citations - a.citations);
      else if (sort === 'year_desc') papers.sort((a, b) => (b.year === '—' ? -1 : b.year) - (a.year === '—' ? -1 : a.year));
      else if (sort === 'year_asc') papers.sort((a, b) => (a.year === '—' ? Infinity : a.year) - (b.year === '—' ? Infinity : b.year));

      if (page === 0) setResults(papers);
      else setResults((prev) => [...prev, ...papers]);
      setHasMore(false);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  function pushToURL(overrides = {}) {
    const next = {
      q: inputValue.trim(),
      sort: sortBy,
      yearMin: String(yearMin),
      yearMax: String(yearMax),
      citMin: String(citMin),
      page: '0',
      ...(selectedFields.length ? { fields: selectedFields.join(',') } : {}),
      ...overrides,
    };
    // Remove defaults to keep URLs clean
    if (next.yearMin === '2000') delete next.yearMin;
    if (next.yearMax === '2025') delete next.yearMax;
    if (next.citMin === '0') delete next.citMin;
    if (next.sort === 'relevance') delete next.sort;
    setSearchParams(next, { replace: false });
  }

  function handleSubmit(e) {
    e?.preventDefault();
    if (!inputValue.trim()) return;
    setResults([]);
    setSelectedPapers([]);
    pushToURL({ q: inputValue.trim(), page: '0' });
  }

  function handleSortChange(val) {
    setSortBy(val);
    if (queryFromURL) pushToURL({ sort: val, page: '0' });
  }

  function handleFieldToggle(field) {
    const next = selectedFields.includes(field)
      ? selectedFields.filter((f) => f !== field)
      : [...selectedFields, field];
    setSelectedFields(next);
    if (queryFromURL) {
      const overrides = { page: '0' };
      if (next.length) overrides.fields = next.join(',');
      pushToURL(overrides);
    }
  }

  function handleYearMinChange(val) {
    const v = Math.min(val, yearMax - 1);
    setYearMin(v);
    if (queryFromURL) pushToURL({ yearMin: String(v), page: '0' });
  }

  function handleYearMaxChange(val) {
    const v = Math.max(val, yearMin + 1);
    setYearMax(v);
    if (queryFromURL) pushToURL({ yearMax: String(v), page: '0' });
  }

  function handleCitMinChange(val) {
    setCitMin(val);
    if (queryFromURL) pushToURL({ citMin: String(val), page: '0' });
  }

  function handleTogglePaper(paperId) {
    setSelectedPapers((prev) => {
      if (prev.includes(paperId)) return prev.filter((id) => id !== paperId);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, paperId];
    });
  }

  function handleLoadMore() {
    const nextPage = pageFromURL + 1;
    pushToURL({ page: String(nextPage) });
  }

  function handleCompare() {
    const ids = selectedPapers.join(',');
    navigate(`/compare?ids=${ids}`);
  }

  function clearFilters() {
    setYearMin(2000);
    setYearMax(2025);
    setCitMin(0);
    setSelectedFields([]);
    if (queryFromURL) pushToURL({ yearMin: undefined, yearMax: undefined, citMin: undefined, fields: undefined, page: '0' });
  }

  const hasActiveFilters =
    yearMin !== 2000 || yearMax !== 2025 || citMin !== 0 || selectedFields.length > 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        color: 'var(--text-primary)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      {/* ── Search Header ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: 'linear-gradient(180deg, rgba(15,17,23,0) 0%, rgba(15,17,23,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: hasSearched ? '1.25rem 1.5rem' : '5rem 1.5rem 4rem',
          transition: 'padding 0.4s cubic-bezier(0.4,0,0.2,1)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'rgba(15,17,23,0.92)',
        }}
      >
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          {!hasSearched && (
            <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'slideUp 0.5s ease' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.875rem',
                  borderRadius: '9999px',
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#60a5fa',
                  marginBottom: '1.25rem',
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                  <circle cx="4" cy="4" r="4" fill="#3b82f6" />
                </svg>
                200M+ papers indexed
              </div>
              <h1
                style={{
                  fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#ffffff',
                  marginBottom: '0.75rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Find the research that{' '}
                <span
                  style={{
                    background: 'linear-gradient(90deg, #60a5fa, #a855f7)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  matters to you
                </span>
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  color: '#64748b',
                  maxWidth: '40rem',
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}
              >
                Search by topic, author, DOI, or paste an abstract to find related work.
              </p>
            </div>
          )}

          {/* Search bar */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.625rem' }}>
            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: '0.625rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onFocusCapture={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                  flexShrink: 0,
                }}
              >
                <circle cx="6.5" cy="6.5" r="4.5" stroke="#64748b" strokeWidth="1.5" />
                <path d="M10.5 10.5L14 14" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Search papers, authors, topics…"
                aria-label="Search papers"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  padding: '0.8125rem 1rem 0.8125rem 2.75rem',
                  fontFamily: 'inherit',
                }}
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !inputValue.trim() ? 0.55 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
                whiteSpace: 'nowrap',
                minWidth: '7rem',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.45)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {isLoading ? <Spinner /> : (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <circle cx="6.5" cy="6.5" r="4.5" stroke="white" strokeWidth="1.6" />
                  <path d="M10.5 10.5L14 14" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
              {isLoading ? 'Searching' : 'Search'}
            </button>
          </form>
        </div>
      </header>

      {/* ── Body: Sidebar + Results ──────────────────────────────────────── */}
      {hasSearched && (
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '1.5rem 1.5rem',
            display: 'grid',
            gridTemplateColumns: sidebarOpen ? '260px 1fr' : '0 1fr',
            gap: '1.5rem',
            alignItems: 'start',
            transition: 'grid-template-columns 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* ── Filter Sidebar ──────────────────────────────────────────── */}
          <aside
            style={{
              overflow: sidebarOpen ? 'visible' : 'hidden',
              opacity: sidebarOpen ? 1 : 0,
              transition: 'opacity 0.25s ease',
              pointerEvents: sidebarOpen ? 'auto' : 'none',
            }}
            aria-label="Filters"
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                position: 'sticky',
                top: '90px',
              }}
            >
              {/* Sidebar header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Filters
                </span>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                      fontFamily: 'inherit',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Year range */}
              <section style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Publication year
                </p>
                <RangeSlider label="From" min={1950} max={2025} value={yearMin} onChange={handleYearMinChange} />
                <div style={{ height: '0.75rem' }} />
                <RangeSlider label="To" min={1950} max={2025} value={yearMax} onChange={handleYearMaxChange} />
              </section>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '1.25rem' }} />

              {/* Citation count */}
              <section style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Min. citations
                </p>
                <RangeSlider label="At least" min={0} max={10000} value={citMin} onChange={handleCitMinChange} />
              </section>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '1.25rem' }} />

              {/* Fields of study */}
              <section>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
                  Field of study
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {FIELDS_OF_STUDY.map((field) => {
                    const checked = selectedFields.includes(field);
                    return (
                      <label
                        key={field}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          cursor: 'pointer',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '6px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          onClick={() => handleFieldToggle(field)}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && handleFieldToggle(field)}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            border: checked ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.2)',
                            background: checked ? '#3b82f6' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                            outline: 'none',
                          }}
                        >
                          {checked && (
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            color: checked ? '#ffffff' : '#94a3b8',
                            transition: 'color 0.15s',
                            userSelect: 'none',
                          }}
                          onClick={() => handleFieldToggle(field)}
                        >
                          {field}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
          </aside>

          {/* ── Results column ──────────────────────────────────────────── */}
          <main>
            {/* Results toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Toggle sidebar */}
                <button
                  onClick={() => setSidebarOpen((v) => !v)}
                  aria-label={sidebarOpen ? 'Hide filters' : 'Show filters'}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '0.5rem',
                    color: '#94a3b8',
                    padding: '0.375rem 0.625rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8125rem',
                    fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = '#94a3b8';
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  Filters
                  {hasActiveFilters && (
                    <span
                      style={{
                        background: '#3b82f6',
                        color: '#ffffff',
                        borderRadius: '9999px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.05rem 0.35rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {(selectedFields.length > 0 ? 1 : 0) +
                        (yearMin !== 2000 || yearMax !== 2025 ? 1 : 0) +
                        (citMin !== 0 ? 1 : 0)}
                    </span>
                  )}
                </button>

                {!isLoading && results.length > 0 && (
                  <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {results.length} results
                    {queryFromURL && (
                      <> for <strong style={{ color: '#94a3b8' }}>"{queryFromURL}"</strong></>
                    )}
                  </span>
                )}
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>Sort by</span>
                <div style={{ position: 'relative' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortChange(e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '0.5rem',
                      color: '#ffffff',
                      fontSize: '0.8125rem',
                      fontFamily: 'inherit',
                      padding: '0.375rem 2rem 0.375rem 0.75rem',
                      cursor: 'pointer',
                      outline: 'none',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} style={{ background: '#1a1d27' }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    aria-hidden="true"
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}
                  >
                    <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Selected papers notice */}
            {selectedPapers.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.625rem 1rem',
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '0.625rem',
                  marginBottom: '1rem',
                  animation: 'fadeIn 0.25s ease',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <span
                    style={{
                      background: '#3b82f6',
                      color: '#ffffff',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {selectedPapers.length}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>
                    {selectedPapers.length === MAX_SELECTED
                      ? `${MAX_SELECTED} papers selected (maximum)`
                      : `${selectedPapers.length} paper${selectedPapers.length > 1 ? 's' : ''} selected — pick up to ${MAX_SELECTED}`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedPapers([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#94a3b8')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    Clear selection
                  </button>
                  {selectedPapers.length >= 2 && (
                    <button
                      onClick={handleCompare}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        padding: '0.375rem 0.875rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        transition: 'opacity 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.9';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <rect x="1" y="2" width="4" height="8" rx="1" stroke="white" strokeWidth="1.3" />
                        <rect x="7" y="2" width="4" height="8" rx="1" stroke="white" strokeWidth="1.3" />
                      </svg>
                      Compare {selectedPapers.length}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Results grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))',
                gap: '1rem',
              }}
            >
              {isLoading && results.length === 0
                ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
                : results.length > 0
                ? results.map((paper, idx) => (
                    <div
                      key={paper.id}
                      style={{
                        animation: `slideUp 0.35s ease ${Math.min(idx % PAGE_SIZE, 8) * 0.04}s both`,
                      }}
                    >
                      <PaperCard
                        paper={paper}
                        selected={selectedPapers.includes(paper.id)}
                        onToggle={handleTogglePaper}
                      />
                    </div>
                  ))
                : !isLoading && <EmptyState query={queryFromURL} />}
            </div>

            {/* Load more / pagination */}
            {results.length > 0 && !isLoading && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: '2.5rem',
                  paddingBottom: compareBarVisible ? '5rem' : '2rem',
                }}
              >
                {hasMore ? (
                  <button
                    onClick={handleLoadMore}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.625rem',
                      color: '#94a3b8',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                      padding: '0.625rem 2rem',
                      cursor: 'pointer',
                      transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = '#94a3b8';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    }}
                  >
                    Load more results
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M7 3v8M4 8l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    All results loaded · {results.length} papers
                  </p>
                )}
              </div>
            )}

            {/* Inline loading spinner for load-more */}
            {isLoading && results.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: '#64748b', fontSize: '0.875rem' }}>
                  <Spinner />
                  Loading more results…
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Empty landing — before any search */}
      {!hasSearched && (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.5rem 4rem' }}>
          <EmptyState query="" />
        </div>
      )}

      {/* ── Floating Compare Bar ─────────────────────────────────────────── */}
      {compareBarVisible && (
        <div
          ref={compareBarRef}
          role="complementary"
          aria-label="Compare selected papers"
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
            animation: 'bounceIn 0.3s ease',
            width: 'min(640px, calc(100vw - 3rem))',
          }}
        >
          <div
            style={{
              background: 'rgba(15,17,23,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '1rem',
              padding: '0.875rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.1), 0 0 24px rgba(59,130,246,0.15)',
            }}
          >
            {/* Paper chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              {selectedPapers.map((id, i) => {
                const paper = results.find((p) => p.id === id);
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.5rem 0.25rem 0.625rem',
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      color: '#60a5fa',
                      maxWidth: '160px',
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {paper ? paper.title.split(' ').slice(0, 4).join(' ') + '…' : `Paper ${i + 1}`}
                    </span>
                    <button
                      onClick={() => handleTogglePaper(id)}
                      aria-label={`Remove ${paper?.title || 'paper'} from comparison`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#60a5fa',
                        display: 'flex',
                        padding: '1px',
                        opacity: 0.7,
                        flexShrink: 0,
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
              {selectedPapers.length < MAX_SELECTED && (
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  +{MAX_SELECTED - selectedPapers.length} more
                </span>
              )}
            </div>

            {/* Compare CTA */}
            <button
              onClick={handleCompare}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.625rem',
                padding: '0.5625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.92';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="4.5" height="9" rx="1" stroke="white" strokeWidth="1.3" />
                <rect x="7.5" y="2" width="4.5" height="9" rx="1" stroke="white" strokeWidth="1.3" />
              </svg>
              Compare {selectedPapers.length} papers
            </button>
          </div>
        </div>
      )}

      {/* Inline style for range input thumb */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #0f1117;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.5);
          cursor: pointer;
          transition: box-shadow 0.15s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2px solid #0f1117;
          cursor: pointer;
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
        @media (max-width: 768px) {
          .search-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
