import { type SetStateAction, useEffect, useRef, useState } from "react";
import type { Preferences } from "../Types/types";
import {
  userSettingsAPI,
  type UpdateUserSettingsInput,
} from "@/api/user-settings.api";
import { useAuthContext } from "@/context/AuthContext";

const LOCAL_THEME_KEY = "crevo-theme";
const LOCAL_WORKSPACE_HEALTH_KEY = "crevo-workspace-health";

const getWorkspaceHealthStorageKey = (userId?: string | null) =>
  userId ? `${LOCAL_WORKSPACE_HEALTH_KEY}:${userId}` : LOCAL_WORKSPACE_HEALTH_KEY;

const DEFAULT_PREFERENCES: Preferences = {
  notifications: true,
  emailNotifications: true,
  taskAssignments: true,
  projectUpdates: true,
  commentNotifications: true,
  dailyFocusEmail: false,
  compactMode: false,
  workspaceHealth: false,
};

export const useSettings = () => {
  const { idToken, authStatus, currentUser } = useAuthContext();
  const [theme, setThemeState] = useState<"light" | "dark">("dark");
  const [language, setLanguageState] = useState<"en" | "es" | "fr">("en");
  const [preferences, setPreferencesState] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const applyTheme = (nextTheme: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem(LOCAL_THEME_KEY, nextTheme);
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem(LOCAL_THEME_KEY) as
      | "light"
      | "dark"
      | null;

    if (storedTheme) {
      setThemeState(storedTheme);
      applyTheme(storedTheme);
    } else {
      applyTheme("dark");
    }
  }, []);

  useEffect(() => {
    const storedWorkspaceHealth = localStorage.getItem(
      getWorkspaceHealthStorageKey(currentUser?.uid),
    );

    if (storedWorkspaceHealth === null) {
      return;
    }

    setPreferencesState((previous) => ({
      ...previous,
      workspaceHealth: storedWorkspaceHealth === "true",
    }));
  }, [currentUser?.uid]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      hydratedRef.current = false;
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const settings = await userSettingsAPI.get(idToken);

        if (cancelled) {
          return;
        }

        const nextTheme = settings.theme === "dark" ? "dark" : "light";
        setThemeState(nextTheme);
        setLanguageState((settings.language as "en" | "es" | "fr") ?? "en");
        const storedWorkspaceHealth = localStorage.getItem(
          getWorkspaceHealthStorageKey(currentUser?.uid),
        );
        setPreferencesState({
          notifications: settings.notifications_enabled,
          emailNotifications: settings.email_notifications_enabled,
          taskAssignments: settings.task_assignment_notifications,
          projectUpdates: settings.project_update_notifications,
          commentNotifications: settings.comment_notifications,
          dailyFocusEmail: settings.daily_focus_email_enabled,
          compactMode: settings.compact_mode,
          workspaceHealth:
            storedWorkspaceHealth === null
              ? DEFAULT_PREFERENCES.workspaceHealth
              : storedWorkspaceHealth === "true",
        });
        hydratedRef.current = true;
      } catch (settingsError: any) {
        if (!cancelled) {
          setError(settingsError.message || "Failed to load settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [authStatus?.onboardingState, currentUser?.uid, idToken]);

  const patchSettings = async (payload: UpdateUserSettingsInput) => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await userSettingsAPI.update(payload, idToken);
      hydratedRef.current = true;
    } catch (settingsError: any) {
      setError(settingsError.message || "Failed to update settings");
      throw settingsError;
    } finally {
      setSaving(false);
    }
  };

  const setTheme = (
    value:
      | SetStateAction<"light" | "dark">
      | "light"
      | "dark",
  ) => {
    setThemeState((prev) => {
      const nextTheme = typeof value === "function" ? value(prev) : value;
      void patchSettings({ theme: nextTheme });
      return nextTheme;
    });
  };

  const setLanguage = (
    value:
      | SetStateAction<"en" | "es" | "fr">
      | "en"
      | "es"
      | "fr",
  ) => {
    setLanguageState((prev) => {
      const nextLanguage = typeof value === "function" ? value(prev) : value;
      void patchSettings({ language: nextLanguage });
      return nextLanguage;
    });
  };

  const setPreferences = (
    value: SetStateAction<Preferences>,
  ) => {
    setPreferencesState((prev) => {
      const nextPreferences =
        typeof value === "function" ? value(prev) : value;

      if (hydratedRef.current) {
        localStorage.setItem(
          getWorkspaceHealthStorageKey(currentUser?.uid),
          String(nextPreferences.workspaceHealth),
        );
        void patchSettings({
          notifications_enabled: nextPreferences.notifications,
          email_notifications_enabled: nextPreferences.emailNotifications,
          task_assignment_notifications: nextPreferences.taskAssignments,
          project_update_notifications: nextPreferences.projectUpdates,
          comment_notifications: nextPreferences.commentNotifications,
          daily_focus_email_enabled: nextPreferences.dailyFocusEmail,
          compact_mode: nextPreferences.compactMode,
        });
      }

      if (!hydratedRef.current) {
        localStorage.setItem(
          getWorkspaceHealthStorageKey(currentUser?.uid),
          String(nextPreferences.workspaceHealth),
        );
      }

      return nextPreferences;
    });
  };

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
    loading,
    saving,
    error,
  };
};
