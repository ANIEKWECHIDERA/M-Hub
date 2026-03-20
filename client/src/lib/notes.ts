import DOMPurify from "dompurify";

export const EMPTY_NOTE_HTML = "<p><br></p>";

export const NOTE_EDITOR_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "blockquote",
  "list",
  "bullet",
  "code-block",
  "link",
  "color",
  "background",
] as const;

export const NOTE_EDITOR_TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
  ["blockquote", "code-block"],
  [{ color: [] }, { background: [] }],
  ["link", "clean"],
];

export const sanitizeNoteHtmlClient = (html: string | undefined | null) => {
  const cleanHtml = DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "pre",
      "code",
      "ol",
      "ul",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "style", "data-checked"],
  }).trim();

  return cleanHtml || EMPTY_NOTE_HTML;
};

export const normalizeNoteTitleClient = (title: string) =>
  title.trim() || "Untitled note";

export const normalizeNoteTagsClient = (tags: string[]) =>
  [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(
    0,
    8,
  );

export const buildNoteSearchText = (note: {
  title: string;
  plainTextPreview: string;
  tags: string[];
}) =>
  `${note.title} ${note.plainTextPreview} ${note.tags.join(" ")}`.toLowerCase();

export const getNoteSaveStateLabel = (
  state: "idle" | "dirty" | "saving" | "saved" | "error",
) => {
  switch (state) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "error":
      return "Save failed";
    case "dirty":
      return "Unsaved changes";
    default:
      return "Ready";
  }
};
