"use server";

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitContactMessage(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!name || !email || !message) {
    return {
      status: "error",
      message: "Please fill out your name, email, and message.",
    };
  }

  console.log("Crevo contact form submission", {
    name,
    email,
    message,
    submittedAt: new Date().toISOString(),
  });

  return {
    status: "success",
    message: "Message received. We'll get back to you soon.",
  };
}
