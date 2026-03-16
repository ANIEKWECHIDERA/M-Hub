import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UploadStatusContextValue = {
  uploading: boolean;
  label: string;
  startUpload: (label?: string) => void;
  finishUpload: () => void;
};

const UploadStatusContext = createContext<UploadStatusContextValue | null>(null);

export function UploadStatusProvider({ children }: { children: ReactNode }) {
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("Uploading...");

  const value = useMemo(
    () => ({
      uploading,
      label,
      startUpload(nextLabel = "Uploading...") {
        setLabel(nextLabel);
        setUploading(true);
      },
      finishUpload() {
        setUploading(false);
      },
    }),
    [label, uploading],
  );

  return (
    <UploadStatusContext.Provider value={value}>
      {uploading && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
          <div className="h-1 w-full overflow-hidden bg-primary/20">
            <div className="h-full w-1/3 animate-[upload-bar_1.2s_ease-in-out_infinite] bg-primary" />
          </div>
          <div className="bg-background/95 px-4 py-2 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
            {label}
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
