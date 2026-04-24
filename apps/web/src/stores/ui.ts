import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";

interface UiState {
  theme: ThemeMode;
  locale: "ko" | "en";
  collapsed: boolean;
  toggleTheme: () => void;
  setLocale: (locale: "ko" | "en") => void;
  toggleCollapsed: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      locale: "ko",
      collapsed: false,
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setLocale: (locale) => set({ locale }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
    }),
    { name: "trinox-ui" },
  ),
);
