import { z } from "zod";

const MAX_NOTE_TITLE_LENGTH = 160;
const MAX_NOTE_HTML_LENGTH = 100_000;
const MAX_TAG_LENGTH = 32;
const MAX_TAG_COUNT = 8;

const nullableUuid = z
  .union([z.string().uuid(), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (!value) return null;
    return value;
  });

const noteTagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(MAX_TAG_LENGTH),
  )
  .max(MAX_TAG_COUNT)
  .optional();

export const noteListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

export const createNoteSchema = z.object({
  title: z.string().trim().max(MAX_NOTE_TITLE_LENGTH).optional(),
  content_html: z.string().max(MAX_NOTE_HTML_LENGTH).optional(),
  project_id: nullableUuid,
  pinned: z.boolean().optional(),
  tags: noteTagsSchema,
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().max(MAX_NOTE_TITLE_LENGTH).optional(),
    content_html: z.string().max(MAX_NOTE_HTML_LENGTH).optional(),
    project_id: nullableUuid,
    pinned: z.boolean().optional(),
    tags: noteTagsSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one note field must be provided",
  });

export const pinNoteSchema = z.object({
  pinned: z.boolean(),
});

