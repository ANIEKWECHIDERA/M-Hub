import crypto from "crypto";
import { logger } from "../utils/logger";

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
type CachedChatMembershipRecord = {
  context: Record<string, any> | null;
};

const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_CACHE_TTL_MS = 2 * 60 * 1000;
const TEAM_MEMBER_CACHE_TTL_MS = 60 * 1000;
const NOTIFICATION_CACHE_TTL_MS = 20 * 1000;
const ONBOARDING_CACHE_TTL_MS = 60 * 1000;
const CHAT_MEMBERSHIP_CACHE_TTL_MS = 45 * 1000;

type CacheNamespace =
  | "token"
  | "user"
  | "onboarding"
  | "team_member"
  | "notification"
  | "chat_membership";

type CacheMetrics = {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
};

type CacheMeta = {
  requestPath?: string;
  ttlMs?: number;
  reason?: string;
  invalidatedKeys?: number;
};

const tokenCache = new Map<string, CacheEntry<CachedTokenRecord>>();
const userCache = new Map<string, CacheEntry<CachedUserRecord>>();
const onboardingCache = new Map<string, CacheEntry<CachedOnboardingState>>();
const teamMemberCache = new Map<string, CacheEntry<CachedTeamMemberRecord>>();
const notificationCache = new Map<
  string,
  CacheEntry<CachedNotificationResponse>
>();
const chatMembershipCache = new Map<
  string,
  CacheEntry<CachedChatMembershipRecord>
>();

const userIdToFirebaseUid = new Map<string, string>();
const userIdToTeamMemberKeys = new Map<string, Set<string>>();
const notificationKeysByUser = new Map<string, Set<string>>();
const chatMembershipKeysByConversation = new Map<string, Set<string>>();
const chatMembershipKeysByUser = new Map<string, Set<string>>();

const cacheMetrics: Record<CacheNamespace, CacheMetrics> = {
  token: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
  user: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
  onboarding: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
  team_member: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
  notification: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
  chat_membership: { hits: 0, misses: 0, sets: 0, invalidations: 0 },
};

const CACHE_LOG_SAMPLE_INTERVAL = 25;

function getHitRate(namespace: CacheNamespace) {
  const stats = cacheMetrics[namespace];
  const total = stats.hits + stats.misses;
  return total === 0 ? 0 : Number(((stats.hits / total) * 100).toFixed(2));
}

function recordMetric(
  namespace: CacheNamespace,
  operation: keyof CacheMetrics,
  meta?: CacheMeta,
) {
  cacheMetrics[namespace][operation] += 1;

  const namespaceTotals = cacheMetrics[namespace];
  const totalEvents =
    namespaceTotals.hits +
    namespaceTotals.misses +
    namespaceTotals.sets +
    namespaceTotals.invalidations;

  const shouldLog =
    operation === "invalidations" ||
    operation === "sets" ||
    totalEvents <= 5 ||
    totalEvents % CACHE_LOG_SAMPLE_INTERVAL === 0;

  if (!shouldLog) {
    return;
  }

  logger.info("RequestCacheService.metric", {
    namespace,
    operation,
    hitRate: getHitRate(namespace),
    ...namespaceTotals,
    ...meta,
  });
}

function getValidCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  namespace: CacheNamespace,
  meta?: CacheMeta,
) {
  const entry = cache.get(key);

  if (!entry) {
    recordMetric(namespace, "misses", meta);
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    recordMetric(namespace, "misses", {
      ...meta,
      reason: meta?.reason ?? "expired",
    });
    return null;
  }

  recordMetric(namespace, "hits", meta);
  return entry.value;
}

function setCacheEntry<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
  namespace: CacheNamespace,
  meta?: CacheMeta,
) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });

  recordMetric(namespace, "sets", {
    ...meta,
    ttlMs,
  });
}

function getTeamMemberCacheKey(userId: string, companyId?: string | null) {
  return `team_member:${userId}:${companyId ?? "__default__"}`;
}

function getTokenCacheKey(tokenHash: string) {
  return `token:${tokenHash}`;
}

function getUserCacheKey(firebaseUid: string) {
  return `user:${firebaseUid}`;
}

function getOnboardingCacheKey(firebaseUid: string) {
  return `onboarding:${firebaseUid}`;
}

function getNotificationCacheKey(
  companyId: string,
  userId: string,
  limit: number,
) {
  return `notification:${companyId}:${userId}:limit=${limit}`;
}

function getChatMembershipCacheKey(
  companyId: string,
  conversationId: string,
  userId: string,
) {
  return `chat_membership:${companyId}:${conversationId}:${userId}`;
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

function rememberChatMembershipKey(
  conversationId: string,
  userId: string,
  key: string,
) {
  const conversationKeys =
    chatMembershipKeysByConversation.get(conversationId) ?? new Set<string>();
  conversationKeys.add(key);
  chatMembershipKeysByConversation.set(conversationId, conversationKeys);

  const userKeys = chatMembershipKeysByUser.get(userId) ?? new Set<string>();
  userKeys.add(key);
  chatMembershipKeysByUser.set(userId, userKeys);
}

function clearTrackedKeys(map: Map<string, Set<string>>, key: string) {
  const keys = map.get(key);
  if (!keys) {
    return;
  }

  keys.clear();
  map.delete(key);
}

function invalidateTeamMemberEntries(userId: string, meta?: CacheMeta) {
  const keys = userIdToTeamMemberKeys.get(userId);
  if (!keys) {
    return;
  }

  keys.forEach((key) => teamMemberCache.delete(key));
  recordMetric("team_member", "invalidations", {
    ...meta,
    reason: meta?.reason ?? "user_context_changed",
    invalidatedKeys: keys.size,
  });
  clearTrackedKeys(userIdToTeamMemberKeys, userId);
}

function invalidateNotificationEntries(userId: string, meta?: CacheMeta) {
  const keys = notificationKeysByUser.get(userId);
  if (!keys) {
    return;
  }

  keys.forEach((key) => notificationCache.delete(key));
  recordMetric("notification", "invalidations", {
    ...meta,
    reason: meta?.reason ?? "user_notifications_changed",
    invalidatedKeys: keys.size,
  });
  clearTrackedKeys(notificationKeysByUser, userId);
}

function clearChatMembershipKeyTracking(
  conversationId: string,
  userId: string,
  keys: Iterable<string>,
) {
  const conversationKeys = chatMembershipKeysByConversation.get(conversationId);
  if (conversationKeys) {
    for (const key of keys) {
      conversationKeys.delete(key);
    }
    if (!conversationKeys.size) {
      chatMembershipKeysByConversation.delete(conversationId);
    }
  }

  const userKeys = chatMembershipKeysByUser.get(userId);
  if (userKeys) {
    for (const key of keys) {
      userKeys.delete(key);
    }
    if (!userKeys.size) {
      chatMembershipKeysByUser.delete(userId);
    }
  }
}

function invalidateChatMembershipKeys(keys: Set<string>, meta?: CacheMeta) {
  if (!keys.size) {
    return;
  }

  keys.forEach((key) => chatMembershipCache.delete(key));
  recordMetric("chat_membership", "invalidations", {
    ...meta,
    reason: meta?.reason ?? "chat_membership_changed",
    invalidatedKeys: keys.size,
  });
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

  getVerifiedToken(token: string, meta?: CacheMeta) {
    return (
      getValidCacheEntry(
        tokenCache,
        getTokenCacheKey(this.hashToken(token)),
        "token",
        meta,
      )
        ?.decoded ?? null
    );
  },

  setVerifiedToken(token: string, decoded: Record<string, any>, meta?: CacheMeta) {
    const now = Date.now();
    const tokenExpiryMs = decoded.exp ? Number(decoded.exp) * 1000 - now : 0;
    const ttlMs =
      tokenExpiryMs > 0
        ? Math.max(1000, Math.min(TOKEN_CACHE_TTL_MS, tokenExpiryMs))
        : TOKEN_CACHE_TTL_MS;

    setCacheEntry(
      tokenCache,
      getTokenCacheKey(this.hashToken(token)),
      { decoded },
      ttlMs,
      "token",
      meta,
    );
  },

  getUser(firebaseUid: string, meta?: CacheMeta) {
    return getValidCacheEntry(userCache, getUserCacheKey(firebaseUid), "user", meta);
  },

  setUser(firebaseUid: string, user: CachedUserRecord, meta?: CacheMeta) {
    if (user?.id) {
      userIdToFirebaseUid.set(String(user.id), firebaseUid);
    }

    setCacheEntry(
      userCache,
      getUserCacheKey(firebaseUid),
      user,
      USER_CACHE_TTL_MS,
      "user",
      meta,
    );
  },

  getOnboardingState(firebaseUid: string, meta?: CacheMeta) {
    return getValidCacheEntry(
      onboardingCache,
      getOnboardingCacheKey(firebaseUid),
      "onboarding",
      meta,
    );
  },

  setOnboardingState(
    firebaseUid: string,
    state: CachedOnboardingState,
    meta?: CacheMeta,
  ) {
    setCacheEntry(
      onboardingCache,
      getOnboardingCacheKey(firebaseUid),
      state,
      ONBOARDING_CACHE_TTL_MS,
      "onboarding",
      meta,
    );
  },

  getTeamMember(userId: string, companyId?: string | null, meta?: CacheMeta) {
    return getValidCacheEntry(
      teamMemberCache,
      getTeamMemberCacheKey(userId, companyId),
      "team_member",
      meta,
    );
  },

  setTeamMember(
    userId: string,
    companyId: string | null | undefined,
    teamMember: CachedTeamMemberRecord,
    meta?: CacheMeta,
  ) {
    const key = getTeamMemberCacheKey(userId, companyId);
    rememberTeamMemberKey(userId, key);
    setCacheEntry(
      teamMemberCache,
      key,
      teamMember,
      TEAM_MEMBER_CACHE_TTL_MS,
      "team_member",
      meta,
    );
  },

  getNotificationResponse(
    companyId: string,
    userId: string,
    limit: number,
    meta?: CacheMeta,
  ) {
    return getValidCacheEntry(
      notificationCache,
      getNotificationCacheKey(companyId, userId, limit),
      "notification",
      meta,
    );
  },

  setNotificationResponse(
    companyId: string,
    userId: string,
    limit: number,
    response: CachedNotificationResponse,
    meta?: CacheMeta,
  ) {
    const key = getNotificationCacheKey(companyId, userId, limit);
    rememberNotificationKey(userId, key);
    setCacheEntry(
      notificationCache,
      key,
      response,
      NOTIFICATION_CACHE_TTL_MS,
      "notification",
      meta,
    );
  },

  getChatMembership(
    companyId: string,
    conversationId: string,
    userId: string,
    meta?: CacheMeta,
  ) {
    return getValidCacheEntry(
      chatMembershipCache,
      getChatMembershipCacheKey(companyId, conversationId, userId),
      "chat_membership",
      meta,
    );
  },

  setChatMembership(
    companyId: string,
    conversationId: string,
    userId: string,
    membership: Record<string, any> | null,
    meta?: CacheMeta,
  ) {
    const key = getChatMembershipCacheKey(companyId, conversationId, userId);
    rememberChatMembershipKey(conversationId, userId, key);
    setCacheEntry(
      chatMembershipCache,
      key,
      { context: membership },
      CHAT_MEMBERSHIP_CACHE_TTL_MS,
      "chat_membership",
      meta,
    );
  },

  invalidateChatMembershipForConversation(
    conversationId: string,
    meta?: CacheMeta,
  ) {
    const keys = chatMembershipKeysByConversation.get(conversationId);
    if (!keys?.size) {
      return;
    }

    const keysToRemove = new Set(keys);
    invalidateChatMembershipKeys(keysToRemove, {
      ...meta,
      reason: meta?.reason ?? "chat_membership_changed",
    });

    for (const [userId, userKeys] of chatMembershipKeysByUser.entries()) {
      const intersectingKeys = [...keysToRemove].filter((key) => userKeys.has(key));
      if (intersectingKeys.length) {
        clearChatMembershipKeyTracking(
          conversationId,
          userId,
          intersectingKeys,
        );
      }
    }
  },

  invalidateChatMembershipForUser(
    userId: string,
    meta?: CacheMeta,
  ) {
    const keys = chatMembershipKeysByUser.get(userId);
    if (!keys?.size) {
      return;
    }

    const keysToRemove = new Set(keys);
    invalidateChatMembershipKeys(keysToRemove, {
      ...meta,
      reason: meta?.reason ?? "chat_membership_changed",
    });

    for (const [conversationId, conversationKeys] of chatMembershipKeysByConversation.entries()) {
      const intersectingKeys = [...keysToRemove].filter((key) =>
        conversationKeys.has(key),
      );
      if (intersectingKeys.length) {
        clearChatMembershipKeyTracking(
          conversationId,
          userId,
          intersectingKeys,
        );
      }
    }
  },

  invalidateUserContext(
    params: { userId?: string | null; firebaseUid?: string | null },
    meta?: CacheMeta,
  ) {
    const firebaseUid = resolveFirebaseUid(params.userId, params.firebaseUid);

    if (firebaseUid) {
      userCache.delete(getUserCacheKey(firebaseUid));
      onboardingCache.delete(getOnboardingCacheKey(firebaseUid));
      recordMetric("user", "invalidations", {
        ...meta,
        reason: "user_context_changed",
        invalidatedKeys: 1,
      });
      recordMetric("onboarding", "invalidations", {
        ...meta,
        reason: "user_context_changed",
        invalidatedKeys: 1,
      });
    }

    if (params.userId) {
      invalidateTeamMemberEntries(params.userId, meta);
      invalidateNotificationEntries(params.userId, meta);
      this.invalidateChatMembershipForUser(params.userId, {
        ...meta,
        reason: meta?.reason ?? "user_context_changed",
      });
    }
  },

  invalidateNotificationUser(userId: string, meta?: CacheMeta) {
    invalidateNotificationEntries(userId, meta);
  },

  invalidateAll() {
    tokenCache.clear();
    userCache.clear();
    onboardingCache.clear();
    teamMemberCache.clear();
    notificationCache.clear();
    chatMembershipCache.clear();
    userIdToFirebaseUid.clear();
    userIdToTeamMemberKeys.clear();
    notificationKeysByUser.clear();
    chatMembershipKeysByConversation.clear();
    chatMembershipKeysByUser.clear();
    recordMetric("token", "invalidations", { reason: "invalidate_all" });
    recordMetric("user", "invalidations", { reason: "invalidate_all" });
    recordMetric("onboarding", "invalidations", { reason: "invalidate_all" });
    recordMetric("team_member", "invalidations", { reason: "invalidate_all" });
    recordMetric("notification", "invalidations", { reason: "invalidate_all" });
    recordMetric("chat_membership", "invalidations", { reason: "invalidate_all" });
  },

  getMetricsSnapshot() {
    return {
      token: { ...cacheMetrics.token, hitRate: getHitRate("token") },
      user: { ...cacheMetrics.user, hitRate: getHitRate("user") },
      onboarding: {
        ...cacheMetrics.onboarding,
        hitRate: getHitRate("onboarding"),
      },
      team_member: {
        ...cacheMetrics.team_member,
        hitRate: getHitRate("team_member"),
      },
      notification: {
        ...cacheMetrics.notification,
        hitRate: getHitRate("notification"),
      },
      chat_membership: {
        ...cacheMetrics.chat_membership,
        hitRate: getHitRate("chat_membership"),
      },
    };
  },
};
