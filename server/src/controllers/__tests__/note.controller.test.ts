import { NoteController } from "../note.controller";
import { NoteService } from "../../services/note.service";

jest.mock("../../services/note.service", () => ({
  NoteService: {
    listForAuthor: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    restore: jest.fn(),
    setPinned: jest.fn(),
  },
}));

const mockedNoteService = NoteService as jest.Mocked<typeof NoteService>;

const createResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("NoteController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("scopes note creation to the authenticated user and company", async () => {
    const req: any = {
      body: {
        title: "Client brief",
        company_id: "malicious-company",
        author_id: "malicious-user",
      },
      user: {
        company_id: "company-1",
        user_id: "user-1",
      },
      log: { error: jest.fn() },
    };
    const res = createResponse();

    mockedNoteService.create.mockResolvedValue({
      id: "note-1",
      company_id: "company-1",
      project_id: null,
      author_id: "user-1",
      title: "Client brief",
      plain_text_preview: "Client brief",
      pinned: false,
      archived_at: null,
      created_at: "2026-03-20T00:00:00.000Z",
      updated_at: "2026-03-20T00:00:00.000Z",
      last_edited_at: "2026-03-20T00:00:00.000Z",
      tags: [],
      content_html: "<p>Client brief</p>",
    });

    await NoteController.createNote(req, res);

    expect(mockedNoteService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: "company-1",
        author_id: "user-1",
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("returns 404 when updating a note the user does not own", async () => {
    const req: any = {
      params: { id: "note-2" },
      body: { title: "Updated title" },
      user: {
        company_id: "company-1",
        user_id: "user-1",
      },
      log: { error: jest.fn() },
    };
    const res = createResponse();

    mockedNoteService.update.mockResolvedValue(null);

    await NoteController.updateNote(req, res);

    expect(mockedNoteService.update).toHaveBeenCalledWith(
      "note-2",
      "company-1",
      "user-1",
      { title: "Updated title", project_id: null },
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 404 when archiving a note the user cannot access", async () => {
    const req: any = {
      params: { id: "note-3" },
      user: {
        company_id: "company-1",
        user_id: "user-1",
      },
      log: { error: jest.fn() },
    };
    const res = createResponse();

    mockedNoteService.archive.mockResolvedValue(false);

    await NoteController.archiveNote(req, res);

    expect(mockedNoteService.archive).toHaveBeenCalledWith(
      "note-3",
      "company-1",
      "user-1",
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
