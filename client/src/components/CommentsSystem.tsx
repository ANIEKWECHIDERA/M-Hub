import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Edit, Trash2, Send } from "lucide-react";
import { useUser } from "@/context/UserContext";
import type { UIComment } from "@/Types/types";
import { CommentSkeleton } from "./CommentSkeleton";
import { formatRelativeTimestamp } from "@/lib/datetime";

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
          `${profile.first_name} ${profile.last_name}`.trim() ||
          profile.email,
        avatar: profile.photoURL,
      }
    : null;

  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalComments(comments);
  }, [comments]);

  useEffect(() => {
    if (textareaRef.current && !newComment) {
      textareaRef.current.focus();
    }
  }, [newComment]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    listRef.current.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [localComments.length]);

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content || !currentUser) {
      throw new Error("User not authenticated");
    }

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content,
      author: currentUser,
      author_id: currentUser.id,
      createdAt: new Date().toISOString(),
      isEdited: false,
    };

    setLocalComments((prev) => [...prev, optimisticComment]);
    setNewComment("");
    requestAnimationFrame(() => textareaRef.current?.focus());

    try {
      const created = await onCommentAdd(content);
      setLocalComments((prev) =>
        prev.map((comment) =>
          comment.id === optimisticComment.id ? created : comment,
        ),
      );
    } catch (error) {
      console.error("Failed to add comment:", error);
      setLocalComments((prev) =>
        prev.filter((comment) => comment.id !== optimisticComment.id),
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

    setLocalComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              content,
              isEdited: true,
              updatedAt: new Date().toISOString(),
            }
          : comment,
      ),
    );

    try {
      await onCommentUpdate(commentId, content);
    } catch (error) {
      console.error("Failed to update comment:", error);
    } finally {
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;

    setLocalComments((prev) => prev.filter((comment) => comment.id !== commentId));

    try {
      await onCommentDelete(commentId);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const isAuthor = (comment: Comment) =>
    Boolean(currentUser && currentUser.id === comment.author_id);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {loading && <CommentSkeleton />}

          {!loading && localComments.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-center text-muted-foreground">
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
                        <AvatarImage src={comment.author?.avatar} />
                        <AvatarFallback>
                          {comment.author?.name
                            ?.split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.author?.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTimestamp(comment.createdAt)}
                            {comment.isEdited && " (edited)"}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editContent}
                              onChange={(event) => setEditContent(event.target.value)}
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
                            <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed">
                              {comment.content}
                            </p>

                            {isOwner && (
                              <div className="mt-2 flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleStartEdit(comment)}
                                >
                                  <Edit className="mr-1 h-3.5 w-3.5" />
                                  Edit
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-destructive hover:text-destructive/90"
                                  onClick={() => handleDelete(comment.id)}
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />
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

      <div className="shrink-0 border-t bg-background/95 p-4 backdrop-blur">
        <div className="flex gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback>
              {currentUser?.name
                ?.split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder={placeholder}
              className="min-h-[72px] resize-none"
              maxLength={maxCommentLength}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
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
      </div>
    </div>
  );
}
