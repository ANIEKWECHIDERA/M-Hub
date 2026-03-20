import fs from "fs";
import path from "path";
import util from "util";
import winston from "winston";

const LOG_DIR = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.resolve(process.cwd(), "logs");
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const APP_LOG_PATH = path.join(LOG_DIR, "app.log");
const ERROR_LOG_PATH = path.join(LOG_DIR, "error.log");
const SENSITIVE_KEYS = new Set([
  "authorization",
  "password",
  "token",
  "firebaseToken",
  "idToken",
  "accessToken",
  "refreshToken",
  "cookie",
]);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const redactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (value && typeof value === "object") {
    const redactedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      redactedObject[key] = SENSITIVE_KEYS.has(key)
        ? "[redacted]"
        : redactValue(nestedValue);
    }

    return redactedObject;
  }

  return value;
};

const redactionFormat = winston.format((info) => {
  const clonedInfo = { ...info };

  for (const [key, value] of Object.entries(clonedInfo)) {
    if (key === "level" || key === "message" || key === "timestamp") {
      continue;
    }

    clonedInfo[key] = SENSITIVE_KEYS.has(key) ? "[redacted]" : redactValue(value);
  }

  return clonedInfo;
});

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  redactionFormat(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length
      ? `\n${util.inspect(meta, { depth: 6, colors: false, compact: false })}`
      : "";

    return `${timestamp} [${level}] ${message}${metaString}`;
  }),
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  redactionFormat(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: {
    service: "m-hub-backend",
    environment: process.env.NODE_ENV ?? "development",
  },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: APP_LOG_PATH,
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: ERROR_LOG_PATH,
      level: "error",
      format: jsonFormat,
    }),
  ],
});
