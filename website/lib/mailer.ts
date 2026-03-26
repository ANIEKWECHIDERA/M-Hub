import "server-only";

import nodemailer from "nodemailer";

import { siteConfig } from "@/lib/site";
import { getServerEnv, serverEnvDefaults } from "@/lib/server-env";

function getSmtpConfig() {
  const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, contactInboxEmail } =
    getServerEnv();

  if (!smtpPass) {
    throw new Error(
      "Missing SMTP_PASS. Configure website email delivery before using the contact form in production.",
    );
  }

  return {
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    from: smtpFrom,
    inbox: contactInboxEmail,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderButton(label: string, href: string) {
  return `
    <a
      href="${escapeHtml(href)}"
      style="display:inline-block;padding:14px 20px;border-radius:999px;background:#c8f135;color:#0c0c0f;text-decoration:none;font-size:14px;font-weight:700;line-height:1.2;"
    >
      ${escapeHtml(label)}
    </a>
  `;
}

function renderEmailShell({
  preheader,
  eyebrow,
  title,
  intro,
  contentHtml,
}: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  contentHtml: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#0c0c0f;color:#f0eee8;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 12px;background:#0c0c0f;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid rgba(240,238,232,0.08);background:#16161e;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:24px 20px 12px;border-bottom:1px solid rgba(240,238,232,0.08);">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="height:40px;width:40px;border-radius:12px;background:#c8f135;color:#0c0c0f;font-size:18px;font-weight:800;line-height:40px;text-align:center;">C</div>
                  <div>
                    <div style="font-size:20px;font-weight:700;line-height:1.2;color:#f0eee8;">${escapeHtml(siteConfig.name)}</div>
                    <div style="font-size:12px;line-height:1.5;color:#9492a0;">${escapeHtml(siteConfig.secondaryTagline)}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 20px 28px;">
                <div style="display:inline-flex;border:1px solid rgba(200,241,53,0.24);background:rgba(200,241,53,0.08);padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700;line-height:1;text-transform:uppercase;letter-spacing:0.12em;color:#c8f135;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.1;letter-spacing:-0.03em;color:#f0eee8;">${escapeHtml(title)}</h1>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#b4b1bc;">${escapeHtml(intro)}</p>
                ${contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 24px;">
                <div style="border-top:1px solid rgba(240,238,232,0.08);padding-top:18px;font-size:12px;line-height:1.7;color:#7e7b88;">
                  <div>${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.domain)}</div>
                  <div>Questions? Reply to this email or reach us at <a href="mailto:${serverEnvDefaults.defaultInbox}" style="color:#f0eee8;">${serverEnvDefaults.defaultInbox}</a>.</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendMail({
  to,
  replyTo,
  subject,
  text,
  html,
}: {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    replyTo,
    subject,
    text,
    html,
  });
}

export async function sendContactInboxEmail({
  name,
  email,
  message,
}: {
  name: string;
  email: string;
  message: string;
}) {
  const { contactInboxEmail } = getServerEnv();
  const html = renderEmailShell({
    preheader: `New contact message from ${name}`,
    eyebrow: "New contact",
    title: `Message from ${name}`,
    intro: "A new message just came in from the website contact form.",
    contentHtml: `
      <div style="border:1px solid rgba(240,238,232,0.08);background:#111118;border-radius:20px;padding:18px;">
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#9492a0;">Reply to</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#f0eee8;">${escapeHtml(email)}</p>
        <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#9492a0;">Message</p>
        <p style="margin:0;font-size:15px;line-height:1.8;color:#f0eee8;">${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      </div>
    `,
  });

  await sendMail({
    to: contactInboxEmail,
    replyTo: email,
    subject: `New website contact from ${name}`,
    text: [`Name: ${name}`, `Email: ${email}`, "", message].join("\n"),
    html,
  });
}

export async function sendContactAcknowledgement({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const html = renderEmailShell({
    preheader: "We received your message.",
    eyebrow: "Contact received",
    title: "Thanks for reaching out.",
    intro: `Hi ${name}, we received your message. The Crevo team will get back to you soon.`,
    contentHtml: `
      <div style="border:1px solid rgba(240,238,232,0.08);background:#111118;border-radius:20px;padding:18px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#b4b1bc;">
          If your note is about launch access, pricing, or partnership ideas, you can expect a reply from the team after review.
        </p>
        ${renderButton("Visit Crevo", siteConfig.siteUrl)}
      </div>
    `,
  });

  await sendMail({
    to: email,
    subject: "We received your message",
    text: `Hi ${name}, we received your message and will get back to you soon. Visit ${siteConfig.siteUrl}`,
    html,
  });
}

export async function sendWaitlistAcknowledgement({
  email,
  name,
  referralLink,
}: {
  email: string;
  name?: string | null;
  referralLink: string;
}) {
  const firstName = name?.trim() || "there";
  const html = renderEmailShell({
    preheader: "Your spot on the Crevo waitlist is confirmed.",
    eyebrow: "Waitlist confirmed",
    title: "You are on the list.",
    intro: `Hi ${firstName}, your spot on the Crevo waitlist is locked in. We will keep you posted as launch access rolls out.`,
    contentHtml: `
      <div style="border:1px solid rgba(240,238,232,0.08);background:#111118;border-radius:20px;padding:18px;">
        <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#9492a0;">Your referral link</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.8;color:#f0eee8;word-break:break-word;">${escapeHtml(referralLink)}</p>
        ${renderButton("View your referral link", referralLink)}
      </div>
    `,
  });

  await sendMail({
    to: email,
    subject: "Your Crevo waitlist spot is confirmed",
    text: `Hi ${firstName}, your Crevo waitlist spot is confirmed. Share your referral link: ${referralLink}`,
    html,
  });
}
