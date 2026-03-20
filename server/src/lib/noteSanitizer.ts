import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
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
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "target", "rel"],
  span: ["style"],
  p: ["style"],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  ul: ["data-checked"],
};

const ALLOWED_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
    "background-color": [
      /^#[0-9a-fA-F]{3,8}$/,
      /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/,
    ],
  },
  p: {
    "text-align": [/^(left|center|right|justify)$/],
  },
  h1: {
    "text-align": [/^(left|center|right|justify)$/],
  },
  h2: {
    "text-align": [/^(left|center|right|justify)$/],
  },
  h3: {
    "text-align": [/^(left|center|right|justify)$/],
  },
  h4: {
    "text-align": [/^(left|center|right|justify)$/],
  },
};

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRIBUTES,
  allowedStyles: ALLOWED_STYLES,
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    b: "strong",
    i: "em",
  },
};

export const sanitizeNoteHtml = (html: string | undefined | null): string => {
  const safeHtml = sanitizeHtml(html ?? "", SANITIZE_OPTIONS).trim();

  return safeHtml || "<p><br></p>";
};

export const extractNotePlainTextPreview = (html: string): string => {
  const plainText = sanitizeHtml(html.replace(/<[^>]+>/g, " "), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();

  return plainText.slice(0, 280);
};

export const normalizeNoteTitle = (title: string | undefined | null): string => {
  const normalized = title?.trim();
  return normalized?.length ? normalized.slice(0, 160) : "Untitled note";
};

export const normalizeNoteTags = (tags: string[] | undefined): string[] => {
  if (!tags?.length) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 8),
    ),
  ];
};
