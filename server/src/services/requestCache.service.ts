import crypto from "crypto";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CachedUserRecord = Record<string, any>;
type CachedTeamMemberRecord = Record<string, any> | null;
type CachedNotificationResponse = {
  etag: string;
  payload: {
    notifications: any[];
    unreadCount: number;
  };
};
type CachedTokenRecord = {
  decoded: Record<string, any>;
};
type CachedOnboardingState = {
  onboardingState: string;
  profileComplete: boolean;
  hasCompany: boolean;
  access: string | null;
  companyId: string | null;
};

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_CACHE_TTL_MS = 2 * 60 * 1000;
const TEAM_MEMBER_CACHE_TTL_MS = 60 * 1000;
const NOTIFICATION_CACHE_TTL_MS = 20 * 1000;
const ONBOARDING_CACHE_TTL_MS = 60 * 1000;

const tokenCache = new Map<string, CacheEntry<CachedTokenRecord>>();
const userCache = new Map<string, CacheEntry<CachedUserRecord>>();
const onboardingCache = new Map<string, CacheEntry<CachedOnboardingState>>();
const teamMemberCache = new Map<string, CacheEntry<CachedTeamMemberRecord>>();
const notificationCache = new Map<
  string,
  CacheEntry<CachedNotificationResponse>
>();

const userIdToFirebaseUid = new Map<string, string>();
const userIdToTeamMemberKeys = new Map<string, Set<string>>();
const notificationKeysByUser = new Map<string, Set<string>>();

function getValidCacheEntry<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

function getTeamMemberCacheKey(userId: string, companyId?: string | null) {
  return `${userId}:${companyId ?? "__default__"}`;
}

function getNotificationCacheKey(
  companyId: string,
  userId: string,
  limit: number,
) {
  return `${companyId}:${userId}:${limit}`;
}

function rememberTeamMemberKey(userId: string, key: string) {
  const keys = userIdToTeamMemberKeys.get(userId) ?? new Set<string>();
  keys.add(key);
  userIdToTeamMemberKeys.set(userId, keys);
}

function rememberNotificationKey(userId: string, key: string) {
  const keys = notificationKeysByUser.get(userId) ?? new Set<string>();
  keys.add(key);
  notificationKeysByUser.set(userId, keys);
}

function clearTrackedKeys(map: Map<string, Set<string>>, key: string) {
  const keys = map.get(key);
  if (!keys) {
    return;
  }

  keys.clear();
  map.delete(key);
}

function invalidateTeamMemberEntries(userId: string) {
  const keys = userIdToTeamMemberKeys.get(userId);
  if (!keys) {
    return;
  }

  keys.forEach((key) => teamMemberCache.delete(key));
  clearTrackedKeys(userIdToTeamMemberKeys, userId);
}

function invalidateNotificationEntries(userId: string) {
  const keys = notificationKeysByUser.get(userId);
  if (!keys) {
    return;
  }

  keys.forEach((key) => notificationCache.delete(key));
  clearTrackedKeys(notificationKeysByUser, userId);
}

function resolveFirebaseUid(userId?: string | null, firebaseUid?: string | null) {
  if (firebaseUid) {
    return firebaseUid;
  }

  if (!userId) {
    return null;
  }

  return userIdToFirebaseUid.get(userId) ?? null;
}

export const RequestCacheService = {
  hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  },

  getVerifiedToken(token: string) {
    return getValidCacheEntry(tokenCache, this.hashToken(token))?.decoded ?? null;
  },

  setVerifiedToken(token: string, decoded: Record<string, any>) {
    const now = Date.now();
    const tokenExpiryMs = decoded.exp ? Number(decoded.exp) * 1000 - now : 0;
    const ttlMs =
      tokenExpiryMs > 0
        ? Math.max(1000, Math.min(TOKEN_CACHE_TTL_MS, tokenExpiryMs))
        : TOKEN_CACHE_TTL_MS;

    setCacheEntry(tokenCache, this.hashToken(token), { decoded }, ttlMs);
  },

  getUser(firebaseUid: string) {
    return getValidCacheEntry(userCache, firebaseUid);
  },

  setUser(firebaseUid: string, user: CachedUserRecord) {
    if (user?.id) {
      userIdToFirebaseUid.set(String(user.id), firebaseUid);
    }

    setCacheEntry(userCache, firebaseUid, user, USER_CACHE_TTL_MS);
  },

  getOnboardingState(firebaseUid: string) {
    return getValidCacheEntry(onboardingCache, firebaseUid);
  },

  setOnboardingState(firebaseUid: string, state: CachedOnboardingState) {
    setCacheEntry(onboardingCache, firebaseUid, state, ONBOARDING_CACHE_TTL_MS);
  },

  getTeamMember(userId: string, companyId?: string | null) {
    return getValidCacheEntry(
      teamMemberCache,
      getTeamMemberCacheKey(userId, companyId),
    );
  },

  setTeamMember(
    userId: string,
    companyId: string | null | undefined,
    teamMember: CachedTeamMemberRecord,
  ) {
    const key = getTeamMemberCacheKey(userId, companyId);
    rememberTeamMemberKey(userId, key);
    setCacheEntry(teamMemberCache, key, teamMember, TEAM_MEMBER_CACHE_TTL_MS);
  },

  getNotificationResponse(companyId: string, userId: string, limit: number) {
    return getValidCacheEntry(
      notificationCache,
      getNotificationCacheKey(companyId, userId, limit),
    );
  },

  setNotificationResponse(
    companyId: string,
    userId: string,
    limit: number,
    response: CachedNotificationResponse,
  ) {
    const key = getNotificationCacheKey(companyId, userId, limit);
    rememberNotificationKey(userId, key);
    setCacheEntry(
      notificationCache,
      key,
      response,
      NOTIFICATION_CACHE_TTL_MS,
    );
  },

  invalidateUserContext(params: { userId?: string | null; firebaseUid?: string | null }) {
    const firebaseUid = resolveFirebaseUid(params.userId, params.firebaseUid);

    if (firebaseUid) {
      userCache.delete(firebaseUid);
      onboardingCache.delete(firebaseUid);
    }

    if (params.userId) {
      invalidateTeamMemberEntries(params.userId);
      invalidateNotificationEntries(params.userId);
    }
  },

  invalidateNotificationUser(userId: string) {
    invalidateNotificationEntries(userId);
  },

  invalidateAll() {
    tokenCache.clear();
    userCache.clear();
    onboardingCache.clear();
    teamMemberCache.clear();
    notificationCache.clear();
    userIdToFirebaseUid.clear();
    userIdToTeamMemberKeys.clear();
    notificationKeysByUser.clear();
  },
};
