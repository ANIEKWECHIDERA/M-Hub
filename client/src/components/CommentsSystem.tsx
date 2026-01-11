import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import type { UIComment } from "@/Types/types";
import { CommentSkeleton } from "./CommentSkeleton";

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  author_id: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

interface CommentsSystemProps {
  comments: UIComment[];
  onCommentAdd: (content: string) => Promise<UIComment>;
  onCommentUpdate: (commentId: string, content: string) => Promise<void>;
  onCommentDelete: (commentId: string) => Promise<void>;
  placeholder?: string;
  maxCommentLength?: number;
  loading?: boolean;
}

export function CommentsSystem({
  comments,
  loading,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  placeholder = "Add a comment...",
  maxCommentLength = 1000,
}: CommentsSystemProps) {
  const { profile } = useUser();

  const currentUser = profile
    ? {
        id: profile.id,
        name:
          profile.displayName ||
          `${profile.first_name} ${profile.last_name}`.trim(),
        avatar: profile.photoURL,
      }
    : null;

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local comments when prop changes (from server)
  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  // Focus textarea after adding comment
  useEffect(() => {
    if (textareaRef.current && !newComment) {
      textareaRef.current.focus();
    }
  }, [newComment]);

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || !currentUser) {
      throw new Error("User not authenticated");
    }

    // Optimistic UI update
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content,
      author: currentUser,
      author_id: currentUser.id,
      createdAt: new Date().toISOString(),
      isEdited: false,
    };

    setLocalComments((prev) => [optimisticComment, ...prev]);
    setNewComment("");
    requestAnimationFrame(() => textareaRef.current?.focus());

    try {
      try {
        const created = await onCommentAdd(content);

        setLocalComments((prev) =>
          prev.map((c) => (c.id === optimisticComment.id ? created : c))
        );
      } catch {
        setLocalComments((prev) =>
          prev.filter((c) => c.id !== optimisticComment.id)
        );
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      // Rollback on error (optional)
      setLocalComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id)
      );
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    const content = editContent.trim();
    if (!content) return;

    // Optimistic update
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              content,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    try {
      await onCommentUpdate(commentId, content);
    } catch (error) {
      console.error("Failed to update comment:", error);
      // Optional: rollback
    } finally {
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;

    // Optimistic remove
    setLocalComments((prev) => prev.filter((c) => c.id !== commentId));

    try {
      await onCommentDelete(commentId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
      // Optional: rollback
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr + "Z"); // treat backend time as UTC
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // difference in seconds

    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 31536000)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  console.log("CommentsSystem rendered:", comments, "user:", currentUser);

  const isAuthor = (comment: Comment) =>
    currentUser && currentUser.id === comment.author_id;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-200px)]">
      {/* Comment input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>
                {currentUser?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={placeholder}
                className="min-h-[80px] resize-none"
                maxLength={maxCommentLength}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {newComment.length} / {maxCommentLength}
                </span>
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments list */}
      <div className="space-y-4">
        {loading && <CommentSkeleton />}
        {localComments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No comments yet. Be the first!
          </div>
        ) : (
          localComments.map((comment) => {
            const isEditing = editingId === comment.id;
            const isOwner = isAuthor(comment);

            return (
              <Card key={comment.id} className="transition-all">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={currentUser?.avatar} />
                      <AvatarFallback>
                        {currentUser?.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">
                          {currentUser?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(comment.createdAt)}
                          {comment.isEdited && " (edited)"}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="min-h-[80px]"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(comment.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                                setEditContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">
                            {comment.content}
                          </p>

                          {isOwner && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => handleStartEdit(comment)}
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-destructive hover:text-destructive/90"
                                onClick={() => handleDelete(comment.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
