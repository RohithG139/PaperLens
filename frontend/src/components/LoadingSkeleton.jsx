import React from "react";

// ─── Shared primitive ─────────────────────────────────────────────────────────

/**
 * A single shimmer block. Uses the `.shimmer` utility class defined in
 * index.css (background-size: 200% 100%, animation: shimmer 1.5s infinite)
 * and Tailwind `animate-pulse` as a fallback — both are harmless together.
 */
function Bone({ className = "", style = {} }) {
  return (
    <div
      className={`animate-pulse shimmer rounded ${className}`}
      style={{
        background: "rgba(255,255,255,0.06)",
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

// ─── PaperCardSkeleton ────────────────────────────────────────────────────────
// Mirrors the exact PaperCard structure from PaperSearch.jsx:
//   padding: 1.25rem 1.375rem | border-radius: 0.75rem
//   field badge → title (2 lines) → authors (1 line) → abstract (3 lines) → footer meta row

export function PaperCardSkeleton() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "0.75rem",
        padding: "1.25rem 1.375rem",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}
      aria-hidden="true"
      role="presentation"
    >
      {/* Field badge — top-right checkbox placeholder + left badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "0.625rem",
        }}
      >
        {/* Badge pill */}
        <Bone style={{ height: "1.125rem", width: "5.5rem", borderRadius: "9999px" }} />
        {/* Checkbox ghost */}
        <Bone style={{ width: "1.125rem", height: "1.125rem", borderRadius: "4px", flexShrink: 0 }} />
      </div>

      {/* Title — two lines */}
      <Bone style={{ height: "0.9375rem", width: "92%", marginBottom: "0.4rem" }} />
      <Bone style={{ height: "0.9375rem", width: "72%", marginBottom: "0.625rem" }} />

      {/* Authors — one truncated line */}
      <Bone style={{ height: "0.8125rem", width: "60%", marginBottom: "0.75rem" }} />

      {/* Abstract excerpt — three lines at 0.8125rem */}
      <Bone style={{ height: "0.8125rem", width: "100%", marginBottom: "0.35rem" }} />
      <Bone style={{ height: "0.8125rem", width: "97%", marginBottom: "0.35rem" }} />
      <Bone style={{ height: "0.8125rem", width: "80%", marginBottom: "0.875rem" }} />

      {/* Footer meta row: year · citations · venue */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Bone style={{ height: "0.75rem", width: "3rem" }} />
        <Bone style={{ height: "0.75rem", width: "5rem" }} />
        <Bone style={{ height: "0.75rem", width: "4rem", marginLeft: "auto" }} />
      </div>
    </div>
  );
}

// ─── DashboardSkeleton ────────────────────────────────────────────────────────
// Mirrors Dashboard.jsx layout:
//   stats row (3 cards) + recent-searches list (5 rows) + topic chips

export function DashboardSkeleton() {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* ── Greeting line ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Bone style={{ height: "1.875rem", width: "14rem" }} />
        <Bone style={{ height: "0.875rem", width: "22rem" }} />
      </div>

      {/* ── Stats row — 3 cards ── */}
      <section>
        <Bone style={{ height: "0.625rem", width: "5rem", marginBottom: "1rem" }} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "1rem",
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "0.75rem",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
              aria-hidden="true"
            >
              {/* Icon placeholder */}
              <Bone style={{ width: "1.5rem", height: "1.5rem", borderRadius: "0.25rem" }} />
              {/* Label */}
              <Bone style={{ height: "0.625rem", width: "6rem" }} />
              {/* Value */}
              <Bone style={{ height: "2rem", width: "3rem" }} />
              {/* Sub-label */}
              <Bone style={{ height: "0.625rem", width: "7rem" }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Two-column lower section ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2rem",
        }}
      >
        {/* Recent searches — 5 rows */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <Bone style={{ height: "0.625rem", width: "7rem" }} />
            <Bone style={{ height: "0.625rem", width: "3.5rem" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "0.625rem",
                  padding: "1rem 1.1rem",
                }}
                aria-hidden="true"
              >
                {/* Search icon ghost */}
                <Bone style={{ width: "1rem", height: "1rem", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <Bone style={{ height: "0.875rem", width: `${55 + (i % 3) * 12}%` }} />
                  <Bone style={{ height: "0.7rem", width: "25%" }} />
                </div>
                {/* Arrow ghost */}
                <Bone style={{ width: "1rem", height: "1rem", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </section>

        {/* Trending topic chips */}
        <section>
          <Bone style={{ height: "0.625rem", width: "6.5rem", marginBottom: "1rem" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {[92, 128, 108, 96, 116, 88, 120, 104, 92, 112].map((w, i) => (
              <Bone
                key={i}
                style={{ height: "2.25rem", width: `${w}px`, borderRadius: "9999px" }}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── ProfileSkeleton ──────────────────────────────────────────────────────────
// Mirrors Profile.jsx layout:
//   user card (avatar + name/email/date) + tab bar + list of history rows

export function ProfileSkeleton() {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 0 }}
      aria-busy="true"
      aria-label="Loading profile"
    >
      {/* ── User info card ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "1rem",
          padding: "1.75rem 2rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
        aria-hidden="true"
      >
        {/* Avatar circle */}
        <Bone
          style={{ width: "4.5rem", height: "4.5rem", borderRadius: "50%", flexShrink: 0 }}
        />

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Name */}
          <Bone style={{ height: "1.25rem", width: "40%" }} />
          {/* Email */}
          <Bone style={{ height: "0.875rem", width: "55%" }} />
          {/* Member since */}
          <Bone style={{ height: "0.75rem", width: "30%" }} />
        </div>

        {/* Provider badge ghost */}
        <Bone style={{ height: "1.625rem", width: "9rem", borderRadius: "9999px", flexShrink: 0 }} />
      </div>

      {/* ── Tab bar ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          marginBottom: "1.75rem",
        }}
        aria-hidden="true"
      >
        {[88, 80, 64].map((w, i) => (
          <Bone
            key={i}
            style={{
              height: "0.875rem",
              width: `${w}px`,
              margin: "0.75rem 1rem",
            }}
          />
        ))}
      </div>

      {/* ── History/saved list — 6 rows ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }} aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.75rem",
              padding: "0.875rem 1.1rem",
            }}
          >
            {/* Icon */}
            <Bone style={{ width: "1rem", height: "1rem", borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <Bone style={{ height: "0.875rem", width: `${45 + (i % 4) * 13}%` }} />
              <Bone style={{ height: "0.7rem", width: "20%" }} />
            </div>
            {/* Delete button ghost */}
            <Bone style={{ width: "1.875rem", height: "1.875rem", borderRadius: "0.5rem", flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
