import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICONS = {
  brain: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
      <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
      <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
      <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
      <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
      <path d="M6 18a4 4 0 0 1-1.967-.516" />
      <path d="M19.967 17.484A4 4 0 0 1 18 18" />
    </svg>
  ),
  search: ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  "file-text": ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </svg>
  ),
  "bar-chart": ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  "message-circle": ({ size = 20, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  ),
};

// ─── Agent → icon mapping ─────────────────────────────────────────────────────

const AGENT_ICON_MAP = {
  orchestrator:  "brain",
  planner:       "brain",
  search:        "search",
  retriever:     "search",
  reader:        "file-text",
  extractor:     "file-text",
  analyst:       "bar-chart",
  synthesizer:   "bar-chart",
  responder:     "message-circle",
  writer:        "message-circle",
};

function resolveIcon(agentName) {
  if (!agentName) return "brain";
  const lower = agentName.toLowerCase();
  for (const [key, icon] of Object.entries(AGENT_ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return "brain";
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:   { label: "Queued",     bg: "rgba(232,227,215,0.07)", text: "#7A7568", border: "rgba(122,117,104,0.3)" },
  running:   { label: "Running",    bg: "rgba(212,168,75,0.12)",  text: "#D4A84B", border: "rgba(212,168,75,0.4)" },
  completed: { label: "Done",       bg: "rgba(75,143,212,0.10)",  text: "#4B8FD4", border: "rgba(75,143,212,0.35)" },
  error:     { label: "Error",      bg: "rgba(212,75,75,0.10)",   text: "#D44B4B", border: "rgba(212,75,75,0.35)" },
  skipped:   { label: "Skipped",    bg: "rgba(232,227,215,0.05)", text: "#555047", border: "rgba(85,80,71,0.25)" },
};

// ─── Output renderer ──────────────────────────────────────────────────────────

function OutputBlock({ output }) {
  if (!output) return null;

  let rendered;
  if (typeof output === "string") {
    rendered = <pre style={styles.outputPre}>{output}</pre>;
  } else {
    try {
      rendered = (
        <pre style={styles.outputPre}>
          {JSON.stringify(output, null, 2)}
        </pre>
      );
    } catch {
      rendered = <pre style={styles.outputPre}>{String(output)}</pre>;
    }
  }

  return (
    <motion.div
      style={styles.outputBlock}
      initial={{ opacity: 0, height: 0, marginTop: 0 }}
      animate={{ opacity: 1, height: "auto", marginTop: 12 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <div style={styles.outputLabel}>OUTPUT</div>
      {rendered}
    </motion.div>
  );
}

// ─── Single step ─────────────────────────────────────────────────────────────

function TimelineStep({ step, isActive, isLast, index }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = step.output !== undefined && step.output !== null;

  const iconKey = step.icon || resolveIcon(step.agent);
  const IconComponent = ICONS[iconKey] || ICONS.brain;
  const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending;
  const isCompleted = step.status === "completed";
  const isPending = step.status === "pending";

  const iconColor = isActive
    ? "#D4A84B"
    : isCompleted
    ? "#4B8FD4"
    : step.status === "error"
    ? "#D44B4B"
    : "#7A7568";

  const iconBg = isActive
    ? "rgba(212,168,75,0.12)"
    : isCompleted
    ? "rgba(75,143,212,0.10)"
    : step.status === "error"
    ? "rgba(212,75,75,0.10)"
    : "rgba(232,227,215,0.04)";

  const iconBorder = isActive
    ? "rgba(212,168,75,0.5)"
    : isCompleted
    ? "rgba(75,143,212,0.35)"
    : "rgba(232,227,215,0.1)";

  return (
    <motion.div
      style={styles.stepRow}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: isPending ? 0.45 : 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1], delay: index * 0.07 }}
    >
      {/* Spine column */}
      <div style={styles.spineCol}>
        {/* Icon node */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {isActive && (
            <>
              <motion.div
                style={styles.pulseRing}
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                style={{ ...styles.pulseRing, animationDelay: "0.6s" }}
                animate={{ scale: [1, 1.9, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
            </>
          )}
          <div
            style={{
              ...styles.iconNode,
              background: iconBg,
              border: `1.5px solid ${iconBorder}`,
              position: "relative",
              zIndex: 2,
            }}
          >
            <IconComponent size={18} color={iconColor} />
          </div>
        </div>

        {/* Connector line */}
        {!isLast && (
          <div style={styles.connectorWrap}>
            <div style={styles.connectorTrack}>
              {isCompleted && (
                <motion.div
                  style={styles.connectorFill}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                />
              )}
              {isActive && (
                <motion.div
                  style={styles.connectorActive}
                  animate={{ scaleY: [0, 0.6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content column */}
      <div style={styles.contentCol}>
        <div style={styles.stepHeader}>
          <div style={styles.agentMeta}>
            <span style={{ ...styles.agentName, color: isPending ? "#555047" : "#E8E3D7" }}>
              {step.agent || "Unknown Agent"}
            </span>
            {step.model && (
              <span style={styles.modelTag}>{step.model}</span>
            )}
          </div>

          <div style={styles.rightMeta}>
            {isCompleted && step.duration != null && (
              <span style={styles.duration}>
                {typeof step.duration === "number"
                  ? `${step.duration < 1 ? (step.duration * 1000).toFixed(0) + "ms" : step.duration.toFixed(1) + "s"}`
                  : step.duration}
              </span>
            )}
            <div
              style={{
                ...styles.badge,
                background: statusCfg.bg,
                color: statusCfg.text,
                border: `1px solid ${statusCfg.border}`,
              }}
            >
              {isActive && (
                <motion.span
                  style={styles.badgeDot}
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              {statusCfg.label}
            </div>
          </div>
        </div>

        {step.description && (
          <p style={styles.stepDesc}>{step.description}</p>
        )}

        {step.error && (
          <div style={styles.errorBlock}>
            <span style={styles.errorIcon}>!</span>
            <span style={styles.errorText}>{step.error}</span>
          </div>
        )}

        {hasOutput && (
          <button
            style={styles.expandBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse output" : "Expand output"}
          >
            <motion.span
              style={styles.expandChevron}
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.18 }}
            >
              ›
            </motion.span>
            <span>{expanded ? "Collapse" : "Inspect output"}</span>
          </button>
        )}

        <AnimatePresence initial={false}>
          {expanded && hasOutput && <OutputBlock output={step.output} />}
        </AnimatePresence>

        <div style={styles.stepSpacer} />
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgentTimeline({ steps = [], currentStep = null }) {
  if (!steps.length) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>
          <ICONS.brain size={28} color="#3A3830" />
        </span>
        <p style={styles.emptyText}>No agents have run yet.</p>
        <p style={styles.emptyHint}>Start a research query to see the pipeline.</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <span style={styles.headerLabel}>AGENT PIPELINE</span>
        <span style={styles.headerCount}>
          {steps.filter((s) => s.status === "completed").length}
          <span style={styles.headerCountDim}> / {steps.length}</span>
        </span>
      </div>

      <div style={styles.timeline}>
        {steps.map((step, i) => (
          <TimelineStep
            key={step.id || step.agent || i}
            step={step}
            isActive={
              currentStep !== null &&
              (step.id === currentStep ||
                step.agent === currentStep ||
                step.status === "running")
            }
            isLast={i === steps.length - 1}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  root: {
    background: "#0E1117",
    borderRadius: "10px",
    border: "1px solid rgba(232,227,215,0.08)",
    padding: "20px 20px 8px",
    fontFamily: "'Inter', system-ui, sans-serif",
    minWidth: "320px",
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    paddingBottom: "12px",
    borderBottom: "1px solid rgba(232,227,215,0.07)",
  },
  headerLabel: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "10px",
    letterSpacing: "0.12em",
    color: "#555047",
    fontWeight: 500,
  },
  headerCount: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "12px",
    color: "#4B8FD4",
    fontWeight: 600,
  },
  headerCountDim: {
    color: "#3A3830",
  },

  timeline: {
    display: "flex",
    flexDirection: "column",
  },

  stepRow: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    minHeight: "48px",
  },

  spineCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flexShrink: 0,
    width: "36px",
  },

  iconNode: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  pulseRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "10px",
    border: "2px solid rgba(212,168,75,0.6)",
    zIndex: 1,
    transformOrigin: "center",
  },

  connectorWrap: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    paddingTop: "4px",
    paddingBottom: "4px",
    minHeight: "24px",
  },
  connectorTrack: {
    width: "2px",
    background: "rgba(232,227,215,0.06)",
    borderRadius: "2px",
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  connectorFill: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, rgba(75,143,212,0.5), rgba(75,143,212,0.15))",
    transformOrigin: "top",
  },
  connectorActive: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to bottom, transparent, rgba(212,168,75,0.6), transparent)",
    transformOrigin: "top",
  },

  contentCol: {
    flex: 1,
    paddingTop: "8px",
    minWidth: 0,
  },

  stepHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  },

  agentMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
    minWidth: 0,
  },

  agentName: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "13px",
    fontWeight: 500,
    letterSpacing: "0.01em",
    color: "#E8E3D7",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  modelTag: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "10px",
    color: "#3A3830",
    background: "rgba(232,227,215,0.04)",
    border: "1px solid rgba(232,227,215,0.07)",
    borderRadius: "4px",
    padding: "1px 6px",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },

  rightMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: 0,
  },

  duration: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "11px",
    color: "#555047",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  },

  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "10px",
    fontWeight: 500,
    letterSpacing: "0.08em",
    borderRadius: "4px",
    padding: "3px 8px",
    whiteSpace: "nowrap",
  },

  badgeDot: {
    width: "5px",
    height: "5px",
    borderRadius: "50%",
    background: "#D4A84B",
    flexShrink: 0,
  },

  stepDesc: {
    fontSize: "12px",
    color: "#7A7568",
    marginTop: "5px",
    lineHeight: "1.5",
    fontWeight: 400,
  },

  errorBlock: {
    display: "flex",
    alignItems: "flex-start",
    gap: "7px",
    marginTop: "7px",
    background: "rgba(212,75,75,0.07)",
    border: "1px solid rgba(212,75,75,0.2)",
    borderRadius: "5px",
    padding: "7px 10px",
  },
  errorIcon: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "11px",
    color: "#D44B4B",
    fontWeight: 700,
    flexShrink: 0,
    marginTop: "1px",
  },
  errorText: {
    fontSize: "12px",
    color: "#D44B4B",
    lineHeight: "1.5",
    opacity: 0.85,
  },

  expandBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    marginTop: "8px",
    background: "transparent",
    border: "none",
    padding: "0",
    cursor: "pointer",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "11px",
    color: "#555047",
    letterSpacing: "0.04em",
    transition: "color 0.15s",
    outline: "none",
    ":hover": { color: "#D4A84B" },
    ":focus-visible": {
      outline: "2px solid rgba(212,168,75,0.5)",
      outlineOffset: "2px",
      borderRadius: "3px",
    },
  },

  expandChevron: {
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "1",
    color: "#D4A84B",
    transformOrigin: "center",
  },

  outputBlock: {
    background: "rgba(14,17,23,0.8)",
    border: "1px solid rgba(232,227,215,0.08)",
    borderRadius: "6px",
    overflow: "hidden",
  },

  outputLabel: {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "9px",
    letterSpacing: "0.14em",
    color: "#3A3830",
    padding: "6px 12px 4px",
    borderBottom: "1px solid rgba(232,227,215,0.05)",
    fontWeight: 600,
  },

  outputPre: {
    margin: 0,
    padding: "10px 12px 12px",
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: "11px",
    color: "#A09880",
    lineHeight: "1.65",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: "260px",
    overflowY: "auto",
  },

  stepSpacer: {
    height: "18px",
  },

  // Empty state
  empty: {
    background: "#0E1117",
    borderRadius: "10px",
    border: "1px solid rgba(232,227,215,0.08)",
    padding: "48px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  emptyIcon: {
    display: "flex",
    marginBottom: "4px",
  },
  emptyText: {
    fontSize: "14px",
    color: "#555047",
    fontWeight: 500,
    margin: 0,
  },
  emptyHint: {
    fontSize: "12px",
    color: "#3A3830",
    margin: 0,
  },
};
