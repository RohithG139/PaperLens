import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  getPaperDetails,
  getPaperSummary,
  savePaper as apiSavePaper,
  removeSavedPaper,
  runAgentWorkflow as apiRunAgent,
} from "../services/api";

// ─── API helpers ─────────────────────────────────────────────────────────────

const fetchPaper = (paperId) =>
  getPaperDetails(paperId).then((r) => r.data);

const fetchSummary = (paperId) =>
  getPaperSummary(paperId).then((r) => r.data);

const askAgent = ({ question, paperTitle, userId }) =>
  apiRunAgent(paperTitle || "research paper", userId, question).then((r) => r.data);

// ─── Minimal Markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text) {
  if (!text) return "";
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Ordered list items
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*?<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)
    // Paragraphs from double newlines
    .replace(/\n\n/g, "</p><p>")
    // Single newlines as <br>
    .replace(/\n/g, "<br />")
    // Wrap root text in <p> if not already
    .replace(/^(?!<[h|u|o|p|l])(.+)/gm, (m) =>
      m.startsWith("<") ? m : `<p>${m}</p>`
    );
}

function MarkdownBlock({ content, className = "" }) {
  return (
    <div
      className={`md-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function SkeletonLine({ width = "100%", height = "1rem" }) {
  return (
    <div
      className="shimmer"
      style={{
        width,
        height,
        borderRadius: "0.375rem",
        marginBottom: "0.5rem",
      }}
    />
  );
}

function PaperSkeleton() {
  return (
    <div style={{ padding: "2rem 0" }}>
      <SkeletonLine width="70%" height="2rem" />
      <SkeletonLine width="40%" height="1rem" />
      <SkeletonLine width="55%" height="1rem" />
      <div style={{ marginTop: "1.5rem" }}>
        <SkeletonLine width="100%" />
        <SkeletonLine width="95%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="80%" />
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaBadge({ children, color = "blue" }) {
  const colors = {
    blue: {
      background: "rgba(59,130,246,0.12)",
      color: "var(--primary-light)",
      border: "1px solid rgba(59,130,246,0.25)",
    },
    purple: {
      background: "rgba(168,85,247,0.12)",
      color: "var(--accent-light)",
      border: "1px solid rgba(168,85,247,0.25)",
    },
    green: {
      background: "rgba(34,197,94,0.12)",
      color: "#4ade80",
      border: "1px solid rgba(34,197,94,0.25)",
    },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 500,
        ...colors[color],
      }}
    >
      {children}
    </span>
  );
}

function SummarySection({ icon, label, content }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "0.75rem",
        padding: "1.25rem 1.5rem",
        marginBottom: "0.875rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
      </div>
      <MarkdownBlock content={content} />
    </div>
  );
}

function ThinkingDots() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.75rem 1rem",
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--primary-light)",
            display: "block",
          }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
      <span
        style={{
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          marginLeft: "0.35rem",
        }}
      >
        Thinking…
      </span>
    </div>
  );
}

function ChatMessage({ message }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "1rem",
      }}
    >
      {!isUser && (
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
            marginRight: "0.625rem",
            marginTop: "0.1rem",
          }}
        >
          AI
        </div>
      )}
      <div
        style={{
          maxWidth: "82%",
          padding: isUser ? "0.6rem 1rem" : "0.75rem 1rem",
          borderRadius: isUser
            ? "1rem 1rem 0.25rem 1rem"
            : "0.25rem 1rem 1rem 1rem",
          background: isUser
            ? "linear-gradient(135deg, var(--primary), var(--accent))"
            : "rgba(255,255,255,0.06)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.09)",
          fontSize: "0.9rem",
          lineHeight: 1.65,
          color: "var(--text-primary)",
        }}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <MarkdownBlock content={message.content} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Tab content panels ───────────────────────────────────────────────────────

function SummaryTab({ paperId }) {
  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["summary", paperId],
    queryFn: () => fetchSummary(paperId),
    enabled: !!paperId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div style={{ padding: "1rem 0" }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.75rem",
              padding: "1.25rem 1.5rem",
              marginBottom: "0.875rem",
            }}
          >
            <SkeletonLine width="30%" height="0.9rem" />
            <SkeletonLine width="100%" />
            <SkeletonLine width="88%" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem 1rem",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠</div>
        <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
          Could not generate summary. The paper may not be indexed yet.
        </p>
        <button className="btn-ghost" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  const sections = [
    { icon: "🎯", label: "Problem", key: "problem" },
    { icon: "⚙️", label: "Methodology", key: "methodology" },
    { icon: "📊", label: "Results", key: "results" },
    { icon: "✅", label: "Advantages", key: "advantages" },
    { icon: "⚡", label: "Limitations", key: "limitations" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ paddingTop: "0.5rem" }}
    >
      {sections.map(({ icon, label, key }) =>
        summary?.[key] ? (
          <SummarySection
            key={key}
            icon={icon}
            label={label}
            content={summary[key]}
          />
        ) : null
      )}
      {!summary ||
        (Object.values(summary).every((v) => !v) && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-muted)",
            }}
          >
            No summary available for this paper yet.
          </div>
        ))}
    </motion.div>
  );
}

function AskTab({ paperId, paperTitle, userId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `I've read this paper. Ask me anything about it — its methods, results, how it compares to related work, or how to apply its findings.`,
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const askMutation = useMutation({
    mutationFn: askAgent,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || data.response || "I couldn't find a specific answer. Try rephrasing your question." },
      ]);
    },
    onError: () => {
      toast.error("Something went wrong. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I ran into a problem retrieving that answer. Please try rephrasing your question.",
        },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, askMutation.isPending]);

  const handleSend = useCallback(() => {
    const question = input.trim();
    if (!question || askMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    askMutation.mutate({ question, paperId, paperTitle, userId });
  }, [input, paperId, askMutation]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "What problem does this paper solve?",
    "How does the methodology work?",
    "What are the key limitations?",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "520px",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "0.25rem",
          paddingTop: "0.5rem",
        }}
      >
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {askMutation.isPending && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, var(--primary), var(--accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
                marginRight: "0.625rem",
                marginTop: "0.1rem",
              }}
            >
              AI
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "0.25rem 1rem 1rem 1rem",
              }}
            >
              <ThinkingDots />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — only before first user message */}
      {messages.length === 1 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            padding: "0.75rem 0 0.5rem",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => {
                setInput(s);
                inputRef.current?.focus();
              }}
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: "9999px",
                color: "var(--primary-light)",
                fontSize: "0.75rem",
                padding: "0.3rem 0.8rem",
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.16)";
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59,130,246,0.08)";
                e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div
        style={{
          display: "flex",
          gap: "0.625rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          marginTop: "0.5rem",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this paper…"
          rows={1}
          disabled={askMutation.isPending}
          style={{
            flex: 1,
            resize: "none",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.625rem",
            color: "var(--text-primary)",
            padding: "0.65rem 1rem",
            fontSize: "0.9rem",
            lineHeight: 1.5,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow =
              "0 0 0 3px rgba(59,130,246,0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || askMutation.isPending}
          aria-label="Send question"
          style={{
            width: 42,
            height: 42,
            borderRadius: "0.625rem",
            border: "none",
            background:
              !input.trim() || askMutation.isPending
                ? "rgba(59,130,246,0.25)"
                : "linear-gradient(135deg, var(--primary), var(--accent))",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:
              !input.trim() || askMutation.isPending
                ? "not-allowed"
                : "pointer",
            flexShrink: 0,
            alignSelf: "flex-end",
            transition: "background 0.2s, transform 0.15s",
          }}
          onMouseEnter={(e) => {
            if (input.trim() && !askMutation.isPending) {
              e.currentTarget.style.transform = "scale(1.06)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

function ReferencesTab({ paper }) {
  const refs = paper?.references || [];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{ paddingTop: "0.5rem" }}
    >
      {refs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            color: "var(--text-muted)",
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
              fontSize: "1.5rem",
              margin: "0 auto 1rem",
            }}
          >
            📄
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            References are not available for this paper yet.
          </p>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.8rem",
              marginTop: "0.4rem",
            }}
          >
            Check the original PDF for the full bibliography.
          </p>
        </div>
      ) : (
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {refs.map((ref, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "0.875rem 1rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "0.625rem",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  marginTop: "0.15rem",
                  minWidth: "1.5rem",
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--primary-light)",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {ref.title || ref.text || ref}
                  </a>
                ) : (
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {ref.title || ref.text || ref}
                  </span>
                )}
                {ref.authors && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {ref.authors} {ref.year ? `· ${ref.year}` : ""}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "summary", label: "AI Summary" },
  { id: "ask", label: "Ask Questions" },
  { id: "references", label: "References" },
];

export default function PaperDetail() {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("summary");
  const [saved, setSaved] = useState(false);

  const {
    data: paper,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["paper", paperId],
    queryFn: () => fetchPaper(paperId),
    enabled: !!paperId,
    onSuccess: (data) => {
      if (data?.isSaved !== undefined) setSaved(data.isSaved);
    },
  });

  useEffect(() => {
    if (paper?.isSaved !== undefined) {
      setSaved(paper.isSaved);
    }
  }, [paper]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saved
        ? removeSavedPaper(user?.userId, paperId)
        : apiSavePaper(user?.userId, paperId),
    onMutate: () => setSaved((s) => !s),
    onSuccess: () => {
      toast.success(saved ? "Removed from library" : "Saved to your library");
    },
    onError: () => {
      setSaved((s) => !s);
      toast.error("Could not update your library. Try again.");
    },
  });

  if (isError) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          color: "var(--text-secondary)",
        }}
      >
        <div style={{ fontSize: "3rem" }}>🔍</div>
        <h2 style={{ color: "var(--text-primary)" }}>Paper not found</h2>
        <p>This paper may have been removed or the link is incorrect.</p>
        <button className="btn-ghost" onClick={() => navigate(-1)}>
          ← Go back
        </button>
      </div>
    );
  }

  const authors = (paper?.authors || []).map((a) =>
    typeof a === "string" ? a : a.name
  );
  const authorDisplay =
    authors.length > 3
      ? `${authors.slice(0, 3).join(", ")} et al.`
      : authors.join(", ");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        paddingBottom: "4rem",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(15,17,23,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "0 1.5rem",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              cursor: "pointer",
              padding: "0.35rem 0",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-secondary)")
            }
          >
            <svg
              width="15"
              height="15"
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
            Back to search
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {paper?.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  color: "var(--text-secondary)",
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.75rem",
                  transition: "background 0.2s, color 0.2s",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "var(--text-secondary)";
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
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                View PDF
              </a>
            )}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              aria-label={saved ? "Remove from library" : "Save paper"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: saved
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(255,255,255,0.05)",
                border: saved
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
                color: saved ? "#f87171" : "var(--text-secondary)",
                fontSize: "0.8rem",
                padding: "0.35rem 0.75rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem 0",
        }}
      >
        {/* Paper header */}
        {isLoading ? (
          <PaperSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Tags row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.45rem",
                marginBottom: "1rem",
              }}
            >
              {paper?.venue && (
                <MetaBadge color="blue">{paper.venue}</MetaBadge>
              )}
              {paper?.year && (
                <MetaBadge color="purple">{paper.year}</MetaBadge>
              )}
              {paper?.fieldsOfStudy?.slice(0, 2).map((f) => (
                <MetaBadge key={f} color="green">
                  {f}
                </MetaBadge>
              ))}
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: "clamp(1.3rem, 2.8vw, 1.75rem)",
                fontWeight: 700,
                lineHeight: 1.35,
                color: "var(--text-primary)",
                marginBottom: "0.875rem",
                letterSpacing: "-0.01em",
              }}
            >
              {paper?.title || "Untitled Paper"}
            </h1>

            {/* Authors + meta row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0.5rem 1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              {authorDisplay && (
                <span
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {authorDisplay}
                </span>
              )}
              {paper?.citationCount !== undefined && (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
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
                    <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
                    <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
                  </svg>
                  {paper.citationCount.toLocaleString()} citations
                </span>
              )}
              {paper?.doi && (
                <a
                  href={`https://doi.org/${paper.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    fontFamily: "monospace",
                  }}
                >
                  DOI: {paper.doi}
                </a>
              )}
            </div>

            {/* Abstract */}
            {paper?.abstract && (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "0.75rem",
                  padding: "1.25rem 1.5rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "0.6rem",
                  }}
                >
                  Abstract
                </div>
                <p
                  style={{
                    fontSize: "0.9rem",
                    lineHeight: 1.75,
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  {paper.abstract}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <div
          style={{
            marginTop: "2rem",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            gap: "0",
            position: "relative",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "none",
                border: "none",
                padding: "0.6rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: activeTab === tab.id ? 600 : 400,
                color:
                  activeTab === tab.id
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                cursor: "pointer",
                position: "relative",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = "var(--text-secondary)";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id)
                  e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: "absolute",
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2,
                    background:
                      "linear-gradient(90deg, var(--primary), var(--accent))",
                    borderRadius: "2px 2px 0 0",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div style={{ paddingTop: "1.5rem" }}>
          <AnimatePresence mode="wait">
            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <SummaryTab paperId={paperId} />
              </motion.div>
            )}
            {activeTab === "ask" && (
              <motion.div
                key="ask"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <AskTab paperId={paperId} paperTitle={paper?.title} userId={user?.userId} />
              </motion.div>
            )}
            {activeTab === "references" && (
              <motion.div
                key="references"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
              >
                <ReferencesTab paper={paper} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Inline styles for markdown prose */}
      <style>{`
        .md-prose h1 { font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0.75rem 0 0.4rem; }
        .md-prose h2 { font-size: 1rem; font-weight: 600; color: var(--text-primary); margin: 0.65rem 0 0.35rem; }
        .md-prose h3 { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0.5rem 0 0.3rem; }
        .md-prose p  { font-size: 0.9rem; line-height: 1.7; color: var(--text-secondary); margin: 0 0 0.5rem; }
        .md-prose p:last-child { margin-bottom: 0; }
        .md-prose ul { padding-left: 1.1rem; margin: 0.4rem 0; }
        .md-prose li { font-size: 0.875rem; line-height: 1.65; color: var(--text-secondary); margin-bottom: 0.25rem; }
        .md-prose strong { color: var(--text-primary); font-weight: 600; }
        .md-prose em { color: var(--text-secondary); font-style: italic; }
        .md-prose code { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 0.82rem; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1); border-radius: 0.25rem; padding: 0.1rem 0.3rem; color: var(--primary-light); }
      `}</style>
    </div>
  );
}
