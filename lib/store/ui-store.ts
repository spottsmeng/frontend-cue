import { create } from "zustand";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "cue-theme";

function applyThemeAttribute(theme: ThemePreference) {
  if (typeof document === "undefined") return;
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    // Guarded, not just an SSR check — Safari private browsing (and some
    // test environments' `localStorage` shims) throw synchronously on
    // access rather than being merely absent.
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

interface UIState {
  // Client-only UI state with no server counterpart — the one rule Prompt
  // F0 gives for what belongs in this store instead of TanStack Query
  // (server data, its cache, its loading/error state all stay there).
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  projectSwitcherOpen: boolean;
  setProjectSwitcherOpen: (open: boolean) => void;

  // `app/globals.css`'s theme contract (prefers-color-scheme +
  // `[data-theme]` override) already existed before this session; this is
  // just the control that flips the attribute, persisted across visits via
  // localStorage rather than a server-side preference (there is no
  // per-user settings row for this, nor should there be — it's a device
  // preference, not project data).
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  projectSwitcherOpen: false,
  setProjectSwitcherOpen: (open) => set({ projectSwitcherOpen: open }),

  theme: readStoredTheme(),
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Same guard as readStoredTheme — a failed write still applies the
        // theme for this visit, it just won't persist to the next one.
      }
    }
    applyThemeAttribute(theme);
    set({ theme });
  },
}));
