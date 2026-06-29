import React, { useRef, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ASPECT_ROWS = [
  { key: 'methodology',         label: 'Methodology'         },
  { key: 'results',             label: 'Results'             },
  { key: 'dataset_used',        label: 'Dataset Used'        },
  { key: 'performance_metrics', label: 'Performance Metrics' },
  { key: 'limitations',         label: 'Limitations'         },
  { key: 'year',                label: 'Year'                },
  { key: 'citations',           label: 'Citations'           },
];

const TRUNCATE_TITLE = 52;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/**
 * Determine whether a set of values (one per paper) should be highlighted.
 * We highlight if at least two papers have non-empty, non-identical values.
 */
function hasDifference(values) {
  const filled = values.filter((v) => v != null && String(v).trim() !== '' && v !== '—');
  if (filled.length < 2) return false;
  const normalised = filled.map((v) => String(v).trim().toLowerCase());
  return new Set(normalised).size > 1;
}

/**
 * Resolve a value from a paper object for a given aspect key.
 * Handles both the flat paper fields and a nested `comparison` payload.
 */
function resolveValue(paper, key) {
  // Direct paper field
  if (key === 'year' || key === 'citations') {
    const v = paper[key];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  // Prefer values stored inside paper.comparison (backend enrichment)
  if (paper.comparison?.[key] != null) {
    return String(paper.comparison[key]);
  }
  // Flat fallback
  if (paper[key] != null && String(paper[key]).trim() !== '') {
    return String(paper[key]);
  }
  return null;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

function buildCSV(papers, rows) {
  const headers = ['Aspect', ...papers.map((p) => p.title ?? 'Paper')];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(({ label, values }) =>
      [escape(label), ...values.map(escape)].join(',')
    ),
  ];
  return lines.join('\r\n');
}

function downloadCSV(csv, filename = 'comparison.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DiffBadge() {
  return (
    <span
      className="ct-diff-badge"
      aria-label="Values differ across papers"
      title="These values differ across papers"
    >
      differs
    </span>
  );
}

function EmptyCell() {
  return <span className="ct-na" aria-label="Not available">—</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ComparisonTable
 *
 * Props:
 *   comparisonResult — the object returned by POST /api/papers/compare.
 *   Expected shape:
 *   {
 *     papers: Paper[],          // array of paper objects (may also be top-level)
 *     attributes?: Attribute[], // optional legacy format
 *     recommendation?: string,
 *     similarities?: string[],
 *     differences?: string[],
 *   }
 *
 *   Paper objects may carry flat fields (year, citations, methodology, …)
 *   or a nested `comparison` object with those keys.
 */
export default function ComparisonTable({ comparisonResult }) {
  const tableRef = useRef(null);

  // ── Resolve paper list ──────────────────────────────────────────────────────
  const papers = comparisonResult?.papers ?? [];

  // ── Build row data ──────────────────────────────────────────────────────────
  const rows = ASPECT_ROWS.map(({ key, label }) => {
    const values = papers.map((p) => resolveValue(p, key));
    const diff = hasDifference(values);
    return { key, label, values, diff };
  });

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const csv = buildCSV(papers, rows);
    const names = papers
      .slice(0, 2)
      .map((p) => (p.title ?? 'paper').slice(0, 20).replace(/\s+/g, '_'))
      .join('_vs_');
    downloadCSV(csv, `paperlens_${names || 'comparison'}.csv`);
  }, [papers, rows]);

  // ── Guard ───────────────────────────────────────────────────────────────────
  if (!papers.length) {
    return (
      <div className="ct-empty" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="ct-empty-icon">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
        <p>No comparison data available.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ── Container ── */
        .ct-root {
          display: flex;
          flex-direction: column;
          gap: 0;
          animation: slideUp 0.35s ease forwards;
        }

        /* ── Toolbar ── */
        .ct-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          border-bottom: 1px solid var(--border);
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .ct-toolbar-label {
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ct-toolbar-label-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          flex-shrink: 0;
        }
        .ct-paper-count {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.55rem;
          border-radius: 9999px;
          background: rgba(59, 130, 246, 0.12);
          color: var(--primary-light);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .ct-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .ct-diff-legend {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .ct-diff-legend-swatch {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          background: rgba(245, 158, 11, 0.18);
          border: 1px solid rgba(245, 158, 11, 0.35);
          flex-shrink: 0;
        }
        .ct-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s;
          white-space: nowrap;
        }
        .ct-export-btn:hover {
          background: var(--surface-hover);
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .ct-export-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .ct-export-btn:active {
          transform: translateY(1px);
        }

        /* ── Scroll wrapper ── */
        .ct-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        /* ── Table ── */
        .ct-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
          font-size: 0.8125rem;
          table-layout: auto;
        }

        /* ── Head row ── */
        .ct-head-row {
          border-bottom: 1px solid var(--border);
        }

        /* ── Aspect header cell (sticky) ── */
        .ct-th-aspect {
          position: sticky;
          left: 0;
          z-index: 3;
          width: 148px;
          min-width: 120px;
          max-width: 180px;
          padding: 0.875rem 1rem;
          background: var(--background-secondary);
          text-align: left;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--text-muted);
          /* Separator shadow on the right edge */
          box-shadow: 2px 0 8px -2px rgba(0, 0, 0, 0.4);
        }

        /* ── Paper header cells ── */
        .ct-th-paper {
          padding: 0.875rem 1rem;
          text-align: left;
          min-width: 190px;
          vertical-align: top;
          background: rgba(255, 255, 255, 0.018);
          border-left: 1px solid var(--border);
        }
        .ct-paper-title {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: 0;
          text-transform: none;
          line-height: 1.35;
          margin-bottom: 0.3rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .ct-paper-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          align-items: center;
        }
        .ct-paper-year {
          font-size: 0.7rem;
          font-weight: 500;
          color: var(--primary-light);
          text-transform: none;
          letter-spacing: 0;
        }
        .ct-paper-venue {
          font-size: 0.68rem;
          color: var(--text-muted);
          text-transform: none;
          letter-spacing: 0;
        }

        /* ── Body rows ── */
        .ct-row-even .ct-td-aspect,
        .ct-row-even .ct-td-value {
          background: transparent;
        }
        .ct-row-odd .ct-td-aspect,
        .ct-row-odd .ct-td-value {
          background: rgba(255, 255, 255, 0.016);
        }
        .ct-row-diff .ct-td-value {
          background: rgba(245, 158, 11, 0.07) !important;
        }
        .ct-row-diff.ct-row-odd .ct-td-value {
          background: rgba(245, 158, 11, 0.1) !important;
        }

        /* ── Aspect (first) cell — sticky ── */
        .ct-td-aspect {
          position: sticky;
          left: 0;
          z-index: 2;
          width: 148px;
          min-width: 120px;
          max-width: 180px;
          padding: 0.75rem 1rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          vertical-align: top;
          white-space: nowrap;
          line-height: 1.4;
          /* Keep the same shadow as the sticky header */
          box-shadow: 2px 0 8px -2px rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        /* The sticky col needs its own background per row-parity to stay readable.
           We apply it inline via a data-attribute override in JS rather than
           cascading ambiguity — but CSS vars handle both cases cleanly here. */
        .ct-row-even .ct-td-aspect  { background: var(--background-secondary); }
        .ct-row-odd  .ct-td-aspect  { background: #191c29; }
        .ct-row-diff .ct-td-aspect  { background: var(--background-secondary); }
        .ct-row-diff.ct-row-odd .ct-td-aspect { background: #191c29; }

        /* diff indicator stripe on the left of aspect cell */
        .ct-row-diff .ct-td-aspect::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #f59e0b 0%, rgba(245, 158, 11, 0.3) 100%);
          border-radius: 0 2px 2px 0;
        }
        .ct-td-aspect {
          position: sticky;
          left: 0;
        }

        .ct-diff-row-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* ── Value cells ── */
        .ct-td-value {
          padding: 0.75rem 1rem;
          color: var(--text-secondary);
          vertical-align: top;
          line-height: 1.55;
          border-left: 1px solid rgba(255, 255, 255, 0.045);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          transition: background 0.15s;
        }

        /* highlight specific cells within a diff row */
        .ct-cell-diff {
          color: var(--text-primary);
        }

        /* ── Diff badge ── */
        .ct-diff-badge {
          display: inline-block;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 0.1rem 0.4rem;
          border-radius: 3px;
          background: rgba(245, 158, 11, 0.18);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
          vertical-align: middle;
          flex-shrink: 0;
          line-height: 1.4;
        }

        /* ── N/A placeholder ── */
        .ct-na {
          color: var(--text-muted);
          font-style: italic;
        }

        /* ── Empty state ── */
        .ct-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem 1.5rem;
          color: var(--text-muted);
          font-size: 0.875rem;
          text-align: center;
        }
        .ct-empty-icon {
          width: 2.5rem;
          height: 2.5rem;
          opacity: 0.35;
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ct-root { animation: none; }
        }
      `}</style>

      <div className="ct-root" role="region" aria-label="Paper comparison table">
        {/* Toolbar */}
        <div className="ct-toolbar">
          <span className="ct-toolbar-label">
            <span className="ct-toolbar-label-dot" aria-hidden="true"></span>
            Side-by-side comparison
            <span className="ct-paper-count">{papers.length} papers</span>
          </span>

          <div className="ct-toolbar-actions">
            <span className="ct-diff-legend" aria-hidden="true">
              <span className="ct-diff-legend-swatch"></span>
              highlighted rows differ
            </span>

            <button
              className="ct-export-btn"
              onClick={handleExport}
              aria-label="Export comparison as CSV"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style={{ width: '0.8125rem', height: '0.8125rem' }}>
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Scrollable table */}
        <div className="ct-scroll" tabIndex={0} aria-label="Scroll to see all paper columns">
          <table className="ct-table" ref={tableRef} aria-label="Paper comparison">
            <thead>
              <tr className="ct-head-row">
                <th scope="col" className="ct-th-aspect">Aspect</th>
                {papers.map((paper) => {
                  const id = paper.id ?? paper._id ?? paper.paperId;
                  return (
                    <th scope="col" key={id} className="ct-th-paper">
                      <span
                        className="ct-paper-title"
                        title={paper.title}
                      >
                        {truncate(paper.title, TRUNCATE_TITLE)}
                      </span>
                      <span className="ct-paper-meta">
                        {paper.year && (
                          <span className="ct-paper-year">{paper.year}</span>
                        )}
                        {paper.venue && (
                          <span className="ct-paper-venue">{paper.venue}</span>
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {rows.map(({ key, label, values, diff }, rowIdx) => {
                const isOdd = rowIdx % 2 !== 0;
                const rowClass = [
                  isOdd ? 'ct-row-odd' : 'ct-row-even',
                  diff ? 'ct-row-diff' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <tr key={key} className={rowClass}>
                    {/* Sticky aspect label */}
                    <td className="ct-td-aspect" scope="row">
                      <span className="ct-diff-row-label">
                        {label}
                        {diff && <DiffBadge />}
                      </span>
                    </td>

                    {/* Paper values */}
                    {values.map((val, colIdx) => {
                      const paper = papers[colIdx];
                      const id = paper.id ?? paper._id ?? paper.paperId;
                      return (
                        <td
                          key={id}
                          className={['ct-td-value', diff ? 'ct-cell-diff' : ''].filter(Boolean).join(' ')}
                        >
                          {val ? val : <EmptyCell />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
