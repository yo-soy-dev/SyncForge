const KEY = "coduet:preferences"

export const DEFAULT_PREFERENCES = {
  fontSize: 14,
  wordWrap: true,
  defaultLanguage: "javascript",
}

export const getPreferences = () => {
  try {
    return {
      ...DEFAULT_PREFERENCES,
      ...JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("syncforge:preferences") || "{}"),
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export const savePreferences = (prefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
  }
}