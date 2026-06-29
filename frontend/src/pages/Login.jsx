import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
  ground:      "#0B0F1A",
  surface:     "#111827",
  glassBg:     "rgba(17, 24, 43, 0.72)",
  glassBorder: "rgba(124, 92, 252, 0.18)",
  text:        "#E8EDFB",
  textMuted:   "#8892A4",
  accent:      "#7C5CFC",
  accent2:     "#4FC3F7",
  success:     "#34D399",
};

// ─── Dot-grid canvas background ──────────────────────────────────────────────
function DotGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let dots = [];
    let startTime = null;

    function buildDots(W, H) {
      dots = [];
      const spacing = 36;
      const cols = Math.ceil(W / spacing) + 1;
      const rows = Math.ceil(H / spacing) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            x: c * spacing - spacing / 2,
            y: r * spacing - spacing / 2,
            baseAlpha: 0.06 + Math.random() * 0.08,
            phase:     Math.random() * Math.PI * 2,
            speed:     0.3 + Math.random() * 0.5,
          });
        }
      }
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      buildDots(canvas.width, canvas.height);
    }

    function draw(ts) {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const d of dots) {
        const pulse = Math.sin(t * d.speed + d.phase) * 0.5 + 0.5;
        const alpha = d.baseAlpha + pulse * 0.06;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(124, 92, 252, ${alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

// ─── Lens SVG icon ────────────────────────────────────────────────────────────
function LensIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="17" cy="17" r="10" stroke="url(#lens-grad1)" strokeWidth="2.2" />
      <circle cx="17" cy="17" r="6"  fill="rgba(124,92,252,0.12)" />
      <line x1="24.5" y1="24.5" x2="34" y2="34" stroke="url(#lens-grad2)" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="13" y1="15" x2="21" y2="15" stroke="rgba(79,195,247,0.6)"  strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="18" x2="19" y2="18" stroke="rgba(79,195,247,0.4)"  strokeWidth="1.2" strokeLinecap="round" />
      <defs>
        <linearGradient id="lens-grad1" x1="7" y1="7" x2="27" y2="27" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#7C5CFC" />
        </linearGradient>
        <linearGradient id="lens-grad2" x1="24" y1="24" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7C5CFC" />
          <stop offset="100%" stopColor="#4FC3F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Google G SVG ─────────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Feature tile data ────────────────────────────────────────────────────────
const FEATURES = [
  {
    label:   "Search Papers",
    iconBg:  "rgba(124, 92, 252, 0.15)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="4.5" stroke="#A78BFA" strokeWidth="1.6" />
        <line x1="11" y1="11" x2="15.5" y2="15.5" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="5.5" y1="7"  x2="9.5"  y2="7"   stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.5" y1="9"  x2="8.5"  y2="9"   stroke="#C4B5FD" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label:   "AI Analysis",
    iconBg:  "rgba(79, 195, 247, 0.15)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <path d="M3 5h12M3 9h8M3 13h10" stroke="#67E8F9" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="14" cy="13" r="2.5" fill="rgba(79,195,247,0.2)" stroke="#4FC3F7" strokeWidth="1.2" />
        <path d="M13.3 13l.7.7 1.2-1.2" stroke="#4FC3F7" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label:   "Compare Research",
    iconBg:  "rgba(52, 211, 153, 0.15)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="1.5" y="3" width="6" height="12" rx="2" stroke="#34D399" strokeWidth="1.6" />
        <rect x="10.5" y="3" width="6" height="12" rx="2" stroke="#6EE7B7" strokeWidth="1.4" strokeDasharray="2 1.5" />
        <path d="M7.5 9h3" stroke="#34D399" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── Framer-motion variants ───────────────────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.28 } },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

// ─── Login page ───────────────────────────────────────────────────────────────
export default function Login() {
  const { user, loginWithGoogle, loading } = useAuth();

  // Redirect if already authenticated
  if (user) return <Navigate to="/" replace />;

  // ── Inline styles (no external CSS file dependency) ──
  const styles = {
    root: {
      position:       "relative",
      minHeight:      "100vh",
      background:     TOKEN.ground,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      padding:        "24px",
      fontFamily:     "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      overflow:       "hidden",
    },
    // Ambient gradient orbs
    orb: (top, left, bottom, right, color, size) => ({
      position:      "fixed",
      width:         size,
      height:        size,
      borderRadius:  "50%",
      background:    color,
      filter:        "blur(80px)",
      pointerEvents: "none",
      zIndex:        1,
      top, left, bottom, right,
    }),
    // Main card
    card: {
      position:          "relative",
      zIndex:            2,
      width:             "100%",
      maxWidth:          "440px",
      background:        TOKEN.glassBg,
      border:            `1px solid ${TOKEN.glassBorder}`,
      borderRadius:      "20px",
      padding:           "48px 40px 40px",
      backdropFilter:    "blur(24px) saturate(160%)",
      WebkitBackdropFilter: "blur(24px) saturate(160%)",
      boxShadow:         `0 0 0 1px rgba(124,92,252,0.08), 0 24px 64px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.04) inset`,
    },
    logoRow: {
      display:       "flex",
      alignItems:    "center",
      gap:           "12px",
      marginBottom:  "6px",
    },
    wordmark: {
      fontFamily:                'Courier New, "Lucida Console", monospace',
      fontSize:                  "26px",
      fontWeight:                700,
      letterSpacing:             "-0.02em",
      lineHeight:                1,
      background:                "linear-gradient(135deg, #C4B5FD 0%, #7C5CFC 40%, #4FC3F7 100%)",
      WebkitBackgroundClip:      "text",
      WebkitTextFillColor:       "transparent",
      backgroundClip:            "text",
    },
    wordmarkLight: {
      fontWeight: 400,
      opacity:    0.7,
    },
    subtitle: {
      fontFamily:    'Courier New, "Lucida Console", monospace',
      fontSize:      "11px",
      fontWeight:    400,
      color:         TOKEN.textMuted,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      marginBottom:  "36px",
    },
    divider: {
      height:       "1px",
      background:   `linear-gradient(90deg, transparent, ${TOKEN.glassBorder} 30%, ${TOKEN.glassBorder} 70%, transparent)`,
      marginBottom: "32px",
    },
    headline: {
      fontSize:      "22px",
      fontWeight:    600,
      color:         TOKEN.text,
      lineHeight:    1.3,
      marginBottom:  "8px",
      letterSpacing: "-0.02em",
    },
    headlineSub: {
      fontSize:     "14px",
      color:        TOKEN.textMuted,
      lineHeight:   1.55,
      marginBottom: "28px",
    },
    btnGoogle: {
      width:          "100%",
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      gap:            "12px",
      padding:        "14px 20px",
      background:     "#FFFFFF",
      color:          "#1F2937",
      border:         "none",
      borderRadius:   "12px",
      fontFamily:     "inherit",
      fontSize:       "15px",
      fontWeight:     600,
      letterSpacing:  "-0.01em",
      cursor:         loading ? "not-allowed" : "pointer",
      opacity:        loading ? 0.7 : 1,
      boxShadow:      "0 2px 12px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.9) inset",
      marginBottom:   "28px",
      transition:     "transform 0.15s ease, box-shadow 0.15s ease",
    },
    features: {
      display:             "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap:                 "8px",
    },
    feature: {
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           "8px",
      padding:       "16px 10px",
      background:    "rgba(255,255,255,0.03)",
      border:        "1px solid rgba(255,255,255,0.06)",
      borderRadius:  "12px",
      textAlign:     "center",
      transition:    "border-color 0.2s ease, background 0.2s ease",
    },
    featureIcon: (bg) => ({
      width:          "32px",
      height:         "32px",
      borderRadius:   "8px",
      background:     bg,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
    }),
    featureLabel: {
      fontSize:      "11px",
      fontWeight:    500,
      color:         TOKEN.textMuted,
      lineHeight:    1.3,
      letterSpacing: "0.01em",
    },
    footerNote: {
      marginTop:     "24px",
      textAlign:     "center",
      fontSize:      "11px",
      color:         TOKEN.textMuted,
      letterSpacing: "0.01em",
    },
  };

  return (
    <div style={styles.root}>
      {/* Dot-grid canvas */}
      <DotGrid />

      {/* Ambient orbs */}
      <div style={styles.orb("-120px", "-100px", "auto", "auto", "radial-gradient(circle, rgba(124,92,252,0.22) 0%, transparent 70%)", "480px")} />
      <div style={styles.orb("auto", "auto", "-80px", "-60px", "radial-gradient(circle, rgba(79,195,247,0.14) 0%, transparent 70%)", "360px")} />
      <div style={styles.orb("auto", "20%", "20%", "auto", "radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)", "280px")} />

      {/* Card */}
      <motion.div
        style={styles.card}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        role="main"
      >
        <motion.div variants={stagger} initial="hidden" animate="visible">

          {/* Logo row */}
          <motion.div style={styles.logoRow} variants={itemVariants}>
            <LensIcon />
            <span style={styles.wordmark}>
              Paper<span style={styles.wordmarkLight}>Lens</span>
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p style={styles.subtitle} variants={itemVariants}>
            Multi-Agent Research Assistant
          </motion.p>

          {/* Divider */}
          <motion.div style={styles.divider} variants={itemVariants} aria-hidden="true" />

          {/* Headline */}
          <motion.h1 style={styles.headline} variants={itemVariants}>
            Search deeper. Understand faster.
          </motion.h1>
          <motion.p style={styles.headlineSub} variants={itemVariants}>
            Sign in to explore academic literature with AI agents that read,
            analyze, and connect research on your behalf.
          </motion.p>

          {/* Google Sign-In */}
          <motion.button
            style={styles.btnGoogle}
            variants={itemVariants}
            whileHover={loading ? {} : { y: -1, boxShadow: "0 6px 24px rgba(124,92,252,0.25), 0 1px 0 rgba(255,255,255,0.9) inset" }}
            whileTap={loading ? {} : { y: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
            onClick={loginWithGoogle}
            disabled={loading}
            aria-label="Continue with Google"
          >
            <GoogleG />
            {loading ? "Signing in…" : "Continue with Google"}
          </motion.button>

          {/* Feature highlights */}
          <motion.div style={styles.features} variants={itemVariants} role="list">
            {FEATURES.map(({ label, icon, iconBg }) => (
              <motion.div
                key={label}
                style={styles.feature}
                role="listitem"
                whileHover={{
                  background: "rgba(124, 92, 252, 0.08)",
                  borderColor: "rgba(124, 92, 252, 0.24)",
                }}
              >
                <div style={styles.featureIcon(iconBg)}>{icon}</div>
                <span style={styles.featureLabel}>{label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Footer note */}
          <motion.p style={styles.footerNote} variants={itemVariants}>
            By signing in, you agree to our{" "}
            <a href="#" style={{ color: TOKEN.textMuted, textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={{ color: TOKEN.textMuted, textDecoration: "underline", textUnderlineOffset: "2px" }}>
              Privacy Policy
            </a>
            .
          </motion.p>

        </motion.div>
      </motion.div>
    </div>
  );
}
