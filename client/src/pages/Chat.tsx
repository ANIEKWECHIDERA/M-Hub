import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Hash, Search, Send, Users } from "lucide-react";

import { chatSections, type ChatSection } from "@/config/chat-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const mockChats = [
  {
    id: 1,
    name: "General",
    type: "channel",
    unread: 3,
    lastMessage: "Great work on the project!",
    lastTime: "2:30 PM",
  },
  {
    id: 2,
    name: "TechCorp Project",
    type: "project",
    unread: 1,
    lastMessage: "Logo designs are ready for review",
    lastTime: "1:45 PM",
  },
  {
    id: 3,
    name: "Sarah Smith",
    type: "direct",
    unread: 0,
    lastMessage: "Thanks for the update",
    lastTime: "12:30 PM",
  },
];

const mockMessages = [
  {
    id: 1,
    author: "Sarah Smith",
    content: "Hey team! How's everyone doing with their tasks today?",
    timestamp: "10:30 AM",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    author: "John Doe",
    content:
      "Making good progress on the logo designs. Should have the first drafts ready by end of day.",
    timestamp: "10:35 AM",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    author: "Mike Johnson",
    content:
      "Website mockups are coming along nicely. Will share them in the project channel once ready.",
    timestamp: "10:40 AM",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 4,
    author: "Current User",
    content:
      "Excellent! Looking forward to seeing everyone's work. Let me know if you need any resources.",
    timestamp: "10:45 AM",
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

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activeSection = useMemo(() => {
    const section = searchParams.get("section") as ChatSection | null;

    return chatSections.find((item) => item.id === section)?.id ?? "all";
  }, [searchParams]);

  const [selectedChatId, setSelectedChatId] = useState<number>(
    getInitialChat(activeSection)?.id ?? mockChats[0].id,
  );

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

        if (activeSection === "projects") {
          return chat.type === "project";
        }

        if (activeSection === "direct") {
          return chat.type === "direct";
        }

        return true;
      }),
    [activeSection, searchTerm],
  );

  useEffect(() => {
    if (filteredChats.some((chat) => chat.id === selectedChatId)) {
      return;
    }

    setSelectedChatId(filteredChats[0]?.id ?? getInitialChat(activeSection)?.id ?? mockChats[0].id);
  }, [activeSection, filteredChats, selectedChatId]);

  const currentChat =
    filteredChats.find((chat) => chat.id === selectedChatId) ??
    filteredChats[0] ??
    null;

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentChat) {
      return;
    }

    const message = {
      id: messages.length + 1,
      author: "Current User",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      avatar: "/placeholder.svg?height=32&width=32",
      isCurrentUser: true,
    };

    setMessages([...messages, message]);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <Card className="flex w-80 min-w-0 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Messages</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
          <div className="space-y-1 px-4 pb-4">
            {filteredChats.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No conversations match this section yet.
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`cursor-pointer rounded-lg p-3 transition-colors ${
                    currentChat?.id === chat.id
                      ? "border border-primary/20 bg-primary/10"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {chat.type === "channel" && (
                        <Hash className="h-4 w-4 text-muted-foreground" />
                      )}
                      {chat.type === "project" && (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      {chat.type === "direct" && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="/placeholder.svg?height=24&width=24" />
                          <AvatarFallback className="text-xs">
                            {chat.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="font-medium text-sm">{chat.name}</span>
                    </div>
                    {chat.unread > 0 && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {chat.unread}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    {chat.lastMessage}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {chat.lastTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-w-0 flex-1 flex-col">
        <CardHeader className="border-b">
          {currentChat ? (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex-shrink-0">
                {currentChat.type === "channel" && (
                  <Hash className="h-5 w-5 text-muted-foreground" />
                )}
                {currentChat.type === "project" && (
                  <Users className="h-5 w-5 text-muted-foreground" />
                )}
                {currentChat.type === "direct" && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" />
                    <AvatarFallback>
                      {currentChat.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{currentChat.name}</h2>
                {currentChat.type === "project" && (
                  <p className="text-sm text-muted-foreground">
                    Project Discussion
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No conversations available in this view.
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
          {currentChat ? (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.isCurrentUser ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {message.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`flex-1 space-y-1 ${
                    message.isCurrentUser ? "text-right" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{message.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                  <div
                    className={`inline-block max-w-[70%] rounded-lg p-3 ${
                      message.isCurrentUser
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Try another chat section or search term.
            </div>
          )}
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={
                currentChat ? `Message ${currentChat.name}...` : "Select a conversation..."
              }
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
      </Card>
    </div>
  );
}
