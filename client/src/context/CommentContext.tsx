import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { commentsAPI } from "@/api/comments.api";
import { useAuthContext } from "../context/AuthContext";
import type { UIComment } from "../Types/types";
import { mapBackendCommentToUI } from "../mapper/comment.mapper";
import type { CommentContextType } from "@/Types/types";

const CommentContext = createContext<CommentContextType | null>(null);

export const useCommentContext = () => {
  const context = useContext(CommentContext);
  if (!context)
    throw new Error("useCommentContext must be used within provider");
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

  const [comments, setComments] = useState<UIComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!idToken || !projectId)
      throw new Error("Authentication and project ID required");

    setLoading(true);
    try {
      const data = await commentsAPI.getByProject(projectId, idToken);
      setComments(data.map(mapBackendCommentToUI));
    } catch {
      setError("Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  }, [idToken, projectId]);

  const addComment = async (content: string, taskId?: string) => {
    if (!idToken) throw new Error("Authentication required");

    const created = await commentsAPI.create(
      { project_id: projectId, content, task_id: taskId },
      idToken
    );

    const normalized = mapBackendCommentToUI(created);
    setComments((prev) => [normalized, ...prev]);

    return normalized;
  };

  const updateComment = async (id: string, content: string) => {
    if (!idToken) return;

    await commentsAPI.update(id, { content }, idToken);

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, content, isEdited: true } : c))
    );
  };

  const deleteComment = async (id: string) => {
    if (!idToken) return;

    await commentsAPI.delete(id, idToken);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return (
    <CommentContext.Provider
      value={{
        comments,
        loading,
        error,
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
};
