import { createContext, useContext, useEffect, useState } from "react";

import type { AssetContextType, Assets } from "../Types/types";
import { toast } from "sonner";

const AssetContext = createContext<AssetContextType | null>(null);

export const useAssetContext = () => {
  const context = useContext(AssetContext);
  if (!context) {
    throw new Error("useAssetContext must be used within an AssetProvider");
  }
  return context;
};

export const AssetContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const mockFiles: Assets[] = [
    {
      id: 1,
      companyId: 1,
      projectId: 1,
      assigneeId: 2,
      name: "logo-conceptsddddd.pdf",
      size: "2.4 MB",
      uploadDate: "2024-01-10",
      type: "pdf",
      url: "",
    },
    {
      id: 2,
      companyId: 1,
      projectId: 1,
      assigneeId: 2,
      name: "brand-colors.png",
      size: "856 KB",
      uploadDate: "2024-01-12",
      type: "image",
      url: "",
    },
    {
      id: 3,
      companyId: 1,
      projectId: 3,
      assigneeId: 2,
      name: "style-guide.docx",
      size: "1.2 MB",
      uploadDate: "2024-01-14",
      type: "document",
      url: "",
    },
  ];

  const [files, setFiles] = useState<Assets[]>([]);
  const [currentFile, setCurrentFile] = useState<Assets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<Assets | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real fetch (e.g. Firebase, REST API)
      setFiles(mockFiles);
      setError(null);
    } catch (err) {
      setError("Failed to fetch files.");
    } finally {
      setLoading(false);
    }
  };

  const addFile = async (file: Assets) => {
    setFiles((prev) => [...prev, file]);
    toast.success("File uploaded successfully!");
    // TODO: Upload to backend
  };

  const updateFile = async (id: number, data: Partial<Assets>) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...data } : file))
    );
    // TODO: Update in backend
  };

  const deleteFile = async (id: number) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    toast.success("File deleted successfully!");
    // TODO: Delete from backend
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const confirmFileDelete = () => {
    if (fileToDelete) {
      deleteFile(fileToDelete.id);
      setFileToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const value = {
    files,
    setFiles,
    currentFile,
    setCurrentFile,
    fetchFiles,
    addFile,
    updateFile,
    deleteFile,
    loading,
    error,
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
