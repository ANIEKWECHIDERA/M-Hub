import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Hash,
  Search,
  Send,
  Users,
  MessageSquare,
} from "lucide-react";

import { chatSections, type ChatSection } from "@/config/chat-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatShortTime } from "@/lib/datetime";

const mockChats = [
  {
    id: 1,
    name: "General",
    type: "channel",
    unread: 3,
    lastMessage: "Great work on the project!",
    lastTime: "2026-03-17T14:30:00Z",
  },
  {
    id: 2,
    name: "TechCorp Project",
    type: "project",
    unread: 1,
    lastMessage: "Logo designs are ready for review",
    lastTime: "2026-03-17T13:45:00Z",
  },
  {
    id: 3,
    name: "Sarah Smith",
    type: "direct",
    unread: 0,
    lastMessage: "Thanks for the update",
    lastTime: "2026-03-17T12:30:00Z",
  },
];

const mockMessages = [
  {
    id: 1,
    author: "Sarah Smith",
    content: "Hey team! How's everyone doing with their tasks today?",
    timestamp: "2026-03-17T10:30:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    author: "John Doe",
    content:
      "Making good progress on the logo designs. Should have the first drafts ready by end of day.",
    timestamp: "2026-03-17T10:35:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    author: "Mike Johnson",
    content:
      "Website mockups are coming along nicely. Will share them in the project channel once ready.",
    timestamp: "2026-03-17T10:40:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 4,
    author: "Current User",
    content:
      "Excellent! Looking forward to seeing everyone's work. Let me know if you need any resources.",
    timestamp: "2026-03-17T10:45:00Z",
    avatar: "/placeholder.svg?height=32&width=32",
    isCurrentUser: true,
  },
];

function getInitialChat(section: ChatSection) {
  if (section === "projects") {
    return mockChats.find((chat) => chat.type === "project") ?? mockChats[0];
  }

  if (section === "direct") {
    return mockChats.find((chat) => chat.type === "direct") ?? mockChats[0];
  }

  return mockChats[0];
}

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
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const isMobile = useIsMobileScreen();

  const activeSection = useMemo(() => {
    const section = searchParams.get("section") as ChatSection | null;
    return chatSections.find((item) => item.id === section)?.id ?? "all";
  }, [searchParams]);

  const [selectedChatId, setSelectedChatId] = useState<number>(
    getInitialChat(activeSection)?.id ?? mockChats[0].id,
  );
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);

  useEffect(() => {
    const currentSection = searchParams.get("section") as ChatSection | null;

    if (!chatSections.some((section) => section.id === currentSection)) {
      setSearchParams({ section: "all" }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredChats = useMemo(
    () =>
      mockChats.filter((chat) => {
        const matchesSearch = chat.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

        if (!matchesSearch) {
          return false;
        }

        if (activeSection === "projects") return chat.type === "project";
        if (activeSection === "direct") return chat.type === "direct";
        return true;
      }),
    [activeSection, searchTerm],
  );

  useEffect(() => {
    if (filteredChats.some((chat) => chat.id === selectedChatId)) {
      return;
    }

    setSelectedChatId(
      filteredChats[0]?.id ?? getInitialChat(activeSection)?.id ?? mockChats[0].id,
    );
  }, [activeSection, filteredChats, selectedChatId]);

  useEffect(() => {
    if (!isMobile) {
      setMobileConversationOpen(false);
    }
  }, [isMobile]);

  const currentChat =
    filteredChats.find((chat) => chat.id === selectedChatId) ??
    filteredChats[0] ??
    null;

  const handleSelectChat = (chatId: number) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setMobileConversationOpen(true);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentChat) return;

    const message = {
      id: messages.length + 1,
      author: "Current User",
      content: newMessage,
      timestamp: new Date().toISOString(),
      avatar: "/placeholder.svg?height=32&width=32",
      isCurrentUser: true,
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
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
                Switch between channels, projects, and direct conversations.
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
              {filteredChats.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  No conversations match this section yet.
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = currentChat?.id === chat.id;

                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => handleSelectChat(chat.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        isActive
                          ? "border-primary/20 bg-primary/8"
                          : "border-transparent hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {chat.type === "channel" && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {chat.type === "project" && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          {chat.type === "direct" && (
                            <Avatar className="h-9 w-9">
                              <AvatarImage src="/placeholder.svg?height=36&width=36" />
                              <AvatarFallback>
                                {chat.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {chat.name}
                            </span>
                            {chat.unread > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-auto rounded-full px-2 py-0 text-[11px]"
                              >
                                {chat.unread}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {chat.lastMessage}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatShortTime(chat.lastTime)}
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
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="/placeholder.svg?height=40&width=40" />
                    <AvatarFallback>
                      {currentChat.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {currentChat.type === "channel" ? (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{currentChat.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentChat.type === "project"
                      ? "Project discussion"
                      : currentChat.type === "direct"
                        ? "Direct message"
                        : "Team channel"}
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
              {currentChat ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.isCurrentUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!message.isCurrentUser && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.avatar} />
                          <AvatarFallback>
                            {message.author
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={`max-w-[82%] space-y-1 ${
                          message.isCurrentUser ? "items-end text-right" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{message.author}</span>
                          <span>{formatShortTime(message.timestamp)}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            message.isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Try another chat section or search term.
                </div>
              )}
            </div>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  placeholder={
                    currentChat
                      ? `Message ${currentChat.name}...`
                      : "Select a conversation..."
                  }
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                  onKeyDown={handleKeyPress}
                  className="flex-1"
                  disabled={!currentChat}
                />
                <Button
                  onClick={handleSendMessage}
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
