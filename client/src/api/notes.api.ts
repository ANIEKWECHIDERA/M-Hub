import { apiFetch } from "./http";

type BackendNoteSummary = {
  id: string;
  company_id: string;
  project_id: string | null;
  author_id: string;
  title: string;
  plain_text_preview: string;
  pinned: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  last_edited_at: string;
  tags: string[];
};

type BackendNote = BackendNoteSummary & {
  content_html: string;
};

const toNoteSummary = (note: BackendNoteSummary) => ({
  id: note.id,
  companyId: note.company_id,
  projectId: note.project_id,
  authorId: note.author_id,
  title: note.title,
  plainTextPreview: note.plain_text_preview,
  pinned: note.pinned,
  archivedAt: note.archived_at,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  lastEditedAt: note.last_edited_at,
  tags: note.tags ?? [],
});

const toNote = (note: BackendNote) => ({
  ...toNoteSummary(note),
  contentHtml: note.content_html,
});

export const notesAPI = {
  async list(
    idToken: string,
    options?: {
      archived?: boolean;
      q?: string;
    },
  ) {
    const params = new URLSearchParams();

    if (options?.archived) {
      params.set("archived", "true");
    }

    if (options?.q?.trim()) {
      params.set("q", options.q.trim());
    }

    const query = params.toString();
    const data = await apiFetch<{ notes: BackendNoteSummary[] }>(
      `/api/notes${query ? `?${query}` : ""}`,
      undefined,
      idToken,
    );

    return data.notes.map(toNoteSummary);
  },

  async getById(id: string, idToken: string) {
    const data = await apiFetch<{ note: BackendNote }>(
      `/api/notes/${id}`,
      undefined,
      idToken,
    );

    return toNote(data.note);
  },

  async create(
    payload: {
      title?: string;
      content_html?: string;
      project_id?: string | null;
      pinned?: boolean;
      tags?: string[];
    },
    idToken: string,
  ) {
    const data = await apiFetch<{ note: BackendNote }>(
      "/api/notes",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      idToken,
    );

    return toNote(data.note);
  },

  async update(
    id: string,
    payload: {
      title?: string;
      content_html?: string;
      project_id?: string | null;
      pinned?: boolean;
      tags?: string[];
    },
    idToken: string,
  ) {
    const data = await apiFetch<{ note: BackendNote }>(
      `/api/notes/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
      idToken,
    );

    return toNote(data.note);
  },

  async archive(id: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/notes/${id}`,
      { method: "DELETE" },
      idToken,
    );
  },

  async delete(id: string, idToken: string) {
    return apiFetch<{ success: boolean }>(
      `/api/notes/${id}/permanent`,
      { method: "DELETE" },
      idToken,
    );
  },

  async restore(id: string, idToken: string) {
    const data = await apiFetch<{ note: BackendNote }>(
      `/api/notes/${id}/restore`,
      { method: "POST", body: JSON.stringify({}) },
      idToken,
    );

    return toNote(data.note);
  },

  async setPinned(id: string, pinned: boolean, idToken: string) {
    const data = await apiFetch<{ note: BackendNote }>(
      `/api/notes/${id}/pin`,
      {
        method: "PATCH",
        body: JSON.stringify({ pinned }),
      },
      idToken,
    );

    return toNote(data.note);
  },
};
