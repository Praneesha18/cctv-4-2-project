const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";
const SESSION_NOTICE_KEY = "sessionNotice";
const SEARCH_HISTORY_KEY_PREFIX = "searchHistory";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function setSessionNotice(message) {
  localStorage.setItem(SESSION_NOTICE_KEY, message);
}

export function getSessionNotice() {
  return localStorage.getItem(SESSION_NOTICE_KEY);
}

export function consumeSessionNotice() {
  const message = getSessionNotice();
  if (message) {
    localStorage.removeItem(SESSION_NOTICE_KEY);
  }

  return message;
}

function getSearchHistoryStorageKey() {
  const user = getAuthUser();
  const userIdentifier = user?.id || user?._id || user?.email;

  if (!userIdentifier) {
    return null;
  }

  return `${SEARCH_HISTORY_KEY_PREFIX}:${String(userIdentifier).toLowerCase()}`;
}

export function getSearchHistory() {
  const storageKey = getSearchHistoryStorageKey();
  if (!storageKey) {
    return [];
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (typeof item === "string") {
          return {
            id: item,
            query: item,
            createdAt: null,
          };
        }

        if (!item || typeof item.query !== "string") {
          return null;
        }

        return {
          id: item.id || `${item.query}-${item.createdAt || "unknown"}`,
          query: item.query,
          createdAt: item.createdAt || null,
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function addSearchHistory(query) {
  const trimmedQuery = query.trim();
  const storageKey = getSearchHistoryStorageKey();
  if (!trimmedQuery || !storageKey) {
    return [];
  }

  const nextHistory = [
    {
      id: `${trimmedQuery}-${Date.now()}`,
      query: trimmedQuery,
      createdAt: new Date().toISOString(),
    },
    ...getSearchHistory().filter((item) => item.query !== trimmedQuery),
  ].slice(0, 8);

  localStorage.setItem(storageKey, JSON.stringify(nextHistory));
  return nextHistory;
}

export function removeSearchHistoryEntry(entryId) {
  const storageKey = getSearchHistoryStorageKey();
  if (!storageKey) {
    return [];
  }

  const nextHistory = getSearchHistory().filter((item) => item.id !== entryId);
  localStorage.setItem(storageKey, JSON.stringify(nextHistory));
  return nextHistory;
}

export function clearSearchHistory() {
  const storageKey = getSearchHistoryStorageKey();
  if (!storageKey) {
    return [];
  }

  localStorage.removeItem(storageKey);
  return [];
}
