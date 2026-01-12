import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { toast } from "sonner";
import { useAuthContext } from "./AuthContext";
import type { Assets, AssetContextType } from "@/Types/types";
import { AssetsAPI } from "@/api/assets.api";

const AssetContext = createContext<AssetContextType | null>(null);

export const useAssetContext = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error("useAssetContext must be used within AssetContextProvider");
  }
  return context;
};

export const AssetContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken } = useAuthContext();

  const [files, setFiles] = useState<Assets[]>([]);
  const [currentFile, setCurrentFile] = useState<Assets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fileToDelete, setFileToDelete] = useState<Assets | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchFilesByProject = useCallback(
    async (projectId: string) => {
      if (!idToken) throw new Error("Authentication required");

      setLoading(true);
      try {
        const data = await AssetsAPI.getByProject(projectId, idToken);
        setFiles(data);
        setError(null);
      } catch (err: any) {
        const msg = err.message || "Failed to fetch assets";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [idToken]
  );

  const uploadFiles = async (
    projectId: string,
    filesToUpload: File[],
    taskId?: string
  ) => {
    if (!idToken) throw new Error("Authentication required");

    try {
      const uploaded = await AssetsAPI.upload(
        projectId,
        filesToUpload,
        idToken,
        taskId
      );

      console.log("uploaded files:", uploaded);

      setFiles((prev) => [...uploaded, ...prev]);
      toast.success("Files uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const deleteFile = async (id: string) => {
    if (!idToken) throw new Error("Authentication required");

    try {
      await AssetsAPI.delete(id, idToken);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("File deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const confirmFileDelete = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setFileToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const value: AssetContextType = {
    files,
    currentFile,
    loading,
    error,

    fetchFilesByProject,
    uploadFiles,
    deleteFile,

    setCurrentFile,
    confirmFileDelete,
    isDeleteDialogOpen,
    fileToDelete,
    setFileToDelete,
    setIsDeleteDialogOpen,
  };

  return (
    <AssetContext.Provider value={value}>{children}</AssetContext.Provider>
  );
};
