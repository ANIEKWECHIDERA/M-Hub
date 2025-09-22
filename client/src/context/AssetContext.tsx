import { createContext, useContext } from "react";
import { useFiles } from "@/hooks/useFiles";
import type { AssetContextType } from "../Types/types";

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
  const {
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
  } = useFiles();

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
  };

  return (
    <AssetContext.Provider value={value}>{children}</AssetContext.Provider>
  );
};
