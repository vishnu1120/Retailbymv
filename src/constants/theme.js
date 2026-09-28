import React from "react";
import werpLogo from "../assets/werp-logo.jpg";

export const DARK = Object.freeze({
  bg: "#0a0c12",
  surface: "#0f1219",
  card: "#141720",
  border: "#1e2335",
  accent: "#6366f1",
  accentDim: "#1e1f4e",
  accentHover: "#818cf8",
  green: "#10b981",
  greenDim: "#052e1c",
  greenHover: "#34d399",
  red: "#ef4444",
  redDim: "#2d0a0a",
  amber: "#f59e0b",
  amberDim: "#2d1f05",
  purple: "#a855f7",
  purpleDim: "#2d0d47",
  text: "#f1f5f9",
  muted: "#64748b",
  subtle: "#1e2740",
  sidebar: "#0d1017",
  sidebarBorder: "#1a1f2e",
  inputBg: "#0f1219",
  shadow: "rgba(0,0,0,.4)",
});

export const LIGHT = Object.freeze({
  bg: "#f8fafc",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e2e8f0",
  accent: "#6366f1",
  accentDim: "#eef2ff",
  accentHover: "#4f46e5",
  green: "#10b981",
  greenDim: "#ecfdf5",
  greenHover: "#059669",
  red: "#ef4444",
  redDim: "#fef2f2",
  amber: "#f59e0b",
  amberDim: "#fffbeb",
  purple: "#a855f7",
  purpleDim: "#faf5ff",
  text: "#0f172a",
  muted: "#64748b",
  subtle: "#f1f5f9",
  sidebar: "#1e1b4b",
  sidebarBorder: "#312e81",
  inputBg: "#f8fafc",
  shadow: "rgba(0,0,0,.08)",
});

export const T = { ...DARK };

export const syncTheme = (isDark) => {
  Object.assign(T, isDark ? DARK : LIGHT);
  return T;
};

export const setT = (newTheme) => {
  Object.assign(T, newTheme);
};

export const ThemeCtx = React.createContext(T);

export const useTheme = () => React.useContext(ThemeCtx);

export const LOGO_URI = werpLogo;