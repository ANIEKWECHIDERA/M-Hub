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
  cursorConversationId: UUID.optional().nullable(),
});

export const ChatMessageListQueryDTO = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursorMessageId: UUID.optional().nullable(),
});

export const CreateDirectConversationDTO = z.object({
  target_user_id: UUID.optional(),
  target_team_member_id: UUID.optional(),
}).superRefine((value, ctx) => {
  const provided = [value.target_user_id, value.target_team_member_id].filter(Boolean);
  if (provided.length !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide exactly one direct-chat target.",
      path: ["target_user_id"],
    });
  }
});

export const CreateGroupConversationDTO = z.object({
  name: z.string().trim().min(1).max(120),
  participant_user_ids: z.array(UUID).max(50).default([]),
  participant_team_member_ids: z.array(UUID).max(50).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const AddConversationMembersDTO = z.object({
  participant_user_ids: z.array(UUID).max(50).default([]),
  participant_team_member_ids: z.array(UUID).max(50).default([]),
}).superRefine((value, ctx) => {
  if (!value.participant_user_ids.length && !value.participant_team_member_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide at least one member to add.",
      path: ["participant_user_ids"],
    });
  }
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

export const DeleteMessageDTO = z.object({
  hard_delete: z.boolean().optional(),
});

export const MarkConversationReadDTO = z
  .object({
    last_read_message_id: UUID.optional().nullable(),
    last_read_at: z.string().datetime().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.last_read_message_id && !value.last_read_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a message id or timestamp to mark as read.",
        path: ["last_read_message_id"],
      });
    }
  });
