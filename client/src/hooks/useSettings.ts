import { useState, useEffect } from "react";
import type { Preferences } from "../Types/types";

export const useSettings = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [language, setLanguage] = useState<"en" | "es" | "fr">("en");
  const [preferences, setPreferences] = useState<Preferences>({
    notifications: true,
    compactMode: false,
  });

  // 🌓 Sync theme to HTML class and localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    if (storedTheme) setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
    preferences,
    setPreferences,
  };
};
