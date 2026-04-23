import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "../i18n/index";

type Theme = "light" | "dark";
type Language = "de" | "en";
type WidgetStyle = "card" | "compact" | "minimal";

interface SettingsState {
  theme: Theme;
  language: Language;
  widgetStyle: WidgetStyle;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setWidgetStyle: (s: WidgetStyle) => void;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function syncToBackend(data: Partial<Record<string, string>>) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }, 500);
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      language: "de",
      widgetStyle: "card",

      setTheme: (theme) => {
        applyTheme(theme);
        syncToBackend({ theme });
        set({ theme });
      },

      setLanguage: (language) => {
        i18n.changeLanguage(language);
        syncToBackend({ language });
        set({ language });
      },

      setWidgetStyle: (widgetStyle) => {
        syncToBackend({ widgetStyle });
        set({ widgetStyle });
      },
    }),
    {
      name: "thedash-settings",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
