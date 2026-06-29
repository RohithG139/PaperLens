import { useState, useRef, useEffect, useCallback } from "react";

const DEFAULT_TRENDING = [
  "large language models in drug discovery",
  "transformer attention mechanisms survey",
  "climate tipping points 2024",
  "CRISPR off-target effects review",
  "diffusion models image synthesis",
  "federated learning privacy guarantees",
  "quantum error correction codes",
  "microbiome mental health connection",
];

const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M13.5 13.5L17 17"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const ClearIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1 1L13 13M13 1L1 13"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const TrendIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="none"
    aria-hidden="true"
    style={{ flexShrink: 0, opacity: 0.55 }}
  >
    <path
      d="M1 9.5L4.5 6L7 8.5L12 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 3H12V6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Spinner = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    aria-hidden="true"
    style={{ animation: "sb-spin 0.75s linear infinite", flexShrink: 0 }}
  >
    <circle
      cx="9"
      cy="9"
      r="7"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="32"
      strokeDashoffset="10"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
);

export default function SearchBar({
  onSearch,
  loading = false,
  placeholder = "Search papers, authors, topics…",
  initialValue = "",
  suggestions: propSuggestions,
}) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  const trending = propSuggestions ?? DEFAULT_TRENDING;

  const filtered =
    value.trim().length > 0
      ? trending.filter((s) =>
          s.toLowerCase().includes(value.toLowerCase())
        )
      : trending;

  const showDropdown = open && filtered.length > 0;

  const handleSubmit = useCallback(() => {
    const q = value.trim();
    if (!q || loading) return;
    setOpen(false);
    onSearch?.(q);
  }, [value, loading, onSearch]);

  const handleKeyDown = (e) => {
    if (!showDropdown) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        const chosen = filtered[activeIndex];
        setValue(chosen);
        setOpen(false);
        setActiveIndex(-1);
        onSearch?.(chosen);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleSuggestionClick = (s) => {
    setValue(s);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
    onSearch?.(s);
  };

  const handleClear = () => {
    setValue("");
    setOpen(true);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <>
      <style>{`
        :root {
          --sb-ground: #0F1623;
          --sb-surface: #141c2b;
          --sb-surface-2: #1a2235;
          --sb-border: rgba(45, 126, 248, 0.22);
          --sb-border-hover: rgba(45, 126, 248, 0.42);
          --sb-text: #E8EDF5;
          --sb-text-muted: #7a8ba8;
          --sb-accent: #2D7EF8;
          --sb-accent-dim: rgba(45, 126, 248, 0.12);
          --sb-accent-glow: rgba(45, 126, 248, 0.35);
          --sb-radius: 12px;
          --sb-font-ui: 'Space Grotesk', 'Inter', system-ui, sans-serif;
          --sb-font-body: 'Inter', system-ui, sans-serif;
        }

        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Inter:wght@400;500&display=swap');

        @keyframes sb-spin {
          to { transform: rotate(360deg); }
        }

        @keyframes sb-scan {
          0%   { box-shadow: 0 0 0 0 var(--sb-accent-glow), 0 0 0 0 transparent; }
          50%  { box-shadow: 0 0 0 5px var(--sb-accent-glow), 0 0 20px 4px rgba(45, 126, 248, 0.12); }
          100% { box-shadow: 0 0 0 0 transparent, 0 0 0 0 transparent; }
        }

        @keyframes sb-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes sb-scan { from, to { box-shadow: 0 0 0 3px var(--sb-accent-glow); } }
          @keyframes sb-fadein { from, to { opacity: 1; transform: none; } }
          @keyframes sb-spin { to { transform: rotate(0deg); } }
        }

        .sb-wrapper {
          position: relative;
          width: 100%;
          font-family: var(--sb-font-ui);
        }

        .sb-track {
          display: flex;
          align-items: center;
          background: var(--sb-surface);
          border: 1.5px solid var(--sb-border);
          border-radius: var(--sb-radius);
          transition: border-color 0.18s ease, background 0.18s ease;
          overflow: visible;
        }

        .sb-track:hover {
          border-color: var(--sb-border-hover);
        }

        .sb-track.sb-focused {
          border-color: var(--sb-accent);
          background: #162030;
          animation: sb-scan 2s ease-in-out infinite;
        }

        .sb-icon-slot {
          display: flex;
          align-items: center;
          padding: 0 14px 0 18px;
          color: var(--sb-text-muted);
          pointer-events: none;
          flex-shrink: 0;
          transition: color 0.18s;
        }

        .sb-track.sb-focused .sb-icon-slot {
          color: var(--sb-accent);
        }

        .sb-input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--sb-text);
          font-family: var(--sb-font-body);
          font-size: 1.0625rem;
          font-weight: 400;
          line-height: 1.4;
          padding: 15px 0;
          caret-color: var(--sb-accent);
          letter-spacing: 0.01em;
        }

        .sb-input::placeholder {
          color: var(--sb-text-muted);
          font-weight: 400;
        }

        .sb-input:focus-visible {
          outline: none;
        }

        .sb-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          margin: 0 4px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: var(--sb-text-muted);
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }

        .sb-clear:hover {
          color: var(--sb-text);
          background: rgba(255, 255, 255, 0.07);
        }

        .sb-clear:focus-visible {
          outline: 2px solid var(--sb-accent);
          outline-offset: 2px;
        }

        .sb-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin: 5px;
          padding: 9px 20px;
          background: var(--sb-accent);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-family: var(--sb-font-ui);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s, transform 0.12s;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .sb-submit:hover:not(:disabled) {
          background: #4A90F5;
          transform: translateY(-1px);
        }

        .sb-submit:active:not(:disabled) {
          transform: translateY(0);
        }

        .sb-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .sb-submit:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }

        .sb-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--sb-surface);
          border: 1.5px solid var(--sb-border);
          border-radius: var(--sb-radius);
          overflow: hidden;
          z-index: 100;
          animation: sb-fadein 0.16s ease both;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .sb-dropdown-label {
          padding: 10px 16px 7px;
          font-family: var(--sb-font-ui);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--sb-text-muted);
          border-bottom: 1px solid rgba(45, 126, 248, 0.1);
        }

        .sb-list {
          list-style: none;
          margin: 0;
          padding: 4px 0;
          max-height: 280px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--sb-border) transparent;
        }

        .sb-list::-webkit-scrollbar {
          width: 4px;
        }

        .sb-list::-webkit-scrollbar-thumb {
          background: var(--sb-border);
          border-radius: 2px;
        }

        .sb-list-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          cursor: pointer;
          color: var(--sb-text);
          font-family: var(--sb-font-body);
          font-size: 0.9125rem;
          font-weight: 400;
          line-height: 1.35;
          transition: background 0.1s;
          border-radius: 0;
        }

        .sb-list-item:hover,
        .sb-list-item[aria-selected="true"] {
          background: var(--sb-accent-dim);
          color: var(--sb-text);
        }

        .sb-list-item[aria-selected="true"] .sb-suggestion-text {
          color: #7fb8ff;
        }

        .sb-suggestion-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sb-suggestion-text mark {
          background: transparent;
          color: var(--sb-accent);
          font-weight: 500;
        }
      `}</style>

      <div
        className="sb-wrapper"
        ref={containerRef}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        aria-owns="sb-listbox"
      >
        <div className={`sb-track${focused ? " sb-focused" : ""}`}>
          <span className="sb-icon-slot">
            <SearchIcon />
          </span>

          <input
            ref={inputRef}
            className="sb-input"
            type="search"
            role="searchbox"
            aria-label="Search papers"
            aria-autocomplete="list"
            aria-controls="sb-listbox"
            aria-activedescendant={
              activeIndex >= 0 ? `sb-item-${activeIndex}` : undefined
            }
            value={value}
            placeholder={placeholder}
            disabled={loading}
            autoComplete="off"
            spellCheck="false"
            onChange={(e) => {
              setValue(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
          />

          {value.length > 0 && !loading && (
            <button
              className="sb-clear"
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => {
                e.preventDefault();
                handleClear();
              }}
            >
              <ClearIcon />
            </button>
          )}

          <button
            className="sb-submit"
            type="button"
            aria-label={loading ? "Searching…" : "Search"}
            disabled={loading || !value.trim()}
            onClick={handleSubmit}
          >
            {loading ? <Spinner /> : <SearchIcon />}
            <span>{loading ? "Searching" : "Search"}</span>
          </button>
        </div>

        {showDropdown && (
          <div className="sb-dropdown" role="presentation">
            <div className="sb-dropdown-label">
              {value.trim() ? "Suggestions" : "Trending topics"}
            </div>
            <ul
              id="sb-listbox"
              ref={listRef}
              className="sb-list"
              role="listbox"
              aria-label="Search suggestions"
            >
              {filtered.map((s, i) => {
                const q = value.trim().toLowerCase();
                let display;
                if (q) {
                  const idx = s.toLowerCase().indexOf(q);
                  if (idx >= 0) {
                    display = (
                      <>
                        {s.slice(0, idx)}
                        <mark>{s.slice(idx, idx + q.length)}</mark>
                        {s.slice(idx + q.length)}
                      </>
                    );
                  } else {
                    display = s;
                  }
                } else {
                  display = s;
                }

                return (
                  <li
                    key={s}
                    id={`sb-item-${i}`}
                    className="sb-list-item"
                    role="option"
                    aria-selected={activeIndex === i}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <TrendIcon />
                    <span className="sb-suggestion-text">{display}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
