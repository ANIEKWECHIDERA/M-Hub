"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Mail, User } from "lucide-react";
import { toast } from "sonner";

import { submitContactMessage, type ContactActionState } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactActionState = {
  status: "idle",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit">{pending ? "Sending..." : "Send message"}</Button>;
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactMessage, initialState);
  const startedAtRef = useRef<HTMLInputElement | null>(null);

  const stampFormStart = () => {
    if (startedAtRef.current && !startedAtRef.current.value) {
      startedAtRef.current.value = String(Date.now());
    }
  };

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(state.message);
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  return (
    <Card className="surface-outline">
      <CardHeader>
        <CardTitle>Talk to the founding team</CardTitle>
        <CardDescription>
          Questions, partnerships, or launch interest. Send a note and we&apos;ll reply.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="space-y-4"
          onFocusCapture={stampFormStart}
          onPointerDownCapture={stampFormStart}
        >
          <input ref={startedAtRef} type="hidden" name="startedAt" defaultValue="" />
          <div className="hidden" aria-hidden="true">
            <label htmlFor="contact-company-website">Leave this field empty</label>
            <Input
              id="contact-company-website"
              name="companyWebsite"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="contact-name" className="text-sm font-medium">Name</label>
              <div className="relative">
                <User className="field-icon" />
                <Input id="contact-name" name="name" autoComplete="name" placeholder="Your name" className="field-with-icon" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="contact-email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="field-icon" />
                <Input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@agency.com" className="field-with-icon" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="contact-message" className="text-sm font-medium">Message</label>
            <Textarea id="contact-message" name="message" autoComplete="off" placeholder="Tell us about your team, what you're evaluating, or what you want Crevo to help with." />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
