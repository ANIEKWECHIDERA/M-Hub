export const emailConfig = {
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  appName: process.env.APP_NAME ?? "Crevo",
  tagline:
    process.env.APP_TAGLINE ?? "Built for agencies. Not adapted for them.",
  footerText:
    process.env.EMAIL_FOOTER_TEXT ??
    "© 2026 Crevo · trycrevo.com · All rights reserved.",
  supportEmail: process.env.APP_SUPPORT_EMAIL ?? "help@trycrevo.com",
  baseUrl: process.env.EMAIL_BASE_URL ?? "https://app.trycrevo.com",
  fromAddress: process.env.EMAIL_FROM ?? "Crevo <hello@mail.trycrevo.com>",
  replyTo: process.env.EMAIL_REPLY_TO ?? "help@trycrevo.com",
  unsubscribeUrl:
    process.env.EMAIL_UNSUBSCRIBE_URL ?? "mailto:help@trycrevo.com",
};

export function isEmailConfigured() {
  return Boolean(emailConfig.resendApiKey && emailConfig.fromAddress);
}
