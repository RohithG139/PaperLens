import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const AGENTS = [
  {
    id: "planner",
    label: "Planner",
    role: "Decomposes the query into a research strategy",
    icon: "P",
  },
  {
    id: "researcher",
    label: "Researcher",
    role: "Retrieves and ranks relevant papers",
    icon: "R",
  },
  {
    id: "summarizer",
    label: "Summarizer",
    role: "Distills findings from each paper",
    icon: "S",
  },
  {
    id: "comparator",
    label: "Comparator",
    role: "Cross-examines claims and methodologies",
    icon: "C",
  },
  {
    id: "qa",
    label: "QA",
    role: "Verifies answer quality and citations",
    icon: "Q",
  },
];

const STATUS = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
};

function runAgentWorkflow(query, userId, onUpdate, onComplete, onError) {
  const delays = [700, 1600, 2200, 1400, 1000];
  let step = 0;
  let animDone = false;
  let apiResult = null;
  let failed = false;

  function checkComplete() {
    if (animDone && apiResult && !failed) {
      onComplete(apiResult);
    }
  }

  function runNext() {
    if (step >= AGENTS.length) {
      animDone = true;
      checkComplete();
      return;
    }
    const agentId = AGENTS[step].id;
    onUpdate(agentId, STATUS.running, null);
    const currentStep = step;
    setTimeout(() => {
      if (failed) return;
      onUpdate(agentId, STATUS.completed, `${AGENTS[currentStep].label} step completed.`);
      step++;
      setTimeout(runNext, 180);
    }, delays[currentStep]);
  }

  runNext();

  api.post("/agents/run", { query, userId })
    .then((response) => {
      const data = response.data;
      const papers = (data.papers || []).map((p) => ({
        title: p.title || "Untitled",
        authors: (p.authors || [])
          .map((a) => (typeof a === "string" ? a : a.name))
          .slice(0, 3)
          .join(", "),
        year: p.year || "—",
        venue: (p.fieldsOfStudy || [])[0] || "",
        citations: p.citationCount || 0,
        relevance: p.relevanceScore || 0,
      }));
      apiResult = {
        papers,
        finalAnswer:
          data.answer ||
          `Found ${papers.length} paper${papers.length !== 1 ? "s" : ""} for "${query}". Review the results above for detailed findings.`,
      };
      checkComplete();
    })
    .catch((err) => {
      failed = true;
      onError(err.response?.data?.detail || "Workflow failed. Please try again.");
    });
}

function StatusDot({ status }) {
  const map = {
    pending: { color: "#4A5568", label: "Pending" },
    running: { color: "#4A90D9", label: "Running", pulse: true },
    completed: { color: "#5BAD8A", label: "Completed" },
    failed: { color: "#C05A5A", label: "Failed" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      className={`status-dot status-dot--${status}`}
      title={s.label}
      aria-label={s.label}
    />
  );
}

function AgentStep({ agent, status, output, expanded, onToggle, isLast }) {
  const hasOutput = output && output.length > 0;
  return (
    <div className={`agent-step agent-step--${status}`}>
      <div className="agent-step__track">
        <div className="agent-step__node">
          <span className="agent-step__glyph">{agent.icon}</span>
          <StatusDot status={status} />
        </div>
        {!isLast && <div className="agent-step__line" />}
      </div>
      <div className="agent-step__body">
        <button
          className="agent-step__header"
          onClick={hasOutput ? onToggle : undefined}
          aria-expanded={expanded}
          disabled={!hasOutput}
        >
          <span className="agent-step__name">{agent.label}</span>
          <span className="agent-step__role">{agent.role}</span>
          <span className="agent-step__status-label">
            {status === STATUS.running && (
              <span className="running-label">processing</span>
            )}
            {status === STATUS.completed && (
              <span className="completed-label">done</span>
            )}
            {status === STATUS.failed && (
              <span className="failed-label">failed</span>
            )}
            {hasOutput && (
              <span className="toggle-chevron">{expanded ? "▲" : "▼"}</span>
            )}
          </span>
        </button>
        {expanded && hasOutput && (
          <div className="agent-step__output">
            <pre className="agent-output-text">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-bar__fill" style={{ width: `${value}%` }} />
    </div>
  );
}

function PaperCard({ paper }) {
  return (
    <div className="paper-card">
      <div className="paper-card__relevance">
        {Math.round(paper.relevance * 100)}% match
      </div>
      <div className="paper-card__title">{paper.title}</div>
      <div className="paper-card__meta">
        <span className="paper-card__authors">{paper.authors}</span>
        <span className="paper-card__dot">·</span>
        <span className="paper-card__year">{paper.year}</span>
        <span className="paper-card__dot">·</span>
        <span className="paper-card__venue">{paper.venue}</span>
      </div>
      <div className="paper-card__citations">
        {paper.citations.toLocaleString()} citations
      </div>
    </div>
  );
}

function ComparisonTable({ rows }) {
  if (!rows || rows.length === 0) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="comparison-table-wrapper">
      <table className="comparison-table">
        <thead>
          <tr>
            {cols.map((col) => (
              <th key={col}>{col.charAt(0).toUpperCase() + col.slice(1)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {cols.map((col) => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AgentExecution() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [agentStates, setAgentStates] = useState(
    Object.fromEntries(
      AGENTS.map((a) => [a.id, { status: STATUS.pending, output: null }])
    )
  );
  const [expandedAgents, setExpandedAgents] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [hasRun, setHasRun] = useState(false);
  const progressRef = useRef(null);
  const resultsRef = useRef(null);

  const completedCount = Object.values(agentStates).filter(
    (s) => s.status === STATUS.completed
  ).length;

  useEffect(() => {
    if (isRunning) {
      const total = AGENTS.length;
      setProgress(Math.round((completedCount / total) * 100));
    }
  }, [completedCount, isRunning]);

  const handleUpdate = useCallback((agentId, status, output) => {
    setAgentStates((prev) => ({
      ...prev,
      [agentId]: { status, output },
    }));
    if (status === STATUS.completed) {
      setExpandedAgents((prev) => ({ ...prev, [agentId]: true }));
    }
  }, []);

  const handleComplete = useCallback((data) => {
    setIsRunning(false);
    setProgress(100);
    setResults(data);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }, []);

  const handleError = useCallback((msg) => {
    setIsRunning(false);
    setError(msg);
  }, []);

  const handleRun = () => {
    if (!query.trim() || isRunning) return;
    setError(null);
    setResults(null);
    setHasRun(true);
    setProgress(0);
    setExpandedAgents({});
    setAgentStates(
      Object.fromEntries(
        AGENTS.map((a) => [a.id, { status: STATUS.pending, output: null }])
      )
    );
    setIsRunning(true);
    runAgentWorkflow(query, user?.userId, handleUpdate, handleComplete, handleError);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
  };

  const toggleAgent = (id) => {
    setExpandedAgents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <style>{`
        :root {
          --ground: #0F1824;
          --surface: #162032;
          --surface-2: #1E2D42;
          --border: #263348;
          --text: #E8DFC8;
          --text-muted: #8A9BB0;
          --text-dim: #4A5C72;
          --accent: #D4A843;
          --accent-dim: rgba(212, 168, 67, 0.12);
          --accent-2: #4A90D9;
          --accent-2-dim: rgba(74, 144, 217, 0.12);
          --status-green: #5BAD8A;
          --status-red: #C05A5A;
          --status-red-dim: rgba(192, 90, 90, 0.12);
          --track-width: 2px;
          --node-size: 40px;
          --font-display: "DM Sans", system-ui, sans-serif;
          --font-body: Georgia, "Times New Roman", serif;
          --font-mono: "DM Mono", "Fira Mono", "Consolas", monospace;
          --radius: 4px;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--ground);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.65;
          min-height: 100vh;
        }

        .page {
          max-width: 860px;
          margin: 0 auto;
          padding: 56px 24px 96px;
        }

        /* Header */
        .page-header {
          margin-bottom: 48px;
        }
        .page-eyebrow {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          margin-bottom: 10px;
        }
        .page-title {
          font-family: var(--font-display);
          font-size: clamp(26px, 4vw, 38px);
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text);
          line-height: 1.15;
          margin-bottom: 10px;
        }
        .page-subtitle {
          font-family: var(--font-body);
          font-size: 15px;
          color: var(--text-muted);
          max-width: 560px;
        }

        /* Query Input */
        .query-section {
          margin-bottom: 40px;
        }
        .query-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .query-label {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .query-input-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .query-textarea {
          flex: 1;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          color: var(--text);
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.55;
          padding: 14px 16px;
          resize: vertical;
          min-height: 72px;
          transition: border-color 0.15s;
          outline: none;
        }
        .query-textarea::placeholder {
          color: var(--text-dim);
          font-style: italic;
        }
        .query-textarea:focus {
          border-color: var(--accent-2);
          box-shadow: 0 0 0 3px rgba(74, 144, 217, 0.15);
        }
        .run-button {
          flex-shrink: 0;
          background: var(--accent);
          border: none;
          border-radius: var(--radius);
          color: #0F1824;
          cursor: pointer;
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 14px 22px;
          white-space: nowrap;
          transition: background 0.15s, opacity 0.15s;
          align-self: flex-end;
          min-height: 48px;
        }
        .run-button:hover:not(:disabled) {
          background: #e0b84f;
        }
        .run-button:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 3px;
        }
        .run-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .query-hint {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
        }

        /* Progress Bar */
        .progress-section {
          margin-bottom: 36px;
        }
        .progress-meta {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 6px;
        }
        .progress-label {
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
        }
        .progress-pct {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--accent);
        }
        .progress-bar {
          height: 3px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
        }
        .progress-bar__fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-2), var(--accent));
          border-radius: 2px;
          transition: width 0.4s ease;
        }

        /* Error */
        .error-banner {
          background: var(--status-red-dim);
          border: 1px solid rgba(192, 90, 90, 0.35);
          border-radius: var(--radius);
          color: #e8a0a0;
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 14px 18px;
          margin-bottom: 32px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .error-icon { flex-shrink: 0; margin-top: 1px; }

        /* Agent Timeline */
        .timeline-section {
          margin-bottom: 56px;
        }
        .section-heading {
          font-family: var(--font-display);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 28px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }
        .timeline {
          display: flex;
          flex-direction: column;
        }

        /* Agent Step */
        .agent-step {
          display: flex;
          gap: 0;
          min-height: 56px;
        }
        .agent-step__track {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: var(--node-size);
          flex-shrink: 0;
          padding-top: 8px;
        }
        .agent-step__node {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--surface);
          border: 1.5px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: border-color 0.2s, background 0.2s;
        }
        .agent-step--running .agent-step__node {
          border-color: var(--accent-2);
          background: var(--accent-2-dim);
        }
        .agent-step--completed .agent-step__node {
          border-color: var(--status-green);
          background: rgba(91, 173, 138, 0.1);
        }
        .agent-step--failed .agent-step__node {
          border-color: var(--status-red);
          background: var(--status-red-dim);
        }
        .agent-step__glyph {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 700;
          color: var(--text-dim);
        }
        .agent-step--running .agent-step__glyph { color: var(--accent-2); }
        .agent-step--completed .agent-step__glyph { color: var(--status-green); }
        .agent-step--failed .agent-step__glyph { color: var(--status-red); }

        .agent-step__line {
          width: var(--track-width);
          flex: 1;
          min-height: 20px;
          background: var(--border);
          margin: 4px 0;
          border-radius: 1px;
        }
        .agent-step--completed .agent-step__line {
          background: var(--status-green);
          opacity: 0.4;
        }

        .agent-step__body {
          flex: 1;
          padding: 6px 0 20px 16px;
        }
        .agent-step__header {
          width: 100%;
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 4px 0;
          text-align: left;
        }
        .agent-step__header:disabled { cursor: default; }
        .agent-step__header:focus-visible {
          outline: 2px solid var(--accent-2);
          outline-offset: 2px;
          border-radius: 2px;
        }
        .agent-step__name {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.01em;
          flex-shrink: 0;
        }
        .agent-step__role {
          font-family: var(--font-body);
          font-size: 13px;
          color: var(--text-muted);
          font-style: italic;
          flex: 1;
        }
        .agent-step__status-label {
          font-family: var(--font-mono);
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .running-label { color: var(--accent-2); }
        .completed-label { color: var(--status-green); }
        .failed-label { color: var(--status-red); }
        .toggle-chevron { color: var(--text-dim); font-size: 10px; }

        .agent-step__output {
          margin-top: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-left: 3px solid var(--accent);
          border-radius: 0 var(--radius) var(--radius) 0;
          padding: 14px 16px;
        }
        .agent-step--failed .agent-step__output {
          border-left-color: var(--status-red);
        }
        .agent-output-text {
          font-family: var(--font-mono);
          font-size: 12.5px;
          line-height: 1.7;
          color: var(--text-muted);
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* Status Dot */
        .status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--ground);
        }
        .status-dot--pending { background: #4A5568; }
        .status-dot--running {
          background: var(--accent-2);
          animation: pulse 1.2s infinite;
        }
        .status-dot--completed { background: var(--status-green); }
        .status-dot--failed { background: var(--status-red); }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 217, 0.5); }
          50% { box-shadow: 0 0 0 5px rgba(74, 144, 217, 0); }
        }

        /* Results Section */
        .results-section {
          border-top: 1px solid var(--border);
          padding-top: 48px;
        }
        .results-header {
          margin-bottom: 36px;
        }
        .results-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }
        .results-meta {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
        }

        .results-block {
          margin-bottom: 44px;
        }
        .results-block-label {
          font-family: var(--font-mono);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--accent);
          margin-bottom: 16px;
        }

        /* Papers */
        .papers-grid {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .paper-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 16px 18px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px 12px;
          transition: border-color 0.15s;
        }
        .paper-card:hover { border-color: #3A4E66; }
        .paper-card__relevance {
          grid-column: 2;
          grid-row: 1 / 3;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--accent);
          align-self: start;
          margin-top: 2px;
          text-align: right;
          white-space: nowrap;
        }
        .paper-card__title {
          font-family: var(--font-body);
          font-size: 14px;
          font-style: italic;
          color: var(--text);
          grid-column: 1;
          grid-row: 1;
        }
        .paper-card__meta {
          grid-column: 1;
          grid-row: 2;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .paper-card__authors,
        .paper-card__year,
        .paper-card__venue {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .paper-card__dot { color: var(--text-dim); }
        .paper-card__citations {
          grid-column: 1 / 3;
          grid-row: 3;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 4px;
        }

        /* Comparison Table */
        .comparison-table-wrapper {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: var(--radius);
        }
        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--font-mono);
          font-size: 12.5px;
        }
        .comparison-table th {
          background: var(--surface-2);
          color: var(--text-muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 11px 14px;
          text-align: left;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        .comparison-table td {
          padding: 11px 14px;
          color: var(--text);
          border-bottom: 1px solid var(--border);
          vertical-align: top;
        }
        .comparison-table tr:last-child td {
          border-bottom: none;
        }
        .comparison-table tbody tr:hover td {
          background: rgba(255,255,255,0.025);
        }

        /* Final Answer */
        .final-answer {
          background: var(--accent-dim);
          border: 1px solid rgba(212, 168, 67, 0.25);
          border-radius: var(--radius);
          padding: 24px 28px;
        }
        .final-answer__text {
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.75;
          color: var(--text);
        }

        @media (prefers-reduced-motion: reduce) {
          .status-dot--running { animation: none; }
          .progress-bar__fill { transition: none; }
          * { transition: none !important; }
        }

        @media (max-width: 600px) {
          .query-input-row { flex-direction: column; }
          .run-button { width: 100%; }
          .agent-step__role { display: none; }
          .page { padding: 32px 16px 64px; }
        }
      `}</style>

      <div className="page">
        <header className="page-header">
          <div className="page-eyebrow">PaperLens AI</div>
          <h1 className="page-title">Agent Workflow</h1>
          <p className="page-subtitle">
            Five specialized agents work in sequence — planning, retrieving, summarizing,
            comparing, and verifying — to answer research questions from the literature.
          </p>
        </header>

        <section className="query-section" aria-label="Research query">
          <div className="query-form">
            <label className="query-label" htmlFor="query-input">
              Research question
            </label>
            <div className="query-input-row">
              <textarea
                id="query-input"
                className="query-textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. How do large language models achieve in-context learning?"
                disabled={isRunning}
                rows={3}
                aria-label="Enter your research question"
              />
              <button
                className="run-button"
                onClick={handleRun}
                disabled={!query.trim() || isRunning}
                aria-label="Run agent workflow"
              >
                {isRunning ? "Running…" : "Run Agents"}
              </button>
            </div>
            <span className="query-hint">
              Tip: press Ctrl+Enter to run
            </span>
          </div>
        </section>

        {hasRun && (
          <section className="progress-section" aria-label="Execution progress">
            <div className="progress-meta">
              <span className="progress-label">
                {isRunning ? "Executing" : progress === 100 ? "Complete" : "Halted"}
              </span>
              <span className="progress-pct">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </section>
        )}

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">x</span>
            <span>{error}</span>
          </div>
        )}

        {hasRun && (
          <section className="timeline-section" aria-label="Agent execution timeline">
            <h2 className="section-heading">Execution trace</h2>
            <div className="timeline">
              {AGENTS.map((agent, i) => {
                const state = agentStates[agent.id];
                return (
                  <AgentStep
                    key={agent.id}
                    agent={agent}
                    status={state.status}
                    output={state.output}
                    expanded={!!expandedAgents[agent.id]}
                    onToggle={() => toggleAgent(agent.id)}
                    isLast={i === AGENTS.length - 1}
                  />
                );
              })}
            </div>
          </section>
        )}

        {results && (
          <section
            className="results-section"
            aria-label="Workflow results"
            ref={resultsRef}
          >
            <div className="results-header">
              <h2 className="results-title">Results</h2>
              <span className="results-meta">
                {results.papers.length} papers · workflow completed
              </span>
            </div>

            <div className="results-block">
              <div className="results-block-label">
                Papers found — {results.papers.length}
              </div>
              <div className="papers-grid">
                {results.papers.map((paper, i) => (
                  <PaperCard key={i} paper={paper} />
                ))}
              </div>
            </div>

            {results.comparisonRows && results.comparisonRows.length > 0 && (
              <div className="results-block">
                <div className="results-block-label">Methodology comparison</div>
                <ComparisonTable rows={results.comparisonRows} />
              </div>
            )}

            {results.finalAnswer && (
              <div className="results-block">
                <div className="results-block-label">Verified answer</div>
                <div className="final-answer">
                  <p className="final-answer__text">{results.finalAnswer}</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </>
  );
}
