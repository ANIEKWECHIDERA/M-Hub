// hooks/useFiles.ts
import { useState, useEffect } from "react";
import type { File } from "../Types/types";

const mockFiles: File[] = [
  {
    id: 1,
    name: "logo-concepts.pdf",
    size: "2.4 MB",
    uploadDate: "2024-01-10",
    type: "pdf",
  },
  {
    id: 2,
    name: "brand-colors.png",
    size: "856 KB",
    uploadDate: "2024-01-12",
    type: "image",
  },
  {
    id: 3,
    name: "style-guide.docx",
    size: "1.2 MB",
    uploadDate: "2024-01-14",
    type: "document",
  },
];

export function useFiles() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const addFile = async (file: File) => {
    setFiles((prev) => [...prev, file]);
    // TODO: Upload to backend
  };

  const updateFile = async (id: number, data: Partial<File>) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...data } : file))
    );
    // TODO: Update in backend
  };

  const deleteFile = async (id: number) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
    // TODO: Delete from backend
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return {
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
}
