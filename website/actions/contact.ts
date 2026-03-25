"use server";

import { guardPublicForm } from "@/lib/form-guard";
import {
  sendContactAcknowledgement,
  sendContactInboxEmail,
} from "@/lib/mailer";

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitContactMessage(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const message = String(formData.get("message") || "").trim();

  if (!name || !email || !message) {
    return {
      status: "error",
      message: "Please fill out your name, email, and message.",
    };
  }

  if (!email.includes("@")) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
    };
  }

  try {
    await guardPublicForm({
      formName: "contact",
      formData,
      email,
    });

    await sendContactInboxEmail({
      name,
      email,
      message,
    });

    try {
      await sendContactAcknowledgement({
        name,
        email,
      });
    } catch (ackError) {
      console.error("Contact acknowledgement failed", ackError);
    }

    return {
      status: "success",
      message: "Message sent. We'll get back to you soon.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Message delivery failed. Please try again.",
    };
  }
}
