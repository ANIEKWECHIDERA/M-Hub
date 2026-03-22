import { Resend } from "resend";
import { emailConfig, isEmailConfigured } from "../config/email";
import { logger } from "../utils/logger";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

let resendClient: Resend | null = null;

function getResendClient() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(emailConfig.resendApiKey);
  }

  return resendClient;
}

export const EmailService = {
  isConfigured() {
    return isEmailConfigured();
  },

  async send(input: SendEmailInput) {
    const resend = getResendClient();

    if (!resend) {
      logger.warn("EmailService.send: email provider not configured", {
        subject: input.subject,
      });
      return { skipped: true as const, reason: "not_configured" as const };
    }

    const recipients = Array.isArray(input.to) ? input.to : [input.to];

    const { data, error } = await resend.emails.send({
      from: emailConfig.fromAddress,
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? emailConfig.replyTo,
    });

    if (error) {
      logger.error("EmailService.send: resend error", {
        subject: input.subject,
        to: recipients,
        error,
      });
      throw new Error(error.message || "Failed to send email");
    }

    logger.info("EmailService.send: sent", {
      subject: input.subject,
      to: recipients,
      emailId: data?.id ?? null,
    });

    return { skipped: false as const, id: data?.id ?? null };
  },
};
