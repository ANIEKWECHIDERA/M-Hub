import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Hash,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { chatSections, type ChatSection } from "@/config/chat-nav";
import { useChatContext } from "@/context/ChatContext";
import { useUser } from "@/context/UserContext";
import { getConversationAvatar, getConversationDisplayName, getConversationSection } from "@/lib/chat";
import { formatRelativeTimestamp, formatShortTime } from "@/lib/datetime";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";

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

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useUser();
  const {
    conversations,
    activeConversationId,
    activeConversation,
    conversationDetails,
    messages,
    loadingConversations,
    loadingMessages,
    error,
    setActiveConversationId,
    sendMessage,
    sendTypingIndicator,
    typingUserIds,
    unreadBySection,
  } = useChatContext();
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingActiveRef = useRef(false);
  const isMobile = useIsMobileScreen();

  const activeSection = useMemo(() => {
    const section = searchParams.get("section") as ChatSection | null;
    return chatSections.find((item) => item.id === section)?.id ?? "all";
  }, [searchParams]);

  useEffect(() => {
    const currentSection = searchParams.get("section") as ChatSection | null;

    if (!chatSections.some((section) => section.id === currentSection)) {
      setSearchParams({ section: "all" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

      if (activeSection === "all") {
        return true;
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
      activeConversationId &&
      filteredChats.some((conversation) => conversation.id === activeConversationId)
    ) {
      return;
    }

    setActiveConversationId(filteredChats[0].id);
  }, [activeConversationId, filteredChats, setActiveConversationId]);

  useEffect(() => {
    if (!isMobile) {
      setMobileConversationOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      typingActiveRef.current = false;
      void sendTypingIndicator(false);
    };
  }, [sendTypingIndicator]);

  const currentChat =
    filteredChats.find((conversation) => conversation.id === activeConversationId) ??
    filteredChats[0] ??
    null;
  const currentMembers = conversationDetails?.members ?? currentChat?.members ?? [];
  const typingNames = typingUserIds
    .map((userId) => currentMembers.find((member) => member.user_id === userId)?.name)
    .filter(Boolean) as string[];

  const handleSelectChat = (conversationId: string) => {
    setActiveConversationId(conversationId);
    if (isMobile) {
      setMobileConversationOpen(true);
    }
  };

  const handleMessageChange = async (value: string) => {
    setNewMessage(value);

    if (!currentChat) {
      return;
    }

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChat) return;

    const outgoingMessage = newMessage;
    setNewMessage("");

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingActiveRef.current = false;
    await sendTypingIndicator(false);

    try {
      await sendMessage(outgoingMessage);
    } catch (chatError: any) {
      setNewMessage(outgoingMessage);
      toast.error(chatError.message || "Failed to send message");
    }
  };

  const handleKeyPress = async (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSendMessage();
    }
  };

  const showInboxPane = !isMobile || !mobileConversationOpen;
  const showConversationPane = !isMobile || mobileConversationOpen;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[620px] gap-4">
      {showInboxPane && (
        <Card className="flex min-w-0 flex-1 flex-col md:max-w-sm md:flex-[0_0_22rem]">
          <CardHeader className="space-y-4 border-b pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Messages</CardTitle>
              <p className="text-sm text-muted-foreground">
                Browse workspace conversations and direct messages in one place.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="space-y-1 p-3">
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
                    <EmptyTitle>No conversations yet</EmptyTitle>
                    <EmptyDescription>
                      {activeSection === "all"
                        ? "Your workspace conversations will appear here."
                        : `No ${activeSection} chats match this view right now.`}
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
                  const avatar = getConversationAvatar(conversation, profile?.id);
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
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? "border-primary/20 bg-primary/8"
                          : "border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative mt-0.5">
                          {conversation.type === "group" ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ) : (
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={avatar || undefined} />
                              <AvatarFallback>
                                {displayName
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {conversation.type === "direct" && otherMember?.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {displayName}
                            </span>
                            {conversation.unread_count > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-auto rounded-full px-2 py-0 text-[11px]"
                              >
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {conversation.last_message?.body || "No messages yet"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatShortTime(
                              conversation.last_message_at ?? conversation.created_at,
                            )}
                          </p>
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
        <Card className="flex min-w-0 flex-1 flex-col">
          <CardHeader className="border-b pb-4">
            {currentChat ? (
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => setMobileConversationOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to conversations</span>
                  </Button>
                )}

                {currentChat.type === "direct" ? (
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={
                          getConversationAvatar(currentChat, profile?.id) ||
                          undefined
                        }
                      />
                      <AvatarFallback>
                        {getConversationDisplayName(currentChat, profile?.id)
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    {currentMembers.find((member) => member.user_id !== profile?.id)
                      ?.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                    )}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate font-semibold">
                    {getConversationDisplayName(currentChat, profile?.id)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {typingNames.length
                      ? `${typingNames.join(", ")} ${typingNames.length > 1 ? "are" : "is"} typing...`
                      : currentChat.type === "direct"
                        ? currentMembers.find((member) => member.user_id !== profile?.id)
                            ?.online
                          ? "Online"
                          : "Direct message"
                        : `${conversationDetails?.member_count ?? currentChat.member_count} members`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                No conversation selected.
              </div>
            )}
          </CardHeader>

          <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages && currentChat ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              ) : currentChat ? (
                messages.length ? (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isCurrentUser = message.sender.user_id === profile?.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            isCurrentUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isCurrentUser && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatar || undefined} />
                              <AvatarFallback>
                                {(message.sender.name || "U")
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div
                            className={`max-w-[82%] space-y-1 ${
                              isCurrentUser ? "items-end text-right" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{message.sender.name || "Unknown"}</span>
                              <span>{formatShortTime(message.created_at)}</span>
                              {message.is_edited && <span>edited</span>}
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {message.body}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty className="min-h-full border-none bg-transparent">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        {currentChat.type === "direct" ? <Hash /> : <Users />}
                      </EmptyMedia>
                      <EmptyTitle>No messages yet</EmptyTitle>
                      <EmptyDescription>
                        Start the conversation in{" "}
                        {getConversationDisplayName(currentChat, profile?.id)}.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {error || "Try another chat section or search term."}
                </div>
              )}
            </div>

            <div className="border-t p-4">
              {currentChat?.last_message_at && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Updated {formatRelativeTimestamp(currentChat.last_message_at)}
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={
                    currentChat
                      ? `Message ${getConversationDisplayName(currentChat, profile?.id)}...`
                      : "Select a conversation..."
                  }
                  value={newMessage}
                  onChange={(event) => {
                    void handleMessageChange(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    void handleKeyPress(event);
                  }}
                  className="flex-1"
                  disabled={!currentChat}
                />
                <Button
                  onClick={() => {
                    void handleSendMessage();
                  }}
                  disabled={!newMessage.trim() || !currentChat}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
