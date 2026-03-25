"use client";

import { useMemo } from "react";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function WaitlistOpsActions({ emails }: { emails: string[] }) {
  const bccLine = useMemo(() => emails.join(", "), [emails]);

  const copyEmails = async () => {
    if (!bccLine) {
      toast.error("No emails in this segment yet.");
      return;
    }

    await navigator.clipboard.writeText(bccLine);
    toast.success("Email list copied.");
  };

  const shareMailto = async () => {
    if (!bccLine) {
      toast.error("No emails in this segment yet.");
      return;
    }

    window.location.href = `mailto:?bcc=${encodeURIComponent(bccLine)}`;
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" size="sm" onClick={copyEmails}>
        <Copy className="h-4 w-4" />
        Copy emails
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={shareMailto}>
        <Share2 className="h-4 w-4" />
        Open BCC draft
      </Button>
    </div>
  );
}
