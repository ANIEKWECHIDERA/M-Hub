-- DropIndex
DROP INDEX "notes_company_author_pinned_updated_idx";

-- CreateIndex
CREATE INDEX "notes_company_id_author_id_pinned_updated_at_idx" ON "notes"("company_id", "author_id", "pinned", "updated_at");

-- RenameIndex
ALTER INDEX "note_tags_company_note_tag_key" RENAME TO "note_tags_company_id_note_id_tag_key";

-- RenameIndex
ALTER INDEX "notes_company_author_archived_idx" RENAME TO "notes_company_id_author_id_archived_at_idx";
