ALTER TABLE "notes"
ADD COLUMN IF NOT EXISTS "plain_text_preview" TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "last_edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "notes"
SET
  "plain_text_preview" = LEFT(
    TRIM(
      REGEXP_REPLACE(
        COALESCE("content", ''),
        '<[^>]+>',
        ' ',
        'g'
      )
    ),
    280
  ),
  "last_edited_at" = COALESCE("updated_at", CURRENT_TIMESTAMP)
WHERE "plain_text_preview" = ''
   OR "last_edited_at" IS NULL;

CREATE INDEX IF NOT EXISTS "notes_company_author_archived_idx"
  ON "notes" ("company_id", "author_id", "archived_at");

CREATE INDEX IF NOT EXISTS "notes_company_author_pinned_updated_idx"
  ON "notes" ("company_id", "author_id", "pinned", "updated_at" DESC);

CREATE UNIQUE INDEX IF NOT EXISTS "note_tags_company_note_tag_key"
  ON "note_tags" ("company_id", "note_id", "tag");
