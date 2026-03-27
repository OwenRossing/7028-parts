"use client";

import { useEffect, useRef, useState } from "react";
import { type Theme, useTheme } from "./theme-context";

interface ThemeOption {
  id: Theme;
  label: string;
  swatchColors: string[];
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "default",
    label: "Default",
    swatchColors: ["#171a21", "#37506a", "#66c0f4"],
  },
  {
    id: "liquid-glass",
    label: "Liquid Glass",
    swatchColors: ["#dce8f8", "#ffffff", "#e8dff5"],
  },
  {
    id: "android17",
    label: "Android 17",
    swatchColors: ["#1a1b2e", "#3d5afe", "#90caf9"],
  },
  {
    id: "shop-floor",
    label: "Shop Floor",
    swatchColors: ["#1a1400", "#ff9800", "#ffb300"],
  },
];

/* ---------- inline styles (theme-neutral) ---------- */

const toggleBtnStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 20,
  right: 20,
  zIndex: 9999,
  width: 40,
  height: 40,
  borderRadius: "50%",
  border: "1px solid rgba(128,128,128,0.4)",
  background: "rgba(30,30,30,0.75)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  color: "#ccc",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  transition: "transform 180ms ease, box-shadow 180ms ease",
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 68,
  right: 20,
  zIndex: 9998,
  width: 220,
  borderRadius: 12,
  border: "1px solid rgba(128,128,128,0.35)",
  background: "rgba(24,24,28,0.92)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  padding: "8px 0",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

const optionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  color: "#d0d0d0",
  fontSize: 13,
  cursor: "pointer",
  textAlign: "left",
  transition: "background 120ms ease",
};

const optionActiveStyle: React.CSSProperties = {
  ...optionStyle,
  background: "rgba(255,255,255,0.08)",
  color: "#ffffff",
};

const swatchContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: 2,
  flexShrink: 0,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "#888",
  padding: "6px 14px 4px",
};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        style={toggleBtnStyle}
        onClick={() => setOpen((p) => !p)}
        aria-label="Toggle theme switcher"
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        }}
      >
        {/* Gear icon using SVG */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div ref={panelRef} style={panelStyle}>
          <div style={labelStyle}>Theme</div>
          {THEME_OPTIONS.map((opt) => {
            const isActive = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                style={isActive ? optionActiveStyle : optionStyle}
                onClick={() => {
                  setTheme(opt.id);
                  setOpen(false);
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div style={swatchContainerStyle}>
                  {opt.swatchColors.map((color, i) => (
                    <span
                      key={i}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 4,
                        background: color,
                        border: "1px solid rgba(128,128,128,0.3)",
                      }}
                    />
                  ))}
                </div>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {isActive && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#66c0f4"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
