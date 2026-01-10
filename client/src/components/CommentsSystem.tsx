import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Reply,
  MoreHorizontal,
  Heart,
  Edit,
  Trash2,
  Send,
  AtSign,
  Paperclip,
  Smile,
  Filter,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectContext } from "@/context/ProjectContext";
import { useUser } from "@/context/UserContext";

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  parentId?: string;
  mentions?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  isEdited?: boolean;
}

interface EnhancedCommentsSystemProps {
  comments: Comment[];
  onCommentAdd: (
    content: string,
    parentId?: string,
    mentions?: string[]
  ) => void;
  onCommentUpdate: (commentId: string, content: string) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentLike: (commentId: string) => void;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  teamMembers?: Array<{
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  }>;
  placeholder?: string;
  allowAttachments?: boolean;
  maxCommentLength?: number;
}

export function CommentsSystem({
  comments,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onCommentLike,
  currentUser,
  teamMembers = [],
  placeholder = "Add a comment...",
  allowAttachments = true,
  maxCommentLength = 1000,
}: EnhancedCommentsSystemProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
  const [filterBy, setFilterBy] = useState<"all" | "mentions" | "liked">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-liked">(
    "newest"
  );

  const { profile } = useUser();
  const photoURL = profile?.photoURL;
  const initials = (() => {
    if (!profile) return "User";

    const { first_name, last_name, displayName } = profile;
    const initials =
      [first_name, last_name]
        .filter(Boolean)
        .map((x) => x![0].toUpperCase())
        .join("") ||
      displayName
        ?.split(" ")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase())
        .join("");

    return initials || "User";
  })();

  const handleSubmitComment = () => {
    const content = newComment.trim();
    if (!content) return;

    onCommentAdd(content);

    setNewComment("");
  };

  const handleEditComment = (commentId: string) => {
    const content = editContent.trim();
    if (!content) return;

    onCommentUpdate(commentId, content);

    setEditingComment(null);
    setEditContent("");
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleMention = (memberName: string) => {
    const currentText = newComment;
    const mentionText = `@${memberName} `;
    setNewComment(currentText + mentionText);
    setSelectedMentions([...selectedMentions, memberName]);
    setShowMentions(false);
    setMentionQuery("");
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  const filteredComments = comments
    .filter((comment) => {
      const matchesSearch =
        searchTerm === "" ||
        comment.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comment.author.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "mentions" &&
          comment.mentions?.includes(currentUser?.name || "")) ||
        (filterBy === "liked" && comment.isLiked);

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "most-liked":
          return b.likes - a.likes;
        default:
          return 0;
      }
    });

  const CommentItem = ({
    comment,
    isReply = false,
  }: {
    comment: Comment;
    isReply?: boolean;
  }) => {
    const isOwner = currentUser?.id === comment.author.id;
    const isEditing = editingComment === comment.id;
    const isMentioned = comment.mentions?.includes(currentUser?.name || "");

    return (
      <div className={cn("space-y-3", isReply && "ml-12")}>
        <Card
          className={cn(
            "transition-all hover:shadow-sm",
            isReply && "bg-muted/30",
            isMentioned && "ring-2 ring-primary/20 bg-primary/5"
          )}
        >
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={photoURL || "/placeholder.svg"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {comment.author.name}
                  </span>
                  {comment.author.role && (
                    <Badge variant="outline" className="text-xs">
                      {comment.author.role}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatTimeAgo(comment.createdAt)}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-muted-foreground">
                      (edited)
                    </span>
                  )}
                  {isMentioned && (
                    <Badge variant="secondary" className="text-xs">
                      <AtSign className="h-3 w-3 mr-1" />
                      Mentioned
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                      maxLength={maxCommentLength}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {editContent.length}/{maxCommentLength}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditComment(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingComment(null);
                            setEditContent("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none mb-3">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>

                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {comment.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-2 p-2 bg-muted/50 rounded"
                          >
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{attachment.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto"
                            >
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCommentLike?.(comment.id)}
                        className={cn(
                          "h-8 px-2 gap-1",
                          comment.isLiked && "text-red-500"
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-4 w-4",
                            comment.isLiked && "fill-current"
                          )}
                        />
                        {comment.likes > 0 && (
                          <span className="text-xs">{comment.likes}</span>
                        )}
                      </Button>

                      {!isReply && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(comment.id)}
                          className="h-8 px-2 gap-1"
                        >
                          <Reply className="h-4 w-4" />
                          <span className="text-xs">Reply</span>
                        </Button>
                      )}

                      {isOwner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => startEdit(comment)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onCommentDelete?.(comment.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reply Form */}
        {replyingTo === comment.id && (
          <Card className="ml-12">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage
                    src={currentUser?.avatar || "/placeholder.svg"}
                  />
                  <AvatarFallback>
                    {currentUser?.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={`Reply to ${comment.author.name}...`}
                    className="min-h-[80px]"
                    maxLength={maxCommentLength}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMentions(true)}
                      >
                        <AtSign className="h-4 w-4" />
                      </Button>
                      {allowAttachments && (
                        <Button variant="ghost" size="sm">
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {newComment.length}/{maxCommentLength}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSubmitComment}
                        disabled={!newComment.trim()}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReplyingTo(null);
                          setNewComment("");
                          setSelectedMentions([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Comments List */}
      <div className="space-y-4">
        {filteredComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}

        {filteredComments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || filterBy !== "all"
                  ? "No comments found"
                  : "No comments yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterBy !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Be the first to share your thoughts!"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* New Comment Form */}
      {!replyingTo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={photoURL || "/placeholder.svg"} />
                <AvatarFallback>{initials || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[100px]"
                  maxLength={maxCommentLength}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {newComment.length}/{maxCommentLength}
                    </span>
                  </div>

                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
