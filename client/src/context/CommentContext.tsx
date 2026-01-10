import { createContext, useContext, useEffect, useState } from "react";
import type { Comment, CommentContextType } from "@/Types/types";
import { useAuthContext } from "./AuthContext";
import { commentsAPI } from "@/api/comments.api";

const CommentContext = createContext<CommentContextType | null>(null);

export const useCommentContext = () => {
  const context = useContext(CommentContext);
  if (!context) {
    throw new Error(
      "useCommentContext must be used within CommentContextProvider"
    );
  }
  return context;
};

export const CommentContextProvider = ({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) => {
  const { idToken } = useAuthContext();

  const [comments, setComments] = useState<Comment[]>([]);
  const [currentComment, setCurrentComment] = useState<Comment | null>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = async () => {
    if (!idToken || !projectId) return;

    setLoading(true);
    try {
      const data = await commentsAPI.getByProject(projectId, idToken);
      setComments(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  const addComment: CommentContextType["addComment"] = async ({
    content,
    projectId,
    taskId,
  }) => {
    if (!idToken) return;
    console.log("[Context] addComment called", { content, projectId });

    try {
      const created = await commentsAPI.create(
        {
          project_id: projectId,
          content,
          task_id: taskId,
        },
        idToken
      );

      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch {
      setError("Failed to add comment");
    }
  };

  const updateComment = async (id: string, data: { content?: string }) => {
    if (!idToken) return;

    try {
      const updated = await commentsAPI.update(id, data, idToken);

      setComments((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setError("Failed to update comment");
    }
  };

  const deleteComment = async (id: string) => {
    if (!idToken) return;

    try {
      await commentsAPI.delete(id, idToken);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError("Failed to delete comment");
    }
  };

  useEffect(() => {
    fetchComments();
  }, [projectId, idToken]);

  return (
    <CommentContext.Provider
      value={{
        comments,
        setComments,
        currentComment,
        setCurrentComment,
        newComment,
        setNewComment,
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        loading,
        error,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
};
