import type React from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowDown,
  BellOff,
  Check,
  Crown,
  Flag,
  Hash,
  HelpCircle,
  Loader2,
  ListFilter,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { ChatConversation, ChatMessage, ChatMember } from "@/api/chat.api";
import type { TeamMember } from "@/Types/types";
import { chatSections, type ChatSection } from "@/config/chat-nav";
import { useChatContext } from "@/context/ChatContext";
import { useAuthContext } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import {
  getConversationAvatar,
  getConversationDisplayName,
  getConversationSection,
} from "@/lib/chat";
import { formatRelativeTimestamp, formatShortTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MESSAGE_TAG_CONFIG = {
  decision: {
    label: "Decision",
    chipClassName:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  "action-item": {
    label: "Action Item",
    chipClassName:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  blocker: {
    label: "Blocker",
    chipClassName:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
  },
  update: {
    label: "Update",
    chipClassName:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  question: {
    label: "Question",
    chipClassName:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
  },
  "follow-up": {
    label: "Follow-up",
    chipClassName:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300",
  },
} as const;

const MESSAGE_TAGS = Object.keys(MESSAGE_TAG_CONFIG) as Array<
  keyof typeof MESSAGE_TAG_CONFIG
>;
type MessageTag = (typeof MESSAGE_TAGS)[number];
const CHAT_EDIT_WINDOW_MINUTES = 15;
const CHAT_EDIT_BUTTON_HIDE_BUFFER_SECONDS = 30;

function useIsMobileScreen() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

function getInitials(name?: string | null, email?: string | null) {
  const base = name || email || "User";
  return base
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function getMessageTagConfig(tag: string) {
  const config = MESSAGE_TAG_CONFIG[tag as MessageTag];
  return (
    config ?? {
      label: tag,
      chipClassName: "border-border bg-muted/60 text-muted-foreground",
    }
  );
}

function AvatarVisual({
  name,
  email,
  avatar,
  className,
}: {
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium text-foreground sm:h-10 sm:w-10 sm:text-sm",
        className,
      )}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={`${name || email || "User"} avatar`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{getInitials(name, email)}</span>
      )}
    </div>
  );
}

function getMemberRoleBadge(access?: string | null, role?: string | null) {
  if (access === "superAdmin") {
    return {
      label: role || "Super Admin",
      icon: Crown,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (access === "admin") {
    return {
      label: role || "Admin",
      icon: ShieldCheck,
      className: "border-sky-200 bg-sky-50 text-sky-700",
    };
  }

  return {
    label: role || "Member",
    icon: Users,
    className: "border-border bg-muted/40 text-muted-foreground",
  };
}

function PersonBadge({
  access,
  role,
  className,
}: {
  access?: string | null;
  role?: string | null;
  className?: string;
}) {
  const badge = getMemberRoleBadge(access, role);
  const Icon = badge.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-full gap-1.5 rounded-full px-2.5 py-0.5 text-[11px]",
        badge.className,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate">{badge.label}</span>
    </Badge>
  );
}

function MemberAvatar({
  member,
  onPreview,
  showPresence = false,
}: {
  member: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    online?: boolean;
  };
  onPreview?: () => void;
  showPresence?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPreview}
      disabled={!onPreview}
      className="relative shrink-0 rounded-full disabled:cursor-default"
    >
      <AvatarVisual
        name={member.name}
        email={member.email}
        avatar={member.avatar}
      />
      {showPresence && member.online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
      )}
    </button>
  );
}

function ProfilePreviewDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
    access?: string | null;
  } | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {member?.name || member?.email || "Profile photo"}
          </DialogTitle>
          <DialogDescription>
            Preview the member profile image.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6 pt-2">
          {member?.avatar ? (
            <div className="overflow-hidden rounded-xl border bg-muted/20">
              <img
                src={member.avatar}
                alt={`${member.name || member.email || "User"} profile`}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              No profile photo available.
            </div>
          )}
          {member && (
            <div className="mt-4 space-y-2 rounded-xl border bg-muted/20 p-4 text-sm">
              {member.email && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <p className="font-medium">{member.email}</p>
                </div>
              )}
              {(member.role || member.access) && (
                <div className="flex flex-wrap items-center gap-2">
                  <PersonBadge access={member.access} role={member.role} />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionMenu({
  align = "end",
  closeOnPointerLeave = false,
  trigger,
  children,
}: {
  align?: "start" | "end";
  closeOnPointerLeave?: boolean;
  trigger: (controls: {
    open: boolean;
    toggle: () => void;
    close: () => void;
  }) => React.ReactNode;
  children: (controls: { close: () => void }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {trigger({
          open,
          toggle: () => setOpen((previous) => !previous),
          close: () => setOpen(false),
        })}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={8}
        collisionPadding={16}
        className="min-w-[14rem] rounded-xl p-1"
        onPointerLeave={() => {
          if (closeOnPointerLeave) {
            setOpen(false);
          }
        }}
      >
        {children({ close: () => setOpen(false) })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActionMenuItem({
  label,
  onSelect,
  icon: Icon,
  destructive = false,
  checked = false,
  keepOpen = false,
}: {
  label: string;
  onSelect: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  checked?: boolean;
  keepOpen?: boolean;
}) {
  const content = (
    <>
      <span className="flex h-4 w-4 items-center justify-center">
        {Icon ? <Icon className="h-4 w-4" /> : null}
      </span>
      <span className="flex-1">{label}</span>
    </>
  );

  if (keepOpen || checked) {
    return (
      <DropdownMenuCheckboxItem
        checked={checked}
        className={cn(destructive && "text-red-600 focus:text-red-600")}
        onSelect={(event) => {
          if (keepOpen) {
            event.preventDefault();
          }
          onSelect();
        }}
        onCheckedChange={() => undefined}
      >
        {content}
      </DropdownMenuCheckboxItem>
    );
  }

  return (
    <DropdownMenuItem
      className={cn(
        destructive && "text-red-600 focus:bg-red-50 focus:text-red-600",
      )}
      onSelect={onSelect}
    >
      {content}
    </DropdownMenuItem>
  );
}

function ActionMenuSeparator() {
  return <DropdownMenuSeparator />;
}

function MessageBubble({
  message,
  isCurrentUser,
  canDeleteModeration,
  canTagMessage,
  showActionMenu,
  onEdit,
  onDelete,
  onToggleTag,
  onPreviewProfile,
}: {
  message: ChatMessage;
  isCurrentUser: boolean;
  canDeleteModeration: boolean;
  canTagMessage: boolean;
  showActionMenu: boolean;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onToggleTag: (message: ChatMessage, tag: MessageTag) => void;
  onPreviewProfile: (message: ChatMessage) => void;
}) {
  const canDelete = isCurrentUser || canDeleteModeration;
  const messageAgeMs = Date.now() - new Date(message.created_at).getTime();
  const editWindowMs =
    (CHAT_EDIT_WINDOW_MINUTES * 60 - CHAT_EDIT_BUTTON_HIDE_BUFFER_SECONDS) *
    1000;
  const canShowEditButton =
    isCurrentUser &&
    !message.is_deleted &&
    !message.id.startsWith("optimistic-") &&
    messageAgeMs < editWindowMs;

  if (message.message_type === "system") {
    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <div className="inline-flex max-w-[90%] items-center rounded-full border border-dashed bg-muted/45 px-4 py-2 text-center text-xs font-medium text-muted-foreground">
          <span>{message.body}</span>
        </div>
        <div className="inline-flex items-center rounded-full border border-dashed bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground/90">
          <span className="whitespace-nowrap">
            {new Date(message.created_at).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`chat-message-${message.id}`}
      className={cn(
        "group flex gap-2.5 sm:gap-3",
        isCurrentUser ? "justify-end" : "justify-start",
      )}
    >
      {!isCurrentUser && (
        <MemberAvatar
          member={message.sender}
          onPreview={() => onPreviewProfile(message)}
        />
      )}

      <div
        className={cn(
          "max-w-[88%] space-y-1",
          isCurrentUser ? "items-end text-right" : "",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 text-xs text-muted-foreground",
            isCurrentUser && "justify-end",
          )}
        >
          <span>{message.sender.name || "Unknown"}</span>
          <span>{formatShortTime(message.created_at)}</span>
          {message.is_edited && <span>edited</span>}
          {!message.id.startsWith("optimistic-") && showActionMenu && (
            <div className="opacity-0 transition-opacity group-hover:opacity-100">
              <ActionMenu
                align={isCurrentUser ? "end" : "start"}
                closeOnPointerLeave
                trigger={() => (
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent bg-background/80 transition-colors hover:border-input hover:bg-accent hover:text-accent-foreground"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">Message actions</span>
                  </button>
                )}
              >
                {({ close }) => (
                  <>
                    {canTagMessage && !message.is_deleted && (
                      <>
                        <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                          Capture signal
                        </DropdownMenuLabel>
                        {MESSAGE_TAGS.map((tag) => (
                          <ActionMenuItem
                            key={tag}
                            label={getMessageTagConfig(tag).label}
                            checked={message.tags.includes(tag)}
                            keepOpen
                            onSelect={() => onToggleTag(message, tag)}
                          />
                        ))}
                        {(isCurrentUser || canDelete) && (
                          <ActionMenuSeparator />
                        )}
                      </>
                    )}
                    {canShowEditButton && (
                      <ActionMenuItem
                        label="Edit message"
                        icon={Pencil}
                        onSelect={() => {
                          close();
                          onEdit(message);
                        }}
                      />
                    )}
                    {canDelete && (
                      <ActionMenuItem
                        label="Delete message"
                        icon={Trash2}
                        destructive
                        onSelect={() => {
                          close();
                          onDelete(message);
                        }}
                      />
                    )}
                  </>
                )}
              </ActionMenu>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl border px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] sm:px-4 sm:py-3 sm:text-sm",
            isCurrentUser
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-muted/60",
            message.is_deleted && "italic opacity-80",
          )}
        >
          {message.reply_to && !message.is_deleted && (
            <div
              className={cn(
                "mb-2 rounded-xl border px-3 py-2 text-xs",
                isCurrentUser
                  ? "border-primary-foreground/20 bg-primary-foreground/10"
                  : "border-border bg-background/70",
              )}
            >
              <div className="font-medium">
                {message.reply_to.sender.name || "Reply"}
              </div>
              <div className="truncate">{message.reply_to.body}</div>
            </div>
          )}
          {message.body}
        </div>
        {!!message.tags.length && (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              isCurrentUser && "justify-end",
            )}
          >
            {message.tags.map((tag) => {
              const config = getMessageTagConfig(tag);
              return (
                <span
                  key={`${message.id}-${tag}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                    config.chipClassName,
                  )}
                >
                  <Flag className="h-3 w-3" />
                  {config.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {isCurrentUser && (
        <MemberAvatar
          member={message.sender}
          onPreview={() => onPreviewProfile(message)}
        />
      )}
    </div>
  );
}

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { authStatus } = useAuthContext();
  const { profile } = useUser();
  const {
    conversations,
    workspaceMembers,
    activeConversationId,
    activeConversation,
    conversationDetails,
    messages,
    taggedMessages,
    loadingConversations,
    loadingMessages,
    loadingTaggedMessages,
    loadingWorkspaceMembers,
    loadingOlderMessages,
    hasMoreMessages,
    error,
    setActiveConversationId,
    loadOlderMessages,
    sendMessage,
    sendTypingIndicator,
    createDirectConversation,
    createGroupConversation,
    deleteConversation,
    renameConversation,
    addConversationMembers,
    removeConversationMember,
    updateConversationPreferences,
    editMessage,
    deleteMessage,
    updateMessageTags,
    typingUserIds,
    presenceByUserId,
  } = useChatContext();
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [profilePreviewMember, setProfilePreviewMember] = useState<{
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
    role?: string | null;
    access?: string | null;
  } | null>(null);
  const [isCreateDirectOpen, setIsCreateDirectOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isDeleteConversationOpen, setIsDeleteConversationOpen] =
    useState(false);
  const [deleteConversationTarget, setDeleteConversationTarget] =
    useState<ChatConversation | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<ChatMessage | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [directMemberSearch, setDirectMemberSearch] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>(
    [],
  );
  const [selectedAddMembers, setSelectedAddMembers] = useState<string[]>([]);
  const [editValue, setEditValue] = useState("");
  const [selectedTagsByConversation, setSelectedTagsByConversation] =
    useState<Record<string, MessageTag[]>>({});
  const [activeTagFilter, setActiveTagFilter] = useState<MessageTag | "all">(
    "all",
  );
  const [chatPanelMode, setChatPanelMode] = useState<"messages" | "summary">(
    "messages",
  );
  const typingTimeoutRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const messageScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messageBottomRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const shouldScrollOnConversationOpenRef = useRef(false);
  const hasCompletedInitialScrollRef = useRef(false);
  const isMobile = useIsMobileScreen();
  const [showNewMessageJump, setShowNewMessageJump] = useState(false);
  const isWorkspaceManager =
    authStatus?.access === "admin" || authStatus?.access === "superAdmin";

  const activeSection = useMemo(() => {
    const section = searchParams.get("section") as ChatSection | null;
    return chatSections.find((item) => item.id === section)?.id ?? "projects";
  }, [searchParams]);
  const requestedConversationId = searchParams.get("conversationId");
  const requestedMessageId = searchParams.get("messageId");
  const requestedPanel = searchParams.get("panel");

  useEffect(() => {
    const currentSection = searchParams.get("section") as ChatSection | null;
    if (!chatSections.some((section) => section.id === currentSection)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("section", "projects");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!isRenameOpen) {
      setRenameValue(activeConversation?.name || "");
    }
  }, [activeConversation?.name, isRenameOpen]);

  useEffect(() => {
    const hasOpenDialog =
      isCreateDirectOpen ||
      isCreateGroupOpen ||
      isDirectoryOpen ||
      isRenameOpen ||
      isManageMembersOpen ||
      isGroupInfoOpen ||
      isDeleteConversationOpen ||
      Boolean(editingMessage) ||
      Boolean(deleteTarget) ||
      Boolean(profilePreviewMember);

    if (!hasOpenDialog) {
      document.body.style.removeProperty("pointer-events");
    }

    return () => {
      document.body.style.removeProperty("pointer-events");
    };
  }, [
    deleteTarget,
    editingMessage,
    isCreateDirectOpen,
    isCreateGroupOpen,
    isDirectoryOpen,
    isDeleteConversationOpen,
    isGroupInfoOpen,
    isManageMembersOpen,
    isRenameOpen,
    profilePreviewMember,
  ]);

  useEffect(() => {
    if (!editingMessage) {
      setEditValue("");
      return;
    }
    setEditValue(editingMessage.body);
  }, [editingMessage]);

  const workspaceDirectoryMembers = useMemo(() => {
    return workspaceMembers
      .filter((member) => member.user_id !== profile?.id)
      .map((member) => ({
        ...member,
        online: member.user_id
          ? Boolean(presenceByUserId[member.user_id])
          : false,
      }));
  }, [presenceByUserId, profile?.id, workspaceMembers]);

  const filteredChats = useMemo(() => {
    return conversations.filter((conversation) => {
      const section = getConversationSection(conversation);
      const displayName = getConversationDisplayName(conversation, profile?.id);
      const matchesSearch = displayName
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      if (!matchesSearch) {
        return false;
      }
      return section === activeSection;
    });
  }, [activeSection, conversations, profile?.id, searchTerm]);

  useEffect(() => {
    if (!filteredChats.length) {
      setActiveConversationId(null);
      return;
    }

     if (
      requestedConversationId &&
      filteredChats.some(
        (conversation) => conversation.id === requestedConversationId,
      ) &&
      activeConversationId !== requestedConversationId
    ) {
      setActiveConversationId(requestedConversationId);
      if (isMobile) {
        setMobileConversationOpen(true);
      }
      return;
    }

    if (
      activeConversationId &&
      filteredChats.some(
        (conversation) => conversation.id === activeConversationId,
      )
    ) {
      return;
    }

    setActiveConversationId(filteredChats[0].id);
  }, [
    activeConversationId,
    filteredChats,
    isMobile,
    requestedConversationId,
    setActiveConversationId,
  ]);

  useEffect(() => {
    if (!isMobile) {
      setMobileConversationOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    shouldScrollOnConversationOpenRef.current = true;
    hasCompletedInitialScrollRef.current = false;
    previousMessageCountRef.current = 0;
    setShowNewMessageJump(false);
    setChatPanelMode("messages");
    setActiveTagFilter("all");
  }, [activeConversationId]);

  useEffect(() => {
    if (!requestedPanel) {
      return;
    }

    if (requestedPanel === "summary") {
      setChatPanelMode("summary");
      return;
    }

    if (requestedPanel === "messages") {
      setChatPanelMode("messages");
    }
  }, [requestedPanel]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (!typingActiveRef.current) {
        return;
      }
      typingActiveRef.current = false;
      void sendTypingIndicator(false);
    };
  }, [sendTypingIndicator]);

  const currentChat =
    activeConversation ??
    filteredChats.find(
      (conversation) => conversation.id === activeConversationId,
    ) ??
    filteredChats[0] ??
    null;

  const currentMembers =
    conversationDetails?.members ?? currentChat?.members ?? [];
  const directConversationMember =
    currentChat?.type === "direct"
      ? (currentMembers.find((member) => member.user_id !== profile?.id) ??
        null)
      : null;
  const directConversationRoleLabel = directConversationMember?.role?.trim()
    ? directConversationMember.role
    : directConversationMember?.access === "superAdmin"
      ? "Super Admin"
      : directConversationMember?.access === "admin"
        ? "Admin"
        : "Team Member";
  const currentConversationName = currentChat
    ? getConversationDisplayName(currentChat, profile?.id)
    : "";
  const currentConversationDescription =
    currentChat?.type === "group" &&
    typeof currentChat.metadata?.description === "string"
      ? currentChat.metadata.description
      : null;
  const deleteConversationTargetName = deleteConversationTarget
    ? getConversationDisplayName(deleteConversationTarget, profile?.id)
    : "";
  const selectedTags = currentChat?.id
    ? selectedTagsByConversation[currentChat.id] ?? []
    : [];
  const typingNames = typingUserIds
    .map(
      (userId) =>
        currentMembers.find((member) => member.user_id === userId)?.name,
    )
    .filter(Boolean) as string[];
  const filteredTaggedMessages = useMemo(() => {
    if (activeTagFilter === "all") {
      return taggedMessages;
    }

    return taggedMessages.filter((message) =>
      message.tags.includes(activeTagFilter),
    );
  }, [activeTagFilter, taggedMessages]);

  const availableMembersToAdd = useMemo(() => {
    const activeUserIds = new Set(
      currentMembers.map((member) => member.user_id),
    );
    return workspaceDirectoryMembers.filter(
      (member) => !member.user_id || !activeUserIds.has(member.user_id),
    );
  }, [currentMembers, workspaceDirectoryMembers]);

  const filteredDirectMembers = useMemo(() => {
    return workspaceDirectoryMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(directMemberSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(directMemberSearch.toLowerCase());
      return matchesSearch;
    });
  }, [directMemberSearch, workspaceDirectoryMembers]);

  const filteredGroupMembers = useMemo(() => {
    return workspaceDirectoryMembers.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(groupMemberSearch.toLowerCase()) ||
        member.email.toLowerCase().includes(groupMemberSearch.toLowerCase());
      return matchesSearch;
    });
  }, [groupMemberSearch, workspaceDirectoryMembers]);

  const filteredDirectoryMembers = useMemo(() => {
    return workspaceDirectoryMembers.filter((member) => {
      const roleLabel = getMemberRoleBadge(member.access, member.role).label;
      return (
        member.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
        member.email.toLowerCase().includes(directorySearch.toLowerCase()) ||
        roleLabel.toLowerCase().includes(directorySearch.toLowerCase())
      );
    });
  }, [directorySearch, workspaceDirectoryMembers]);

  const activePermissions = conversationDetails?.permissions;
  const canManageMembers = Boolean(activePermissions?.can_manage_members);
  const canRenameGroup = Boolean(activePermissions?.can_rename_group);
  const canModerateMessages = Boolean(activePermissions?.can_moderate_messages);
  const canDeleteConversation = Boolean(
    activePermissions?.can_delete_conversation,
  );
  const notificationsMuted = Boolean(activeConversation?.notifications_muted);
  const visibleMemberCount =
    conversationDetails?.member_count ??
    currentChat?.member_count ??
    currentMembers.length;
  const memberLabel = visibleMemberCount === 1 ? "member" : "members";

  const showInboxPane = !isMobile || !mobileConversationOpen;
  const showConversationPane = !isMobile || mobileConversationOpen;

  const handleSelectChat = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setShowNewMessageJump(false);
    if (isMobile) {
      setMobileConversationOpen(true);
    }
  };

  const scrollToLatestMessage = (behavior: ScrollBehavior = "smooth") => {
    const container = messageScrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    setShowNewMessageJump(false);
  };

  const isScrolledFarFromBottom = () => {
    const container = messageScrollContainerRef.current;
    if (!container) {
      return false;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom > 320;
  };

  const handleMessageChange = async (value: string) => {
    setNewMessage(value);
    if (!currentChat) return;

    const hasValue = Boolean(value.trim());
    if (hasValue && !typingActiveRef.current) {
      typingActiveRef.current = true;
      await sendTypingIndicator(true);
    }
    if (!hasValue && typingActiveRef.current) {
      typingActiveRef.current = false;
      await sendTypingIndicator(false);
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (hasValue) {
      typingTimeoutRef.current = window.setTimeout(() => {
        typingActiveRef.current = false;
        void sendTypingIndicator(false);
      }, 2500);
    }
  };

  const clearComposer = async () => {
    setNewMessage("");
    if (currentChat?.id) {
      setSelectedTagsByConversation((prev) => ({
        ...prev,
        [currentChat.id]: [],
      }));
    }
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingActiveRef.current = false;
    await sendTypingIndicator(false);
  };

  const handleKeyPress = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChat) return;

    const outgoingMessage = newMessage;
    const outgoingTags = selectedTags;
    await clearComposer();

    try {
      await sendMessage(outgoingMessage, {
        tags: outgoingTags.length ? outgoingTags : undefined,
      });
    } catch (chatError: any) {
      setNewMessage(outgoingMessage);
      if (currentChat?.id) {
        setSelectedTagsByConversation((prev) => ({
          ...prev,
          [currentChat.id]: outgoingTags,
        }));
      }
      toast.error(chatError.message || "Failed to send message");
    }
  };

  const handleCreateDirectConversation = async (member: TeamMember) => {
    try {
      setIsCreateDirectOpen(false);
      setIsDirectoryOpen(false);
      setSearchParams({ section: "direct" }, { replace: true });
      await createDirectConversation(
        member.user_id
          ? { target_user_id: member.user_id }
          : { target_team_member_id: member.id },
      );
      setIsCreateDirectOpen(false);
      setIsDirectoryOpen(false);
      setDirectMemberSearch("");
      if (isMobile) {
        setMobileConversationOpen(true);
      }
    } catch (chatError: any) {
      setIsCreateDirectOpen(true);
      toast.error(chatError.message || "Failed to start direct chat");
    }
  };

  const handleCreateDirectConversationFromChatMember = async (
    member: ChatMember,
  ) => {
    try {
      setIsManageMembersOpen(false);
      setSearchParams({ section: "direct" }, { replace: true });
      await createDirectConversation(
        member.user_id
          ? { target_user_id: member.user_id }
          : { target_team_member_id: member.team_member_id },
      );
      setIsManageMembersOpen(false);
      if (isMobile) {
        setMobileConversationOpen(true);
      }
    } catch (chatError: any) {
      setIsManageMembersOpen(true);
      toast.error(chatError.message || "Failed to start direct chat");
    }
  };

  const handleCreateGroupConversation = async () => {
    const selectedMembers = workspaceDirectoryMembers.filter((member) =>
      selectedGroupMembers.includes(member.id),
    );

    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (!selectedMembers.length) {
      toast.error("Choose at least one member for the group");
      return;
    }

    try {
      setIsCreateGroupOpen(false);
      await createGroupConversation({
        name: groupName.trim(),
        metadata: groupDescription.trim()
          ? { description: groupDescription.trim() }
          : undefined,
        participant_user_ids: selectedMembers
          .filter((member) => member.user_id)
          .map((member) => member.user_id as string),
        participant_team_member_ids: selectedMembers
          .filter((member) => !member.user_id)
          .map((member) => member.id),
      });
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupMembers([]);
      setGroupMemberSearch("");
      if (isMobile) {
        setMobileConversationOpen(true);
      }
    } catch (chatError: any) {
      setIsCreateGroupOpen(true);
      toast.error(chatError.message || "Failed to create group");
    }
  };

  const handleRenameConversation = async () => {
    if (!renameValue.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    try {
      setIsRenameOpen(false);
      await renameConversation(renameValue.trim());
      toast.success("Group name updated");
    } catch (chatError: any) {
      setIsRenameOpen(true);
      toast.error(chatError.message || "Failed to rename group");
    }
  };

  const handleAddMembers = async () => {
    const selectedMembers = availableMembersToAdd.filter((member) =>
      selectedAddMembers.includes(member.id),
    );

    if (!selectedMembers.length) {
      toast.error("Select at least one member to add");
      return;
    }

    try {
      setIsManageMembersOpen(false);
      await addConversationMembers({
        participant_user_ids: selectedMembers
          .filter((member) => member.user_id)
          .map((member) => member.user_id as string),
        participant_team_member_ids: selectedMembers
          .filter((member) => !member.user_id)
          .map((member) => member.id),
      });
      setSelectedAddMembers([]);
      toast.success("Members added");
    } catch (chatError: any) {
      setIsManageMembersOpen(true);
      toast.error(chatError.message || "Failed to add members");
    }
  };

  const handleRemoveMember = async (member: ChatMember) => {
    try {
      await removeConversationMember(member.user_id);
      toast.success(`${member.name} removed from group`);
    } catch (chatError: any) {
      toast.error(chatError.message || "Failed to remove member");
    }
  };

  const handleDeleteConversation = async () => {
    if (!deleteConversationTarget) {
      return;
    }

    try {
      setIsDeleteConversationOpen(false);
      await deleteConversation(deleteConversationTarget.id);
      if (deleteConversationTarget.type === "direct") {
        setSearchParams({ section: "projects" }, { replace: true });
      }
      toast.success(
        deleteConversationTarget.type === "group"
          ? "Group chat deleted"
          : "Personal chat deleted",
      );
      setDeleteConversationTarget(null);
      if (isMobile) {
        setMobileConversationOpen(false);
      }
    } catch (chatError: any) {
      setIsDeleteConversationOpen(true);
      toast.error(chatError.message || "Failed to delete conversation");
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      await updateConversationPreferences(!notificationsMuted);
      toast.success(
        !notificationsMuted ? "Notifications muted" : "Notifications enabled",
      );
    } catch (chatError: any) {
      toast.error(chatError.message || "Failed to update preferences");
    }
  };

  const handleConfirmEdit = async () => {
    if (!editingMessage || !editValue.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      setEditingMessage(null);
      await editMessage(editingMessage.id, editValue.trim());
      toast.success("Message updated");
    } catch (chatError: any) {
      setEditingMessage(editingMessage);
      toast.error(chatError.message || "Failed to edit message");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      setDeleteTarget(null);
      await deleteMessage(deleteTarget.id);
      toast.success("Message deleted");
    } catch (chatError: any) {
      setDeleteTarget(deleteTarget);
      toast.error(chatError.message || "Failed to delete message");
    }
  };

  const handleToggleTag = (tag: (typeof MESSAGE_TAGS)[number]) => {
    if (!currentChat?.id) {
      return;
    }

    setSelectedTagsByConversation((prev) => {
      const currentTags = prev[currentChat.id] ?? [];
      return {
        ...prev,
        [currentChat.id]: currentTags.includes(tag)
          ? currentTags.filter((item) => item !== tag)
          : [...currentTags, tag],
      };
    });
  };

  const handleRemoveSelectedTag = (tag: MessageTag) => {
    if (!currentChat?.id) {
      return;
    }

    setSelectedTagsByConversation((prev) => ({
      ...prev,
      [currentChat.id]: (prev[currentChat.id] ?? []).filter(
        (item) => item !== tag,
      ),
    }));
  };

  const handleUpdateMessageTag = async (
    message: ChatMessage,
    tag: MessageTag,
  ) => {
    const nextTags = message.tags.includes(tag)
      ? message.tags.filter((item) => item !== tag)
      : [...message.tags, tag];

    try {
      await updateMessageTags(message.id, nextTags);
      toast.success(
        nextTags.includes(tag)
          ? `${getMessageTagConfig(tag).label} added`
          : `${getMessageTagConfig(tag).label} removed`,
      );
    } catch (chatError: any) {
      toast.error(chatError.message || "Failed to update message tag");
    }
  };

  const jumpToMessage = (messageId: string) => {
    setChatPanelMode("messages");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(`chat-message-${messageId}`);
        if (!target) {
          toast.message(
            "That tagged message is outside the loaded chat history.",
          );
          return;
        }

        target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  };

  useEffect(() => {
    if (
      !requestedConversationId ||
      !requestedMessageId ||
      activeConversationId !== requestedConversationId ||
      loadingMessages
    ) {
      return;
    }

    const hasMessageLoaded = messages.some(
      (message) => message.id === requestedMessageId,
    );

    if (!hasMessageLoaded) {
      return;
    }

    jumpToMessage(requestedMessageId);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("messageId");
    nextParams.delete("panel");
    setSearchParams(nextParams, { replace: true });
  }, [
    activeConversationId,
    loadingMessages,
    messages,
    requestedConversationId,
    requestedMessageId,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    const container = messageScrollContainerRef.current;
    if (!container || !currentChat) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    const previousCount = previousMessageCountRef.current;
    const currentCount = messages.length;
    const messageCountInView = currentCount;
    const latestMessage = messages[currentCount - 1];
    const latestFromCurrentUser = latestMessage?.sender.user_id === profile?.id;

    if (shouldScrollOnConversationOpenRef.current && !loadingMessages) {
      shouldScrollOnConversationOpenRef.current = false;
      previousMessageCountRef.current = currentCount;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToLatestMessage("auto");
          hasCompletedInitialScrollRef.current = true;
        });
      });
      return;
    }

    if (!hasCompletedInitialScrollRef.current) {
      previousMessageCountRef.current = currentCount;
      return;
    }

    if (currentCount > previousCount) {
      if (!isScrolledFarFromBottom() || latestFromCurrentUser) {
        requestAnimationFrame(() => {
          scrollToLatestMessage("smooth");
        });
      } else if (messageCountInView > 8) {
        setShowNewMessageJump(true);
      }
    }

    previousMessageCountRef.current = currentCount;
  }, [currentChat, loadingMessages, messages, profile?.id]);

  return (
    <>
      <div className="flex h-[calc(100vh-8rem)] min-h-0 gap-3 sm:gap-4">
        {showInboxPane && (
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col md:max-w-sm md:flex-[0_0_24rem]">
            <CardHeader className="space-y-3 border-b pb-3 sm:space-y-4 sm:pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Start direct conversations, create groups, and keep track of
                    live workspace activity.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ActionMenu
                    align="end"
                    trigger={() => (
                      <button
                        type="button"
                        className="premium-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground transition-colors hover:bg-primary/92 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-9 sm:w-9"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Create conversation</span>
                      </button>
                    )}
                  >
                    {({ close }) => (
                      <>
                        <ActionMenuItem
                          label="Workspace people"
                          onSelect={() => {
                            close();
                            setIsDirectoryOpen(true);
                          }}
                        />
                        <ActionMenuSeparator />
                        <ActionMenuItem
                          label="New direct chat"
                          onSelect={() => {
                            close();
                            setIsCreateDirectOpen(true);
                          }}
                        />
                        {isWorkspaceManager && (
                          <ActionMenuItem
                            label="New group chat"
                            onSelect={() => {
                              close();
                              setIsCreateGroupOpen(true);
                            }}
                          />
                        )}
                      </>
                    )}
                  </ActionMenu>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-14"
                />
              </div>

              <div className="flex gap-2">
                {chatSections.map((section) => (
                  <Button
                    key={section.id}
                    variant={
                      activeSection === section.id ? "default" : "outline"
                    }
                    size="sm"
                    className="rounded-md px-3"
                    onClick={() =>
                      setSearchParams(
                        { section: section.id },
                        { replace: true },
                      )
                    }
                  >
                    {section.label}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
              <div className="space-y-1 p-2.5 sm:p-3">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading conversations...
                  </div>
                ) : filteredChats.length === 0 ? (
                  <Empty className="min-h-[16rem] border-none bg-transparent p-0">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MessageSquare />
                      </EmptyMedia>
                      <EmptyTitle>
                        {activeSection === "direct"
                          ? "No personal chats yet"
                          : "No group chats yet"}
                      </EmptyTitle>
                      <EmptyDescription>
                        {activeSection === "direct"
                          ? "Start a personal chat with someone in this workspace."
                          : "Create or join a group chat to start collaborating."}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  filteredChats.map((conversation) => {
                    const isActive = currentChat?.id === conversation.id;
                    const displayName = getConversationDisplayName(
                      conversation,
                      profile?.id,
                    );
                    const avatar = getConversationAvatar(
                      conversation,
                      profile?.id,
                    );
                    const otherMember =
                      conversation.type === "direct"
                        ? conversation.members.find(
                            (member) => member.user_id !== profile?.id,
                          )
                        : null;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectChat(conversation.id)}
                        className={cn(
                          "premium-interactive w-full rounded-xl border px-2.5 py-2.5 text-left transition-colors sm:px-3 sm:py-3",
                          conversation.type === "group" &&
                            "border-sky-100 bg-sky-50/40 hover:bg-sky-50/60 dark:border-sky-950 dark:bg-sky-950/20",
                          isActive
                            ? "border-primary/20 bg-primary/8"
                            : "border-transparent hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-start gap-2.5 sm:gap-3">
                          <div className="relative mt-0.5">
                            {conversation.type === "group" ? (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted sm:h-10 sm:w-10">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ) : (
                              <AvatarVisual
                                name={displayName}
                                avatar={avatar || null}
                              />
                            )}
                            {conversation.type === "direct" &&
                              otherMember?.online && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
                              )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
                                {displayName}
                              </span>
                              <span className="shrink-0 text-[11px] text-muted-foreground">
                                {formatShortTime(
                                  conversation.last_message_at ??
                                    conversation.created_at,
                                )}
                              </span>
                              {conversation.unread_count > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="shrink-0 rounded-full px-2 py-0 text-[11px]"
                                >
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>

                            {conversation.type === "group" && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {conversation.member_count}{" "}
                                {conversation.member_count === 1
                                  ? "member"
                                  : "members"}
                              </p>
                            )}

                            <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">
                              {conversation.type === "group" &&
                              conversation.last_message?.sender.name
                                ? `${conversation.last_message.sender.name}: `
                                : ""}
                              {conversation.last_message?.body ||
                                "No messages yet"}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                              {conversation.notifications_muted && (
                                <BellOff className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {showConversationPane && (
          <Card className="flex min-h-0 min-w-0 flex-1 flex-col">
            <CardHeader className="border-b pb-3 sm:pb-4">
              {currentChat ? (
                <div className="flex items-start justify-between gap-2.5 sm:gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
                        onClick={() => setMobileConversationOpen(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back to conversations</span>
                      </Button>
                    )}

                    {currentChat.type === "direct" ? (
                      <div className="relative shrink-0">
                        <AvatarVisual
                          className="h-10 w-10 text-sm sm:h-11 sm:w-11"
                          name={currentConversationName}
                          email={directConversationMember?.email}
                          avatar={
                            getConversationAvatar(currentChat, profile?.id) ||
                            null
                          }
                        />
                        {directConversationMember?.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
                        )}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted sm:h-11 sm:w-11">
                        <Users className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold sm:text-lg">
                        {currentConversationName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:gap-2 sm:text-sm">
                        {typingNames.length ? (
                          <span>
                            {typingNames.join(", ")}{" "}
                            {typingNames.length > 1 ? "are" : "is"} typing...
                          </span>
                        ) : currentChat.type === "direct" ? (
                          <>
                            <span>{directConversationRoleLabel}</span>
                            {currentMembers.find(
                              (member) => member.user_id !== profile?.id,
                            )?.online && (
                              <>
                                <span className="text-border">•</span>
                                <span>Online</span>
                              </>
                            )}
                          </>
                        ) : (
                          <span>
                            {visibleMemberCount} {memberLabel}
                          </span>
                        )}
                        {notificationsMuted && (
                          <Badge
                            variant="outline"
                            className="rounded-full px-2 py-0 text-[11px]"
                          >
                            Muted
                          </Badge>
                        )}
                      </div>
                      {currentConversationDescription && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
                          {currentConversationDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <ActionMenu
                      align="end"
                      trigger={() => (
                        <button
                          type="button"
                          className="premium-interactive inline-flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-9 sm:w-9"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Conversation actions</span>
                        </button>
                      )}
                    >
                      {({ close }) => (
                        <>
                          {currentChat.type === "direct" &&
                            directConversationMember && (
                              <ActionMenuItem
                                label="View profile"
                                onSelect={() => {
                                  close();
                                  setProfilePreviewMember({
                                    name: directConversationMember.name,
                                    email: directConversationMember.email,
                                    avatar: directConversationMember.avatar,
                                    role: directConversationMember.role,
                                    access: directConversationMember.access,
                                  });
                                }}
                              />
                            )}
                          {currentChat.type === "group" && (
                            <ActionMenuItem
                              label="Show group info"
                              onSelect={() => {
                                close();
                                setIsGroupInfoOpen(true);
                              }}
                            />
                          )}
                          {currentChat.type === "group" && (
                            <ActionMenuItem
                              label="Show members"
                              onSelect={() => {
                                close();
                                setIsManageMembersOpen(true);
                              }}
                            />
                          )}
                          {currentChat.type === "group" && canRenameGroup && (
                            <ActionMenuItem
                              label="Rename group"
                              onSelect={() => {
                                close();
                                setIsRenameOpen(true);
                              }}
                            />
                          )}
                          {currentChat.type === "group" && canManageMembers && (
                            <ActionMenuItem
                              label="Manage members"
                              onSelect={() => {
                                close();
                                setIsManageMembersOpen(true);
                              }}
                            />
                          )}
                          <ActionMenuSeparator />
                          <ActionMenuItem
                            label={
                              notificationsMuted
                                ? "Unmute notifications"
                                : "Mute notification"
                            }
                            onSelect={() => {
                              close();
                              void handleUpdatePreferences();
                            }}
                          />
                          {canDeleteConversation && (
                            <ActionMenuItem
                              label={
                                currentChat.type === "group"
                                  ? "Delete group chat"
                                  : "Delete personal chat"
                              }
                              icon={Trash2}
                              destructive
                              onSelect={() => {
                                close();
                                setDeleteConversationTarget(currentChat);
                                setIsDeleteConversationOpen(true);
                              }}
                            />
                          )}
                        </>
                      )}
                    </ActionMenu>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  No conversation selected.
                </div>
              )}
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              {currentChat?.type === "group" && (
                <div className="border-b px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full px-3 text-[11px] sm:text-xs"
                      variant={
                        chatPanelMode === "messages" ? "default" : "outline"
                      }
                      onClick={() => setChatPanelMode("messages")}
                    >
                      Messages
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-full px-3 text-[11px] sm:text-xs"
                      variant={
                        chatPanelMode === "summary" ? "default" : "outline"
                      }
                      onClick={() => setChatPanelMode("summary")}
                    >
                      <ListFilter className="mr-2 h-4 w-4" />
                      Decision Feed
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            role="button"
                            tabIndex={0}
                            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                            onClick={(event) => event.preventDefault()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                              }
                            }}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span className="sr-only">
                              What decision feed means
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[260px] text-left leading-relaxed">
                          Review the key decisions, blockers, and action items from
                          this group without rereading the full chat stream.
                        </TooltipContent>
                      </Tooltip>
                      <Badge
                        variant="secondary"
                        className="ml-2 rounded-full px-2 py-0 text-[10px]"
                      >
                        {taggedMessages.length}
                      </Badge>
                    </Button>
                  </div>
                  {chatPanelMode === "summary" && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full px-3 text-[11px] sm:text-xs"
                          variant={
                            activeTagFilter === "all" ? "default" : "outline"
                          }
                          onClick={() => setActiveTagFilter("all")}
                        >
                          All signals
                        </Button>
                        {MESSAGE_TAGS.map((tag) => {
                          const config = getMessageTagConfig(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              className={cn(
                                "premium-interactive inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[11px] font-medium transition-colors sm:text-xs",
                                activeTagFilter === tag
                                  ? config.chipClassName
                                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                              )}
                              onClick={() => setActiveTagFilter(tag)}
                            >
                              <Flag className="h-3 w-3" />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="relative flex-1 min-h-0">
                {showNewMessageJump && (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center">
                    <button
                      type="button"
                      className="pointer-events-auto inline-flex items-center rounded-md border bg-background/95 px-3 py-2 text-sm shadow-sm backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
                      onClick={() => scrollToLatestMessage("smooth")}
                    >
                      <ArrowDown className="mr-2 h-4 w-4" />
                      New message
                    </button>
                  </div>
                )}
                <div
                  ref={messageScrollContainerRef}
                    className="h-full overflow-y-auto p-3 sm:p-4"
                  onScroll={() => {
                    if (!isScrolledFarFromBottom()) {
                      setShowNewMessageJump(false);
                    }
                  }}
                >
                  {chatPanelMode === "summary" &&
                  currentChat?.type === "group" ? (
                    loadingTaggedMessages ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading tagged messages...
                      </div>
                    ) : filteredTaggedMessages.length ? (
                      <div className="space-y-2.5 sm:space-y-3">
                        {filteredTaggedMessages.map((message) => (
                          <div
                            key={`summary-${message.id}`}
                            className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">
                                  {message.sender.name || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(message.created_at).toLocaleString(
                                    [],
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => jumpToMessage(message.id)}
                              >
                                Jump to message
                              </Button>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {message.tags.map((tag) => {
                                const config = getMessageTagConfig(tag);
                                return (
                                  <span
                                    key={`${message.id}-${tag}`}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                                      config.chipClassName,
                                    )}
                                  >
                                    <Flag className="h-3 w-3" />
                                    {config.label}
                                  </span>
                                );
                              })}
                            </div>
                            <p className="mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed [overflow-wrap:anywhere] sm:mt-3 sm:text-sm">
                              {message.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty className="min-h-[28rem] border-none bg-transparent">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Flag />
                          </EmptyMedia>
                          <EmptyTitle>No tagged decisions yet</EmptyTitle>
                          <EmptyDescription>
                            Use tags like Decision, Action Item, or Blocker to
                            capture the important moments from this group chat.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    )
                  ) : loadingMessages && currentChat ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading messages...
                    </div>
                  ) : currentChat ? (
                    <div className="space-y-3 sm:space-y-4">
                      {hasMoreMessages && (
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void loadOlderMessages()}
                            disabled={loadingOlderMessages}
                          >
                            {loadingOlderMessages ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading earlier messages...
                              </>
                            ) : (
                              "Load earlier messages"
                            )}
                          </Button>
                        </div>
                      )}

                      {messages.length ? (
                        messages.map((message, index) => {
                          const previousMessage = messages[index - 1];
                          const showDaySeparator =
                            !previousMessage ||
                            new Date(previousMessage.created_at).toDateString() !==
                              new Date(message.created_at).toDateString();
                          const isCurrentUserMessage =
                            message.sender.user_id === profile?.id;

                          return (
                            <Fragment key={message.id}>
                              {showDaySeparator && (
                                <div className="flex justify-center py-1.5">
                                  <div className="inline-flex items-center rounded-full border bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                                    {new Date(message.created_at).toLocaleDateString(
                                      [],
                                      {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      },
                                    )}
                                  </div>
                                </div>
                              )}
                              <MessageBubble
                                message={message}
                                isCurrentUser={isCurrentUserMessage}
                                canDeleteModeration={
                                  canModerateMessages &&
                                  currentChat.type === "group"
                                }
                                canTagMessage={currentChat.type === "group"}
                                showActionMenu={
                                  currentChat.type === "group" ||
                                  isCurrentUserMessage
                                }
                                onEdit={setEditingMessage}
                                onDelete={setDeleteTarget}
                                onToggleTag={(target, tag) => {
                                  void handleUpdateMessageTag(target, tag);
                                }}
                                onPreviewProfile={(target) =>
                                  setProfilePreviewMember({
                                    name: target.sender.name,
                                    avatar: target.sender.avatar,
                                  })
                                }
                              />
                            </Fragment>
                          );
                        })
                      ) : (
                        <Empty className="min-h-[28rem] border-none bg-transparent">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              {currentChat.type === "direct" ? (
                                <Hash />
                              ) : (
                                <Users />
                              )}
                            </EmptyMedia>
                            <EmptyTitle>
                              {currentChat.type === "group"
                                ? "No group messages yet"
                                : "No personal messages yet"}
                            </EmptyTitle>
                            <EmptyDescription>
                              {currentChat.type === "group"
                                ? `Start the first group message in ${currentConversationName}.`
                                : `Start the first personal message in ${currentConversationName}.`}
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )}
                      <div ref={messageBottomRef} />
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {error || "Try another chat section or search term."}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t p-3 sm:p-4">
                {currentChat?.last_message_at && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Updated{" "}
                    {formatRelativeTimestamp(currentChat.last_message_at)}
                  </p>
                )}

                <div className="space-y-2.5 sm:space-y-3">
                  {!!selectedTags.length && (
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map((tag) => {
                        const config = getMessageTagConfig(tag);
                        return (
                          <span
                            key={`composer-${tag}`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs",
                              config.chipClassName,
                            )}
                          >
                            <Flag className="h-3 w-3" />
                            {config.label}
                            <button
                              type="button"
                              className="rounded-full p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                              onClick={() => handleRemoveSelectedTag(tag)}
                            >
                              <X className="h-3 w-3" />
                              <span className="sr-only">
                                Remove {config.label} tag
                              </span>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder={
                        currentChat
                          ? `Message ${currentConversationName}...`
                          : "Select a conversation..."
                      }
                      value={newMessage}
                      onChange={(event) => {
                        void handleMessageChange(event.target.value);
                      }}
                      onKeyDown={(event) => {
                        void handleKeyPress(event);
                      }}
                      className="min-h-[52px] max-h-40 flex-1 resize-none overflow-y-auto text-xs sm:min-h-[56px] sm:text-sm"
                      disabled={!currentChat}
                    />
                    {currentChat?.type === "group" && (
                      <ActionMenu
                        align="end"
                        closeOnPointerLeave
                        trigger={() => (
                          <button
                            type="button"
                            className="premium-interactive inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-input bg-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:h-11 sm:w-11"
                          >
                            <Tag className="h-4 w-4" />
                            <span className="sr-only">
                              Tag message before sending
                            </span>
                          </button>
                        )}
                      >
                        {() => (
                          <>
                            <DropdownMenuLabel className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                              Capture signal
                            </DropdownMenuLabel>
                            {MESSAGE_TAGS.map((tag) => (
                              <ActionMenuItem
                                key={tag}
                                label={getMessageTagConfig(tag).label}
                                checked={selectedTags.includes(tag)}
                                keepOpen
                                onSelect={() => handleToggleTag(tag)}
                              />
                            ))}
                          </>
                        )}
                      </ActionMenu>
                    )}
                    <Button
                      className="h-10 w-10 shrink-0 rounded-xl p-0 sm:h-11 sm:w-11"
                      onClick={() => {
                        void handleSendMessage();
                      }}
                      disabled={!newMessage.trim() || !currentChat}
                    >
                      <Send className="h-4 w-4" />
                      <span className="sr-only">Send message</span>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isCreateDirectOpen} onOpenChange={setIsCreateDirectOpen}>
        <DialogContent className="top-[8vh] max-h-[82vh] max-w-2xl translate-y-0 overflow-hidden sm:top-1/2 sm:max-h-[85vh] sm:-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Start direct conversation</DialogTitle>
            <DialogDescription>
              Everyone in the current workspace is listed here so you can start
              a direct chat quickly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={directMemberSearch}
                onChange={(event) => setDirectMemberSearch(event.target.value)}
                placeholder="Search workspace members..."
                className="pl-14"
              />
            </div>

            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1 sm:max-h-[26rem]">
              {loadingWorkspaceMembers ? (
                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading workspace members...
                </div>
              ) : filteredDirectMembers.length === 0 ? (
                <Empty className="border-dashed py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle>No matching members</EmptyTitle>
                    <EmptyDescription>
                      Try another search term.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                filteredDirectMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-2 rounded-xl border p-3 sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <MemberAvatar
                        member={member}
                        onPreview={() => setProfilePreviewMember(member)}
                        showPresence
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium">{member.name}</p>
                          <PersonBadge
                            access={member.access}
                            role={member.role}
                            className="hidden max-w-[7.5rem] sm:inline-flex"
                          />
                        </div>
                        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{member.email}</span>
                          {member.online && (
                            <span className="shrink-0 text-emerald-600">Online</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="shrink-0 px-3"
                      onClick={() =>
                        void handleCreateDirectConversation(member)
                      }
                    >
                      <MessageSquare className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateGroupOpen}
        onOpenChange={(open) => {
          setIsCreateGroupOpen(open);
          if (!open) {
            setGroupName("");
            setGroupDescription("");
            setSelectedGroupMembers([]);
            setGroupMemberSearch("");
          }
        }}
      >
        <DialogContent className="top-[6vh] max-h-[84vh] max-w-2xl translate-y-0 overflow-hidden sm:top-1/2 sm:max-h-[85vh] sm:-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Create group chat</DialogTitle>
            <DialogDescription>
              Name the group, choose members from this workspace, and start
              collaborating.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Design review squad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description">Group description</Label>
              <Textarea
                id="group-description"
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="What is this group about?"
                className="min-h-[96px]"
              />
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={groupMemberSearch}
                onChange={(event) => setGroupMemberSearch(event.target.value)}
                placeholder="Search members to add..."
                className="pl-14"
              />
            </div>

            <div className="max-h-[24rem] space-y-2 overflow-y-auto pr-1 sm:max-h-[26rem]">
              {filteredGroupMembers.map((member) => {
                const checked = selectedGroupMembers.includes(member.id);
                return (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          setSelectedGroupMembers((prev) =>
                            nextChecked
                              ? [...prev, member.id]
                              : prev.filter((id) => id !== member.id),
                          );
                        }}
                      />
                      <MemberAvatar
                        member={member}
                        onPreview={() => setProfilePreviewMember(member)}
                        showPresence
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium">{member.name}</p>
                          <PersonBadge
                            access={member.access}
                            role={member.role}
                            className="hidden max-w-[7.5rem] sm:inline-flex"
                          />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                    {member.online && (
                      <Badge
                        variant="outline"
                        className="shrink-0 rounded-full px-2 py-0 text-[10px]"
                      >
                        <span className="hidden sm:inline">Online</span>
                        <span className="sm:hidden">On</span>
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCreateGroupOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreateGroupConversation()}>
              Create group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteConversationOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteConversationOpen(false);
            setDeleteConversationTarget(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {deleteConversationTarget?.type === "group"
                ? "Delete group chat"
                : "Delete personal chat"}
            </DialogTitle>
            <DialogDescription>
              {deleteConversationTarget?.type === "group"
                ? `This will remove ${deleteConversationTargetName || "this group"} from the workspace chat list for everyone.`
                : `This will remove the personal chat with ${deleteConversationTargetName || "this member"}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConversationOpen(false);
                setDeleteConversationTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteConversation()}
            >
              {deleteConversationTarget?.type === "group"
                ? "Delete group chat"
                : "Delete personal chat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDirectoryOpen} onOpenChange={setIsDirectoryOpen}>
        <DialogContent className="top-[6vh] max-h-[84vh] max-w-3xl translate-y-0 overflow-hidden sm:top-1/2 sm:max-h-[85vh] sm:-translate-y-1/2">
          <DialogHeader>
            <DialogTitle>Workspace people</DialogTitle>
            <DialogDescription>
              See everyone in this workspace, their roles, and start a
              conversation from one place.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={directorySearch}
                onChange={(event) => setDirectorySearch(event.target.value)}
                placeholder="Search by name, email, or role..."
                className="pl-14"
              />
            </div>

            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1 sm:max-h-[30rem]">
              {filteredDirectoryMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-xl border p-3 sm:gap-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <MemberAvatar
                      member={member}
                      onPreview={() => setProfilePreviewMember(member)}
                      showPresence
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-medium">{member.name}</p>
                        <PersonBadge
                          access={member.access}
                          role={member.role}
                          className="hidden max-w-[7.5rem] sm:inline-flex"
                        />
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {member.online && (
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0 text-[10px] text-emerald-600"
                      >
                        <span className="hidden sm:inline">Online</span>
                        <span className="sm:hidden">On</span>
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 px-3"
                      onClick={() =>
                        void handleCreateDirectConversation(member)
                      }
                    >
                      <span className="hidden sm:inline">Start chat</span>
                      <span className="sm:hidden">Chat</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
            <DialogDescription>
              Update the group name for everyone in this conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="rename-conversation">Group name</Label>
            <Input
              id="rename-conversation"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder="Enter a new group name"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRenameConversation()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupInfoOpen} onOpenChange={setIsGroupInfoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group info</DialogTitle>
            <DialogDescription>
              Overview for this group conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-medium">{currentConversationName}</p>
              <div className="mt-2 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide">Type</p>
                  <p className="font-medium text-foreground">
                    {currentChat?.metadata?.kind === "general"
                      ? "General group"
                      : "Group chat"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Members</p>
                  <p className="font-medium text-foreground">
                    {conversationDetails?.member_count ?? currentMembers.length}{" "}
                    {(conversationDetails?.member_count ??
                      currentMembers.length) === 1
                      ? "member"
                      : "members"}
                  </p>
                </div>
                {currentConversationDescription && (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide">
                      Description
                    </p>
                    <p className="font-medium text-foreground">
                      {currentConversationDescription}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide">Created</p>
                  <p className="font-medium text-foreground">
                    {currentChat?.created_at
                      ? formatRelativeTimestamp(currentChat.created_at)
                      : "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Updated</p>
                  <p className="font-medium text-foreground">
                    {currentChat?.updated_at
                      ? formatRelativeTimestamp(currentChat.updated_at)
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isManageMembersOpen} onOpenChange={setIsManageMembersOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage group members</DialogTitle>
            <DialogDescription>
              {canManageMembers
                ? "Add new people to this group or remove members who no longer need access."
                : "See who currently belongs to this group and start direct conversations from the roster."}
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn("grid gap-6", canManageMembers && "md:grid-cols-2")}
          >
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">Current members</h3>
                <p className="text-sm text-muted-foreground">
                  Access changes apply immediately.
                </p>
              </div>

              <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                {currentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <MemberAvatar
                        member={member}
                        onPreview={() => setProfilePreviewMember(member)}
                        showPresence
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{member.name}</p>
                          <PersonBadge
                            access={member.access}
                            role={member.role}
                          />
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {canManageMembers && member.user_id !== profile?.id && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void handleCreateDirectConversationFromChatMember(
                              member,
                            )
                          }
                        >
                          Chat
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-600"
                          onClick={() => void handleRemoveMember(member)}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    {!canManageMembers && member.user_id !== profile?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void handleCreateDirectConversationFromChatMember(
                            member,
                          )
                        }
                      >
                        Chat
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {canManageMembers && (
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium">Add members</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose more people from this workspace.
                  </p>
                </div>

                <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                  {availableMembersToAdd.length === 0 ? (
                    <Empty className="border-dashed py-10">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <UserPlus />
                        </EmptyMedia>
                        <EmptyTitle>No available members</EmptyTitle>
                        <EmptyDescription>
                          Everyone in the workspace is already part of this
                          group.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    availableMembersToAdd.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Checkbox
                            checked={selectedAddMembers.includes(member.id)}
                            onCheckedChange={(checked) => {
                              setSelectedAddMembers((prev) =>
                                checked
                                  ? [...prev, member.id]
                                  : prev.filter((id) => id !== member.id),
                              );
                            }}
                          />
                          <MemberAvatar
                            member={member}
                            onPreview={() => setProfilePreviewMember(member)}
                            showPresence
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">
                                {member.name}
                              </p>
                              <PersonBadge
                                access={member.access}
                                role={member.role}
                              />
                            </div>
                            <p className="truncate text-sm text-muted-foreground">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => void handleAddMembers()}
                  disabled={!selectedAddMembers.length}
                >
                  Add selected members
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingMessage)}
        onOpenChange={(open) => !open && setEditingMessage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
            <DialogDescription>
              Update the message body and save your changes.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            className="min-h-[140px]"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleConfirmEdit()}>
              <Check className="mr-2 h-4 w-4" />
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete message</DialogTitle>
            <DialogDescription>
              This will soft-delete the message and keep the timeline intact for
              everyone in the conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            {deleteTarget?.body}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={() => void handleConfirmDelete()}
            >
              Delete message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfilePreviewDialog
        open={Boolean(profilePreviewMember)}
        onOpenChange={(open) => {
          if (!open) {
            setProfilePreviewMember(null);
          }
        }}
        member={profilePreviewMember}
      />
    </>
  );
}
