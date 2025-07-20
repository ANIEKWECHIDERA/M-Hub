import type React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Hash, Users, Search } from "lucide-react";

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

export default function Chat() {
  const [selectedChat, setSelectedChat] = useState(mockChats[0]);
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChats = mockChats.filter((chat) =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim()) {
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
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Chat Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Messages</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <Tabs defaultValue="all" className="h-full">
            <TabsList className="grid grid-cols-3 mx-4 mb-4 w-[24%]]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="direct">Direct</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0 h-full">
              <div className="space-y-1 px-4">
                {filteredChats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChat.id === chat.id
                        ? "bg-primary/10 border border-primary/20"
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
                        <Badge
                          variant="destructive"
                          className="ml-auto text-xs"
                        >
                          {chat.unread}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {chat.lastMessage}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {chat.lastTime}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Chat Main */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              {selectedChat.type === "channel" && (
                <Hash className="h-5 w-5 text-muted-foreground" />
              )}
              {selectedChat.type === "project" && (
                <Users className="h-5 w-5 text-muted-foreground" />
              )}
              {selectedChat.type === "direct" && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg?height=32&width=32" />
                  <AvatarFallback>
                    {selectedChat.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold truncate">{selectedChat.name}</h2>
              {selectedChat.type === "project" && (
                <p className="text-sm text-muted-foreground">
                  Project Discussion
                </p>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
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
                  <span className="font-medium text-sm">{message.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp}
                  </span>
                </div>
                <div
                  className={`inline-block p-3 rounded-lg max-w-[70%] ${
                    message.isCurrentUser
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Message ${selectedChat.name}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
