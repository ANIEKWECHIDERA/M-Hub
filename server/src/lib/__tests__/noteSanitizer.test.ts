import {
  extractNotePlainTextPreview,
  normalizeNoteTags,
  normalizeNoteTitle,
  sanitizeNoteHtml,
} from "../noteSanitizer";

describe("noteSanitizer", () => {
  it("removes unsafe markup while preserving formatting", () => {
    const sanitized = sanitizeNoteHtml(
      `<script>alert(1)</script><p>Hello <strong>team</strong> <a href="https://example.com">link</a></p>`,
    );

    expect(sanitized).toContain("<p>Hello <strong>team</strong>");
    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("alert(1)");
  });

  it("builds a clean preview from sanitized html", () => {
    const preview = extractNotePlainTextPreview(
      "<h1>Brief</h1><p>Capture project kickoff details and next steps.</p>",
    );

    expect(preview).toBe("Brief Capture project kickoff details and next steps.");
  });

  it("normalizes empty titles and deduplicates tags", () => {
    expect(normalizeNoteTitle("   ")).toBe("Untitled note");
    expect(
      normalizeNoteTags([" Brief ", "brief", " Planning ", "", "planning"]),
    ).toEqual(["brief", "planning"]);
  });
});
