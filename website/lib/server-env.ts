import "server-only";

const defaultInbox = "hi@trycrevo.com";
const defaultNotifyEmail = "notify@trycrevo.com";
const defaultNotifyFrom = `Crevo <${defaultNotifyEmail}>`;
const defaultSmtpHost = "mail.trycrevo.com";
const defaultSmtpPort = 465;

function readRuntimeEnv(key: string) {
  return process.env[key];
}

function envKey(...parts: string[]) {
  return parts.join("_");
}

export function getServerEnv() {
  return {
    supabaseUrl: readRuntimeEnv(envKey("NEXT", "PUBLIC", "SUPABASE", "URL")),
    supabaseServiceRoleKey: readRuntimeEnv(
      envKey("SUPABASE", "SERVICE", "ROLE", "KEY"),
    ),
    waitlistAdminEmail: readRuntimeEnv(
      envKey("WAITLIST", "ADMIN", "EMAIL"),
    ),
    waitlistAdminPassword: readRuntimeEnv(
      envKey("WAITLIST", "ADMIN", "PASSWORD"),
    ),
    waitlistAdminSessionSecret: readRuntimeEnv(
      envKey("WAITLIST", "ADMIN", "SESSION", "SECRET"),
    ),
    contactInboxEmail:
      readRuntimeEnv(envKey("CONTACT", "INBOX", "EMAIL")) || defaultInbox,
    smtpHost: readRuntimeEnv(envKey("SMTP", "HOST")) || defaultSmtpHost,
    smtpPort: Number(readRuntimeEnv(envKey("SMTP", "PORT")) || defaultSmtpPort),
    smtpUser: readRuntimeEnv(envKey("SMTP", "USER")) || defaultNotifyEmail,
    smtpPass: readRuntimeEnv(envKey("SMTP", "PASS")),
    smtpFrom: readRuntimeEnv(envKey("SMTP", "FROM")) || defaultNotifyFrom,
  };
}

export const serverEnvDefaults = {
  defaultInbox,
  defaultNotifyEmail,
  defaultNotifyFrom,
  defaultSmtpHost,
  defaultSmtpPort,
};
