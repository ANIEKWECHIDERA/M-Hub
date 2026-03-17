import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type UploadStatusContextValue = {
  uploading: boolean;
  label: string;
  progress: number;
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

  const value = useMemo(
    () => ({
      uploading,
      label,
      progress,
      startUpload(nextLabel = "Uploading...") {
        setLabel(nextLabel);
        setProgress(12);
        setUploading(true);
      },
      setUploadProgress(nextProgress: number) {
        setProgress(Math.max(0, Math.min(100, nextProgress)));
      },
      finishUpload() {
        setUploading(false);
        setProgress(0);
        setLabel("Uploading...");
      },
      resetUpload() {
        setUploading(false);
        setProgress(0);
        setLabel("Uploading...");
      },
    }),
    [label, progress, uploading],
  );

  return (
    <UploadStatusContext.Provider value={value}>
      {uploading && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
          <div className="pointer-events-auto w-full max-w-md rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{label}</span>
            </div>
            <Progress value={progress} className="h-2" />
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
