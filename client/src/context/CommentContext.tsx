import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from "react";
import { commentsAPI } from "@/api/comments.api";
import { useAuthContext } from "../context/AuthContext";
import type { UIComment } from "../Types/types";
import { mapBackendCommentToUI } from "../mapper/comment.mapper";
import type { CommentContextType } from "@/Types/types";
import { API_CONFIG } from "@/lib/api";

const CommentContext = createContext<CommentContextType | null>(null);

type CommentStreamEvent =
  | { type: "comment.created"; comment: any; project_id: string; company_id: string }
  | { type: "comment.updated"; comment: any; project_id: string; company_id: string }
  | { type: "comment.deleted"; commentId: string; project_id: string; company_id: string };

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
  const streamRef = useRef<EventSource | null>(null);

  const fetchComments = useCallback(async () => {
    if (!idToken || !projectId)
      throw new Error("Authentication and project ID required");

    setLoading(true);
    try {
      const data = await commentsAPI.getByProject(projectId, idToken);
      setComments(data.map(mapBackendCommentToUI));
      setError(null);
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
      idToken,
    );

    const normalized = mapBackendCommentToUI(created);
    setComments((prev) => {
      const exists = prev.some((comment) => comment.id === normalized.id);
      return exists ? prev : [...prev, normalized];
    });

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

  useEffect(() => {
    if (!idToken || !projectId) {
      streamRef.current?.close();
      streamRef.current = null;
      return;
    }

    const stream = new EventSource(
      `${API_CONFIG.backend}/api/comments/stream?token=${encodeURIComponent(
        idToken,
      )}&projectId=${encodeURIComponent(projectId)}`,
    );

    const handleCommentEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as CommentStreamEvent;

        if (payload.project_id !== projectId) {
          return;
        }

        if (payload.type === "comment.deleted") {
          setComments((prev) =>
            prev.filter((comment) => comment.id !== payload.commentId),
          );
          return;
        }

        const normalized = mapBackendCommentToUI(payload.comment);
        setComments((prev) => {
          const existingIndex = prev.findIndex((comment) => comment.id === normalized.id);

          if (existingIndex === -1) {
            return [...prev, normalized];
          }

          const next = [...prev];
          next[existingIndex] = normalized;
          return next;
        });
      } catch {
        // Ignore malformed events and let a manual refresh reconcile state.
      }
    };

    stream.addEventListener("comment", handleCommentEvent);
    stream.onerror = () => {
      // EventSource will attempt to reconnect automatically.
    };

    streamRef.current = stream;

    return () => {
      stream.removeEventListener("comment", handleCommentEvent);
      stream.close();
      streamRef.current = null;
    };
  }, [idToken, projectId]);

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
