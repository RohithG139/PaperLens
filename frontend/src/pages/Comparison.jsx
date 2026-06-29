import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  searchPapers as apiSearchPapers,
  comparePapers as apiComparePapers,
  getPaperDetails,
} from '../services/api';

// ─── API helpers ──────────────────────────────────────────────────────────────

function normalizePaper(p) {
  return {
    ...p,
    id: p.paperId,
    authors: (p.authors || []).map((a) => (typeof a === 'string' ? a : a.name)),
  };
}

const searchPapersLocal = async (query) => {
  if (!query || query.trim().length < 2) return [];
  const { data } = await apiSearchPapers(query, 10);
  return (data.papers || []).map(normalizePaper);
};

const comparePapersLocal = async (paperIds) => {
  const { data } = await apiComparePapers(paperIds);
  const table = data.comparisonTable || {};
  const dimLabels = { year: 'Year', citations: 'Citations', fields: 'Fields of Study', authors: 'Authors' };
  const attributes = Object.keys(dimLabels).map((dim) => ({
    label: dimLabels[dim],
    values: Object.fromEntries(
      Object.entries(table).map(([pid, vals]) => {
        const v = vals[dim];
        return [pid, Array.isArray(v) ? v.join(', ') : (v ?? '—')];
      })
    ),
  }));
  return { ...data, attributes };
};

// ─── ComparisonTable ──────────────────────────────────────────────────────────

function ComparisonTable({ papers, attributes }) {
  if (!papers?.length || !attributes?.length) return null;

  return (
    <div className="comparison-table-wrapper">
      <div className="comparison-table-scroll">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="attr-col">Attribute</th>
              {papers.map((paper) => (
                <th key={paper.id ?? paper._id} className="paper-col">
                  <span className="paper-col-title" title={paper.title}>
                    {paper.title?.length > 60
                      ? paper.title.slice(0, 57) + '…'
                      : paper.title}
                  </span>
                  {paper.year && (
                    <span className="paper-col-year">{paper.year}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attributes.map((attr, i) => (
              <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="attr-label">{attr.label}</td>
                {papers.map((paper) => {
                  const val = attr.values?.[paper.id ?? paper._id];
                  return (
                    <td key={paper.id ?? paper._id} className="attr-value">
                      {val ?? <span className="na-mark">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LoadingOverlay ───────────────────────────────────────────────────────────

function LoadingOverlay() {
  return (
    <div className="loading-overlay" role="status" aria-label="Generating comparison">
      <div className="loading-inner">
        <svg className="loading-ring" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="url(#ring-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="72 56"
          />
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <p className="loading-label">Analyzing papers…</p>
        <p className="loading-sub">Extracting methods, contributions, and results</p>
      </div>
    </div>
  );
}

// ─── SkeletonBlock ────────────────────────────────────────────────────────────

function SkeletonBlock({ lines = 3, style }) {
  return (
    <div className="skeleton-block" style={style}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="shimmer skeleton-line"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const MAX_PAPERS = 5;

export default function Comparison() {
  const [searchParams] = useSearchParams();

  // Pre-selected IDs from URL: ?papers=id1,id2
  const preselectedIds = (searchParams.get('papers') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [selectedPapers, setSelectedPapers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Fetch pre-selected papers on mount (fetch individually since no batch endpoint exists)
  const { data: preselectedData } = useQuery({
    queryKey: ['papers-preselected', preselectedIds.join(',')],
    queryFn: async () => {
      if (!preselectedIds.length) return [];
      const results = await Promise.allSettled(
        preselectedIds.map((id) => getPaperDetails(id))
      );
      return results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => normalizePaper(r.value.data));
    },
    enabled: preselectedIds.length > 0,
    onSuccess: (papers) => {
      if (papers?.length) {
        setSelectedPapers(papers.slice(0, MAX_PAPERS));
      }
    },
  });

  useEffect(() => {
    if (preselectedData?.length && !selectedPapers.length) {
      setSelectedPapers(preselectedData.slice(0, MAX_PAPERS));
    }
  }, [preselectedData]);

  // Live search
  const { data: searchResults = [], isFetching: searchLoading } = useQuery({
    queryKey: ['paper-search', searchQuery],
    queryFn: () => searchPapersLocal(searchQuery),
    enabled: searchQuery.trim().length >= 2,
    keepPreviousData: true,
  });

  // Compare mutation
  const compareMutation = useMutation({
    mutationFn: () =>
      comparePapersLocal(selectedPapers.map((p) => p.paperId ?? p.id)),
    onSuccess: (data) => {
      setComparisonResult(data);
      toast.success('Comparison ready');
      setTimeout(() => {
        document.getElementById('comparison-results')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    onError: () => {
      toast.error('Comparison failed. Please try again.');
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !searchRef.current?.contains(e.target)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addPaper = (paper) => {
    const id = paper.id ?? paper._id;
    if (selectedPapers.find((p) => (p.id ?? p._id) === id)) {
      toast('Already added', { icon: '📌' });
      return;
    }
    if (selectedPapers.length >= MAX_PAPERS) {
      toast.error(`Maximum ${MAX_PAPERS} papers allowed`);
      return;
    }
    setSelectedPapers((prev) => [...prev, paper]);
    setSearchQuery('');
    setSearchOpen(false);
    setComparisonResult(null);
  };

  const removePaper = (id) => {
    setSelectedPapers((prev) => prev.filter((p) => (p.id ?? p._id) !== id));
    setComparisonResult(null);
  };

  const handleExport = () => {
    window.print();
  };

  const canCompare = selectedPapers.length >= 2 && !compareMutation.isLoading;
  const isLoading = compareMutation.isLoading;

  return (
    <>
      <style>{`
        /* ── Page Layout ── */
        .cmp-page {
          min-height: 100vh;
          background: var(--background);
          padding: 2rem 1rem 4rem;
        }
        .cmp-container {
          max-width: 1100px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .cmp-header {
          margin-bottom: 2.5rem;
        }
        .cmp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--primary-light);
          margin-bottom: 0.75rem;
        }
        .cmp-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          flex-shrink: 0;
        }
        .cmp-title {
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }
        .cmp-title span {
          background: linear-gradient(to right, #60a5fa, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cmp-subtitle {
          color: var(--text-secondary);
          font-size: 0.9375rem;
        }

        /* ── Selector Panel ── */
        .selector-panel {
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .selector-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .selector-heading {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .paper-count-badge {
          background: rgba(59, 130, 246, 0.15);
          color: var(--primary-light);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.55rem;
          letter-spacing: 0.04em;
        }
        .selector-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* ── Selected Papers List ── */
        .selected-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          margin-bottom: 1.25rem;
          min-height: 2rem;
        }
        .selected-empty {
          text-align: center;
          padding: 1.5rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          border: 1px dashed var(--border);
          border-radius: 0.75rem;
        }
        .selected-paper-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          background: var(--background-tertiary);
          border: 1px solid var(--border);
          border-radius: 0.625rem;
          padding: 0.75rem 1rem;
          animation: slideUp 0.25s ease forwards;
          transition: border-color 0.2s;
        }
        .selected-paper-card:hover {
          border-color: var(--border-hover);
        }
        .paper-index {
          flex-shrink: 0;
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(59,130,246,0.2), rgba(168,85,247,0.2));
          border: 1px solid rgba(59,130,246,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6875rem;
          font-weight: 700;
          color: var(--primary-light);
          margin-top: 0.125rem;
        }
        .paper-info {
          flex: 1;
          min-width: 0;
        }
        .paper-info-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 0.2rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .paper-info-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .remove-btn {
          flex-shrink: 0;
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 0.375rem;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          font-size: 0.875rem;
          line-height: 1;
        }
        .remove-btn:hover {
          background: rgba(239,68,68,0.12);
          color: #ef4444;
          border-color: rgba(239,68,68,0.3);
        }
        .remove-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ── Search Box ── */
        .search-wrapper {
          position: relative;
        }
        .search-input-row {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        .search-field-wrap {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
          width: 1rem;
          height: 1rem;
        }
        .search-field {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-primary);
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          font-size: 0.875rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-field::placeholder { color: var(--text-muted); }
        .search-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .search-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Search Dropdown ── */
        .search-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          right: 0;
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
          z-index: 50;
          box-shadow: 0 16px 40px rgba(0,0,0,0.5);
          animation: fadeIn 0.15s ease;
        }
        .search-dropdown-inner {
          max-height: 280px;
          overflow-y: auto;
        }
        .search-result-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .search-result-item:last-child { border-bottom: none; }
        .search-result-item:hover { background: var(--surface-hover); }
        .search-result-item:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: -2px;
        }
        .result-icon {
          flex-shrink: 0;
          width: 2rem;
          height: 2rem;
          border-radius: 0.375rem;
          background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15));
          border: 1px solid rgba(59,130,246,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          color: var(--primary-light);
          margin-top: 0.1rem;
        }
        .result-title {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 0.2rem;
        }
        .result-meta {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .result-added-badge {
          flex-shrink: 0;
          font-size: 0.7rem;
          color: var(--text-muted);
          align-self: center;
        }
        .search-empty-msg {
          padding: 1.5rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .search-loading-msg {
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.8125rem;
          justify-content: center;
        }
        .mini-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        /* ── Generate Button ── */
        .generate-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }
        .generate-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .generate-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          color: #fff;
          font-weight: 600;
          font-size: 0.875rem;
          padding: 0.625rem 1.5rem;
          border-radius: 0.625rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.2s, box-shadow 0.2s;
          white-space: nowrap;
          font-family: inherit;
        }
        .generate-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.4);
        }
        .generate-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .generate-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .generate-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .btn-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* ── Loading overlay ── */
        .loading-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 1rem;
        }
        .loading-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          text-align: center;
        }
        .loading-ring {
          width: 3rem;
          height: 3rem;
          animation: spin 1.2s linear infinite;
        }
        .loading-label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.9375rem;
        }
        .loading-sub {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        /* ── Results Section ── */
        .results-section {
          margin-top: 2rem;
          animation: slideUp 0.4s ease forwards;
        }
        .results-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .results-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.4rem 0.875rem;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s;
          font-family: inherit;
        }
        .export-btn:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .export-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* ── Comparison Table ── */
        .comparison-table-wrapper {
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: 1rem;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        .comparison-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 500px;
          font-size: 0.8125rem;
        }
        .comparison-table thead tr {
          border-bottom: 1px solid var(--border);
        }
        .comparison-table th {
          padding: 0.875rem 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--text-secondary);
          font-size: 0.75rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          background: rgba(255,255,255,0.02);
        }
        .attr-col {
          width: 180px;
          min-width: 140px;
        }
        .paper-col {
          min-width: 180px;
        }
        .paper-col-title {
          display: block;
          color: var(--text-primary);
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.8125rem;
          margin-bottom: 0.15rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }
        .paper-col-year {
          display: block;
          font-size: 0.7rem;
          color: var(--primary-light);
          font-weight: 500;
          text-transform: none;
          letter-spacing: 0;
        }
        .comparison-table td {
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          vertical-align: top;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          line-height: 1.5;
        }
        .row-even td { background: transparent; }
        .row-odd td { background: rgba(255,255,255,0.015); }
        .attr-label {
          color: var(--text-primary) !important;
          font-weight: 500;
          white-space: nowrap;
        }
        .na-mark { color: var(--text-muted); }

        /* ── Insights Grid ── */
        .insights-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        @media (max-width: 640px) {
          .insights-grid { grid-template-columns: 1fr; }
          .generate-row { flex-direction: column; align-items: flex-start; }
          .results-section-header { flex-direction: column; align-items: flex-start; }
        }
        .insight-card {
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.25rem;
        }
        .insight-card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .insight-card-icon {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          flex-shrink: 0;
        }
        .icon-green {
          background: rgba(34,197,94,0.12);
          border: 1px solid rgba(34,197,94,0.2);
        }
        .icon-red {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.2);
        }
        .insight-card-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .insight-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .insight-item {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .insight-marker {
          flex-shrink: 0;
          width: 1.125rem;
          height: 1.125rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          margin-top: 0.15rem;
          font-weight: 700;
        }
        .marker-green {
          background: rgba(34,197,94,0.15);
          color: #22c55e;
        }
        .marker-red {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
        }

        /* ── Recommendation ── */
        .recommendation-card {
          position: relative;
          background: var(--background-secondary);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        .recommendation-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 1rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(59,130,246,0.5), rgba(168,85,247,0.5));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
        .recommendation-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.6), rgba(168,85,247,0.6), transparent);
        }
        .recommendation-inner {
          position: relative;
          z-index: 1;
        }
        .recommendation-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(to right, #60a5fa, #a855f7);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 0.625rem;
          display: block;
        }
        .recommendation-text {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          line-height: 1.7;
        }

        /* ── Skeleton ── */
        .skeleton-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
        }
        .skeleton-line {
          height: 0.75rem;
          border-radius: 0.25rem;
        }

        /* ── Print ── */
        @media print {
          .selector-panel,
          .generate-row,
          .export-btn,
          .remove-btn {
            display: none !important;
          }
          .cmp-page {
            background: #fff;
            color: #000;
            padding: 1rem;
          }
          .comparison-table-wrapper,
          .insight-card,
          .recommendation-card {
            border: 1px solid #ccc;
            break-inside: avoid;
          }
          .comparison-table th,
          .comparison-table td,
          .insight-card-title,
          .attr-label,
          .paper-col-title,
          .results-title,
          .cmp-title,
          .recommendation-label {
            color: #000 !important;
            -webkit-text-fill-color: #000 !important;
          }
          .comparison-table td,
          .insight-item,
          .recommendation-text {
            color: #333 !important;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .loading-ring,
          .mini-spinner,
          .btn-spinner {
            animation: none;
          }
          .selected-paper-card,
          .results-section {
            animation: none;
          }
        }
      `}</style>

      <div className="cmp-page">
        <div className="cmp-container">

          {/* Header */}
          <header className="cmp-header">
            <div className="cmp-eyebrow">
              <span className="cmp-eyebrow-dot" aria-hidden="true"></span>
              Side-by-side analysis
            </div>
            <h1 className="cmp-title">
              Compare <span>Research Papers</span>
            </h1>
            <p className="cmp-subtitle">
              Select up to {MAX_PAPERS} papers to compare methods, datasets, results, and contributions.
            </p>
          </header>

          {/* Selector Panel */}
          <section className="selector-panel" aria-label="Paper selector">
            <div className="selector-top">
              <div className="selector-heading">
                Selected papers
                <span className="paper-count-badge">
                  {selectedPapers.length} / {MAX_PAPERS}
                </span>
              </div>
              <span className="selector-hint">
                {selectedPapers.length < 2
                  ? `Add ${2 - selectedPapers.length} more paper${2 - selectedPapers.length === 1 ? '' : 's'} to compare`
                  : 'Ready to compare'}
              </span>
            </div>

            {/* Selected List */}
            <div className="selected-list" role="list" aria-label="Selected papers">
              {selectedPapers.length === 0 ? (
                <div className="selected-empty">
                  Search for papers below to add them to your comparison.
                </div>
              ) : (
                selectedPapers.map((paper, i) => {
                  const id = paper.id ?? paper._id;
                  return (
                    <div
                      key={id}
                      className="selected-paper-card"
                      role="listitem"
                    >
                      <span className="paper-index" aria-hidden="true">{i + 1}</span>
                      <div className="paper-info">
                        <div className="paper-info-title" title={paper.title}>
                          {paper.title}
                        </div>
                        <div className="paper-info-meta">
                          {paper.authors?.length > 0 && (
                            <span>
                              {Array.isArray(paper.authors)
                                ? paper.authors.slice(0, 2).join(', ') +
                                  (paper.authors.length > 2 ? ' et al.' : '')
                                : paper.authors}
                            </span>
                          )}
                          {paper.year && <span>{paper.year}</span>}
                          {paper.venue && <span>{paper.venue}</span>}
                        </div>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => removePaper(id)}
                        aria-label={`Remove ${paper.title}`}
                        title="Remove paper"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Search */}
            <div className="search-wrapper">
              <div className="search-input-row">
                <div className="search-field-wrap">
                  <svg
                    className="search-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    ref={searchRef}
                    type="search"
                    className="search-field"
                    placeholder={
                      selectedPapers.length >= MAX_PAPERS
                        ? `Maximum ${MAX_PAPERS} papers reached`
                        : 'Search by title, author, or keyword…'
                    }
                    value={searchQuery}
                    disabled={selectedPapers.length >= MAX_PAPERS}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    aria-label="Search papers"
                    aria-expanded={searchOpen && searchQuery.length >= 2}
                    aria-autocomplete="list"
                    aria-controls="search-listbox"
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Dropdown */}
              {searchOpen && searchQuery.trim().length >= 2 && (
                <div
                  className="search-dropdown"
                  ref={dropdownRef}
                  id="search-listbox"
                  role="listbox"
                  aria-label="Search results"
                >
                  <div className="search-dropdown-inner">
                    {searchLoading ? (
                      <div className="search-loading-msg">
                        <span className="mini-spinner" aria-hidden="true"></span>
                        Searching…
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="search-empty-msg">
                        No papers found for "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map((paper) => {
                        const id = paper.id ?? paper._id;
                        const alreadyAdded = selectedPapers.some(
                          (p) => (p.id ?? p._id) === id
                        );
                        return (
                          <div
                            key={id}
                            className="search-result-item"
                            role="option"
                            aria-selected={alreadyAdded}
                            tabIndex={0}
                            onClick={() => !alreadyAdded && addPaper(paper)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && !alreadyAdded) {
                                e.preventDefault();
                                addPaper(paper);
                              }
                            }}
                          >
                            <div className="result-icon" aria-hidden="true">
                              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.875rem', height: '0.875rem' }}>
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                              </svg>
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="result-title">{paper.title}</div>
                              <div className="result-meta">
                                {paper.authors?.length > 0 && (
                                  <span>
                                    {Array.isArray(paper.authors)
                                      ? paper.authors.slice(0, 2).join(', ') +
                                        (paper.authors.length > 2 ? ' et al.' : '')
                                      : paper.authors}
                                    {paper.year ? ` · ${paper.year}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            {alreadyAdded && (
                              <span className="result-added-badge" aria-label="Already added">
                                Added
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <div className="generate-row">
              <p className="generate-hint">
                {selectedPapers.length < 2
                  ? 'Select at least 2 papers to run a comparison.'
                  : `Comparing ${selectedPapers.length} paper${selectedPapers.length === 1 ? '' : 's'} across methods, results, and contributions.`}
              </p>
              <button
                className="generate-btn"
                onClick={() => compareMutation.mutate()}
                disabled={!canCompare}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="btn-spinner" aria-hidden="true"></span>
                    Analyzing…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '1rem', height: '1rem' }} aria-hidden="true">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Generate Comparison
                  </>
                )}
              </button>
            </div>
          </section>

          {/* Loading State */}
          {isLoading && <LoadingOverlay />}

          {/* Results */}
          {!isLoading && comparisonResult && (
            <section
              id="comparison-results"
              className="results-section"
              aria-label="Comparison results"
            >
              <div className="results-section-header">
                <h2 className="results-title">
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.125rem', height: '1.125rem', color: 'var(--primary-light)' }} aria-hidden="true">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                  Comparison Results
                </h2>
                <button
                  className="export-btn"
                  onClick={handleExport}
                  aria-label="Export comparison as PDF"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '0.875rem', height: '0.875rem' }} aria-hidden="true">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  </svg>
                  Export as PDF
                </button>
              </div>

              {/* Attribute Table */}
              {comparisonResult.attributes?.length > 0 ? (
                <ComparisonTable
                  papers={selectedPapers}
                  attributes={comparisonResult.attributes}
                />
              ) : (
                <div className="comparison-table-wrapper" aria-hidden="true">
                  <SkeletonBlock lines={6} />
                </div>
              )}

              {/* Similarities & Differences */}
              <div className="insights-grid">
                {/* Similarities */}
                <div className="insight-card">
                  <div className="insight-card-header">
                    <span className="insight-card-icon icon-green" aria-hidden="true">✓</span>
                    <span className="insight-card-title">Shared Approaches</span>
                  </div>
                  {comparisonResult.similarities?.length > 0 ? (
                    <ul className="insight-list">
                      {comparisonResult.similarities.map((item, i) => (
                        <li key={i} className="insight-item">
                          <span
                            className="insight-marker marker-green"
                            aria-label="Similarity"
                          >
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      No shared approaches identified.
                    </p>
                  )}
                </div>

                {/* Differences */}
                <div className="insight-card">
                  <div className="insight-card-header">
                    <span className="insight-card-icon icon-red" aria-label="" aria-hidden="true">✕</span>
                    <span className="insight-card-title">Key Differences</span>
                  </div>
                  {comparisonResult.differences?.length > 0 ? (
                    <ul className="insight-list">
                      {comparisonResult.differences.map((item, i) => (
                        <li key={i} className="insight-item">
                          <span
                            className="insight-marker marker-red"
                            aria-label="Difference"
                          >
                            ✕
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      No notable differences identified.
                    </p>
                  )}
                </div>
              </div>

              {/* Recommendation */}
              {comparisonResult.recommendation && (
                <div className="recommendation-card">
                  <div className="recommendation-inner">
                    <span className="recommendation-label">AI Recommendation</span>
                    <p className="recommendation-text">{comparisonResult.recommendation}</p>
                  </div>
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </>
  );
}
