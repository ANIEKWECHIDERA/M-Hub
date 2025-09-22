// hooks/useComments.ts
import { useState, useEffect } from "react";
import type { Comment } from "../Types/types";

const mockComments: Comment[] = [
  {
    id: 1,
    author: "Sarah Smith",
    content:
      "Great progress on the logo designs! I think option 2 works best with the brand direction.",
    timestamp: "2024-01-15 10:30 AM",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    author: "John Doe",
    content: "Thanks! I’ll refine option 2 and prepare the color variations.",
    timestamp: "2024-01-15 11:15 AM",
    avatar: "/placeholder.svg?height=32&width=32",
  },
];

export function useComments() {
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
    author = "Current User",
    avatar = "/placeholder.svg?height=32&width=32"
  ) => {
    const newComment: Comment = {
      id: Date.now(),
      author,
      content,
      timestamp: new Date().toLocaleString(),
      avatar,
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

  return {
    newComment,
    setNewComment,
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
}
