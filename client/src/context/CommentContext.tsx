import { createContext, useContext } from "react";
import { useComments } from "@/hooks/useComments";
import type { CommentContextType } from "../Types/types";

const CommentContext = createContext<CommentContextType | null>(null);

export const useCommentContext = () => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error("useCommentContext must be used within a CommentProvider");
  }
  return context;
};

export const CommentContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    comments,
    setComments,
    currentComment,
    setCurrentComment,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
  } = useComments();

  const value = {
    comments,
    setComments,
    currentComment,
    setCurrentComment,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    loading,
    error,
  };

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
};
