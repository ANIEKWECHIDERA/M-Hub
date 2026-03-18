import { z } from "zod";
import {
  CHAT_MESSAGE_TAGS,
  CHAT_MESSAGE_TYPES,
} from "../types/chat.types";

const UUID = z.string().uuid();

const chatMessageTypeSchema = z.enum(CHAT_MESSAGE_TYPES);
const chatMessageTagSchema = z.enum(CHAT_MESSAGE_TAGS);

export const ChatListQueryDTO = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const ChatMessageListQueryDTO = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursorMessageId: UUID.optional().nullable(),
});

export const CreateDirectConversationDTO = z.object({
  participant_user_ids: z.array(UUID).length(1),
});

export const CreateGroupConversationDTO = z.object({
  name: z.string().trim().min(1).max(120),
  participant_user_ids: z.array(UUID).max(50).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AddConversationMembersDTO = z.object({
  participant_user_ids: z.array(UUID).min(1).max(50),
});

export const RenameConversationDTO = z.object({
  name: z.string().trim().min(1).max(120),
});

export const SendMessageDTO = z
  .object({
    body: z.string().trim().min(1).max(4000),
    message_type: chatMessageTypeSchema.optional(),
    reply_to_message_id: UUID.optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(chatMessageTagSchema).max(10).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.message_type === "system") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "System messages can only be created by the server.",
        path: ["message_type"],
      });
    }
  });

export const EditMessageDTO = z.object({
  body: z.string().trim().min(1).max(4000),
});
