import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── Icons ───────────────────────────────────────────────────────────────────

function BrainLensIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer lens ring */}
      <circle
        cx="14"
        cy="14"
        r="11"
        stroke="url(#lensGrad)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Inner iris */}
      <circle
        cx="14"
        cy="14"
        r="6.5"
        stroke="url(#lensGrad)"
        strokeWidth="1"
        fill="rgba(96,165,250,0.08)"
      />
      {/* Neural node — center */}
      <circle cx="14" cy="14" r="2" fill="url(#lensGrad)" />
      {/* Neural branches */}
      <line x1="14" y1="12" x2="14" y2="8" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      <line x1="15.4" y1="12.6" x2="18.8" y2="9.8" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      <line x1="15.7" y1="14.5" x2="19.5" y2="15.8" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      <line x1="14" y1="16" x2="14" y2="20" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      <line x1="12.6" y1="15.4" x2="9.2" y2="18.2" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      <line x1="12.3" y1="13.5" x2="8.5" y2="12.2" stroke="url(#lensGrad)" strokeWidth="1" strokeLinecap="round" />
      {/* Synaptic nodes */}
      <circle cx="14" cy="8" r="1" fill="#a855f7" />
      <circle cx="18.8" cy="9.8" r="1" fill="#60a5fa" />
      <circle cx="19.5" cy="15.8" r="1" fill="#a855f7" />
      <circle cx="14" cy="20" r="1" fill="#60a5fa" />
      <circle cx="9.2" cy="18.2" r="1" fill="#a855f7" />
      <circle cx="8.5" cy="12.2" r="1" fill="#60a5fa" />
      <defs>
        <linearGradient id="lensGrad" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60a5fa" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="10" y="3" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7.5 8H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 6L8 8L6.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 6L8 8L9.5 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AgentsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 13.5c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="13" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6.5" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 15.5c0-3.31 2.91-6 6.5-6s6.5 2.69 6.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 11l3-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <line
        x1="3" y1={open ? "11" : "6"} x2="19" y2={open ? "11" : "6"}
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        style={{ transition: "all 0.2s ease", transformOrigin: "center", transform: open ? "rotate(45deg)" : "none" }}
      />
      <line
        x1="3" y1="11" x2="19" y2="11"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        style={{ transition: "opacity 0.2s ease", opacity: open ? 0 : 1 }}
      />
      <line
        x1="3" y1={open ? "11" : "16"} x2="19" y2={open ? "11" : "16"}
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        style={{ transition: "all 0.2s ease", transformOrigin: "center", transform: open ? "rotate(-45deg)" : "none" }}
      />
    </svg>
  );
}

// ─── Nav link config ──────────────────────────────────────────────────────────

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: GridIcon },
  { to: "/search",    label: "Search",    Icon: SearchIcon },
  { to: "/compare",   label: "Compare",   Icon: CompareIcon },
  { to: "/agents",    label: "Agents",    Icon: AgentsIcon },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Trap focus within mobile menu when open
  useEffect(() => {
    if (!mobileOpen) return;
    const focusable = mobileMenuRef.current?.querySelectorAll(
      'a, button, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
  }, [mobileOpen]);

  function isActive(path) {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <>
      <style>{`
        /* ── Navbar shell ── */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          height: 60px;
          display: flex;
          align-items: center;
          padding: 0 24px;
          background: rgba(15, 17, 23, 0.82);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4);
        }

        /* ── Inner layout: three-column ── */
        .navbar__inner {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          width: 100%;
          max-width: 1280px;
          margin: 0 auto;
          gap: 16px;
        }

        /* ── Logo ── */
        .navbar__logo {
          display: flex;
          align-items: center;
          gap: 9px;
          text-decoration: none;
          flex-shrink: 0;
          outline: none;
          border-radius: 6px;
        }
        .navbar__logo:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.6);
        }
        .navbar__logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: filter 0.2s ease;
        }
        .navbar__logo:hover .navbar__logo-icon {
          filter: drop-shadow(0 0 6px rgba(96,165,250,0.5));
        }
        .navbar__logo-wordmark {
          display: flex;
          flex-direction: column;
          line-height: 1;
        }
        .navbar__logo-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.02em;
          background: linear-gradient(95deg, #60a5fa 0%, #a855f7 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          white-space: nowrap;
        }
        .navbar__logo-tag {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.6);
          margin-top: 1px;
        }

        /* ── Desktop nav links ── */
        .navbar__links {
          display: flex;
          align-items: center;
          gap: 2px;
          justify-content: center;
        }

        .navbar__link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(148, 163, 184, 0.85);
          text-decoration: none;
          transition: color 0.15s ease, background 0.15s ease;
          white-space: nowrap;
          outline: none;
        }
        .navbar__link:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.6);
        }
        .navbar__link:hover {
          color: #e2e8f0;
          background: rgba(255,255,255,0.05);
        }
        .navbar__link--active {
          color: #ffffff;
          background: rgba(96, 165, 250, 0.1);
        }
        .navbar__link--active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, #60a5fa, #a855f7);
        }
        .navbar__link-icon {
          display: flex;
          align-items: center;
          opacity: 0.7;
          transition: opacity 0.15s ease;
        }
        .navbar__link:hover .navbar__link-icon,
        .navbar__link--active .navbar__link-icon {
          opacity: 1;
        }

        /* ── Right section ── */
        .navbar__right {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
        }

        /* ── Avatar + dropdown ── */
        .navbar__avatar-wrap {
          position: relative;
        }
        .navbar__avatar-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          padding: 3px;
          border-radius: 9999px;
          cursor: pointer;
          outline: none;
          transition: box-shadow 0.15s ease;
        }
        .navbar__avatar-btn:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.6);
          border-radius: 9999px;
        }
        .navbar__avatar-btn:hover .navbar__avatar {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.4);
        }
        .navbar__avatar {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          object-fit: cover;
          border: 1.5px solid rgba(255,255,255,0.1);
          transition: box-shadow 0.15s ease;
          display: block;
        }
        .navbar__avatar-fallback {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #3b82f6, #a855f7);
          border: 1.5px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
          transition: box-shadow 0.15s ease;
        }
        .navbar__avatar-caret {
          color: rgba(148,163,184,0.6);
          transition: transform 0.2s ease, color 0.15s ease;
        }
        .navbar__avatar-btn:hover .navbar__avatar-caret {
          color: rgba(148,163,184,1);
        }
        .navbar__avatar-caret--open {
          transform: rotate(180deg);
          color: rgba(148,163,184,1);
        }

        /* ── Dropdown menu ── */
        .navbar__dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: rgba(22, 26, 37, 0.97);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(96,165,250,0.06);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          overflow: hidden;
          transform-origin: top right;
          animation: dropdownIn 0.15s ease forwards;
        }
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.96) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .navbar__dropdown-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .navbar__dropdown-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar__dropdown-email {
          font-size: 11.5px;
          color: rgba(148,163,184,0.65);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar__dropdown-items {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .navbar__dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(148,163,184,0.9);
          text-decoration: none;
          background: none;
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: background 0.12s ease, color 0.12s ease;
          outline: none;
        }
        .navbar__dropdown-item:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.5);
        }
        .navbar__dropdown-item:hover {
          background: rgba(255,255,255,0.05);
          color: #f1f5f9;
        }
        .navbar__dropdown-item--danger {
          color: rgba(239,68,68,0.85);
        }
        .navbar__dropdown-item--danger:hover {
          background: rgba(239,68,68,0.08);
          color: #ef4444;
        }
        .navbar__dropdown-divider {
          height: 1px;
          background: rgba(255,255,255,0.07);
          margin: 4px 0;
        }

        /* ── Hamburger button ── */
        .navbar__hamburger {
          display: none;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          padding: 6px;
          border-radius: 8px;
          color: rgba(148,163,184,0.9);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          outline: none;
        }
        .navbar__hamburger:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.6);
        }
        .navbar__hamburger:hover {
          background: rgba(255,255,255,0.06);
          color: #e2e8f0;
        }

        /* ── Mobile menu drawer ── */
        .navbar__mobile-backdrop {
          display: none;
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
          animation: fadeIn 0.15s ease forwards;
        }
        .navbar__mobile-menu {
          display: none;
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          z-index: 45;
          background: rgba(15, 17, 23, 0.97);
          border-bottom: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 12px 16px 20px;
          animation: slideDown 0.2s ease forwards;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .navbar__mobile-links {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          margin-bottom: 12px;
        }
        .navbar__mobile-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 12px;
          border-radius: 10px;
          font-size: 14.5px;
          font-weight: 500;
          color: rgba(148,163,184,0.85);
          text-decoration: none;
          transition: background 0.12s ease, color 0.12s ease;
          outline: none;
        }
        .navbar__mobile-link:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.5);
        }
        .navbar__mobile-link:hover {
          background: rgba(255,255,255,0.05);
          color: #e2e8f0;
        }
        .navbar__mobile-link--active {
          background: rgba(96,165,250,0.1);
          color: #ffffff;
        }
        .navbar__mobile-link-icon {
          display: flex;
          align-items: center;
          opacity: 0.7;
        }
        .navbar__mobile-link--active .navbar__mobile-link-icon {
          opacity: 1;
        }
        .navbar__mobile-user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 2px 0 10px;
        }
        .navbar__mobile-user-info {
          flex: 1;
          min-width: 0;
        }
        .navbar__mobile-user-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar__mobile-user-email {
          font-size: 11.5px;
          color: rgba(148,163,184,0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar__mobile-actions {
          display: flex;
          gap: 8px;
        }
        .navbar__mobile-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13.5px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          outline: none;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .navbar__mobile-action:focus-visible {
          box-shadow: 0 0 0 2px rgba(96,165,250,0.5);
        }
        .navbar__mobile-action--profile {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(148,163,184,0.9);
        }
        .navbar__mobile-action--profile:hover {
          background: rgba(255,255,255,0.08);
          color: #e2e8f0;
        }
        .navbar__mobile-action--logout {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          color: rgba(239,68,68,0.85);
        }
        .navbar__mobile-action--logout:hover {
          background: rgba(239,68,68,0.14);
          color: #ef4444;
        }

        /* ── Active indicator dot ── */
        .navbar__active-dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: linear-gradient(90deg, #60a5fa, #a855f7);
          flex-shrink: 0;
        }

        /* ── Responsive breakpoints ── */
        @media (max-width: 768px) {
          .navbar__links {
            display: none;
          }
          .navbar__hamburger {
            display: flex;
          }
          .navbar__mobile-menu--open,
          .navbar__mobile-backdrop--open {
            display: block;
          }
          .navbar__mobile-menu--open {
            display: block;
          }
          .navbar__mobile-backdrop--open {
            display: block;
          }
          .navbar__logo-tag {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .navbar {
            padding: 0 16px;
          }
        }

        /* ── Spacer so content below navbar isn't hidden ── */
        .navbar-spacer {
          height: 60px;
          flex-shrink: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .navbar__dropdown,
          .navbar__mobile-menu,
          .navbar__mobile-backdrop {
            animation: none;
          }
        }
      `}</style>

      {/* ── Navbar bar ── */}
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar__inner">

          {/* Left: Logo */}
          <Link to="/dashboard" className="navbar__logo" aria-label="PaperLens AI — go to dashboard">
            <span className="navbar__logo-icon">
              <BrainLensIcon />
            </span>
            <span className="navbar__logo-wordmark">
              <span className="navbar__logo-name">PaperLens AI</span>
              <span className="navbar__logo-tag">Research Intelligence</span>
            </span>
          </Link>

          {/* Center: Desktop nav links */}
          <ul className="navbar__links" role="list">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`navbar__link${isActive(to) ? " navbar__link--active" : ""}`}
                  aria-current={isActive(to) ? "page" : undefined}
                >
                  <span className="navbar__link-icon">
                    <Icon />
                  </span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right: Avatar + hamburger */}
          <div className="navbar__right">

            {/* Desktop avatar dropdown */}
            {user && (
              <div className="navbar__avatar-wrap" ref={dropdownRef}>
                <button
                  className="navbar__avatar-btn"
                  aria-label="Open user menu"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((v) => !v)}
                >
                  {user.picture && !avatarError ? (
                    <img
                      src={user.picture}
                      alt={user.name || "User avatar"}
                      className="navbar__avatar"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span className="navbar__avatar-fallback" aria-hidden="true">
                      {userInitial}
                    </span>
                  )}
                  <svg
                    className={`navbar__avatar-caret${dropdownOpen ? " navbar__avatar-caret--open" : ""}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M2 4.5L6 8L10 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="navbar__dropdown" role="menu" aria-label="User menu">
                    <div className="navbar__dropdown-header">
                      <div className="navbar__dropdown-name">{user.name || "Researcher"}</div>
                      {user.email && (
                        <div className="navbar__dropdown-email">{user.email}</div>
                      )}
                    </div>
                    <div className="navbar__dropdown-items">
                      <Link
                        to="/profile"
                        className="navbar__dropdown-item"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon />
                        Profile
                      </Link>
                      <div className="navbar__dropdown-divider" />
                      <button
                        className="navbar__dropdown-item navbar__dropdown-item--danger"
                        role="menuitem"
                        onClick={() => { setDropdownOpen(false); logout(); }}
                      >
                        <LogoutIcon />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="navbar__hamburger"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="navbar__mobile-backdrop navbar__mobile-backdrop--open"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile menu drawer ── */}
      {mobileOpen && (
        <div
          id="mobile-nav"
          className="navbar__mobile-menu navbar__mobile-menu--open"
          role="dialog"
          aria-label="Mobile navigation"
          ref={mobileMenuRef}
        >
          <nav aria-label="Mobile links">
            <ul className="navbar__mobile-links" role="list">
              {NAV_LINKS.map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`navbar__mobile-link${isActive(to) ? " navbar__mobile-link--active" : ""}`}
                    aria-current={isActive(to) ? "page" : undefined}
                  >
                    <span className="navbar__mobile-link-icon">
                      <Icon />
                    </span>
                    {label}
                    {isActive(to) && <span className="navbar__active-dot" aria-hidden="true" />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {user && (
            <>
              <div className="navbar__mobile-user">
                {user.picture && !avatarError ? (
                  <img
                    src={user.picture}
                    alt={user.name || "User avatar"}
                    className="navbar__avatar"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="navbar__avatar-fallback" aria-hidden="true">
                    {userInitial}
                  </span>
                )}
                <div className="navbar__mobile-user-info">
                  <div className="navbar__mobile-user-name">{user.name || "Researcher"}</div>
                  {user.email && (
                    <div className="navbar__mobile-user-email">{user.email}</div>
                  )}
                </div>
              </div>
              <div className="navbar__mobile-actions">
                <Link
                  to="/profile"
                  className="navbar__mobile-action navbar__mobile-action--profile"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserIcon />
                  Profile
                </Link>
                <button
                  className="navbar__mobile-action navbar__mobile-action--logout"
                  onClick={() => { setMobileOpen(false); logout(); }}
                >
                  <LogoutIcon />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Layout spacer ── */}
      <div className="navbar-spacer" aria-hidden="true" />
    </>
  );
}
