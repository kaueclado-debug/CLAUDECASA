"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./Icons";

export type Theme = "sala" | "galeria";

export const THEME_KEY = "vinis-theme";

/** Roda antes da página aparecer, para não piscar o tema errado. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="sala"&&t!=="galeria"){t=matchMedia("(prefers-color-scheme: light)").matches?"galeria":"sala"}document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="sala"?"#1a1512":"#f7f7f5"}catch(e){document.documentElement.dataset.theme="sala"}})();`;

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "sala" ? "#1a1512" : "#f7f7f5");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Navegação privada: o tema vale só para esta visita.
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("sala");
  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as Theme) ?? "sala");
  }, []);
  return [
    theme,
    (t: Theme) => {
      applyTheme(t);
      setTheme(t);
    },
  ] as const;
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();

  if (compact) {
    const next = theme === "sala" ? "galeria" : "sala";
    return (
      <button
        type="button"
        className="icon-btn"
        onClick={() => setTheme(next)}
        aria-label={next === "galeria" ? "Mudar para o tema Galeria (claro)" : "Mudar para o tema Sala (escuro)"}
        title={next === "galeria" ? "Tema Galeria" : "Tema Sala"}
      >
        {theme === "sala" ? <IconSun /> : <IconMoon />}
      </button>
    );
  }

  return (
    <div className="segmented" role="group" aria-label="Tema">
      <button type="button" aria-pressed={theme === "sala"} onClick={() => setTheme("sala")}>
        <IconMoon size={16} /> Sala
      </button>
      <button type="button" aria-pressed={theme === "galeria"} onClick={() => setTheme("galeria")}>
        <IconSun size={16} /> Galeria
      </button>
    </div>
  );
}
