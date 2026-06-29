import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getUserHistory,
  getUserSavedPapers,
  deleteHistoryItem as apiDeleteHistoryItem,
  removeSavedPaper as apiRemoveSavedPaper,
} from "../services/api";

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchSearchHistory = async (userId) => {
  const { data } = await getUserHistory(userId);
  // data = { userId, total, entries: [{id, query, searchedAt}] }
  return (data.entries || []).map((e) => ({
    id: e.id,
    query: e.query,
    createdAt: e.searchedAt,
  }));
};

const fetchSavedPapers = async (userId) => {
  const { data } = await getUserSavedPapers(userId);
  // data = { userId, total, papers: [{paperId, title, year, savedAt}] }
  return (data.papers || []).map((p) => ({
    id: p.paperId,
    paperId: p.paperId,
    title: p.title,
    year: p.year,
    authors: [],
    venue: null,
    citationCount: null,
  }));
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMemberSince(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ style = {} }) {
  return (
    <div
      className="shimmer"
      style={{ borderRadius: "0.375rem", ...style }}
    />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 80 }) {
  const [imgError, setImgError] = useState(false);
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  if (user?.picture && !imgError) {
    return (
      <img
        src={user.picture}
        alt={user.name || "Profile picture"}
        onError={() => setImgError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid rgba(59,130,246,0.4)",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--primary), var(--accent))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 700,
        color: "white",
        flexShrink: 0,
        border: "2px solid rgba(59,130,246,0.4)",
      }}
      aria-label={`Avatar for ${user?.name ?? "user"}`}
    >
      {initials}
    </div>
  );
}

// ─── User Info Card ───────────────────────────────────────────────────────────

function UserInfoCard({ user }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
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
    >
      <UserAvatar user={user} size={72} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: "0.2rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user?.name ?? "Researcher"}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            marginBottom: "0.5rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user?.email ?? ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-muted)", flexShrink: 0 }}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Member since {formatMemberSince(user?.createdAt)}
          </span>
        </div>
      </div>

      {/* Provider badge */}
      {user?.provider === "google" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "9999px",
            padding: "0.3rem 0.75rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            flexShrink: 0,
          }}
        >
          {/* Google G icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Signed in with Google
        </div>
      )}
    </motion.div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "history", label: "Search History" },
  { id: "saved", label: "Saved Papers" },
  { id: "settings", label: "Settings" },
];

function TabBar({ active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        marginBottom: "1.75rem",
        position: "relative",
      }}
      role="tablist"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            background: "none",
            border: "none",
            padding: "0.65rem 1.15rem",
            fontSize: "0.875rem",
            fontWeight: active === tab.id ? 600 : 400,
            color: active === tab.id ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer",
            position: "relative",
            transition: "color 0.2s",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            if (active !== tab.id)
              e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            if (active !== tab.id)
              e.currentTarget.style.color = "var(--text-muted)";
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = "2px solid rgba(59,130,246,0.5)";
            e.currentTarget.style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = "none";
          }}
        >
          {tab.label}
          {active === tab.id && (
            <motion.div
              layoutId="profile-tab-indicator"
              style={{
                position: "absolute",
                bottom: -1,
                left: 0,
                right: 0,
                height: 2,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                borderRadius: "2px 2px 0 0",
              }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Search History Tab ───────────────────────────────────────────────────────

function HistoryTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: history, isLoading, isError } = useQuery({
    queryKey: ["searchHistory", user?.userId],
    queryFn: () => fetchSearchHistory(user.userId),
    enabled: !!user?.userId,
    retry: false,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiDeleteHistoryItem(user.userId, id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["searchHistory"] });
      const previous = queryClient.getQueryData(["searchHistory"]);
      queryClient.setQueryData(["searchHistory"], (old) =>
        old ? old.filter((item) => (item.id ?? item._id) !== id) : old
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(["searchHistory"], context.previous);
      toast.error("Could not remove that item. Try again.");
    },
    onSuccess: () => {
      toast.success("Removed from history");
    },
  });

  function handleReSearch(query) {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <SkeletonBlock style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock style={{ height: "0.875rem", width: "60%", marginBottom: "0.4rem" }} />
              <SkeletonBlock style={{ height: "0.7rem", width: "25%" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError || !history || history.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            marginBottom: "1rem",
          }}
        >
          🔭
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "0.4rem" }}>
          No search history yet
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
          Searches you run will appear here so you can revisit them.
        </p>
        <button
          onClick={() => navigate("/search")}
          className="btn-primary"
          style={{ fontSize: "0.85rem" }}
        >
          Start searching
        </button>
      </div>
    );
  }

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
      style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      {history.map((item, idx) => {
        const id = item.id ?? item._id ?? idx;
        return (
          <motion.li
            key={id}
            layout
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "0.75rem",
                padding: "0.875rem 1.1rem",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
                e.currentTarget.style.background = "rgba(59,130,246,0.04)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              {/* Re-run button (main clickable area) */}
              <button
                onClick={() => handleReSearch(item.query)}
                aria-label={`Re-run search: ${item.query}`}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: "var(--text-muted)", flexShrink: 0 }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      margin: 0,
                    }}
                  >
                    {item.query}
                  </p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                    {item.resultCount != null ? `${item.resultCount} results · ` : ""}
                    {formatRelativeTime(item.createdAt ?? item.timestamp)}
                  </p>
                </div>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteMutation.mutate(id);
                }}
                disabled={deleteMutation.isPending && deleteMutation.variables === id}
                aria-label={`Remove "${item.query}" from history`}
                title="Remove from history"
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: "0.5rem",
                  background: "none",
                  border: "1px solid transparent",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
                  e.currentTarget.style.color = "#f87171";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.borderColor = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid rgba(59,130,246,0.5)";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none";
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

// ─── Saved Papers Tab ─────────────────────────────────────────────────────────

function PaperCardSaved({ paper, onRemove, isRemoving }) {
  const navigate = useNavigate();
  const authors = paper?.authors ?? [];
  const authorDisplay =
    authors.length > 2
      ? `${authors.slice(0, 2).join(", ")} et al.`
      : authors.join(", ");

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "0.875rem",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "default",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35), 0 0 15px rgba(168,85,247,0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Year badge */}
      {paper?.year && (
        <span
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            fontSize: "0.7rem",
            fontWeight: 600,
            color: "var(--accent-light)",
            background: "rgba(168,85,247,0.1)",
            border: "1px solid rgba(168,85,247,0.2)",
            borderRadius: "9999px",
            padding: "0.15rem 0.55rem",
          }}
        >
          {paper.year}
        </span>
      )}

      {/* Title */}
      <button
        onClick={() => navigate(`/papers/${paper.id ?? paper._id ?? paper.paperId}`)}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: "pointer",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          fontWeight: 600,
          lineHeight: 1.4,
          paddingRight: paper?.year ? "3rem" : 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--primary-light)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
      >
        {paper?.title ?? "Untitled"}
      </button>

      {/* Authors */}
      {authorDisplay && (
        <p
          style={{
            fontSize: "0.775rem",
            color: "var(--text-muted)",
            margin: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {authorDisplay}
        </p>
      )}

      {/* Venue */}
      {paper?.venue && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            fontSize: "0.72rem",
            fontWeight: 500,
            color: "var(--primary-light)",
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.18)",
            borderRadius: "9999px",
            padding: "0.15rem 0.55rem",
            alignSelf: "flex-start",
          }}
        >
          {paper.venue}
        </span>
      )}

      {/* Citation count */}
      {paper?.citationCount != null && (
        <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
          {paper.citationCount.toLocaleString()} citations
        </p>
      )}

      {/* Remove button */}
      <button
        onClick={() => onRemove(paper.id ?? paper._id ?? paper.paperId)}
        disabled={isRemoving}
        style={{
          marginTop: "auto",
          background: isRemoving ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "0.5rem",
          color: "#f87171",
          fontSize: "0.78rem",
          fontWeight: 500,
          padding: "0.45rem 0.875rem",
          cursor: isRemoving ? "not-allowed" : "pointer",
          transition: "background 0.15s, border-color 0.15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.4rem",
          outline: "none",
          opacity: isRemoving ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isRemoving) {
            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(239,68,68,0.08)";
          e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)";
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = "2px solid rgba(59,130,246,0.5)";
          e.currentTarget.style.outlineOffset = "2px";
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = "none";
        }}
        aria-label={`Remove "${paper?.title ?? "paper"}" from saved`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {isRemoving ? "Removing…" : "Remove from saved"}
      </button>
    </div>
  );
}

function SavedPapersTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: savedPapers, isLoading, isError } = useQuery({
    queryKey: ["savedPapers", user?.userId],
    queryFn: () => fetchSavedPapers(user.userId),
    enabled: !!user?.userId,
    retry: false,
    staleTime: 2 * 60_000,
  });

  const [removingIds, setRemovingIds] = useState(new Set());

  const removeMutation = useMutation({
    mutationFn: (paperId) => apiRemoveSavedPaper(user.userId, paperId),
    onMutate: async (paperId) => {
      setRemovingIds((prev) => new Set(prev).add(paperId));
      await queryClient.cancelQueries({ queryKey: ["savedPapers"] });
      const previous = queryClient.getQueryData(["savedPapers"]);
      queryClient.setQueryData(["savedPapers"], (old) =>
        old ? old.filter((p) => (p.id ?? p._id ?? p.paperId) !== paperId) : old
      );
      return { previous };
    },
    onError: (_err, paperId, context) => {
      queryClient.setQueryData(["savedPapers"], context.previous);
      toast.error("Could not remove that paper. Try again.");
    },
    onSuccess: () => {
      toast.success("Removed from your library");
    },
    onSettled: (_data, _err, paperId) => {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(paperId);
        return next;
      });
    },
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "0.875rem",
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              minHeight: 160,
            }}
          >
            <SkeletonBlock style={{ height: "1rem", width: "80%" }} />
            <SkeletonBlock style={{ height: "0.75rem", width: "55%" }} />
            <SkeletonBlock style={{ height: "0.75rem", width: "40%", marginTop: "auto" }} />
          </div>
        ))}
      </div>
    );
  }

  if (isError || !savedPapers || savedPapers.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            marginBottom: "1rem",
          }}
        >
          📄
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "0.4rem" }}>
          Your library is empty
        </p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Save papers from search results to find them here.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1rem",
      }}
    >
      {savedPapers.map((paper) => {
        const pid = paper.id ?? paper._id ?? paper.paperId;
        return (
          <PaperCardSaved
            key={pid}
            paper={paper}
            onRemove={(id) => removeMutation.mutate(id)}
            isRemoving={removingIds.has(pid)}
          />
        );
      })}
    </motion.div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ user }) {
  const { logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const preferenceGroups = [
    {
      label: "Notifications",
      description: "Control email updates about new papers matching your saved topics.",
      control: (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "9999px",
            padding: "0.2rem 0.65rem",
          }}
        >
          Coming soon
        </span>
      ),
    },
    {
      label: "Default search field",
      description: "Choose whether searches look across title, abstract, or full text by default.",
      control: (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "9999px",
            padding: "0.2rem 0.65rem",
          }}
        >
          Coming soon
        </span>
      ),
    },
    {
      label: "Results per page",
      description: "Set how many papers appear per search results page.",
      control: (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "9999px",
            padding: "0.2rem 0.65rem",
          }}
        >
          Coming soon
        </span>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
      style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 560 }}
    >
      {/* Preferences section */}
      <section>
        <h2
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "0.875rem",
          }}
        >
          Preferences
        </h2>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.875rem",
            overflow: "hidden",
          }}
        >
          {preferenceGroups.map((pref, idx) => (
            <div
              key={pref.label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem 1.25rem",
                borderBottom:
                  idx < preferenceGroups.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
              }}
            >
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                  {pref.label}
                </p>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                  {pref.description}
                </p>
              </div>
              {pref.control}
            </div>
          ))}
        </div>
      </section>

      {/* Account section */}
      <section>
        <h2
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "0.875rem",
          }}
        >
          Account
        </h2>
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.875rem",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                Email address
              </p>
              <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                {user?.email ?? "—"}
              </p>
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "9999px",
                padding: "0.2rem 0.65rem",
              }}
            >
              Managed by Google
            </span>
          </div>

          {/* Sign out row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
            }}
          >
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
                Sign out
              </p>
              <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                You will be redirected to the login page.
              </p>
            </div>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "0.5rem",
                  color: "#f87171",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  padding: "0.5rem 1.1rem",
                  cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
                  outline: "none",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.18)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 12px rgba(239,68,68,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(239,68,68,0.1)";
                  e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = "2px solid rgba(239,68,68,0.5)";
                  e.currentTarget.style.outlineOffset = "2px";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = "none";
                }}
              >
                Sign out
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Are you sure?</span>
                <button
                  onClick={logout}
                  style={{
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "white",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    padding: "0.45rem 0.9rem",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    outline: "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#dc2626"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#ef4444"; }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = "2px solid rgba(239,68,68,0.5)";
                    e.currentTarget.style.outlineOffset = "2px";
                  }}
                  onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
                >
                  Yes, sign out
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-ghost"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.8rem" }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("history");

  // Redirect if not authenticated
  if (!loading && !user) {
    navigate("/login", { replace: true });
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        paddingBottom: "4rem",
      }}
    >
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem 0",
        }}
      >
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: "0 0 1.5rem",
            transition: "color 0.2s",
            outline: "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
          onFocus={(e) => {
            e.currentTarget.style.outline = "2px solid rgba(59,130,246,0.5)";
            e.currentTarget.style.outlineOffset = "2px";
          }}
          onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>

        {/* User info card */}
        {loading ? (
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
            }}
          >
            <SkeletonBlock style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBlock style={{ height: "1.25rem", width: "40%", marginBottom: "0.5rem" }} />
              <SkeletonBlock style={{ height: "0.875rem", width: "55%", marginBottom: "0.5rem" }} />
              <SkeletonBlock style={{ height: "0.75rem", width: "30%" }} />
            </div>
          </div>
        ) : (
          <UserInfoCard user={user} />
        )}

        {/* Tabs */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab panels */}
        <AnimatePresence mode="wait">
          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <HistoryTab />
            </motion.div>
          )}
          {activeTab === "saved" && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <SavedPapersTab />
            </motion.div>
          )}
          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
            >
              <SettingsTab user={user} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
