function normalizeDateInput(value: string) {
  if (!value) {
    return value;
  }

  return /z$|[+-]\d{2}:\d{2}$/i.test(value) ? value : `${value}Z`;
}

export function parseAppDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(normalizeDateInput(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTimestamp(value: string | Date | null | undefined) {
  const date = parseAppDate(value);

  if (!date) {
    return "Unknown";
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  if (Math.abs(diffMinutes) < 60) {
    if (Math.abs(diffMinutes) < 1) {
      return "now";
    }

    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}

export function formatShortTime(value: string | Date | null | undefined) {
  const date = parseAppDate(value);

  if (!date) {
    return "Unknown";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
