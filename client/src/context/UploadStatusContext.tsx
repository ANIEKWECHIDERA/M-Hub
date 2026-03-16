import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type UploadStatusContextValue = {
  uploading: boolean;
  label: string;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
  startUpload: (label?: string) => void;
  setUploadProgress: (progress: number) => void;
  finishUpload: (options?: { success?: boolean; message?: string }) => void;
  resetUpload: () => void;
};

const UploadStatusContext = createContext<UploadStatusContextValue | null>(null);

export function UploadStatusProvider({ children }: { children: ReactNode }) {
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("Uploading...");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">(
    "idle",
  );

  useEffect(() => {
    if (status === "uploading") {
      return;
    }

    if (status === "success" || status === "error") {
      const timeout = window.setTimeout(() => {
        setUploading(false);
        setStatus("idle");
        setProgress(0);
        setLabel("Uploading...");
      }, 2200);

      return () => window.clearTimeout(timeout);
    }
  }, [status]);

  const value = useMemo(
    () => ({
      uploading,
      label,
      progress,
      status,
      startUpload(nextLabel = "Uploading...") {
        setLabel(nextLabel);
        setProgress(12);
        setStatus("uploading");
        setUploading(true);
      },
      setUploadProgress(nextProgress: number) {
        setProgress(Math.max(0, Math.min(100, nextProgress)));
      },
      finishUpload(options?: { success?: boolean; message?: string }) {
        const success = options?.success ?? true;
        setLabel(
          options?.message ??
            (success ? "Upload completed" : "Upload failed. Please try again."),
        );
        setProgress(100);
        setStatus(success ? "success" : "error");
      },
      resetUpload() {
        setUploading(false);
        setProgress(0);
        setStatus("idle");
        setLabel("Uploading...");
      },
    }),
    [label, progress, status, uploading],
  );

  return (
    <UploadStatusContext.Provider value={value}>
      {uploading && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              {status === "uploading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2
                  className={cn(
                    "h-4 w-4",
                    status === "success"
                      ? "text-emerald-600"
                      : "text-destructive",
                  )}
                />
              )}
              <span>{label}</span>
            </div>
            <Progress
              value={status === "uploading" ? progress : 100}
              className={cn(
                "h-2",
                status === "success" && "[&>div]:bg-emerald-500",
                status === "error" && "[&>div]:bg-destructive",
              )}
            />
          </div>
        </div>
      )}
      {children}
    </UploadStatusContext.Provider>
  );
}

export function useUploadStatus() {
  const context = useContext(UploadStatusContext);
  if (!context) {
    throw new Error("useUploadStatus must be used within UploadStatusProvider");
  }
  return context;
}
