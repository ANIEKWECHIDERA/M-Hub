import { createContext, useContext, useEffect, useState } from "react";

import type { Comment, CommentContextType } from "../Types/types";
import { format, parse } from "date-fns";

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
  const mockComments: Comment[] = [
    {
      id: 1,
      companyId: 1,
      projectId: 1,
      authorId: 2,
      content:
        "Great progress on the logo Designs! I think option 2 works best with the brand direction.",
      timestamp: "2024-01-15 10:30 AM",
    },
    {
      id: 2,
      companyId: 1,
      projectId: 1,
      authorId: 4,
      content: "Thanks! I’ll refine option 2 and prepare the color variations.",
      timestamp: "2024-01-15 11:15 AM",
    },
  ];

  const [comments, setComments] = useState<Comment[]>([]);
  const [currentComment, setCurrentComment] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const fetchComments = async () => {
    setLoading(true);
    try {
      // TODO: Replace with backend fetch
      setComments(mockComments);
      setError(null);
    } catch (err) {
      setError("Failed to fetch comments.");
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (
    content: string,
    companyId: number,
    authorId: number,
    projectId: number
  ) => {
    const newComment: Comment = {
      id: comments.length + 1,
      companyId,
      projectId,
      authorId,
      content,
      timestamp: format(
        parse(new Date().toLocaleString(), "dd/MM/yyyy, HH:mm:ss", new Date()),
        "PPP p"
      ),
    };
    setComments((prev) => [...prev, newComment]);
    setNewComment("");

    // TODO: Save to backend
  };

  const updateComment = async (id: number, data: Partial<Comment>) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === id ? { ...comment, ...data } : comment
      )
    );

    // TODO: Update in backend
  };

  const deleteComment = async (id: number) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));

    // TODO: Delete from backend
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const value = {
    newComment,
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
    setNewComment,
  };

  return (
    <CommentContext.Provider value={value}>{children}</CommentContext.Provider>
  );
};
