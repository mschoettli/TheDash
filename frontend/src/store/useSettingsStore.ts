import { create } from "zustand";
import { persist } from "zustand/middleware";
import i18n from "../i18n/index";

type Theme = "light" | "dark" | "dashy";
type Language = "de" | "en";
type WidgetStyle = "card" | "compact" | "minimal";
type BackgroundMode = "default" | "custom";

interface SettingsState {
  theme: Theme;
  language: Language;
  widgetStyle: WidgetStyle;
  backgroundMode: BackgroundMode;
  backgroundImage: string;
  setTheme: (t: Theme) => void;
  setLanguage: (l: Language) => void;
  setWidgetStyle: (s: WidgetStyle) => void;
  setBackgroundMode: (m: BackgroundMode) => void;
  setBackgroundImage: (url: string) => void;
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
  if (theme === "dark" || theme === "dashy") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  document.documentElement.dataset.themePreset = theme;
}

function applyBackground(mode: BackgroundMode, image: string) {
  document.documentElement.dataset.background = mode;
  document.documentElement.style.setProperty("--custom-background-image", image.trim() ? `url("${image.trim()}")` : "none");
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dashy",
      language: "de",
      widgetStyle: "card",
      backgroundMode: "default",
      backgroundImage: "",

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

      setBackgroundMode: (backgroundMode) => {
        const image = useSettingsStore.getState().backgroundImage;
        applyBackground(backgroundMode, image);
        syncToBackend({ backgroundMode });
        set({ backgroundMode });
      },

      setBackgroundImage: (backgroundImage) => {
        const mode = backgroundImage.trim() ? "custom" : useSettingsStore.getState().backgroundMode;
        applyBackground(mode, backgroundImage);
        syncToBackend({ backgroundImage, backgroundMode: mode });
        set({ backgroundImage, backgroundMode: mode });
      },
    }),
    {
      name: "thedash-settings",
      version: 2,
      migrate: (persisted: unknown, version) => {
        const state = persisted as Partial<SettingsState> | undefined;
        if (!state) return persisted;
        if (version < 2 && state.theme !== "dashy") {
          return { ...state, theme: "dashy" };
        }
        return persisted;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
          applyBackground(state.backgroundMode ?? "default", state.backgroundImage ?? "");
          i18n.changeLanguage(state.language);
        }
      },
    }
  )
);
