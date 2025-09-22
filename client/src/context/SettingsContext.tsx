import { createContext, useContext } from "react";
import { useSettings } from "../hooks/useSettings";
import type { SettingsContextType } from "../Types/types";

// 1. Create Context
const SettingsContext = createContext<SettingsContextType | null>(null);

// 2. Create Hook
export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider"
    );
  }
  return context;
};

// 3. Provider
export const SettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    preferences,
    setPreferences,
    toggleTheme,
  } = useSettings();

  const value = {
    theme,
    setTheme,
    toggleTheme,
    language,
    setLanguage,
    preferences,
    setPreferences,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
