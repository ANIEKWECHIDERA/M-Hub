import type {
  ChatConversation,
  ChatConversationDetails,
  ChatMember,
  ChatMessage,
} from "@/api/chat.api";
import type { ChatSection } from "@/config/chat-nav";

export function getConversationSection(
  conversation: Pick<ChatConversation, "type">,
): ChatSection {
  return conversation.type === "direct" ? "direct" : "projects";
}

export function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort((a, b) => {
    const aTime = a.last_message_at ?? a.created_at;
    const bTime = b.last_message_at ?? b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export function sortMessagesAscending(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export function upsertConversation(
  current: ChatConversation[],
  nextConversation: ChatConversation,
) {
  const map = new Map(current.map((conversation) => [conversation.id, conversation]));
  map.set(nextConversation.id, nextConversation);
  return sortConversations(Array.from(map.values()));
}

export function updateConversationPresence<T extends { members: ChatMember[] }>(
  conversation: T,
  userId: string,
  online: boolean,
): T {
  return {
    ...conversation,
    members: conversation.members.map((member) =>
      member.user_id === userId ? { ...member, online } : member,
    ),
  };
}

export function getConversationDisplayName(
  conversation: Pick<ChatConversation, "type" | "name" | "members">,
  currentUserId?: string | null,
) {
  if (conversation.type === "group") {
    return conversation.name || "Group chat";
  }

  const otherMember = conversation.members.find(
    (member) => member.user_id !== currentUserId,
  );
  return otherMember?.name || otherMember?.email || "Direct message";
}

export function getConversationAvatar(
  conversation: Pick<ChatConversation, "type" | "members">,
  currentUserId?: string | null,
) {
  if (conversation.type === "group") {
    return null;
  }

  const otherMember = conversation.members.find(
    (member) => member.user_id !== currentUserId,
  );
  return otherMember?.avatar ?? null;
}

export function getConversationSubtitle(
  conversation: Pick<ChatConversation, "type" | "members">,
  details?: ChatConversationDetails | null,
) {
  if (conversation.type === "direct") {
    const otherMember = (details?.members ?? conversation.members).find(
      (member) => member.user_id !== details?.members?.[0]?.user_id,
    );
    if (otherMember?.online) {
      return "Online";
    }
    return "Direct message";
  }

  return `${details?.member_count ?? conversation.members.length} members`;
}
